import { fileURLToPath } from 'node:url'
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const rootEnvDir = fileURLToPath(new URL('..', import.meta.url))

const normalizePublicAppUrl = (value: string): string => {
  const trimmedValue = value.trim()
  if (!trimmedValue) {
    throw new Error('PUBLIC_APP_URL is required to generate robots.txt and sitemap.xml.')
  }

  const url = new URL(trimmedValue)
  if (!['http:', 'https:'].includes(url.protocol) || !url.hostname) {
    throw new Error('PUBLIC_APP_URL must be a complete HTTP or HTTPS URL.')
  }

  return url.toString().replace(/\/+$/, '')
}

const createCrawlControlFiles = (siteUrl: string) => ({
  robots: [
    'User-agent: *',
    'Allow: /',
    'Disallow: /admin',
    'Disallow: /login',
    'Disallow: /cart',
    'Disallow: /checkout',
    'Disallow: /orders',
    'Disallow: /order-confirmation',
    `Sitemap: ${siteUrl}/sitemap.xml`,
    '',
  ].join('\n'),
  sitemap: [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    '  <url>',
    `    <loc>${siteUrl}/</loc>`,
    '  </url>',
    '  <url>',
    `    <loc>${siteUrl}/shop</loc>`,
    '  </url>',
    '  <url>',
    `    <loc>${siteUrl}/new-arrivals</loc>`,
    '  </url>',
    '  <url>',
    `    <loc>${siteUrl}/about</loc>`,
    '  </url>',
    '  <url>',
    `    <loc>${siteUrl}/contact</loc>`,
    '  </url>',
    '</urlset>',
    '',
  ].join('\n'),
})

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const environment = loadEnv(mode, rootEnvDir, '')
  const publicAppUrl = (environment.PUBLIC_APP_URL || '').trim().replace(/\/+$/, '')

  return {
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  plugins: [
    react(),
    tailwindcss(),
    {
      name: 'generate-crawl-control-files',
      configureServer(server) {
        const files = createCrawlControlFiles(normalizePublicAppUrl(environment.PUBLIC_APP_URL || ''))

        server.middlewares.use((request, response, next) => {
          const pathname = request.url?.split('?')[0]
          if (pathname === '/robots.txt') {
            response.statusCode = 200
            response.setHeader('Content-Type', 'text/plain; charset=utf-8')
            response.setHeader('Cache-Control', 'public, max-age=3600')
            response.end(files.robots)
            return
          }
          if (pathname === '/sitemap.xml') {
            response.statusCode = 200
            response.setHeader('Content-Type', 'application/xml; charset=utf-8')
            response.setHeader('Cache-Control', 'public, max-age=3600')
            response.end(files.sitemap)
            return
          }
          next()
        })
      },
      generateBundle() {
        const siteUrl = normalizePublicAppUrl(environment.PUBLIC_APP_URL || '')
        const { robots, sitemap } = createCrawlControlFiles(siteUrl)

        this.emitFile({ type: 'asset', fileName: 'robots.txt', source: robots })
        this.emitFile({ type: 'asset', fileName: 'sitemap.xml', source: sitemap })
      },
    },
    {
      name: 'replace-public-app-url-in-html',
      transformIndexHtml: (html) => html.replaceAll('%PUBLIC_APP_URL%', publicAppUrl),
    },
  ],
  define: {
    'import.meta.env.PUBLIC_APP_URL': JSON.stringify(environment.PUBLIC_APP_URL || ''),
  },
  envDir: rootEnvDir,
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
