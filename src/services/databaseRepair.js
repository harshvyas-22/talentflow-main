import Dexie from 'dexie';
import { db, checkDatabaseHealth, seedDatabase } from './database';

// Add a utility to attempt database repair if needed
export async function repairDatabase() {
  try {
    console.log('Attempting database repair...');
    
    // First check current state
    const healthBefore = await checkDatabaseHealth();
    console.log('Database health before repair:', healthBefore);
    
    if (healthBefore.isHealthy) {
      console.log('Database appears healthy, no repair needed');
      return true;
    }
    
    // Close the database if it's open
    if (db.isOpen()) {
      await db.close();
      console.log('Database closed for repair');
    }
    
    // Try to delete the database as a last resort in development
    if (process.env.NODE_ENV !== 'production') {
      try {
        await Dexie.delete('talentflow');
        console.log('Database deleted for repair');
      } catch (deleteError) {
        console.warn('Unable to delete database during repair:', deleteError);
      }
    }
    
    // Reopen and check
    await db.open();
    console.log('Database reopened after repair attempt');
    
    // Seed if empty
    const jobCount = await db.jobs.count();
    if (jobCount === 0) {
      console.log('Database empty after repair, reseeding...');
      await seedDatabase();
    }
    
    // Check health after repair
    const healthAfter = await checkDatabaseHealth();
    console.log('Database health after repair:', healthAfter);
    
    return healthAfter.isHealthy;
  } catch (error) {
    console.error('Database repair failed:', error);
    return false;
  }
}