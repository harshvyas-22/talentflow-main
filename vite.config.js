import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    headers: {
      'Service-Worker-Allowed': '/'
    }
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