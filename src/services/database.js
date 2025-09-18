import Dexie from 'dexie';
import { seedData } from '../data/seedData';

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
  
  while (retries < maxRetries) {
    try {
      console.log(`Initializing database (attempt ${retries + 1}/${maxRetries})...`);
      
      // For production or first-time setup, we'll clear the database
      if (process.env.NODE_ENV === 'production' || retries > 0) {
        console.log('Clearing database to ensure schema changes take effect...');
        try {
          await db.delete();
          console.log('Database deleted successfully');
        } catch (deleteError) {
          console.warn('Unable to delete database, continuing with open:', deleteError);
        }
      }
      
      // Open the database with the current schema
      await db.open();
      console.log('Database opened successfully');
      
      // Check if we need to seed data
      const jobCount = await db.jobs.count();
      console.log(`Found ${jobCount} existing jobs`);
      
      if (jobCount === 0) {
        console.log('No data found, seeding database...');
        const seedResult = await seedDatabase();
        if (!seedResult) {
          throw new Error('Failed to seed database');
        }
      } else {
        console.log('Database already contains data, skipping seed');
      }
      
      console.log('Database initialized successfully');
      return true;
    } catch (error) {
      retries++;
      console.error(`Database initialization attempt ${retries} failed:`, error);
      
      if (retries >= maxRetries) {
        console.error(`Failed to initialize database after ${maxRetries} attempts`);
        
        // If we're in production, we'll attempt to work without clearing the DB
        if (process.env.NODE_ENV === 'production') {
          try {
            console.log('Attempting to use existing database without clearing...');
            await db.open();
            console.log('Successfully opened existing database');
            return true;
          } catch (fallbackError) {
            console.error('Failed to open existing database:', fallbackError);
          }
        }
        
        return false;
      }
      
      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
}