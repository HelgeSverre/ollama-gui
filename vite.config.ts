import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    vue(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'logo.png'],
      manifest: {
        name: 'Ollama GUI',
        short_name: 'OllamaGUI',
        description: 'Local LLM chat interface for Ollama',
        theme_color: '#15171c',
        background_color: '#0b0c0f',
        display: 'standalone',
        icons: [
          { src: '/favicon/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
          { src: '/favicon/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
          { src: '/favicon/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
      },
    }),
  ],
  build: {
    rolldownOptions: {
      output: {
        // Separate long-lived vendor code from app code so updates don't bust the whole cache
        codeSplitting: {
          groups: [
            { name: 'highlight', test: /node_modules[\\/]highlight\.js/ },
            { name: 'vendor', test: /node_modules[\\/](vue|@vue|dexie|markdown-it|@vueuse|@tabler)/ },
          ],
        },
      },
    },
  },
  server: {
    // IndexedDB is per origin: a port change looks like lost history (#58)
    port: 5173,
    strictPort: true,
    proxy: process.env.VITE_NO_PROXY
      ? {}
      : {
          '/api': {
            target: 'http://localhost:11434',
            changeOrigin: true,
          },
        },
  },
})
