import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import { worker } from './services/mockServer.js'
import { initializeDatabase, checkDatabaseHealth } from './services/database.js'
import { Toaster, toast } from 'react-hot-toast'

// Start the MSW worker and initialize the app
async function startApp() {
  let dbInitialized = false;
  
  // First try to initialize the database
  try {
    dbInitialized = await initializeDatabase();
    
    // Check database health even if initialization reports success
    const healthCheck = await checkDatabaseHealth();
    
    if (!healthCheck.isHealthy && process.env.NODE_ENV === 'production') {
      setTimeout(() => {
        toast.warning('Limited data available. Some features may be restricted.', {
          duration: 5000,
        });
      }, 2000);
    }
    
    if (!dbInitialized && process.env.NODE_ENV === 'production') {
      // In production, show a warning toast but continue
      setTimeout(() => {
        toast.error('Database initialization issue. Some features may be limited.', {
          duration: 5000,
        });
      }, 2000);
    }
  } catch (error) {
    console.error('Failed to initialize database:', error);
    if (process.env.NODE_ENV === 'production') {
      // In production, show an error toast but continue
      setTimeout(() => {
        toast.error('Database error. Please try refreshing the page.', {
          duration: 5000,
        });
      }, 2000);
    }
  }
  
  // Only start the MSW worker in development mode
  if (process.env.NODE_ENV !== 'production') {
    try {
      // Start the worker and wait for it to be ready
      await worker.start({
        onUnhandledRequest: 'bypass', // Don't warn about unhandled requests
      })
    } catch (error) {
      console.error('Failed to start MSW worker:', error);
    }
  }

  // Render the app regardless of database or MSW initialization status
  ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
      <Toaster position="top-right" />
      <App />
    </React.StrictMode>
  )
}

startApp()