import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3002,
    proxy: {
      '/af-api': { target: 'http://localhost:8002', changeOrigin: true, rewrite: (p) => p.replace(/^\/af-api/, '') },
    },
  },
})
