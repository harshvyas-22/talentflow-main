import { http, HttpResponse } from 'msw'
import { setupWorker } from 'msw/browser' // Import setupWorker from msw/browser
import { db } from './database'
import { seedJobs, seedCandidates } from '../data/seedData'

// Create a fallback handler for when database operations fail
const fallbackHandler = (data) => {
  return http.get('/api/*', () => {
    console.log('Using fallback data handler for API requests');
    return HttpResponse.json(data || { message: 'No data available' });
  });
};

// Update the latency function at the top
const addLatency = () => new Promise(resolve => 
  // Reduce latency to 50-150ms for better drag and drop experience
  // setTimeout(resolve, Math.random() * 100 +50)
  setTimeout(resolve, 10)
);

const shouldError = () => Math.random() < 0.05; // 5% error rate

// Define seedAssessments with sample data
const seedAssessments = [
  {
    id: 1,
    title: "Frontend Developer Assessment",
    candidateId: 1,
    questions: [
      {
        id: 1,
        type: "multiple_choice",
        text: "Which of the following is NOT a JavaScript framework or library?",
        options: ["React", "Vue", "Angular", "Jakarta"],
        correctAnswer: "Jakarta"
      },
      {
        id: 2,
        type: "text",
        text: "Explain the concept of closures in JavaScript."
      }
    ],
    createdAt: new Date().toISOString()
  },
  {
    id: 2,
    title: "Backend Developer Assessment",
    candidateId: 2,
    questions: [
      {
        id: 1,
        type: "multiple_choice",
        text: "Which of these is NOT a common database system?",
        options: ["MongoDB", "PostgreSQL", "MySQL", "WebSQL"],
        correctAnswer: "WebSQL"
      },
      {
        id: 2,
        type: "text",
        text: "Explain the difference between SQL and NoSQL databases."
      }
    ],
    createdAt: new Date().toISOString()
  },
  {
    id: 3,
    title: "Full Stack Developer Assessment",
    candidateId: 3,
    questions: [
      {
        id: 1,
        type: "multiple_choice",
        text: "What is the main benefit of server-side rendering?",
        options: ["Better SEO", "Faster runtime performance", "Smaller bundle size", "Simplified code"],
        correctAnswer: "Better SEO"
      },
      {
        id: 2,
        type: "text",
        text: "Describe how you would design a full-stack application architecture."
      }
    ],
    createdAt: new Date().toISOString()
  }
];

// Make sure all handlers have proper Content-Type headers
export const handlers = [
  // Jobs endpoints
  http.get('/api/jobs', async ({ request }) => {
    await addLatency();
    
    // Get URL parameters
    const url = new URL(request.url);
    const status = url.searchParams.get('status') || '';
    
    // For debugging
    console.log('GET /api/jobs handler called with params:', { status });
    
    try {
      // Get jobs and sort by order
      const jobs = await db.jobs.toArray();
      
      // Log available statuses for debugging
      console.log('Available job statuses in database:', [...new Set(jobs.map(job => job.status))]);
      
      // Filter by status if provided
      let filteredJobs = jobs;
      if (status) {
        console.log(`Filtering jobs by status: ${status}`);
        filteredJobs = jobs.filter(job => job.status === status);
        console.log(`Found ${filteredJobs.length} jobs with status ${status}`);
      }
      
      // Ensure all jobs have an order property
      const sortedJobs = filteredJobs.map((job, index) => ({
        ...job,
        order: job.order || index + 1
      })).sort((a, b) => a.order - b.order);
      
      console.log('Jobs to return (sorted and filtered):', sortedJobs);
      
      return HttpResponse.json(sortedJobs, { 
        headers: { 'Content-Type': 'application/json' }
      });
    } catch (error) {
      console.error('Error fetching jobs:', error);
      return new HttpResponse(
        JSON.stringify({ error: 'Failed to fetch jobs' }), 
        { 
          status: 500, 
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }
  }),

  // Add or update the GET /api/jobs/:id handler
  http.get('/api/jobs/:id', async ({ params }) => {
    await addLatency();
    
    try {
      const id = parseInt(params.id);
      
      // Get job from the database
      const job = await db.jobs.get(id);
      
      if (!job) {
        return new HttpResponse(
          JSON.stringify({ error: 'Job not found' }), 
          { 
            status: 404,
            headers: { 'Content-Type': 'application/json' } 
          }
        );
      }
      
      // Ensure createdAt is a valid date
      if (!job.createdAt || isNaN(new Date(job.createdAt).getTime())) {
        job.createdAt = new Date().toISOString();
      }
      
      // Ensure requirements is an array
      if (!Array.isArray(job.requirements)) {
        job.requirements = [];
      }
      
      return HttpResponse.json(job, { 
        headers: { 'Content-Type': 'application/json' }
      });
    } catch (error) {
      console.error('Error in GET /api/jobs/:id:', error);
      return new HttpResponse(
        JSON.stringify({ error: 'Server error' }), 
        { 
          status: 500,
          headers: { 'Content-Type': 'application/json' } 
        }
      );
    }
  }),

  // Add these handlers to make sure both with and without /api are handled
  http.get('/jobs', async ({ request }) => {
    console.log('GET /jobs handler called (without /api)');
    
    // Get URL parameters
    const url = new URL(request.url);
    const status = url.searchParams.get('status') || '';
    
    console.log('GET /jobs handler params:', { status });
    
    // Forward to the /api/jobs handler but with sorting and filtering
    const jobs = await db.jobs.toArray();
    
    // Filter by status if provided
    let filteredJobs = jobs;
    if (status) {
      console.log(`Filtering jobs by status: ${status}`);
      filteredJobs = jobs.filter(job => job.status === status);
    }
    
    // Ensure all jobs have an order property
    const sortedJobs = filteredJobs.map((job, index) => ({
      ...job,
      order: job.order || index + 1
    })).sort((a, b) => a.order - b.order);
    
    return HttpResponse.json(sortedJobs, { 
      headers: { 'Content-Type': 'application/json' }
    });
  }),

  // Candidates endpoints
  http.get('/api/candidates', async ({ request }) => {
    await addLatency();
    
    const url = new URL(request.url);
    const search = url.searchParams.get('search') || '';
    const stage = url.searchParams.get('stage') || '';
    const page = parseInt(url.searchParams.get('page') || '1');
    const pageSize = parseInt(url.searchParams.get('pageSize') || '10');
    const all = url.searchParams.get('all') === 'true';
    
    console.log('GET /api/candidates params:', { search, stage, page, pageSize, all });
    
    try {
      let query = db.candidates.orderBy('createdAt').reverse();
      
      const allCandidates = await query.toArray();
      
      // Log stage values for debugging
      console.log('Available stages in database:', [...new Set(allCandidates.map(c => c.stage))]);
      
      let filteredCandidates = allCandidates;
      
      // Apply stage filter if provided
      if (stage) {
        console.log(`Filtering by stage: "${stage}"`);
        filteredCandidates = filteredCandidates.filter(candidate => {
          const matches = candidate.stage === stage;
          if (!matches) {
            console.log(`Candidate ${candidate.id} has stage "${candidate.stage}", doesn't match "${stage}"`);
          }
          return matches;
        });
        console.log(`Found ${filteredCandidates.length} candidates with stage "${stage}"`);
      }
      
      // Apply search filter if provided
      if (search) {
        filteredCandidates = filteredCandidates.filter(candidate => 
          candidate.name.toLowerCase().includes(search.toLowerCase()) ||
          candidate.email.toLowerCase().includes(search.toLowerCase())
        );
      }
      
      const total = filteredCandidates.length;
      
      // Pagination logic - different approach for all=true vs regular pagination
      let candidates;
      if (all) {
        // Return all candidates without pagination when all=true
        candidates = filteredCandidates;
      } else {
        // Apply pagination
        candidates = filteredCandidates.slice((page - 1) * pageSize, page * pageSize);
      }
      
      console.log(`Returning ${candidates.length} candidates (total: ${total}, page: ${page}, pageSize: ${pageSize})`);
      
      return HttpResponse.json(
        { candidates, total, page, pageSize },
        { headers: { 'Content-Type': 'application/json' } }
      );
    } catch (error) {
      console.error('Error fetching candidates:', error);
      return new HttpResponse(
        JSON.stringify({ error: 'Failed to fetch candidates' }), 
        { 
          status: 500,
          headers: { 'Content-Type': 'application/json' } 
        }
      );
    }
  }),

  http.post('/api/candidates', async ({ request }) => {
    await addLatency();
    
    try {
      const candidateData = await request.json();
      
      // Generate ID if not provided
      const id = Date.now();
      
      const candidate = {
        id,
        ...candidateData,
        createdAt: new Date().toISOString()
      };
      
      // Add to database
      await db.candidates.add(candidate);
      
      // Return the created candidate
      return HttpResponse.json(candidate, { 
        status: 201,
        headers: { 'Content-Type': 'application/json' }
      });
    } catch (error) {
      console.error('Error creating candidate:', error);
      return new HttpResponse(
        JSON.stringify({ error: 'Failed to create candidate' }), 
        { 
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }
  }),

  http.get('/api/candidates/:id', async ({ params }) => {
    await addLatency();
    
    const { id } = params;
    try {
      // Ensure the ID is properly parsed
      const candidateId = parseInt(id);
      
      // Get the candidate from the database
      const candidate = await db.candidates.get(candidateId);
      
      if (!candidate) {
        return new HttpResponse(
          JSON.stringify({ error: 'Candidate not found' }), 
          { status: 404, headers: { 'Content-Type': 'application/json' } }
        );
      }
      
      return HttpResponse.json(candidate, { 
        headers: { 'Content-Type': 'application/json' }
      });
    } catch (error) {
      console.error('Error fetching candidate:', error);
      return new HttpResponse(
        JSON.stringify({ error: 'Failed to fetch candidate' }), 
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }
  }),

  http.patch('/api/candidates/:id', async ({ request, params }) => {
    await addLatency();
    
    try {
      const { id } = params;
      const updates = await request.json();
      
      // Ensure the ID is properly parsed
      const candidateId = parseInt(id);
      
      // Update the candidate
      await db.candidates.update(candidateId, updates);
      
      // Add timeline entry for stage changes
      if (updates.stage) {
        const timelineEntry = {
          id: Date.now(),
          candidateId,
          stage: updates.stage,
          timestamp: new Date().toISOString(),
          notes: updates.rejectionReason || `Moved to ${updates.stage}`
        };
        
        await db.candidateTimeline.add(timelineEntry);
        console.log(`Added timeline entry for candidate ${candidateId} stage change:`, timelineEntry);
      }
      
      // Fetch and return the updated candidate
      const candidate = await db.candidates.get(candidateId);
      if (!candidate) {
        return new HttpResponse(
          JSON.stringify({ error: 'Candidate not found' }), 
          { status: 404, headers: { 'Content-Type': 'application/json' } }
        );
      }
      
      return HttpResponse.json(candidate, { 
        headers: { 'Content-Type': 'application/json' }
      });
    } catch (error) {
      console.error('Error updating candidate:', error);
      return new HttpResponse(
        JSON.stringify({ error: 'Failed to update candidate' }), 
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }
  }),

  // Handler for updating candidate skills
  http.put('/api/candidates/:id/skills', async ({ request, params }) => {
    await addLatency();
    
    try {
      const { id } = params;
      const { skills } = await request.json();
      
      // Ensure the ID is properly parsed
      const candidateId = parseInt(id);
      
      // Get the current candidate
      const candidate = await db.candidates.get(candidateId);
      if (!candidate) {
        return new HttpResponse(JSON.stringify({ error: 'Candidate not found' }), { 
          status: 404, 
          headers: { 'Content-Type': 'application/json' } 
        });
      }
      
      // Update only the skills
      await db.candidates.update(candidateId, { skills });
      
      // Return the updated candidate
      const updatedCandidate = await db.candidates.get(candidateId);
      return HttpResponse.json(updatedCandidate);
    } catch (err) {
      console.error('Error updating candidate skills:', err);
      return new HttpResponse(
        JSON.stringify({ error: 'Failed to update candidate skills' }), 
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }
  }),

  http.post('/api/candidates/:candidateId/notes', async ({ params, request }) => {
    await addLatency();
    const candidateId = parseInt(params.candidateId);
    
    try {
      const data = await request.json();
      const { note } = data;
      
      // Get the candidate
      const candidate = await db.candidates.get(candidateId);
      if (!candidate) {
        return new HttpResponse(
          JSON.stringify({ error: 'Candidate not found' }), 
          { 
            status: 404,
            headers: { 'Content-Type': 'application/json' } 
          }
        );
      }
      
      // Create a timeline entry for the note
      const timelineEntry = {
        id: Date.now(),
        candidateId,
        stage: candidate.stage,
        timestamp: new Date().toISOString(),
        notes: note
      };
      
      // Add to timeline collection
      await db.candidateTimeline.add(timelineEntry);
      
      return HttpResponse.json(timelineEntry, { 
        headers: { 'Content-Type': 'application/json' }
      });
    } catch (error) {
      console.error('Error adding note:', error);
      return new HttpResponse(
        JSON.stringify({ error: 'Failed to add note' }), 
        { 
          status: 500,
          headers: { 'Content-Type': 'application/json' } 
        }
      );
    }
  }),

  http.delete('/api/candidates/:candidateId/notes/:noteId', async ({ params }) => {
    await addLatency();
    const candidateId = parseInt(params.candidateId);
    const noteId = parseInt(params.noteId);
    
    try {
      // Get the candidate
      const candidate = await db.candidates.get(candidateId);
      if (!candidate) {
        return new HttpResponse(
          JSON.stringify({ error: 'Candidate not found' }), 
          { 
            status: 404,
            headers: { 'Content-Type': 'application/json' } 
          }
        );
      }
      
      // Find the timeline entry for the note
      const timelineEntry = await db.candidateTimeline.get(noteId);
      
      if (!timelineEntry || timelineEntry.candidateId !== candidateId) {
        return new HttpResponse(
          JSON.stringify({ error: 'Note not found' }), 
          { 
            status: 404,
            headers: { 'Content-Type': 'application/json' } 
          }
        );
      }
      
      // Delete the timeline entry
      await db.candidateTimeline.delete(noteId);
      
      return HttpResponse.json({ success: true, id: noteId }, { 
        headers: { 'Content-Type': 'application/json' }
      });
    } catch (error) {
      console.error('Error deleting note:', error);
      return new HttpResponse(
        JSON.stringify({ error: 'Failed to delete note' }), 
        { 
          status: 500,
          headers: { 'Content-Type': 'application/json' } 
        }
      );
    }
  }),

  http.post('/api/candidates/:candidateId/interviews', async ({ params, request }) => {
    await addLatency();
    const candidateId = parseInt(params.candidateId);
    
    try {
      const data = await request.json();
      const { scheduledTime } = data;
      
      // Get the candidate
      const candidate = await db.candidates.get(candidateId);
      if (!candidate) {
        return new HttpResponse(
          JSON.stringify({ error: 'Candidate not found' }), 
          { 
            status: 404,
            headers: { 'Content-Type': 'application/json' } 
          }
        );
      }
      
      // Create a timeline entry for the interview
      const timelineEntry = {
        id: Date.now(),
        candidateId,
        stage: candidate.stage,
        timestamp: new Date().toISOString(),
        notes: `Interview scheduled for ${new Date(scheduledTime).toLocaleString()}`,
        interviewTime: scheduledTime
      };
      
      // Add to timeline collection
      await db.candidateTimeline.add(timelineEntry);
      
      return HttpResponse.json(timelineEntry, { 
        headers: { 'Content-Type': 'application/json' }
      });
    } catch (error) {
      console.error('Error scheduling interview:', error);
      return new HttpResponse(
        JSON.stringify({ error: 'Failed to schedule interview' }), 
        { 
          status: 500,
          headers: { 'Content-Type': 'application/json' } 
        }
      );
    }
  }),

  http.get('/api/candidates/:id/timeline', async ({ params }) => {
    await addLatency();
    
    const { id } = params;
    try {
      // Parse id to integer for proper comparison
      const candidateId = parseInt(id);
      
      // Make sure we're filtering by candidateId
      let timeline = await db.candidateTimeline
        .where('candidateId')
        .equals(candidateId)
        .toArray();
      
      // Filter out any objects that don't look like proper timeline entries
      // Timeline entries must have timestamp and either notes or stage change
      timeline = timeline.filter(entry => 
        entry && 
        typeof entry === 'object' && 
        entry.timestamp && 
        (entry.notes || entry.stage) &&
        entry.candidateId === candidateId
      );
      
      // Log for debugging
      console.log(`Found ${timeline.length} valid timeline entries for candidate ${candidateId}`);
      
      // Sort manually since IndexedDB doesn't support orderBy
      timeline.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      
      return HttpResponse.json(timeline, { 
        headers: { 'Content-Type': 'application/json' }
      });
    } catch (error) {
      console.error('Timeline error:', error);
      return new HttpResponse(
        JSON.stringify({ error: 'Failed to fetch timeline' }), 
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }
  }),

  // Add handlers for candidates without /api prefix
  http.get('/candidates', async ({ request }) => {
    console.log('GET /candidates handler called (without /api)');
    
    const url = new URL(request.url);
    const search = url.searchParams.get('search') || '';
    const stage = url.searchParams.get('stage') || '';
    const page = parseInt(url.searchParams.get('page') || '1');
    const pageSize = parseInt(url.searchParams.get('pageSize') || '50');
    
    try {
      let query = db.candidates.orderBy('createdAt');
      
      if (stage) {
        query = query.filter(candidate => candidate.stage === stage);
      }
      
      const allCandidates = await query.toArray();
      
      const filteredCandidates = search 
        ? allCandidates.filter(candidate => 
            candidate.name.toLowerCase().includes(search.toLowerCase()) ||
            candidate.email.toLowerCase().includes(search.toLowerCase())
          )
        : allCandidates;
      
      const total = filteredCandidates.length;
      const candidates = filteredCandidates.slice((page - 1) * pageSize, page * pageSize);
      
      return HttpResponse.json(
        { candidates, total, page, pageSize },
        { headers: { 'Content-Type': 'application/json' } }
      );
    } catch (error) {
      console.error('Error fetching candidates:', error);
      return new HttpResponse(
        JSON.stringify({ error: 'Failed to fetch candidates' }), 
        { 
          status: 500,
          headers: { 'Content-Type': 'application/json' } 
        }
      );
    }
  }),

  http.post('/candidates', async ({ request }) => {
    console.log('POST /candidates handler called (without /api)');
    
    try {
      const candidateData = await request.json();
      
      // Generate ID if not provided
      const id = Date.now();
      
      const candidate = {
        id,
        ...candidateData,
        createdAt: new Date().toISOString()
      };
      
      // Add to database
      await db.candidates.add(candidate);
      
      // Return the created candidate
      return HttpResponse.json(candidate, { 
        status: 201,
        headers: { 'Content-Type': 'application/json' }
      });
    } catch (error) {
      console.error('Error creating candidate:', error);
      return new HttpResponse(
        JSON.stringify({ error: 'Failed to create candidate' }), 
        { 
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }
  }),

  // Assessments endpoints
  http.get('/api/assessments', async () => {
    await addLatency();
    try {
      const assessments = await db.assessments.toArray();
      return HttpResponse.json(assessments, { 
        headers: { 'Content-Type': 'application/json' }
      });
    } catch (error) {
      console.error('Error fetching assessments:', error);
      return new HttpResponse(
        JSON.stringify({ error: 'Failed to fetch assessments' }), 
        { 
          status: 500, 
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }
  }),

  // Get assessment by ID
  http.get('/api/assessments/:id', async ({ params }) => {
    await addLatency();
    
    try {
      const id = parseInt(params.id);
      console.log(`Looking for assessment with ID: ${id}`);
      const assessment = await db.assessments.get(id);
      
      if (!assessment) {
        // Check if this is a candidate ID and try to find an assessment for this candidate
        console.log(`Assessment not found with ID ${id}, checking for candidateId match`);
        const assessmentForCandidate = await db.assessments
          .where('candidateId')
          .equals(id)
          .first();
          
        if (assessmentForCandidate) {
          console.log(`Found assessment for candidate ${id}:`, assessmentForCandidate);
          return HttpResponse.json(assessmentForCandidate, { 
            headers: { 'Content-Type': 'application/json' }
          });
        }
        
        console.log(`No assessment found for candidate ${id}`);
        return new HttpResponse(
          JSON.stringify({ error: 'Assessment not found' }), 
          { 
            status: 404,
            headers: { 'Content-Type': 'application/json' } 
          }
        );
      }
      
      console.log(`Found assessment with ID ${id}:`, assessment);
      return HttpResponse.json(assessment, { 
        headers: { 'Content-Type': 'application/json' }
      });
    } catch (error) {
      console.error('Error fetching assessment:', error);
      return new HttpResponse(
        JSON.stringify({ error: 'Failed to fetch assessment' }), 
        { 
          status: 500, 
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }
  }),

  // Add specific endpoint to get assessment by candidate ID
  http.get('/api/candidates/:id/assessment', async ({ params }) => {
    await addLatency();
    
    try {
      const candidateId = parseInt(params.id);
      console.log(`Looking for assessment for candidate ID: ${candidateId}`);
      
      // Use the where clause with the correct index
      const assessment = await db.assessments
        .where('candidateId')
        .equals(candidateId)
        .first();
      
      if (!assessment) {
        console.log(`No assessment found for candidate ${candidateId}`);
        return new HttpResponse(
          JSON.stringify({ error: 'No assessment found for this candidate' }), 
          { 
            status: 404,
            headers: { 'Content-Type': 'application/json' } 
          }
        );
      }
      
      console.log(`Found assessment for candidate ${candidateId}:`, assessment);
      return HttpResponse.json(assessment, { 
        headers: { 'Content-Type': 'application/json' }
      });
    } catch (error) {
      console.error('Error fetching assessment for candidate:', error);
      return new HttpResponse(
        JSON.stringify({ error: 'Failed to fetch assessment' }), 
        { 
          status: 500, 
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }
  }),

  http.post('/api/assessments', async ({ request }) => {
    await addLatency();
    
    try {
      const assessmentData = await request.json();
      
      // Generate ID if not provided
      const id = Date.now();
      
      const assessment = {
        id,
        ...assessmentData,
        createdAt: new Date().toISOString()
      };
      
      // Add to database
      await db.assessments.add(assessment);
      
      // Return the created assessment
      return HttpResponse.json(assessment, { 
        status: 201,
        headers: { 'Content-Type': 'application/json' }
      });
    } catch (error) {
      console.error('Error creating assessment:', error);
      return new HttpResponse(
        JSON.stringify({ error: 'Failed to create assessment' }), 
        { 
          status: 500, 
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }
  }),

  // Update assessment
  http.put('/api/assessments/:id', async ({ request, params }) => {
    await addLatency();
    
    try {
      const id = parseInt(params.id);
      const updates = await request.json();
      
      // Check if assessment exists
      const existingAssessment = await db.assessments.get(id);
      if (!existingAssessment) {
        return new HttpResponse(
          JSON.stringify({ error: 'Assessment not found' }), 
          { 
            status: 404, 
            headers: { 'Content-Type': 'application/json' }
          }
        );
      }
      
      // Update the assessment
      const updatedAssessment = {
        ...existingAssessment,
        ...updates,
        id, // Ensure ID doesn't change
        updatedAt: new Date().toISOString()
      };
      
      await db.assessments.update(id, updatedAssessment);
      
      return HttpResponse.json(updatedAssessment, { 
        headers: { 'Content-Type': 'application/json' }
      });
    } catch (error) {
      console.error('Error updating assessment:', error);
      return new HttpResponse(
        JSON.stringify({ error: 'Failed to update assessment' }), 
        { 
          status: 500, 
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }
  }),

  // Delete assessment
  http.delete('/api/assessments/:id', async ({ params }) => {
    await addLatency();
    
    try {
      const id = parseInt(params.id);
      
      // Check if assessment exists
      const existingAssessment = await db.assessments.get(id);
      if (!existingAssessment) {
        return new HttpResponse(
          JSON.stringify({ error: 'Assessment not found' }), 
          { 
            status: 404, 
            headers: { 'Content-Type': 'application/json' }
          }
        );
      }
      
      // Delete the assessment
      await db.assessments.delete(id);
      
      // Delete related responses
      await db.assessmentResponses.where('assessmentId').equals(id).delete();
      
      return new HttpResponse(null, { 
        status: 204,
        headers: { 'Content-Type': 'application/json' }
      });
    } catch (error) {
      console.error('Error deleting assessment:', error);
      return new HttpResponse(
        JSON.stringify({ error: 'Failed to delete assessment' }), 
        { 
          status: 500, 
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }
  }),

  // Get assessment responses
  http.get('/api/assessments/:id/responses', async ({ params }) => {
    await addLatency();
    
    try {
      const assessmentId = parseInt(params.id);
      
      // Check if assessment exists
      const assessment = await db.assessments.get(assessmentId);
      if (!assessment) {
        return new HttpResponse(
          JSON.stringify({ error: 'Assessment not found' }), 
          { 
            status: 404, 
            headers: { 'Content-Type': 'application/json' }
          }
        );
      }
      
      // Get responses for this assessment
      const responses = await db.assessmentResponses
        .where('assessmentId')
        .equals(assessmentId)
        .toArray();
      
      return HttpResponse.json(responses, { 
        headers: { 'Content-Type': 'application/json' }
      });
    } catch (error) {
      console.error('Error fetching assessment responses:', error);
      return new HttpResponse(
        JSON.stringify({ error: 'Failed to fetch assessment responses' }), 
        { 
          status: 500, 
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }
  }),

  // Get specific assessment response
  http.get('/api/assessments/:assessmentId/responses/:responseId', async ({ params }) => {
    await addLatency();
    
    try {
      const assessmentId = parseInt(params.assessmentId);
      const responseId = parseInt(params.responseId);
      
      // Get the response
      const response = await db.assessmentResponses.get(responseId);
      
      if (!response || response.assessmentId !== assessmentId) {
        return new HttpResponse(
          JSON.stringify({ error: 'Assessment response not found' }), 
          { 
            status: 404, 
            headers: { 'Content-Type': 'application/json' }
          }
        );
      }
      
      return HttpResponse.json(response, { 
        headers: { 'Content-Type': 'application/json' }
      });
    } catch (error) {
      console.error('Error fetching assessment response:', error);
      return new HttpResponse(
        JSON.stringify({ error: 'Failed to fetch assessment response' }), 
        { 
          status: 500, 
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }
  }),

  // Submit assessment response
  http.post('/api/assessments/:id/responses', async ({ request, params }) => {
    await addLatency();
    
    try {
      const assessmentId = parseInt(params.id);
      const responseData = await request.json();
      
      // Check if assessment exists
      const assessment = await db.assessments.get(assessmentId);
      if (!assessment) {
        return new HttpResponse(
          JSON.stringify({ error: 'Assessment not found' }), 
          { 
            status: 404, 
            headers: { 'Content-Type': 'application/json' }
          }
        );
      }
      
      // Create response record
      const response = {
        id: Date.now(),
        assessmentId,
        ...responseData,
        createdAt: new Date().toISOString(),
        completed: true
      };
      
      // Add to database
      await db.assessmentResponses.add(response);
      
      return HttpResponse.json(response, { 
        status: 201,
        headers: { 'Content-Type': 'application/json' }
      });
    } catch (error) {
      console.error('Error submitting assessment response:', error);
      return new HttpResponse(
        JSON.stringify({ error: 'Failed to submit assessment response' }), 
        { 
          status: 500, 
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }
  }),

  http.get('/api/assessments/:id', async ({ params }) => {
    await addLatency();
    
    // Properly parse the ID
    const id = parseInt(params.id);
    
    try {
      // First try to get from the database
      let assessment = await db.assessments.get(id);
      
      // If not found, create a mock assessment
      if (!assessment) {
        assessment = {
          id,
          title: `Assessment #${id}`,
          questions: [
            { id: 1, text: 'Sample question', type: 'multiple_choice', options: ['A', 'B', 'C'] }
          ],
          createdAt: new Date().toISOString()
        };
      }
      
      return HttpResponse.json(assessment, {
        headers: { 'Content-Type': 'application/json' }
      });
    } catch (error) {
      console.error(`Error fetching assessment ${id}:`, error);
      return new HttpResponse(
        JSON.stringify({ error: 'Failed to fetch assessment' }), 
        { 
          status: 500,
          headers: { 'Content-Type': 'application/json' } 
        }
      );
    }
  }),

  // Add or update the DELETE job handler
  http.delete('/api/jobs/:id', async ({ params }) => {
    await addLatency();
    
    if (shouldError()) {
      return new HttpResponse(null, { status: 500 });
    }
    
    const id = parseInt(params.id);
    
    try {
      // First check if the job exists
      const job = await db.jobs.get(id);
      
      if (!job) {
        return new HttpResponse(null, { status: 404 });
      }
      
      // Delete the job
      await db.jobs.delete(id);
      
      return new HttpResponse(null, { 
        status: 204,
        headers: { 'Content-Type': 'application/json' }
      });
    } catch (error) {
      console.error(`Error deleting job ${id}:`, error);
      return new HttpResponse(
        JSON.stringify({ error: 'Failed to delete job' }), 
        { 
          status: 500,
          headers: { 'Content-Type': 'application/json' } 
        }
      );
    }
  }),

  // Add endpoint for reordering jobs
  http.patch('/api/jobs/:id/reorder', async ({ request, params }) => {
    await addLatency();
    
    try {
      const id = parseInt(params.id);
      const { fromOrder, toOrder } = await request.json();
      
      console.log(`Reordering job ${id} from position ${fromOrder} to ${toOrder}`);
      
      // Get all jobs and ensure they have order properties
      let jobs = await db.jobs.toArray();
      jobs = jobs.map((job, index) => ({
        ...job,
        order: job.order || index + 1
      })).sort((a, b) => a.order - b.order);
      
      // Get the job to reorder
      const jobIndex = jobs.findIndex(j => j.id === id);
      if (jobIndex === -1) {
        return new HttpResponse(
          JSON.stringify({ error: 'Job not found' }), 
          { 
            status: 404,
            headers: { 'Content-Type': 'application/json' } 
          }
        );
      }
      
      // Remove the job from the array
      const [movedJob] = jobs.splice(jobIndex, 1);
      
      // Insert it at the new position
      jobs.splice(toOrder - 1, 0, movedJob);
      
      // Update all job orders
      for (let i = 0; i < jobs.length; i++) {
        await db.jobs.update(jobs[i].id, { order: i + 1 });
      }
      
      console.log('Jobs reordered successfully');
      
      return HttpResponse.json({ success: true }, { 
        headers: { 'Content-Type': 'application/json' }
      });
    } catch (error) {
      console.error('Error in PATCH /api/jobs/:id/reorder:', error);
      return new HttpResponse(
        JSON.stringify({ error: 'Server error' }), 
        { 
          status: 500,
          headers: { 'Content-Type': 'application/json' } 
        }
      );
    }
  }),

  // Make sure you also have the PUT handler for updating jobs
  http.put('/api/jobs/:id', async ({ request, params }) => {
    await addLatency();
    
    try {
      const id = parseInt(params.id);
      const updatedJob = await request.json();
      
      // Validate the updated job data
      if (!updatedJob) {
        return new HttpResponse(
          JSON.stringify({ error: 'Invalid job data' }), 
          { 
            status: 400,
            headers: { 'Content-Type': 'application/json' } 
          }
        );
      }
      
      // Ensure the job exists
      const existingJob = await db.jobs.get(id);
      if (!existingJob) {
        return new HttpResponse(
          JSON.stringify({ error: 'Job not found' }), 
          { 
            status: 404,
            headers: { 'Content-Type': 'application/json' } 
          }
        );
      }
      
      // Preserve createdAt if not provided
      if (!updatedJob.createdAt) {
        updatedJob.createdAt = existingJob.createdAt || new Date().toISOString();
      }
      
      // Ensure requirements is an array
      if (!Array.isArray(updatedJob.requirements)) {
        updatedJob.requirements = Array.isArray(existingJob.requirements) 
          ? [...existingJob.requirements] 
          : [];
      }
      
      // Update the job in the database
      await db.jobs.update(id, updatedJob);
      
      // Get the updated job
      const savedJob = await db.jobs.get(id);
      
      return HttpResponse.json(savedJob, { 
        headers: { 'Content-Type': 'application/json' }
      });
    } catch (error) {
      console.error('Error in PUT /api/jobs/:id:', error);
      return new HttpResponse(
        JSON.stringify({ error: 'Server error' }), 
        { 
          status: 500,
          headers: { 'Content-Type': 'application/json' } 
        }
      );
    }
  }),
];

// Export the worker so it can be started in main.jsx
export const worker = setupWorker(...handlers);

// Set max listeners to avoid memory leak warnings
if (worker.events && typeof worker.events.setMaxListeners === 'function') {
  worker.events.setMaxListeners(100);
}

// Initialize the database with seed data
export async function initializeMockDb() {
  console.log('Initializing mock database...');
  
  try {
    // Check if database already has data
    const jobCount = await db.jobs.count();
    const candidateCount = await db.candidates.count();
    const assessmentCount = await db.assessments.count();
    
    console.log('Current database counts:', { jobCount, candidateCount, assessmentCount });
    
    // Only initialize if empty
    if (jobCount === 0) {
      // Add seed data with proper IDs and timestamps
      const jobsWithMetadata = seedJobs.map((job, index) => ({
        ...job,
        id: index + 1,
        createdAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
        status: job.status || 'open',
        order: index + 1 // Use 1-based indexing for order
      }));
      
      await db.jobs.bulkPut(jobsWithMetadata);
      console.log('Jobs table seeded');
    } else {
      // Ensure existing jobs have order properties
      const jobs = await db.jobs.toArray();
      const needsOrderUpdate = jobs.some(job => job.order === undefined);
      
      if (needsOrderUpdate) {
        console.log('Updating order properties for existing jobs');
        const sortedJobs = [...jobs].sort((a, b) => a.id - b.id);
        
        for (let i = 0; i < sortedJobs.length; i++) {
          await db.jobs.update(sortedJobs[i].id, { 
            order: sortedJobs[i].order || i + 1 
          });
        }
      }
    }
    
    if (candidateCount === 0) {
      const candidatesWithMetadata = seedCandidates.map((candidate, index) => ({
        ...candidate,
        id: index + 1,
        createdAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString()
      }));
      
      await db.candidates.bulkPut(candidatesWithMetadata);
      console.log('Candidates table seeded');
    }
    
    // Always ensure we have assessments data
    if (assessmentCount === 0 && seedAssessments.length > 0) {
      console.log('Seeding assessments table with data:', seedAssessments);
      
      // Clear any existing assessments first
      await db.assessments.clear();
      
      // Add the seed data with proper metadata
      await db.assessments.bulkAdd(seedAssessments);
      
      console.log('Assessments table seeded successfully');
    } else {
      console.log('Assessments table already has data, skipping seed');
    }
    
    console.log('Mock database initialized with seed data');
    console.log('Jobs count:', await db.jobs.count());
    console.log('Candidates count:', await db.candidates.count());
    console.log('Assessments count:', await db.assessments.count());
    
    // Log the first few assessments to verify
    const assessments = await db.assessments.toArray();
    console.log('First few assessments:', assessments.slice(0, 3));
  } catch (error) {
    console.error('Error initializing database:', error);
  }
}

// Initialize the mock database when this module is imported
initializeMockDb();

// Add a function to clean up any corrupt timeline entries
async function cleanupCandidateTimeline() {
  try {
    console.log('Checking for corrupt timeline entries...');
    
    // Get all timeline entries
    const allEntries = await db.candidateTimeline.toArray();
    console.log(`Found ${allEntries.length} total timeline entries`);
    
    // Identify entries that look like candidate objects instead of timeline entries
    const invalidEntries = allEntries.filter(entry => 
      entry && 
      typeof entry === 'object' && 
      (!entry.timestamp || (!entry.notes && !entry.stage)) &&
      entry.name && entry.email // These are likely candidate objects
    );
    
    if (invalidEntries.length > 0) {
      console.log(`Found ${invalidEntries.length} invalid timeline entries to delete`);
      
      // Delete invalid entries
      for (const entry of invalidEntries) {
        console.log(`Deleting invalid timeline entry:`, entry);
        await db.candidateTimeline.delete(entry.id);
      }
      
      console.log('Cleanup completed');
    } else {
      console.log('No corrupt timeline entries found');
    }
  } catch (error) {
    console.error('Error cleaning up timeline entries:', error);
  }
}

// Run the cleanup function
cleanupCandidateTimeline();
