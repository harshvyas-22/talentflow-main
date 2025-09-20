import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import Layout from './components/Layout';
import Router from './components/Router';
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
      refetchOnWindowFocus: false
    },
    mutations: {
      retry: 1
    }
  }
});

// Note: Database is now initialized in main.jsx to avoid duplicate initialization

function App() {
  // Get the base URL for routing
  const baseUrl = import.meta.env.BASE_URL || '/';

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter basename={baseUrl}>
        <Layout>
          <Router />
        </Layout>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;