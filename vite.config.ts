import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { resolve } from 'path'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['assets/logo-maragogi.png'],
      manifest: {
        name: 'MaragoBus',
        short_name: 'MaragoBus',
        description: 'Transporte Universitário de Maragogi',
        theme_color: '#499bd0',
        background_color: '#eaf4fb',
        display: 'standalone',
        start_url: '/',
        icons: [
          {
            src: '/assets/logo-maragogi.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: '/assets/logo-maragogi.png',
            sizes: '512x512',
            type: 'image/png',
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: { '@': resolve(__dirname, './src') },
  },
})
