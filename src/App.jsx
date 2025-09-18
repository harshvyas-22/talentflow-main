import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import JobsPage from './pages/JobsPage';
import JobDetailPage from './pages/JobDetailPage';
import CandidatesPage from './pages/CandidatesPage';
import CandidateDetailPage from './pages/CandidateDetailPage';
import AssessmentsPage from './pages/AssessmentsPage';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import ErrorBoundary from './components/ErrorBoundary';

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      retryDelay: 1000,
      staleTime: 30000,
      cacheTime: 60000,
      refetchOnWindowFocus: false,
      onError: (err) => {
        console.error('Query error:', err);
      }
    },
    mutations: {
      retry: 1,
      onError: (err) => {
        console.error('Mutation error:', err);
      }
    }
  }
});

// Note: Database is now initialized in main.jsx to avoid duplicate initialization

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
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
            <Route path="/candidates" element={
              <ErrorBoundary>
                <CandidatesPage />
              </ErrorBoundary>
            } />
            <Route path="/candidates/:candidateId" element={
              <ErrorBoundary>
                <CandidateDetailPage />
              </ErrorBoundary>
            } />
            <Route path="/assessments" element={
              <ErrorBoundary>
                <AssessmentsPage />
              </ErrorBoundary>
            } />
            <Route path="/jobs/:jobId/assessments" element={
              <ErrorBoundary>
                <AssessmentsPage />
              </ErrorBoundary>
            } />
          </Routes>
        </Layout>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;