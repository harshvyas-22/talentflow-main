import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  base: '/',
  plugins: [
    react(),
    {
      name: 'replace-env-vars',
      transform(code, id) {
        if (id.includes('api.js')) {
          // Replace any remaining direct accesses to process.env
          return code.replace(
            /process\.env\.NODE_ENV === ['"]production['"]/g, 
            'true' // Force production mode for deployed app
          );
        }
      }
    }
  ],
  server: {
    headers: {
      'Service-Worker-Allowed': '/'
    },
    historyApiFallback: true
  },
  resolve: {
    alias: {
      '@': '/src'
    }
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'lucide-icons': ['lucide-react']
        }
      }
    }
  },
  publicDir: 'public'
});