import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(() => {
  // Get the API service URL from Aspire environment variables
  // Hyphens in service names become double underscores in env vars
  const apiUrl = process.env.services__gitclaw__api__https__0 || process.env.services__gitclaw__api__http__0;
  const port = parseInt(process.env.VITE_PORT || process.env.PORT || '5173');

  console.log('Vite Config - API URL:', apiUrl);
  console.log('Vite Config - Port:', port);

  return {
    plugins: [react()],
    server: {
      port: port,
      host: true, // Listen on all addresses
      proxy: apiUrl ? {
        // "gitclaw-api" is the name of the API in AppHost Program.cs
        '/api': {
          target: apiUrl,
          changeOrigin: true,
          secure: false,
          rewrite: (path) => path.replace(/^\/api/, '')
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
