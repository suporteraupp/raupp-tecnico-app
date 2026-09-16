import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: process.env.PORT ? parseInt(process.env.PORT) : 5173,
    allowedHosts: true,
    proxy: {
      '/api/printwayy': {
        target: 'https://api.printwayy.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/printwayy/, ''),
      },
    },
  },
  preview: {
    host: true,
    port: process.env.PORT ? parseInt(process.env.PORT) : 5173,
    allowedHosts: true,
  },
})

