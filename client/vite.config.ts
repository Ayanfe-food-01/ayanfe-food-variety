import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const environment = loadEnv(mode, process.cwd(), '')
  const publicAppUrl = (environment.PUBLIC_APP_URL || '').trim().replace(/\/+$/, '')

  return {
  plugins: [
    react(),
    tailwindcss(),
    {
      name: 'replace-public-app-url-in-html',
      transformIndexHtml: (html) => html.replaceAll('%PUBLIC_APP_URL%', publicAppUrl),
    },
  ],
  define: {
    'import.meta.env.PUBLIC_APP_URL': JSON.stringify(environment.PUBLIC_APP_URL || ''),
  },
  server: {
    allowedHosts: true,
    proxy: {
      '/api': {
        target: environment.VITE_DEV_API_PROXY_TARGET || 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
    },
  },
  }
})
