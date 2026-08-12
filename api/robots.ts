import { getPublicSiteUrl, type VercelRequestLike, type VercelResponseLike } from './_seo'

export default function handler(request: VercelRequestLike, response: VercelResponseLike) {
  try {
    const siteUrl = getPublicSiteUrl(request)
    response
      .setHeader('Content-Type', 'text/plain; charset=utf-8')
      .setHeader('Cache-Control', 'public, max-age=3600, s-maxage=3600')
      .send([
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
      ].join('\n'))
  } catch (error) {
    console.error('Unable to generate robots.txt', error)
    response.status(500).send('Robots file is temporarily unavailable.')
  }
}