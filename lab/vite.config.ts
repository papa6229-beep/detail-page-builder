import path from 'node:path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  root: path.resolve(__dirname, '..'),
  plugins: [react()],
  server: {
    host: '127.0.0.1', port: 3001, strictPort: true,
    headers: { 'Cross-Origin-Opener-Policy': 'same-origin', 'Cross-Origin-Embedder-Policy': 'require-corp' },
  },
  worker: { format: 'es' },
  build: {
    outDir: 'dist-image-lab',
    rollupOptions: { input: path.resolve(__dirname, '../image-lab.html') },
  },
});
