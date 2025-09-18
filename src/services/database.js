import Dexie from 'dexie';
import { seedData } from '../data/seedData';

// Create the database instance
export const db = new Dexie('talentflow');

// Update the version number to ensure the database is reset with our new fields
db.version(7).stores({
  jobs: '++id, jobId, createdAt, status, order',
  candidates: '++id, createdAt, stage, skills',
  candidateTimeline: '++id, candidateId, timestamp',
  assessments: '++id, createdAt, jobId, candidateId, title',
  assessmentResponses: '++id, assessmentId, candidateId, createdAt, completed'
});

// Function to seed the database with initial data
async function seedDatabase() {
  try {
    console.log('Seeding database with initial data...');
    
    // Make sure all jobs have order properties
    const jobsWithOrder = seedData.jobs.map((job, index) => ({
      ...job,
      order: job.order || index + 1
    }));
    
    // Use bulkPut instead of bulkAdd to handle duplicates
    console.log('Seeding jobs table...');
    await db.jobs.bulkPut(jobsWithOrder);
    
    // Use bulkPut instead of bulkAdd to handle duplicates
    console.log('Seeding candidates table with 1000 candidates...');
    await db.candidates.bulkPut(seedData.candidates);
    
    if (seedData.assessments && seedData.assessments.length > 0) {
      // Use bulkPut to add assessments
      console.log('Seeding assessments table...');
      await db.assessments.bulkPut(seedData.assessments);
    }
    
    // Add timeline entries
    if (seedData.timeline && seedData.timeline.length > 0) {
      console.log('Seeding timeline table...');
      await db.candidateTimeline.bulkPut(seedData.timeline);
    }
    
    console.log('Database seeded successfully');
    return true;
  } catch (error) {
    console.error('Error seeding database:', error);
    return false;
  }
}

export async function initializeDatabase() {
  let retries = 0;
  const maxRetries = 3;
  
  // Helper function to safely check if database has data
  async function checkForExistingData() {
    try {
      // Only check if database is open
      if (db.isOpen()) {
        const jobCount = await db.jobs.count();
        console.log(`Found ${jobCount} existing jobs in database`);
        return jobCount > 0;
      }
      return false;
    } catch (error) {
      console.warn('Error checking for existing data:', error);
      return false;
    }
  }
  
  // First, try to just open the database without deleting
  try {
    console.log('First attempt: Opening database without deleting...');
    
    // If database is already open, use it
    if (!db.isOpen()) {
      await db.open();
      console.log('Database opened successfully on first try');
    } else {
      console.log('Database is already open');
    }
    
    // Check if we have data already
    const hasData = await checkForExistingData();
    if (hasData) {
      console.log('Database already contains data, using existing database');
      return true;
    }
    
    // If we're here, database is open but empty, seed it
    console.log('Database is open but empty, seeding it...');
    const seedResult = await seedDatabase();
    if (seedResult) {
      console.log('Database seeded successfully on first try');
      return true;
    }
  } catch (firstAttemptError) {
    console.warn('First attempt to open database failed:', firstAttemptError);
    // Continue to retry logic
  }
  
  // If first attempt failed or database is empty, try the retry approach
  while (retries < maxRetries) {
    try {
      console.log(`Initializing database (attempt ${retries + 1}/${maxRetries})...`);
      
      // Try to close the database if it's open
      if (db.isOpen()) {
        try {
          await db.close();
          console.log('Database closed successfully');
        } catch (closeError) {
          console.warn('Error closing database:', closeError);
        }
      }
      
      // In production, skip the delete operation as it often gets blocked
      if (process.env.NODE_ENV !== 'production' && retries === 0) {
        try {
          console.log('Attempting to delete database...');
          await Dexie.delete('talentflow');
          console.log('Database deleted successfully');
        } catch (deleteError) {
          console.warn('Unable to delete database, will try to open anyway:', deleteError);
        }
      }
      
      // Open the database with the current schema
      await db.open();
      console.log('Database opened successfully');
      
      // Seed the database if needed
      const hasData = await checkForExistingData();
      if (!hasData) {
        console.log('No data found, seeding database...');
        const seedResult = await seedDatabase();
        if (!seedResult) {
          throw new Error('Failed to seed database');
        }
      } else {
        console.log('Database already contains data, using existing data');
      }
      
      console.log('Database initialized successfully');
      return true;
    } catch (error) {
      retries++;
      console.error(`Database initialization attempt ${retries} failed:`, error);
      
      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, 1000 * retries)); // Exponential backoff
    }
  }
  
  // If we're here, all retries failed
  console.error(`Failed to initialize database after ${maxRetries} attempts`);
  
  // Final fallback for production: try to use the database anyway
  if (process.env.NODE_ENV === 'production') {
    try {
      console.log('CRITICAL: All database initialization attempts failed. Trying emergency fallback...');
      
      // Make one last attempt to open the database without any operations
      if (!db.isOpen()) {
        await db.open();
      }
      
      // Check if we have tables and some data
      const tables = db.tables.map(table => table.name);
      console.log('Available tables:', tables);
      
      // Even if we can't seed data, try to continue with empty database
      console.log('Emergency fallback succeeded. Application will continue with limited functionality.');
      return true;
    } catch (emergencyError) {
      console.error('CRITICAL: Emergency fallback failed:', emergencyError);
      console.error('Application will continue but database functionality will be limited');
      
      // Return true anyway to allow the app to try to function
      return true;
    }
  }
  
  return false;
}