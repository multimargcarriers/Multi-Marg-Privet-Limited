import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['PWA IMAGE.png', 'mc.png', 'Final.mp4', 'logistics_global_standards.png', 'construction_materials.png'],
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,mp4}'],
        maximumFileSizeToCacheInBytes: 50 * 1024 * 1024,
      },
      manifest: {
        name: 'Multimarg Carriers Pvt. Ltd.',
        short_name: 'Multimarg',
        description: 'Multimarg Carriers - Nationwide Logistics & Freight Transport',
        theme_color: '#0B1B3D',
        background_color: '#ffffff',
        display: 'standalone',
        start_url: '/',
        scope: '/',
        categories: ['business', 'logistics', 'transportation', 'productivity'],
        icons: [
          {
            src: 'PWA IMAGE.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any maskable'
          },
          {
            src: 'PWA IMAGE.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ],
        shortcuts: [
          {
            name: 'Track Shipment',
            short_name: 'Track',
            description: 'Track your consignment status',
            url: '/track'
          },
          {
            name: 'Get Quote',
            short_name: 'Quote',
            description: 'Calculate instant freight rate',
            url: '/quote'
          }
        ]
      }
    })
  ]
})
