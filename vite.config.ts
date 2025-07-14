import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [vue()],
  // Shh....
  build: { chunkSizeWarningLimit: 1500 },
  server: {
    proxy: process.env.VITE_NO_PROXY ? {} : {
      '/api': {
        target: 'http://localhost:11434',
        changeOrigin: true,
      }
    }
  }
})
