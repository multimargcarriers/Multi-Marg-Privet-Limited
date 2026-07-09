import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'icons.svg', 'PWA IMAGE.png', 'mc.png'],
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
    },
  },
});
