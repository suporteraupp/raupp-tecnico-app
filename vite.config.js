import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 5173

// Proxy para a API do Printwayy (evita bloqueio de CORS no navegador).
// Aplicado tanto no `npm run dev` quanto no `npm start` (vite preview).
const proxy = {
  '/api/printwayy': {
    target: 'https://api.printwayy.com',
    changeOrigin: true,
    rewrite: (path) => path.replace(/^\/api\/printwayy/, ''),
  },
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port,
    allowedHosts: true,
    proxy,
  },
  preview: {
    host: true,
    port,
    allowedHosts: true,
    proxy,
  },
})
