import { Router } from 'express'
import { env } from '../../config/env.js'
import { prisma } from '../../config/prisma.js'

const siteUrl = (env.publicAppUrl || env.corsOrigins[0] || '').replace(/\/+$/, '')

const STATIC_PAGES = [
  { path: '/', priority: '1.0', changefreq: 'daily' },
  { path: '/shop', priority: '0.9', changefreq: 'daily' },
  { path: '/new-arrivals', priority: '0.8', changefreq: 'weekly' },
  { path: '/about', priority: '0.7', changefreq: 'monthly' },
  { path: '/contact', priority: '0.6', changefreq: 'monthly' },
  { path: '/help', priority: '0.6', changefreq: 'monthly' },
  { path: '/return-refund-policy', priority: '0.4', changefreq: 'monthly' },
  { path: '/privacy-policy', priority: '0.4', changefreq: 'monthly' },
  { path: '/terms-and-conditions', priority: '0.4', changefreq: 'monthly' },
]

const escapeXml = (value: string): string =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')

export const seoRoutes = Router()

seoRoutes.get('/robots.txt', (_request, response) => {
  const lines = [
    'User-agent: *',
    'Allow: /',
    '',
    `Sitemap: ${siteUrl}/sitemap.xml`,
  ]
  response.type('text/plain').send(lines.join('\n'))
})

seoRoutes.get('/sitemap.xml', async (_request, response) => {
  const staticUrls = STATIC_PAGES.map(
    (page) => `  <url>
    <loc>${siteUrl}${page.path}</loc>
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority}</priority>
  </url>`,
  )

  const products = await prisma.product.findMany({
    where: { isActive: true },
    select: { slug: true, name: true, image: true, updatedAt: true },
  })

  const productUrls = products.map((product) => {
    const lastmod = product.updatedAt.toISOString().slice(0, 10)
    const imageSnippet = product.image
      ? `    <image:image>
      <image:loc>${escapeXml(product.image)}</image:loc>
      <image:title>${escapeXml(product.name)}</image:title>
    </image:image>`
      : ''
    return `  <url>
    <loc>${siteUrl}/product/${encodeURIComponent(product.slug)}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
${imageSnippet}  </url>`
  })

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
${[...staticUrls, ...productUrls].join('\n')}
</urlset>
`

  response.set({
    'Content-Type': 'application/xml; charset=utf-8',
    'Cache-Control': 'public, max-age=3600, s-maxage=3600',
  })
  response.send(xml)
})