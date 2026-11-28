import path from 'path';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';
import { defineConfig, loadEnv } from 'vite';

const webRoot = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig(({ mode }) => {
  const apiTarget = loadEnv(mode, webRoot, '').API_PROXY_TARGET || 'http://localhost:3000';
  return {
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
          target: apiTarget,
          changeOrigin: true,
        },
        '/socket.io': { target: apiTarget, ws: true, changeOrigin: true },
      },
    },
  };
});
