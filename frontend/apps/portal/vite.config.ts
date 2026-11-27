import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'
import { themeBootstrapScript } from '../../packages/shared/src/theme/bootstrap.ts'

export default defineConfig({
  plugins: [
    vue(),
    tailwindcss(),
    {
      name: 'maragobus-theme',
      transformIndexHtml: {
        order: 'pre',
        handler: () => [{
          tag: 'script',
          children: themeBootstrapScript(),
          injectTo: 'head-prepend',
        }],
      },
    },
  ],
  server: { port: 5173, strictPort: true },
  preview: { port: 5173, strictPort: true },
})
