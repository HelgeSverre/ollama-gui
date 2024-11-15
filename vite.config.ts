import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [vue()],
  // Shh....
  build: { chunkSizeWarningLimit: 1500, },
  preview: {
    port: 8080,
    strictPort: false,
  },
  server: {
    port: 8080,
    strictPort: false,
    host: "0.0.0.0",
    origin: "http://0.0.0.0:8080",
  },
})
