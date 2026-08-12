import {
  escapeXml,
  getApiBaseUrl,
  getPublicSiteUrl,
  type VercelRequestLike,
  type VercelResponseLike,
} from './_seo.js'

interface PublicProduct {
  slug: string
  updatedAt: string
}

interface ProductPageResponse {
  data: {
    products: PublicProduct[]
    pagination: { totalPages: number }
  }
}

const getAllPublicProducts = async (): Promise<PublicProduct[]> => {
  const products: PublicProduct[] = []
  const apiBaseUrl = getApiBaseUrl()
  let page = 1
  let totalPages = 1

  while (page <= totalPages) {
    const response = await fetch(`${apiBaseUrl}/products?page=${page}&limit=50`)
    if (!response.ok) throw new Error(`Product sitemap request failed with ${response.status}.`)
    const payload = await response.json() as ProductPageResponse
    products.push(...payload.data.products)
    totalPages = payload.data.pagination.totalPages
    page += 1
  }

  return products
}

export default async function handler(request: VercelRequestLike, response: VercelResponseLike) {
  try {
    const siteUrl = getPublicSiteUrl(request)
    const products = await getAllPublicProducts()
    const staticUrls = [
      { path: '/', lastmod: undefined },
      { path: '/shop', lastmod: undefined },
    ]
    const productUrls = products
      .filter((product) => product.slug)
      .map((product) => ({ path: `/product/${encodeURIComponent(product.slug)}`, lastmod: product.updatedAt }))
    const urls = [...staticUrls, ...productUrls]
      .map(({ path, lastmod }) => [
        '  <url>',
        `    <loc>${escapeXml(`${siteUrl}${path}`)}</loc>`,
        ...(lastmod ? [`    <lastmod>${escapeXml(lastmod)}</lastmod>`] : []),
        '  </url>',
      ].join('\n'))
      .join('\n')

    response
      .setHeader('Content-Type', 'application/xml; charset=utf-8')
      .setHeader('Cache-Control', 'public, max-age=3600, s-maxage=3600')
      .send(`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`)
  } catch (error) {
    console.error('Unable to generate sitemap.xml', error)
    response.status(500).send('Sitemap is temporarily unavailable.')
  }
}