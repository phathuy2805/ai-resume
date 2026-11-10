import path from 'path';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';
import { defineConfig, loadEnv } from 'vite';

const webRoot = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig(({ mode }) => ({
  root: webRoot,
  envDir: webRoot,
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(webRoot, './src'),
    },
  },
  server: {
    proxy: {
      '/api': {
        target: loadEnv(mode, webRoot, '').API_PROXY_TARGET || 'http://localhost:3000',
        changeOrigin: true,
      },
      '/socket.io': { target: 'http://localhost:3000', ws: true, changeOrigin: true },
    },
  },
}));
