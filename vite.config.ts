import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const base = env.BASE_PATH || '/'
  return {
    base,
    plugins: [
      react(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['icons/favicon.svg'],
        manifest: {
          name: 'SGEM Plus · Equipamiento Médico',
          short_name: 'SGEM Plus',
          description: 'Plataforma premium de gestión de equipamiento médico',
          lang: 'es-AR',
          start_url: base,
          scope: base,
          display: 'standalone',
          theme_color: '#0e7490',
          background_color: '#f1f5f6',
          icons: [
            { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
            { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
            { src: 'icons/icon-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
          ],
        },
        workbox: { navigateFallback: base + 'index.html', globPatterns: ['**/*.{js,css,html,svg,png,woff2}'] },
      }),
    ],
  }
})
