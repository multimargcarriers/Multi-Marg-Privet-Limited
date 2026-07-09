import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['mc.png'],
      manifest: {
        name: 'Multimarg Carriers',
        short_name: 'Multimarg',
        description: 'Multimarg Carriers - Nationwide Logistics',
        theme_color: '#0B1B3D',
        background_color: '#ffffff',
        display: 'standalone',
        icons: [
          {
            src: 'mc.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'mc.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      }
    })
  ]
})
