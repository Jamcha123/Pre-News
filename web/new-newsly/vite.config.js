import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      "/api": {
        target: "https://gamma-api.polymarket.com/events/slug/republican-presidential-nominee-2028",
        changeOrigin: true,  
        rewrite: (path) => path.replace(/^\/api-polymarket/, '')
      }
    }, 
    cors: {
      origin: "https://gamma-api.polymarket.com/events/slug/", 
      credentials: true, 
      methods: "GET"
    }
  }
})
