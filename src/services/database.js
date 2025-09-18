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

export async function initializeDatabase() {
  try {
    console.log('Initializing database...');
    
    // Force a database clear to ensure schema changes take effect
    console.log('Clearing database to ensure schema changes take effect...');
    await db.delete();
    await db.open();
    
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
  } catch (error) {
    console.error('Error seeding database:', error);
    // Continue execution even if seeding fails
  }
};