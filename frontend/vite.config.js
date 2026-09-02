import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'favicon.svg', 'apple-touch-icon.png', 'PWA IMAGE.png', 'fab.png', 'circle_crop_logo.png', 'mc.png'],
      workbox: {
        maximumFileSizeToCacheInBytes: 5000000,
        runtimeCaching: [
          {
            urlPattern: /^\/api\//,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'api-cache',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24 * 7, // 1 week
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          }
        ]
      },
      manifest: {
        name: 'Multimarg Carriers',
        short_name: 'Multimarg',
        description: 'Multimarg Carriers Management System',
        theme_color: '#FF9900',
        background_color: '#f2f3f3',
        display: 'standalone',
        icons: [
          {
            src: 'PWA IMAGE.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'PWA IMAGE.png',
            sizes: '512x512',
            type: 'image/png'
          },
          {
            src: 'PWA IMAGE.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      }
    })
  ],
  build: {
    chunkSizeWarningLimit: 3000, // Suppress warnings on large vendor chunks
    sourcemap: false, // Disabled in production — reduces build size significantly
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('react') || id.includes('react-dom') || id.includes('react-router-dom')) {
              return 'vendor-react';
            }
            if (id.includes('recharts')) {
              return 'vendor-charts';
            }
            if (id.includes('framer-motion')) {
              return 'vendor-animation';
            }
            if (id.includes('exceljs')) {
              return 'vendor-excel';
            }
            if (id.includes('html2pdf.js')) {
              return 'vendor-pdf';
            }
            return 'vendor-utils';
          }
        }
      }
    }
  },
  server: {
    port: 5173,
    hmr: {
      clientPort: 5173,
    },
    proxy: {
      "/api": {
        target: "http://localhost:5000",
        changeOrigin: true,
        secure: false,
      },
      "/uploads": {
        target: "http://localhost:5000",
        changeOrigin: true,
        secure: false,
      },
    },
  },
});
