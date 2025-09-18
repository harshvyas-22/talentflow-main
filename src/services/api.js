// Check if we're in a production environment
const isProduction = process.env.NODE_ENV === 'production';

// Define the API base URL
// In production, we'll use relative paths since we're using IndexedDB
const API_BASE_URL = '/api';

// Generic API call function with fallback to IndexedDB
async function apiCall(endpoint, options = {}) {
  try {
    // Remove the redundant /api prefix from the endpoint if it already exists
    const apiEndpoint = endpoint.startsWith('/api') ? endpoint : `/api${endpoint}`;
    
    console.log(`API call to ${apiEndpoint}`, options);
    
    // In production, we'll bypass the actual API call and go straight to IndexedDB
    if (isProduction) {
      return await handleIndexedDBFallback(endpoint, options);
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
      if (response.status === 404 && isProduction) {
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
      return { error: true, message: 'Invalid response format' };
    }

    const data = await response.json();
    console.log(`API response from ${apiEndpoint}:`, data);
    return data;
  } catch (error) {
    console.error(`API Error (${endpoint}):`, error);
    
    // In case of network errors in production, fall back to IndexedDB
    if (isProduction) {
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
    const path = endpoint.replace(/^\/api\//, '').split('/');
    const resource = path[0];
    const id = path[1] ? parseInt(path[1], 10) : null;
    
    // Based on the HTTP method and resource, perform the appropriate IndexedDB operation
    const method = options.method || 'GET';
    
    if (resource === 'jobs') {
      if (method === 'GET') {
        if (id) {
          const job = await db.jobs.get(id);
          return job || { error: true, message: 'Job not found' };
        } else {
          const jobs = await db.jobs.toArray();
          return jobs || [];
        }
      }
      // Add other methods (POST, PUT, DELETE) as needed
    } 
    else if (resource === 'candidates') {
      if (method === 'GET') {
        if (id) {
          const candidate = await db.candidates.get(id);
          return candidate || { error: true, message: 'Candidate not found' };
        } else {
          // Handle pagination if present in the query params
          const urlParams = new URLSearchParams(endpoint.split('?')[1] || '');
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
        }
      }
      // Add other methods as needed
    } 
    else if (resource === 'assessments') {
      if (method === 'GET') {
        if (id) {
          const assessment = await db.assessments.get(id);
          return assessment || { error: true, message: 'Assessment not found' };
        } else {
          const assessments = await db.assessments.toArray();
          return assessments || [];
        }
      }
      // Add other methods as needed
    }
    else if (resource === 'candidate-timeline') {
      // Extract the candidate ID from the path
      const candidateId = id;
      if (candidateId) {
        const timeline = await db.candidateTimeline
          .where('candidateId')
          .equals(candidateId)
          .toArray();
        return timeline || [];
      }
    }
    
    // Default fallback for any other endpoint
    return { error: true, message: 'Resource not available in offline mode' };
  } catch (error) {
    console.error(`IndexedDB fallback error for ${endpoint}:`, error);
    return { error: true, message: 'Failed to access offline data' };
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
    
    console.log('Fetching jobs with params:', params, 'endpoint:', endpoint);
    
    const jobs = await apiCall(endpoint);
    if (jobs && jobs.error) {
      console.error('Failed to fetch jobs:', jobs.message);
      return []; // Return empty array instead of null
    }
    return jobs;
  },
  getJob: (id) => apiCall(`/jobs/${id}`),
  createJob: (data) => apiCall('/jobs', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  }),
  updateJob: (id, data) => apiCall(`/jobs/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  }),
  deleteJob: (id) => apiCall(`/jobs/${id}`, {
    method: 'DELETE'
  }),
  reorderJob: (id, fromOrder, toOrder) => apiCall(`/jobs/${id}/reorder`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fromOrder, toOrder })
  })
};

// Candidates API
export const candidatesApi = {
  getCandidates: (params = {}) => {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== null && value !== undefined && value !== '') {
        searchParams.append(key, value);
      }
    });
    return apiCall(`/candidates?${searchParams.toString()}`);
  },

  getCandidate: (id) => apiCall(`/candidates/${id}`),

  updateCandidate: (id, data) => apiCall(`/candidates/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  }),

  updateCandidateSkills: (id, skills) => apiCall(`/candidates/${id}/skills`, {
    method: 'PUT',
    body: JSON.stringify({ skills }),
  }),

  getCandidateTimeline: (id) => apiCall(`/candidates/${id}/timeline`),

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
    return apiCall('/candidates', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data)
    });
  },

  addCandidateNote: async (candidateId, data) => {
    return apiCall(`/candidates/${candidateId}/notes`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data)
    });
  },

  scheduleInterview: async (candidateId, data) => {
    return apiCall(`/candidates/${candidateId}/interviews`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data)
    });
  },

  deleteNote: async (candidateId, noteId) => {
    return apiCall(`/candidates/${candidateId}/notes/${noteId}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      }
    });
  },
};

// Assessments API

export const assessmentsApi = {
  getAssessments: () => apiCall('/assessments'),
  getAssessment: async (id) => {
    try {
      const assessment = await apiCall(`/assessments/${id}`);
      if (assessment && assessment.error) {
        // Log the error but return a valid object structure
        console.error(`Failed to fetch assessment ${id}:`, assessment.message);
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
  
  createAssessment: (data) => apiCall('/assessments', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  }),

  updateAssessment: (id, data) => apiCall(`/assessments/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  }),

  deleteAssessment: (id) => apiCall(`/assessments/${id}`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' }
  }),

  // Assessment responses
  getAssessmentResponses: (assessmentId) => apiCall(`/assessments/${assessmentId}/responses`),
  
  getAssessmentResponse: (assessmentId, responseId) => apiCall(`/assessments/${assessmentId}/responses/${responseId}`),
  
  submitAssessmentResponse: (assessmentId, data) => apiCall(`/assessments/${assessmentId}/responses`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  })
};

// Add or update the deleteJob function 
export async function deleteJob(id) {
  return await apiCall(`/jobs/${id}`, { 
    method: 'DELETE' 
  });
}

// Update the getJob function
export async function getJob(id) {
  const job = await apiCall(`/jobs/${id}`);
  
  if (job && !job.error) {
    // Normalize the job data
    return {
      ...job,
      requirements: Array.isArray(job.requirements) ? job.requirements : [],
      createdAt: job.createdAt || new Date().toISOString(),
      status: job.status || 'open'
    };
  }
  
  return job;
}

// And the updateJob function
export async function updateJob(job) {
  return await apiCall(`/jobs/${job.id}`, {
    method: 'PUT',
    body: JSON.stringify(job)
  });
}