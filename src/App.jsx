import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import JobsPage from './pages/JobsPage';
import JobDetailPage from './pages/JobDetailPage';
import CandidatesPage from './pages/CandidatesPage';
import CandidateDetailPage from './pages/CandidateDetailPage';
import AssessmentsPage from './pages/AssessmentsPage';
import { initializeDatabase } from './services/database';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import ErrorBoundary from './components/ErrorBoundary';

// Create a client
const queryClient = new QueryClient();

// Initialize database on app start
initializeDatabase();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Toaster position="top-right" />
        <Layout>
          <Routes>
            <Route path="/" element={<Navigate to="/jobs" replace />} />
            <Route path="/jobs" element={
              <ErrorBoundary>
                <JobsPage />
              </ErrorBoundary>
            } />
            <Route path="/jobs/:id" element={
              <ErrorBoundary>
                <JobDetailPage />
              </ErrorBoundary>
            } />
            <Route path="/candidates" element={<CandidatesPage />} />
            <Route path="/candidates/:candidateId" element={<CandidateDetailPage />} />
            <Route path="/assessments" element={<AssessmentsPage />} />
            <Route path="/jobs/:jobId/assessments" element={<AssessmentsPage />} />
          </Routes>
        </Layout>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;