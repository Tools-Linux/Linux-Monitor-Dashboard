import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0', // ou host: true
    port: 5173,
  },
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
});