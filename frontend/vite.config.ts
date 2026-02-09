import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(() => {
  // API URL from Aspire (set in AppHost as GITCLAW_API_URL)
  const apiUrl = process.env.GITCLAW_API_URL;
  const port = parseInt(process.env.VITE_PORT || process.env.PORT || '5173');

  console.log('Vite Config - API URL:', apiUrl);
  console.log('Vite Config - Port:', port);

  return {
    plugins: [react()],
    server: {
      port: port,
      host: true, // Listen on all addresses
      proxy: apiUrl ? {
        // Forward /api to backend; keep path so backend receives /api/repositories etc.
        '/api': {
          target: apiUrl,
          changeOrigin: true,
          secure: false
        },
        // Forward documentation endpoints to backend (AI agent access)
        '/skill.md': {
          target: apiUrl,
          changeOrigin: true,
          secure: false
        },
        '/heartbeat.md': {
          target: apiUrl,
          changeOrigin: true,
          secure: false
        },
        '/auth.md': {
          target: apiUrl,
          changeOrigin: true,
          secure: false
        },
        // Forward health and swagger to backend
        '/health': {
          target: apiUrl,
          changeOrigin: true,
          secure: false
        },
        '/swagger': {
          target: apiUrl,
          changeOrigin: true,
          secure: false
        },
        // Forward Git HTTP Smart Protocol requests to backend
        // Matches /{owner}/{repo}.git/ paths for clone, push, fetch
        '^/[^/]+/[^/]+\\.git/': {
          target: apiUrl,
          changeOrigin: true,
          secure: false
        }
      } : undefined
    },
    build: {
      outDir: 'dist',
      rollupOptions: {
        input: './index.html'
      }
    }
  }
})
