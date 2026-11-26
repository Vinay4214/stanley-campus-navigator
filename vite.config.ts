import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['assets/stanley-crest.jpg'],
      manifest: {
        name: 'Stanley Campus Navigator',
        short_name: 'Stanley Maps',
        description: 'Indoor and outdoor campus navigation demo',
        theme_color: '#7a1f2b',
        background_color: '#faf8f4',
        display: 'standalone',
        icons: [{ src: '/assets/stanley-crest.jpg', sizes: '192x192', type: 'image/jpeg' }]
      }
    })
  ],
  test: { environment: 'node' }
})
