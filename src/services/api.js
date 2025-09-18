// Check if we're in a production environment
const isProduction = process.env.NODE_ENV === 'production';

// Define the API base URL
// In production, we'll use relative paths since we're using IndexedDB
const API_BASE_URL = '/api';

// Generic API call function with fallback to IndexedDB
async function apiCall(endpoint, options = {}) {
  try {
    // Safety check for endpoint
    if (!endpoint) {
      console.error('Invalid endpoint provided to apiCall');
      return { error: true, message: 'Invalid endpoint' };
    }
    
    // Remove the redundant /api prefix from the endpoint if it already exists
    const apiEndpoint = endpoint.startsWith('/api') ? endpoint : `/api${endpoint}`;
    
    console.log(`API call to ${apiEndpoint}`, options);
    
    // In production, we'll bypass the actual API call and go straight to IndexedDB
    if (process.env.NODE_ENV === 'production') {
      console.log(`Production mode detected, using IndexedDB fallback for ${endpoint}`);
      
      try {
        return await handleIndexedDBFallback(endpoint, options);
      } catch (dbError) {
        console.error(`IndexedDB fallback failed for ${endpoint}:`, dbError);
        
        // If IndexedDB fails, return an appropriate empty structure
        if (endpoint.includes('/jobs') && !endpoint.includes('/jobs/')) {
          return [];
        } else if (endpoint.includes('/candidates') && !endpoint.includes('/candidates/')) {
          return { candidates: [], pagination: { page: 1, pageSize: 20, total: 0, totalPages: 0 } };
        } else if (endpoint.includes('/assessments') && !endpoint.includes('/assessments/')) {
          return [];
        } else {
          return [];
        }
      }
    }
    
    const response = await fetch(apiEndpoint, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    // Check if response is ok
    if (!response.ok) {
      // If we get a 404 in production, we should fall back to IndexedDB
      if (response.status === 404 && process.env.NODE_ENV === 'production') {
        console.log(`Got 404 for ${endpoint}, falling back to IndexedDB`);
        return await handleIndexedDBFallback(endpoint, options);
      }
      
      // Only log errors that aren't 404s for assessments
      const is404ForAssessment = response.status === 404 && 
                               (endpoint.includes('/assessments/') || 
                                endpoint.includes('/candidates/') && endpoint.includes('/assessment'));
      
      if (!is404ForAssessment) {
        console.error(`API error: ${response.status} for ${endpoint}`);
      }
      
      const errorData = await response.json().catch(() => ({}));
      return { 
        error: true, 
        status: response.status,
        message: errorData.error || `HTTP error ${response.status}` 
      };
    }

    // Check content type
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      console.warn(`Endpoint ${endpoint} returned non-JSON response: ${contentType}`);
      
      // If we're in production, fall back to IndexedDB
      if (process.env.NODE_ENV === 'production') {
        console.log(`Non-JSON response in production, falling back to IndexedDB for ${endpoint}`);
        return await handleIndexedDBFallback(endpoint, options);
      }
      
      return { error: true, message: 'Invalid response format' };
    }

    const data = await response.json();
    console.log(`API response from ${apiEndpoint}:`, data);
    return data;
  } catch (error) {
    console.error(`API Error (${endpoint}):`, error);
    
    // In case of network errors in production, fall back to IndexedDB
    if (process.env.NODE_ENV === 'production') {
      console.log(`Network error in production, falling back to IndexedDB for ${endpoint}`);
      return await handleIndexedDBFallback(endpoint, options);
    }
    
    return { 
      error: true, 
      message: error.message || 'Network error' 
    };
  }
}

// Function to handle fallback to IndexedDB when API calls fail
async function handleIndexedDBFallback(endpoint, options = {}) {
  try {
    console.log(`Using IndexedDB fallback for ${endpoint}`);
    const { db } = await import('./database');
    
    // Parse the endpoint to determine which table to query
    // First, remove any leading slashes and /api/ prefix
    const normalizedEndpoint = endpoint.replace(/^\/+/, '').replace(/^api\/+/, '');
    
    // Handle empty endpoint
    if (!normalizedEndpoint) {
      console.warn('Empty endpoint after normalization, defaulting to jobs resource');
      return db.jobs.toArray();
    }
    
    // Parse path and query string
    const questionMarkIndex = normalizedEndpoint.indexOf('?');
    const pathPart = questionMarkIndex >= 0 ? normalizedEndpoint.substring(0, questionMarkIndex) : normalizedEndpoint;
    const path = pathPart.split('/').filter(segment => segment); // Remove empty segments
    
    // Extract resource and ID
    const resource = path.length > 0 ? path[0] : 'jobs'; // Default to jobs if not specified
    const id = path.length > 1 ? parseInt(path[1], 10) : null;
    
    console.log(`Parsed endpoint: resource=${resource}, id=${id}`);
    
    // Based on the HTTP method and resource, perform the appropriate IndexedDB operation
    const method = options.method || 'GET';
    
    if (resource === 'jobs') {
      if (method === 'GET') {
        try {
          if (id) {
            const job = await db.jobs.get(id);
            return job || { error: true, message: 'Job not found' };
          } else {
            // Check if we have jobs in the database
            const jobCount = await db.jobs.count();
            console.log(`Found ${jobCount} jobs in IndexedDB`);
            
            if (jobCount > 0) {
              const jobs = await db.jobs.toArray();
              console.log(`Retrieved ${jobs.length} jobs from IndexedDB`);
              return jobs;
            } else {
              console.log('No jobs found in IndexedDB, returning empty array');
              return [];
            }
          }
        } catch (jobError) {
          console.error('Error retrieving jobs from IndexedDB:', jobError);
          return [];
        }
      }
      // Add other methods (POST, PUT, DELETE) as needed
    } 
    else if (resource === 'candidates') {
      if (method === 'GET') {
        try {
          if (id) {
            const candidate = await db.candidates.get(id);
            return candidate || { error: true, message: 'Candidate not found' };
          } else {
            // Check if we have candidates in the database
            const candidateCount = await db.candidates.count();
            console.log(`Found ${candidateCount} candidates in IndexedDB`);
            
            if (candidateCount > 0) {
              // Handle pagination if present in the query params
              const urlParams = new URLSearchParams(endpoint.includes('?') ? endpoint.split('?')[1] : '');
              const page = parseInt(urlParams.get('page') || '1', 10);
              const pageSize = parseInt(urlParams.get('pageSize') || '20', 10);
              
              const allCandidates = await db.candidates.toArray();
              const total = allCandidates.length;
              
              if (urlParams.get('all') === 'true') {
                return allCandidates;
              }
              
              const startIndex = (page - 1) * pageSize;
              const paginatedCandidates = allCandidates.slice(startIndex, startIndex + pageSize);
              
              return {
                candidates: paginatedCandidates,
                pagination: {
                  page,
                  pageSize,
                  total,
                  totalPages: Math.ceil(total / pageSize)
                }
              };
            } else {
              console.log('No candidates found in IndexedDB, returning empty array');
              return { candidates: [], pagination: { page: 1, pageSize: 20, total: 0, totalPages: 0 } };
            }
          }
        } catch (candidateError) {
          console.error('Error retrieving candidates from IndexedDB:', candidateError);
          return { candidates: [], pagination: { page: 1, pageSize: 20, total: 0, totalPages: 0 } };
        }
      }
      // Add other methods as needed
    } 
    else if (resource === 'assessments') {
      if (method === 'GET') {
        try {
          if (id) {
            const assessment = await db.assessments.get(id);
            return assessment || { 
              id: parseInt(id), 
              title: 'Unavailable Assessment',
              error: true,
              questions: []
            };
          } else {
            // Check if we have assessments in the database
            const assessmentCount = await db.assessments.count();
            console.log(`Found ${assessmentCount} assessments in IndexedDB`);
            
            if (assessmentCount > 0) {
              const assessments = await db.assessments.toArray();
              console.log(`Retrieved ${assessments.length} assessments from IndexedDB`);
              return assessments;
            } else {
              console.log('No assessments found in IndexedDB, returning empty array');
              return [];
            }
          }
        } catch (assessmentError) {
          console.error('Error retrieving assessments from IndexedDB:', assessmentError);
          return [];
        }
      }
      // Add other methods as needed
    }
    else if (resource === 'candidate-timeline') {
      try {
        // Extract the candidate ID from the path
        const candidateId = id;
        if (candidateId) {
          // Check if we have timeline entries
          const timelineCount = await db.candidateTimeline
            .where('candidateId')
            .equals(candidateId)
            .count();
          
          console.log(`Found ${timelineCount} timeline entries for candidate ${candidateId}`);
          
          if (timelineCount > 0) {
            const timeline = await db.candidateTimeline
              .where('candidateId')
              .equals(candidateId)
              .toArray();
            return timeline;
          } else {
            return [];
          }
        }
      } catch (timelineError) {
        console.error(`Error retrieving timeline for candidate ${id}:`, timelineError);
        return [];
      }
    }
    
    // For any other endpoint that we don't explicitly handle, return an empty array
    // This is safer than returning an error object
    console.log(`Unhandled resource in IndexedDB fallback: ${resource}, returning empty array`);
    return [];
  } catch (error) {
    console.error(`IndexedDB fallback error for ${endpoint}:`, error);
    // Extract resource from the endpoint for error handling
    let resourceType = 'unknown';
    
    if (endpoint.includes('/jobs')) {
      resourceType = 'jobs';
    } else if (endpoint.includes('/candidates')) {
      resourceType = 'candidates';
    } else if (endpoint.includes('/assessments')) {
      resourceType = 'assessments';
    }
    
    console.log(`Determined resource type for error handling: ${resourceType}`);
    
    // Return empty arrays or objects instead of error messages
    if (resourceType === 'unknown') {
      console.log('No resource determined from endpoint, returning empty array');
      return [];
    } else if (resourceType === 'candidates' && !endpoint.includes('/candidates/')) {
      return { candidates: [], pagination: { page: 1, pageSize: 20, total: 0, totalPages: 0 } };
    } else if (resourceType === 'jobs' && !endpoint.includes('/jobs/')) {
      return [];
    } else if (resourceType === 'assessments' && !endpoint.includes('/assessments/')) {
      return [];
    } else if (endpoint.includes('/timeline')) {
      return [];
    } else if (endpoint.includes('/candidates/') && endpoint.includes('/assessment')) {
      return { 
        id: 0, 
        title: 'Unavailable Assessment',
        error: true,
        questions: []
      };
    } else {
      return [];
    }
  }
}
export const jobsApi = {
  getJobs: async (params = {}) => {
    // Build query params for filtering
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== null && value !== undefined && value !== '') {
        searchParams.append(key, value);
      }
    });
    
    const queryString = searchParams.toString();
    const endpoint = queryString ? `/jobs?${queryString}` : '/jobs';
    
    console.log('Fetching jobs with filter params:', params);
    console.log('Fetching jobs with params:', params, 'endpoint:', endpoint);
    
    try {
      const jobs = await apiCall(endpoint);
      
      // Additional logging to diagnose issues
      console.log('Jobs API response:', jobs);
      
      // Critical: Ensure we always return an array
      if (!jobs) {
        console.warn('No jobs returned from API, returning empty array');
        return [];
      }
      
      if (jobs.error) {
        console.error('Failed to fetch jobs:', jobs.message);
        return [];
      }
      
      // Handle both array responses and object responses with data property
      if (Array.isArray(jobs)) {
        return jobs;
      } else if (jobs.data && Array.isArray(jobs.data)) {
        return jobs.data;
      } else {
        console.warn('Unexpected jobs response format:', jobs);
        return [];
      }
    } catch (error) {
      console.error('Error in getJobs:', error);
      return [];
    }
  },
  getJob: async (id) => {
    try {
      const job = await apiCall(`/jobs/${id}`);
      if (!job || job.error) {
        console.error('Failed to fetch job:', job?.message || 'Unknown error');
        return null;
      }
      return job;
    } catch (error) {
      console.error('Error in getJob:', error);
      return null;
    }
  },
  createJob: async (data) => {
    try {
      const result = await apiCall('/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (result && result.error) {
        console.error('Failed to create job:', result.message);
        return null;
      }
      return result;
    } catch (error) {
      console.error('Error in createJob:', error);
      return null;
    }
  },
  updateJob: async (id, data) => {
    try {
      const result = await apiCall(`/jobs/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (result && result.error) {
        console.error('Failed to update job:', result.message);
        return null;
      }
      return result;
    } catch (error) {
      console.error('Error in updateJob:', error);
      return null;
    }
  },
  deleteJob: async (id) => {
    try {
      const result = await apiCall(`/jobs/${id}`, {
        method: 'DELETE'
      });
      if (result && result.error) {
        console.error('Failed to delete job:', result.message);
        return false;
      }
      return true;
    } catch (error) {
      console.error('Error in deleteJob:', error);
      return false;
    }
  },
  reorderJob: async (id, fromOrder, toOrder) => {
    try {
      const result = await apiCall(`/jobs/${id}/reorder`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fromOrder, toOrder })
      });
      if (result && result.error) {
        console.error('Failed to reorder job:', result.message);
        return false;
      }
      return true;
    } catch (error) {
      console.error('Error in reorderJob:', error);
      return false;
    }
  }
};

// Candidates API
export const candidatesApi = {
  getCandidates: async (params = {}) => {
    try {
      const searchParams = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        if (value !== null && value !== undefined && value !== '') {
          searchParams.append(key, value);
        }
      });
      
      const queryString = searchParams.toString();
      const endpoint = queryString ? `/candidates?${queryString}` : '/candidates';
      
      const result = await apiCall(endpoint);
      
      // Handle error case
      if (!result || result.error) {
        console.error('Failed to fetch candidates:', result?.message || 'Unknown error');
        return { 
          candidates: [], 
          pagination: { page: 1, pageSize: 20, total: 0, totalPages: 0 } 
        };
      }
      
      // Handle different response formats
      if (Array.isArray(result)) {
        // If result is an array, assume it's the candidates list with no pagination
        return { 
          candidates: result, 
          pagination: { 
            page: 1, 
            pageSize: result.length,
            total: result.length,
            totalPages: 1
          } 
        };
      } else if (result.candidates && Array.isArray(result.candidates)) {
        // Properly formatted response with pagination
        return result;
      } else if (result.data && Array.isArray(result.data)) {
        // Alternative API format
        return {
          candidates: result.data,
          pagination: result.pagination || { 
            page: 1, 
            pageSize: result.data.length,
            total: result.data.length,
            totalPages: 1
          }
        };
      } else {
        // Unexpected format, return empty results
        console.warn('Unexpected candidates response format:', result);
        return { 
          candidates: [], 
          pagination: { page: 1, pageSize: 20, total: 0, totalPages: 0 } 
        };
      }
    } catch (error) {
      console.error('Error in getCandidates:', error);
      return { 
        candidates: [], 
        pagination: { page: 1, pageSize: 20, total: 0, totalPages: 0 } 
      };
    }
  },

  getCandidate: async (id) => {
    try {
      const candidate = await apiCall(`/candidates/${id}`);
      if (!candidate || candidate.error) {
        console.error('Failed to fetch candidate:', candidate?.message || 'Unknown error');
        return null;
      }
      return candidate;
    } catch (error) {
      console.error('Error in getCandidate:', error);
      return null;
    }
  },

  updateCandidate: async (id, data) => {
    try {
      const result = await apiCall(`/candidates/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (result && result.error) {
        console.error('Failed to update candidate:', result.message);
        return null;
      }
      return result;
    } catch (error) {
      console.error('Error in updateCandidate:', error);
      return null;
    }
  },

  updateCandidateSkills: async (id, skills) => {
    try {
      const result = await apiCall(`/candidates/${id}/skills`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ skills })
      });
      if (result && result.error) {
        console.error('Failed to update candidate skills:', result.message);
        return null;
      }
      return result;
    } catch (error) {
      console.error('Error in updateCandidateSkills:', error);
      return null;
    }
  },

  getCandidateTimeline: async (id) => {
    try {
      const timeline = await apiCall(`/candidates/${id}/timeline`);
      
      // Handle error case
      if (!timeline || timeline.error) {
        console.error('Failed to fetch candidate timeline:', timeline?.message || 'Unknown error');
        return [];
      }
      
      // Ensure we always return an array
      if (Array.isArray(timeline)) {
        return timeline;
      } else if (timeline.data && Array.isArray(timeline.data)) {
        return timeline.data;
      } else {
        console.warn('Unexpected timeline response format:', timeline);
        return [];
      }
    } catch (error) {
      console.error('Error in getCandidateTimeline:', error);
      return [];
    }
  },

  getAssessment: async (candidateId) => {
    try {
      // Use a more concise logging approach
      const debugMode = false; // Set to true for verbose logging
      if (debugMode) console.log(`Fetching assessment for candidate ID: ${candidateId}`);
      
      // First try the dedicated endpoint for getting assessment by candidate ID
      const assessment = await apiCall(`/candidates/${candidateId}/assessment`);
      
      if (assessment && !assessment.error) {
        if (debugMode) console.log(`Found assessment for candidate ${candidateId}:`, assessment);
        return assessment;
      }
      
      if (debugMode) console.log(`No assessment found at /candidates/${candidateId}/assessment, trying direct assessment ID`);
      
      // Fallback to trying the assessment ID directly
      const fallbackAssessment = await apiCall(`/assessments/${candidateId}`);
      
      if (fallbackAssessment && !fallbackAssessment.error) {
        if (debugMode) console.log(`Found assessment with direct ID ${candidateId}:`, fallbackAssessment);
        return fallbackAssessment;
      }
      
      // Return a placeholder assessment object if no assessment is found
      if (debugMode) console.log(`No assessment found for candidate ${candidateId}`);
      return { 
        id: parseInt(candidateId), 
        candidateId: parseInt(candidateId),
        title: 'Unavailable Assessment',
        error: true,
        questions: []
      };
    } catch (error) {
      console.error(`Error fetching assessment for candidate ${candidateId}:`, error);
      return { 
        id: parseInt(candidateId), 
        candidateId: parseInt(candidateId),
        title: 'Unavailable Assessment',
        error: true,
        questions: []
      };
    }
  },

  createCandidate: async (data) => {
    try {
      const result = await apiCall('/candidates', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data)
      });
      if (result && result.error) {
        console.error('Failed to create candidate:', result.message);
        return null;
      }
      return result;
    } catch (error) {
      console.error('Error in createCandidate:', error);
      return null;
    }
  },

  addCandidateNote: async (candidateId, data) => {
    try {
      const result = await apiCall(`/candidates/${candidateId}/notes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data)
      });
      if (result && result.error) {
        console.error('Failed to add candidate note:', result.message);
        return null;
      }
      return result;
    } catch (error) {
      console.error('Error in addCandidateNote:', error);
      return null;
    }
  },

  scheduleInterview: async (candidateId, data) => {
    try {
      const result = await apiCall(`/candidates/${candidateId}/interviews`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data)
      });
      if (result && result.error) {
        console.error('Failed to schedule interview:', result.message);
        return null;
      }
      return result;
    } catch (error) {
      console.error('Error in scheduleInterview:', error);
      return null;
    }
  },

  deleteNote: async (candidateId, noteId) => {
    try {
      const result = await apiCall(`/candidates/${candidateId}/notes/${noteId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        }
      });
      if (result && result.error) {
        console.error('Failed to delete note:', result.message);
        return false;
      }
      return true;
    } catch (error) {
      console.error('Error in deleteNote:', error);
      return false;
    }
  },
};

// Assessments API
export const assessmentsApi = {
  getAssessments: async () => {
    try {
      const assessments = await apiCall('/assessments');
      
      // Handle error case
      if (!assessments || assessments.error) {
        console.error('Failed to fetch assessments:', assessments?.message || 'Unknown error');
        return [];
      }
      
      // Ensure we always return an array
      if (Array.isArray(assessments)) {
        return assessments;
      } else if (assessments.data && Array.isArray(assessments.data)) {
        return assessments.data;
      } else {
        console.warn('Unexpected assessments response format:', assessments);
        return [];
      }
    } catch (error) {
      console.error('Error in getAssessments:', error);
      return [];
    }
  },
  
  getAssessment: async (id) => {
    try {
      const assessment = await apiCall(`/assessments/${id}`);
      if (!assessment || assessment.error) {
        // Log the error but return a valid object structure
        console.error(`Failed to fetch assessment ${id}:`, assessment?.message || 'Unknown error');
        return { 
          id: parseInt(id), 
          title: 'Unavailable Assessment',
          error: true,
          questions: []
        };
      }
      return assessment;
    } catch (error) {
      console.error(`Error fetching assessment ${id}:`, error);
      return { 
        id: parseInt(id), 
        title: 'Unavailable Assessment',
        error: true,
        questions: []
      };
    }
  },
  
  createAssessment: async (data) => {
    try {
      const result = await apiCall('/assessments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (result && result.error) {
        console.error('Failed to create assessment:', result.message);
        return null;
      }
      return result;
    } catch (error) {
      console.error('Error in createAssessment:', error);
      return null;
    }
  },

  updateAssessment: async (id, data) => {
    try {
      const result = await apiCall(`/assessments/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (result && result.error) {
        console.error('Failed to update assessment:', result.message);
        return null;
      }
      return result;
    } catch (error) {
      console.error('Error in updateAssessment:', error);
      return null;
    }
  },

  deleteAssessment: async (id) => {
    try {
      const result = await apiCall(`/assessments/${id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' }
      });
      if (result && result.error) {
        console.error('Failed to delete assessment:', result.message);
        return false;
      }
      return true;
    } catch (error) {
      console.error('Error in deleteAssessment:', error);
      return false;
    }
  },

  // Assessment responses
  getAssessmentResponses: async (assessmentId) => {
    try {
      const responses = await apiCall(`/assessments/${assessmentId}/responses`);
      
      // Handle error case
      if (!responses || responses.error) {
        console.error('Failed to fetch assessment responses:', responses?.message || 'Unknown error');
        return [];
      }
      
      // Ensure we always return an array
      if (Array.isArray(responses)) {
        return responses;
      } else if (responses.data && Array.isArray(responses.data)) {
        return responses.data;
      } else {
        console.warn('Unexpected assessment responses format:', responses);
        return [];
      }
    } catch (error) {
      console.error('Error in getAssessmentResponses:', error);
      return [];
    }
  },
  
  getAssessmentResponse: async (assessmentId, responseId) => {
    try {
      const response = await apiCall(`/assessments/${assessmentId}/responses/${responseId}`);
      if (!response || response.error) {
        console.error('Failed to fetch assessment response:', response?.message || 'Unknown error');
        return null;
      }
      return response;
    } catch (error) {
      console.error('Error in getAssessmentResponse:', error);
      return null;
    }
  },
  
  submitAssessmentResponse: async (assessmentId, data) => {
    try {
      const result = await apiCall(`/assessments/${assessmentId}/responses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (result && result.error) {
        console.error('Failed to submit assessment response:', result.message);
        return null;
      }
      return result;
    } catch (error) {
      console.error('Error in submitAssessmentResponse:', error);
      return null;
    }
  }
};

// Add or update the deleteJob function 
export async function deleteJob(id) {
  try {
    const result = await apiCall(`/jobs/${id}`, { 
      method: 'DELETE' 
    });
    
    if (result && result.error) {
      console.error('Failed to delete job:', result.message);
      return false;
    }
    return true;
  } catch (error) {
    console.error('Error in deleteJob standalone function:', error);
    return false;
  }
}

// Update the getJob function
export async function getJob(id) {
  try {
    const job = await apiCall(`/jobs/${id}`);
    
    if (!job || job.error) {
      console.error('Failed to fetch job:', job?.message || 'Unknown error');
      return null;
    }
    
    // Normalize the job data
    return {
      ...job,
      requirements: Array.isArray(job.requirements) ? job.requirements : [],
      createdAt: job.createdAt || new Date().toISOString(),
      status: job.status || 'open'
    };
  } catch (error) {
    console.error('Error in getJob standalone function:', error);
    return null;
  }
}

// And the updateJob function
export async function updateJob(job) {
  try {
    const result = await apiCall(`/jobs/${job.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(job)
    });
    
    if (result && result.error) {
      console.error('Failed to update job:', result.message);
      return null;
    }
    return result;
  } catch (error) {
    console.error('Error in updateJob standalone function:', error);
    return null;
  }
}