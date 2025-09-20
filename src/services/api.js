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
    if (isProduction) {
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
      if (response.status === 404 && isProduction) {
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
      if (isProduction) {
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
    if (isProduction) {
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
    const queryString = questionMarkIndex >= 0 ? normalizedEndpoint.substring(questionMarkIndex + 1) : '';
    const path = pathPart.split('/').filter(segment => segment); // Remove empty segments
    
    // Parse query parameters
    const queryParams = {};
    if (queryString) {
      const searchParams = new URLSearchParams(queryString);
      for (const [key, value] of searchParams.entries()) {
        queryParams[key] = value;
      }
      console.log('Parsed query parameters:', queryParams);
    }
    
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
              // Get all jobs first
              let jobs = await db.jobs.toArray();
              console.log(`Retrieved ${jobs.length} jobs from IndexedDB`);
              
              // Apply filters based on query parameters
              if (queryParams.status && queryParams.status !== 'all') {
                console.log(`Filtering jobs by status: ${queryParams.status}`);
                jobs = jobs.filter(job => job.status === queryParams.status);
                console.log(`After status filter: ${jobs.length} jobs remaining`);
              }
              
              // Sort by order for consistent display
              jobs.sort((a, b) => (a.order || 0) - (b.order || 0));
              
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
      else if (method === 'POST') {
        try {
          // Create a new job
          console.log('Creating new job in IndexedDB:', options.body);
          const jobData = JSON.parse(options.body);
          
          // Generate an ID if none is provided
          if (!jobData.id) {
            const highestId = await db.jobs.orderBy('id').reverse().limit(1).first();
            jobData.id = highestId ? highestId.id + 1 : 1;
          }
          
          // Add created timestamp
          if (!jobData.createdAt) {
            jobData.createdAt = new Date().toISOString();
          }
          
          // Set a default status if none is provided
          if (!jobData.status) {
            jobData.status = 'open';
          }
          
          // Set a default order if none is provided
          if (!jobData.order) {
            const highestOrder = await db.jobs.orderBy('order').reverse().limit(1).first();
            jobData.order = highestOrder ? highestOrder.order + 1 : 1;
          }
          
          // Ensure requirements is an array
          if (!jobData.requirements) {
            jobData.requirements = [];
          }
          
          console.log('Saving job to IndexedDB:', jobData);
          const newId = await db.jobs.put(jobData);
          const newJob = await db.jobs.get(newId);
          console.log('Job created in IndexedDB with ID:', newId);
          return newJob;
        } catch (createError) {
          console.error('Error creating job in IndexedDB:', createError);
          return { error: true, message: 'Failed to create job in IndexedDB' };
        }
      }
      else if (method === 'PUT') {
        try {
          // Update existing job
          if (!id) {
            return { error: true, message: 'Job ID is required for updates' };
          }
          
          console.log(`Updating job ${id} in IndexedDB`);
          const jobData = JSON.parse(options.body);
          
          // Ensure the ID in the data matches the URL
          jobData.id = id;
          
          // Ensure requirements is an array
          if (!jobData.requirements) {
            jobData.requirements = [];
          }
          
          // Check if the job exists
          const existingJob = await db.jobs.get(id);
          if (!existingJob) {
            return { error: true, message: 'Job not found' };
          }
          
          console.log('Updating job in IndexedDB:', jobData);
          await db.jobs.put(jobData);
          const updatedJob = await db.jobs.get(id);
          console.log('Job updated in IndexedDB');
          return updatedJob;
        } catch (updateError) {
          console.error(`Error updating job ${id} in IndexedDB:`, updateError);
          return { error: true, message: 'Failed to update job in IndexedDB' };
        }
      }
      else if (method === 'DELETE') {
        try {
          // Delete job
          if (!id) {
            return { error: true, message: 'Job ID is required for deletion' };
          }
          
          console.log(`Deleting job ${id} from IndexedDB`);
          
          // Check if the job exists
          const existingJob = await db.jobs.get(id);
          if (!existingJob) {
            return { error: true, message: 'Job not found' };
          }
          
          await db.jobs.delete(id);
          console.log(`Job ${id} deleted from IndexedDB`);
          return { success: true };
        } catch (deleteError) {
          console.error(`Error deleting job ${id} from IndexedDB:`, deleteError);
          return { error: true, message: 'Failed to delete job from IndexedDB' };
        }
      }
      else if ((method === 'PATCH' || method === 'PUT') && (endpoint.includes('/reorder') || path.length >= 3 && path[2] === 'reorder')) {
        try {
          // Reorder job
          if (!id) {
            return { error: true, message: 'Job ID is required for reordering' };
          }
          
          // Make sure we can parse the body
          let reorderData;
          try {
            reorderData = JSON.parse(options.body);
          } catch (parseError) {
            console.error('Error parsing reorder data:', parseError, options.body);
            return { error: true, message: 'Invalid reorder data format' };
          }
          
          const { fromOrder, toOrder } = reorderData;
          
          console.log(`Reordering job ${id} from ${fromOrder} to ${toOrder} in IndexedDB`);
          
          // Get the job to reorder
          const jobToReorder = await db.jobs.get(id);
          if (!jobToReorder) {
            return { error: true, message: 'Job not found' };
          }
          
          // Update all affected jobs
          const allJobs = await db.jobs.toArray();
          
          // First ensure all jobs have an order property
          allJobs.forEach((job, idx) => {
            if (!job.order || isNaN(job.order)) {
              job.order = idx + 1;
            }
          });
          
          // Sort by current order
          allJobs.sort((a, b) => a.order - b.order);
          
          // Update the orders based on the drag operation
          for (const job of allJobs) {
            if (job.id === parseInt(id)) {
              // This is the job we're moving
              job.order = toOrder;
            } else if (fromOrder < toOrder && job.order > fromOrder && job.order <= toOrder) {
              // Jobs that need to move down
              job.order -= 1;
            } else if (fromOrder > toOrder && job.order >= toOrder && job.order < fromOrder) {
              // Jobs that need to move up
              job.order += 1;
            }
          }
          
          // Save all jobs
          await db.jobs.bulkPut(allJobs);
          console.log(`Job ${id} reordered in IndexedDB`);
          return { success: true };
        } catch (reorderError) {
          console.error(`Error reordering job ${id} in IndexedDB:`, reorderError);
          return { error: true, message: 'Failed to reorder job in IndexedDB' };
        }
      }
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
              const page = parseInt(urlParams.get('page') || queryParams.page || '1', 10);
              const pageSize = parseInt(urlParams.get('pageSize') || queryParams.pageSize || '20', 10);
              
              let allCandidates = await db.candidates.toArray();
              
              // Ensure each candidate has a valid stage
              allCandidates = allCandidates.map(candidate => ({
                ...candidate,
                // Set default stage to 'applied' if missing or invalid
                stage: candidate.stage || 'applied'
              }));
              
              // Apply filters from query parameters
              if (queryParams.stage && queryParams.stage !== 'all') {
                console.log(`Filtering candidates by stage: ${queryParams.stage}`);
                allCandidates = allCandidates.filter(candidate => candidate.stage === queryParams.stage);
                console.log(`After stage filter: ${allCandidates.length} candidates remaining`);
              }
              
              const total = allCandidates.length;
              
              if (urlParams.get('all') === 'true' || queryParams.all === 'true') {
                return { candidates: allCandidates, pagination: { page: 1, pageSize: total, total, totalPages: 1 } };
              }
              
              const startIndex = (page - 1) * pageSize;
              const paginatedCandidates = allCandidates.slice(startIndex, startIndex + pageSize);
              
              console.log(`Returning ${paginatedCandidates.length} candidates for page ${page}`);
              
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
              return { 
                candidates: [], 
                pagination: { 
                  page: 1, 
                  pageSize: 20, 
                  total: 0, 
                  totalPages: 0 
                } 
              };
            }
          }
        } catch (candidateError) {
          console.error('Error retrieving candidates from IndexedDB:', candidateError);
          return { candidates: [], pagination: { page: 1, pageSize: 20, total: 0, totalPages: 0 } };
        }
      }
      // Add other methods as needed
      else if (method === 'POST') {
        try {
          // Create a new candidate
          console.log('Creating new candidate in IndexedDB:', options.body);
          const candidateData = JSON.parse(options.body);
          
          // Generate an ID if none is provided
          if (!candidateData.id) {
            const highestId = await db.candidates.orderBy('id').reverse().limit(1).first();
            candidateData.id = highestId ? highestId.id + 1 : 1;
          }
          
          // Add created timestamp
          if (!candidateData.createdAt) {
            candidateData.createdAt = new Date().toISOString();
          }
          
          // Set a default stage if none is provided
          if (!candidateData.stage) {
            candidateData.stage = 'applied';
          }
          
          // Ensure skills is an array
          if (!candidateData.skills) {
            candidateData.skills = [];
          }
          
          console.log('Saving candidate to IndexedDB:', candidateData);
          const newId = await db.candidates.put(candidateData);
          const newCandidate = await db.candidates.get(newId);
          console.log('Candidate created in IndexedDB with ID:', newId);
          return newCandidate;
        } catch (createError) {
          console.error('Error creating candidate in IndexedDB:', createError);
          return { error: true, message: 'Failed to create candidate in IndexedDB' };
        }
      }
      else if (method === 'PATCH' || method === 'PUT') {
        try {
          // Update existing candidate
          if (!id) {
            return { error: true, message: 'Candidate ID is required for updates' };
          }
          
          console.log(`Updating candidate ${id} in IndexedDB`);
          let candidateData = JSON.parse(options.body);
          
          // Ensure the ID in the data matches the URL
          candidateData.id = id;
          
          // Check if the candidate exists
          const existingCandidate = await db.candidates.get(id);
          if (!existingCandidate) {
            return { error: true, message: 'Candidate not found' };
          }
          
          // For PATCH, we only update the fields provided in the request
          if (method === 'PATCH') {
            candidateData = { ...existingCandidate, ...candidateData };
          }
          
          // Ensure skills is an array
          if (!candidateData.skills) {
            candidateData.skills = [];
          }
          
          console.log('Updating candidate in IndexedDB:', candidateData);
          await db.candidates.put(candidateData);
          const updatedCandidate = await db.candidates.get(id);
          console.log('Candidate updated in IndexedDB');
          return updatedCandidate;
        } catch (updateError) {
          console.error(`Error updating candidate ${id} in IndexedDB:`, updateError);
          return { error: true, message: 'Failed to update candidate in IndexedDB' };
        }
      }
      else if (method === 'DELETE') {
        try {
          // Delete candidate
          if (!id) {
            return { error: true, message: 'Candidate ID is required for deletion' };
          }
          
          console.log(`Deleting candidate ${id} from IndexedDB`);
          
          // Check if the candidate exists
          const existingCandidate = await db.candidates.get(id);
          if (!existingCandidate) {
            return { error: true, message: 'Candidate not found' };
          }
          
          await db.candidates.delete(id);
          console.log(`Candidate ${id} deleted from IndexedDB`);
          return { success: true };
        } catch (deleteError) {
          console.error(`Error deleting candidate ${id} from IndexedDB:`, deleteError);
          return { error: true, message: 'Failed to delete candidate from IndexedDB' };
        }
      }
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
      else if (method === 'POST') {
        try {
          // Create a new assessment
          console.log('Creating new assessment in IndexedDB:', options.body);
          const assessmentData = JSON.parse(options.body);
          
          // Generate an ID if none is provided
          if (!assessmentData.id) {
            const highestId = await db.assessments.orderBy('id').reverse().limit(1).first();
            assessmentData.id = highestId ? highestId.id + 1 : 1;
          }
          
          // Add created timestamp
          if (!assessmentData.createdAt) {
            assessmentData.createdAt = new Date().toISOString();
          }
          
          // Ensure questions is an array
          if (!assessmentData.questions) {
            assessmentData.questions = [];
          }
          
          console.log('Saving assessment to IndexedDB:', assessmentData);
          const newId = await db.assessments.put(assessmentData);
          const newAssessment = await db.assessments.get(newId);
          console.log('Assessment created in IndexedDB with ID:', newId);
          return newAssessment;
        } catch (createError) {
          console.error('Error creating assessment in IndexedDB:', createError);
          return { error: true, message: 'Failed to create assessment in IndexedDB' };
        }
      }
      else if (method === 'PUT') {
        try {
          // Update existing assessment
          if (!id) {
            return { error: true, message: 'Assessment ID is required for updates' };
          }
          
          console.log(`Updating assessment ${id} in IndexedDB`);
          const assessmentData = JSON.parse(options.body);
          
          // Ensure the ID in the data matches the URL
          assessmentData.id = id;
          
          // Check if the assessment exists
          const existingAssessment = await db.assessments.get(id);
          if (!existingAssessment) {
            return { error: true, message: 'Assessment not found' };
          }
          
          // Ensure questions is an array
          if (!assessmentData.questions) {
            assessmentData.questions = [];
          }
          
          console.log('Updating assessment in IndexedDB:', assessmentData);
          await db.assessments.put(assessmentData);
          const updatedAssessment = await db.assessments.get(id);
          console.log('Assessment updated in IndexedDB');
          return updatedAssessment;
        } catch (updateError) {
          console.error(`Error updating assessment ${id} in IndexedDB:`, updateError);
          return { error: true, message: 'Failed to update assessment in IndexedDB' };
        }
      }
      else if (method === 'DELETE') {
        try {
          // Delete assessment
          if (!id) {
            return { error: true, message: 'Assessment ID is required for deletion' };
          }
          
          console.log(`Deleting assessment ${id} from IndexedDB`);
          
          // Check if the assessment exists
          const existingAssessment = await db.assessments.get(id);
          if (!existingAssessment) {
            return { error: true, message: 'Assessment not found' };
          }
          
          await db.assessments.delete(id);
          console.log(`Assessment ${id} deleted from IndexedDB`);
          return { success: true };
        } catch (deleteError) {
          console.error(`Error deleting assessment ${id} from IndexedDB:`, deleteError);
          return { error: true, message: 'Failed to delete assessment from IndexedDB' };
        }
      }
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
    else if (path.length >= 3 && path[0] === 'candidates' && path[2] === 'assessment') {
      // Handle candidate assessment endpoints: /candidates/{candidateId}/assessment/{assessmentId}
      const candidateId = parseInt(path[1], 10);
      const assessmentId = path.length >= 4 ? parseInt(path[3], 10) : null;
      
      console.log(`Handling candidate assessment: candidateId=${candidateId}, assessmentId=${assessmentId}, method=${method}`);
      
      if (method === 'GET') {
        try {
          // Get a candidate's assessment result
          if (!candidateId) {
            return { error: true, message: 'Candidate ID is required' };
          }
          
          if (assessmentId) {
            // Get a specific assessment result for this candidate
            const result = await db.candidateAssessments
              .where(['candidateId', 'assessmentId'])
              .equals([candidateId, assessmentId])
              .first();
            
            if (result) {
              console.log(`Found assessment result for candidate ${candidateId}, assessment ${assessmentId}`);
              return result;
            } else {
              console.log(`No assessment result found for candidate ${candidateId}, assessment ${assessmentId}`);
              return { 
                candidateId, 
                assessmentId,
                completed: false, 
                score: 0,
                answers: []
              };
            }
          } else {
            // Get all assessment results for this candidate
            const results = await db.candidateAssessments
              .where('candidateId')
              .equals(candidateId)
              .toArray();
            
            console.log(`Found ${results.length} assessment results for candidate ${candidateId}`);
            return results;
          }
        } catch (getError) {
          console.error(`Error getting assessment results for candidate ${candidateId}:`, getError);
          return [];
        }
      }
      else if (method === 'POST' || method === 'PUT') {
        try {
          // Submit or update assessment results
          if (!candidateId || !assessmentId) {
            return { error: true, message: 'Both candidate ID and assessment ID are required' };
          }
          
          const resultData = JSON.parse(options.body);
          
          // Ensure the IDs match the URL parameters
          resultData.candidateId = candidateId;
          resultData.assessmentId = assessmentId;
          
          // Add timestamp if not present
          if (!resultData.submittedAt) {
            resultData.submittedAt = new Date().toISOString();
          }
          
          // Set completed flag if not present
          if (resultData.completed === undefined) {
            resultData.completed = true;
          }
          
          console.log(`Saving assessment result for candidate ${candidateId}, assessment ${assessmentId}:`, resultData);
          
          // Use compound key of candidateId and assessmentId
          await db.candidateAssessments.put(resultData);
          
          // Add a timeline entry for assessment completion if not already exists
          if (resultData.completed) {
            const existingEntry = await db.candidateTimeline
              .where({
                candidateId,
                type: 'assessment_completed',
                assessmentId
              })
              .first();
              
            if (!existingEntry) {
              // Get assessment details for the timeline entry
              const assessment = await db.assessments.get(assessmentId);
              const assessmentTitle = assessment ? assessment.title : 'Assessment';
              
              const timelineEntry = {
                id: Date.now(), // Use timestamp as unique ID
                candidateId,
                type: 'assessment_completed',
                assessmentId,
                date: resultData.submittedAt,
                note: `Completed "${assessmentTitle}" assessment with score: ${resultData.score || 0}%`,
                data: {
                  assessmentId,
                  score: resultData.score || 0
                }
              };
              
              await db.candidateTimeline.add(timelineEntry);
              console.log(`Added timeline entry for assessment completion:`, timelineEntry);
            }
          }
          
          const savedResult = await db.candidateAssessments
            .where(['candidateId', 'assessmentId'])
            .equals([candidateId, assessmentId])
            .first();
            
          console.log(`Assessment result saved for candidate ${candidateId}, assessment ${assessmentId}`);
          return savedResult;
        } catch (saveError) {
          console.error(`Error saving assessment result for candidate ${candidateId}, assessment ${assessmentId}:`, saveError);
          return { error: true, message: 'Failed to save assessment result' };
        }
      }
      else if (method === 'DELETE') {
        try {
          // Delete assessment result
          if (!candidateId || !assessmentId) {
            return { error: true, message: 'Both candidate ID and assessment ID are required' };
          }
          
          console.log(`Deleting assessment result for candidate ${candidateId}, assessment ${assessmentId}`);
          
          // Delete the assessment result
          await db.candidateAssessments
            .where(['candidateId', 'assessmentId'])
            .equals([candidateId, assessmentId])
            .delete();
            
          // Also remove any related timeline entries
          await db.candidateTimeline
            .where({
              candidateId,
              type: 'assessment_completed',
              assessmentId
            })
            .delete();
            
          console.log(`Assessment result deleted for candidate ${candidateId}, assessment ${assessmentId}`);
          return { success: true };
        } catch (deleteError) {
          console.error(`Error deleting assessment result for candidate ${candidateId}, assessment ${assessmentId}:`, deleteError);
          return { error: true, message: 'Failed to delete assessment result' };
        }
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
      // Try to extract IDs from the endpoint path
      const pathParts = endpoint.split('/').filter(p => p);
      const candidateIdIndex = pathParts.indexOf('candidates') + 1;
      const assessmentIdIndex = pathParts.indexOf('assessment') + 1;
      
      const candidateId = candidateIdIndex < pathParts.length ? parseInt(pathParts[candidateIdIndex], 10) : 0;
      const assessmentId = assessmentIdIndex < pathParts.length ? parseInt(pathParts[assessmentIdIndex], 10) : 0;
      
      return { 
        candidateId, 
        assessmentId,
        completed: false, 
        score: 0,
        answers: []
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
  },
  
  // Candidate Assessment functions
  getCandidateAssessment: async (candidateId, assessmentId) => {
    try {
      const result = await apiCall(`/candidates/${candidateId}/assessment/${assessmentId}`);
      if (!result || result.error) {
        console.error(`Failed to fetch assessment ${assessmentId} for candidate ${candidateId}:`, result?.message || 'Unknown error');
        return { 
          candidateId, 
          assessmentId,
          completed: false, 
          score: 0,
          answers: []
        };
      }
      return result;
    } catch (error) {
      console.error(`Error fetching assessment ${assessmentId} for candidate ${candidateId}:`, error);
      return { 
        candidateId, 
        assessmentId,
        completed: false, 
        score: 0,
        answers: []
      };
    }
  },
  
  getCandidateAssessments: async (candidateId) => {
    try {
      const results = await apiCall(`/candidates/${candidateId}/assessment`);
      
      // Handle error case
      if (!results || results.error) {
        console.error(`Failed to fetch assessments for candidate ${candidateId}:`, results?.message || 'Unknown error');
        return [];
      }
      
      // Ensure we always return an array
      if (Array.isArray(results)) {
        return results;
      } else if (results.data && Array.isArray(results.data)) {
        return results.data;
      } else {
        console.warn(`Unexpected candidate assessments response format for candidate ${candidateId}:`, results);
        return [];
      }
    } catch (error) {
      console.error(`Error fetching assessments for candidate ${candidateId}:`, error);
      return [];
    }
  },
  
  submitCandidateAssessment: async (candidateId, assessmentId, data) => {
    try {
      const result = await apiCall(`/candidates/${candidateId}/assessment/${assessmentId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (result && result.error) {
        console.error(`Failed to submit assessment ${assessmentId} for candidate ${candidateId}:`, result.message);
        return null;
      }
      return result;
    } catch (error) {
      console.error(`Error submitting assessment ${assessmentId} for candidate ${candidateId}:`, error);
      return null;
    }
  },
  
  updateCandidateAssessment: async (candidateId, assessmentId, data) => {
    try {
      const result = await apiCall(`/candidates/${candidateId}/assessment/${assessmentId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (result && result.error) {
        console.error(`Failed to update assessment ${assessmentId} for candidate ${candidateId}:`, result.message);
        return null;
      }
      return result;
    } catch (error) {
      console.error(`Error updating assessment ${assessmentId} for candidate ${candidateId}:`, error);
      return null;
    }
  },
  
  deleteCandidateAssessment: async (candidateId, assessmentId) => {
    try {
      const result = await apiCall(`/candidates/${candidateId}/assessment/${assessmentId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' }
      });
      if (result && result.error) {
        console.error(`Failed to delete assessment ${assessmentId} for candidate ${candidateId}:`, result.message);
        return false;
      }
      return true;
    } catch (error) {
      console.error(`Error deleting assessment ${assessmentId} for candidate ${candidateId}:`, error);
      return false;
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