import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 5173

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port,
    allowedHosts: true,
  },
  preview: {
    host: true,
    port,
    allowedHosts: true,
  },
})
