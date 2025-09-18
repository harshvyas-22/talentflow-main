import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import { worker } from './services/mockServer.js'

// Start the MSW worker
async function startApp() {
  if (process.env.NODE_ENV !== 'production') {
    // Start the worker and wait for it to be ready
    await worker.start({
      onUnhandledRequest: 'bypass', // Don't warn about unhandled requests
    })
    console.log('MSW worker started successfully')
  }

  // Render the app after MSW is ready
  ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  )
}

startApp()