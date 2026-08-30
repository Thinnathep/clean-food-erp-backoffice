import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    tailwindcss(), 
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'vite.svg'],
      manifest: {
        name: 'Clean Food Chiang Rai ERP',
        short_name: 'Clean Food CR',
        description: 'ระบบบริหารจัดการร้านอาหารสุขภาพและครัว คลีนฟู้ด เชียงราย',
        theme_color: '#10b981',
        background_color: '#0f172a',
        display: 'standalone',
        orientation: 'any',
        categories: ['business', 'food', 'productivity'],
        icons: [
          {
            src: '/favicon.svg',
            sizes: '192x192',
            type: 'image/svg+xml',
            purpose: 'any'
          },
          {
            src: '/favicon.svg',
            sizes: '512x512',
            type: 'image/svg+xml',
            purpose: 'maskable'
          },
          {
            src: '/favicon.svg',
            sizes: 'any',
            type: 'image/svg+xml'
          }
        ]
      }
    })
  ],
  build: {
    chunkSizeWarningLimit: 1200,
    rollupOptions: {
      output: {
        manualChunks(id: string) {
          if (id.includes('node_modules/react') || id.includes('node_modules/react-dom') || id.includes('node_modules/react-router')) {
            return 'vendor-react';
          }
          if (id.includes('node_modules/leaflet') || id.includes('node_modules/react-leaflet')) {
            return 'vendor-leaflet';
          }
          if (id.includes('node_modules/recharts')) {
            return 'vendor-recharts';
          }
          if (id.includes('node_modules/framer-motion') || id.includes('node_modules/lucide-react')) {
            return 'vendor-ui';
          }
          if (id.includes('node_modules/@supabase')) {
            return 'vendor-supabase';
          }
        }
      }
    }
  }
})
