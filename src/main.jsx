import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import { worker } from './services/mockServer.js'
import { initializeDatabase } from './services/database.js'

// Start the MSW worker and initialize the app
async function startApp() {
  let dbInitialized = false;
  
  // First try to initialize the database
  try {
    dbInitialized = await initializeDatabase();
    console.log('Database initialization status:', dbInitialized ? 'Success' : 'Failed');
  } catch (error) {
    console.error('Failed to initialize database:', error);
  }
  
  // Only start the MSW worker in development mode
  if (process.env.NODE_ENV !== 'production') {
    try {
      // Start the worker and wait for it to be ready
      await worker.start({
        onUnhandledRequest: 'bypass', // Don't warn about unhandled requests
      })
      console.log('MSW worker started successfully');
    } catch (error) {
      console.error('Failed to start MSW worker:', error);
    }
  } else {
    console.log('Running in production mode, MSW worker not started');
  }

  // Render the app regardless of database or MSW initialization status
  ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  )
}

startApp()