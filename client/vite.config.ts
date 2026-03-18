import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 5173,
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // Core React ecosystem — loaded on every page
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          // ReactFlow is heavy (~250 KB) — only needed by ProcessEditor and ProjectTracker
          'vendor-reactflow': ['@xyflow/react'],
        },
      },
    },
  },
});
