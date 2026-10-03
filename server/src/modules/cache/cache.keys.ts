import { env } from '../../config/env.js'

/**
 * Cache key and cache-duration definitions.
 *
 * Cache keys are namespaced with a small project prefix so the application is
 * safe to share a Redis instance with other environments (staging, jobs,
 * unrelated services). Keys are grouped by data domain and are invalidated by
 * pattern — which is why every member of a domain shares the same prefix:
 *
 *   afvc:products:list:*        -> product listing pages (GET /products)
 *   afvc:products:search:*      -> search result pages (GET /products?search=...)
 *   afvc:products:detail:*      -> a single product detail page (GET /products/:id)
 *   afvc:categories:public      -> public category list (GET /categories)
 *   afvc:homepage:featured:*    -> featured products rail (GET /products/featured)
 *   afvc:homepage:popular:*     -> popular products rail (GET /products/popular)
 *   afvc:homepage:new-arrivals:*-> new arrivals rail (GET /products/new-arrivals)
 *   afvc:homepage:category-sections:* -> category product sections (GET /products/category-sections)
 *   afvc:homepage:data          -> aggregated homepage snapshot (GET /homepage)
 *   afvc:delivery-locations:public -> public checkout location picker
 *   afvc:admin:delivery-locations:states -> admin zone-picker location tree
 *
 * A single `DEL afvc:homepage:*` invalidates every piece of the homepage,
 * which keeps invalidation fast and correct.
 */

/** Redis key namespace prefix (see env.redis.keyPrefix override). */
export const NAMESPACE = env.redis.keyPrefix

/**
 * Cache durations, in seconds, matching the requested production policy:
 *  - Product listings:     10 minutes
 *  - Product details:      30 minutes
 *  - Categories:           1 hour
 *  - Homepage data:        15 minutes
 *  - Search results:       5 minutes
 * Featured / popular / new-arrivals / category-sections rails feed the
 * homepage, so they share the homepage's 15-minute window.
 */
export const CACHE_TTL = {
  productList: 60 * 10,     // 600s
  productDetail: 60 * 30,   // 1800s
  categories: 60 * 60,      // 3600s
  homepage: 60 * 15,        // 900s
  search: 60 * 5,           // 300s
  deliveryLocations: 60 * 60, // 3600s (states/cities/areas reference tree)
} as const

/**
 * Negative lookups (e.g. a 404 for a bogus product slug) are cached for a
 * much shorter window than positive product details, so a product created
 * shortly after a client requested it never stays "not found" for long.
 */
export const CACHE_TTL_NEGATIVE_PRODUCT_DETAIL = 60 // 1 minute

export const cacheKey = {
  /** Product listing page, parameterised by canonical query string. */
  productList: (params: string): string => `${NAMESPACE}:products:list:${params}`,
  /** Search result page, parameterised by canonical query string. */
  productSearch: (params: string): string => `${NAMESPACE}:products:search:${params}`,
  /**
   * Single product detail. The identifier is the raw slug or UUID as received
   * in the URL. It is lower-cased so slashes case variants hit one entry.
   */
  productDetail: (identifier: string): string =>
    `${NAMESPACE}:products:detail:${identifier.toLowerCase()}`,
  /** Public category list (single entry; invalidated wholesale on writes). */
  categories: (): string => `${NAMESPACE}:categories:public`,
  /** Featured products rail. */
  featured: (params: string): string => `${NAMESPACE}:homepage:featured:${params}`,
  /** Popular products rail. */
  popular: (params: string): string => `${NAMESPACE}:homepage:popular:${params}`,
  /** New arrivals rail. */
  newArrivals: (params: string): string => `${NAMESPACE}:homepage:new-arrivals:${params}`,
  /** Homepage category product sections. */
  categorySections: (limit: number): string =>
    `${NAMESPACE}:homepage:category-sections:${limit}`,
  /** Aggregated homepage snapshot (categories + all four product rails). */
  homepageData: (): string => `${NAMESPACE}:homepage:data`,
  /** Admin zone-picker location tree (states -> cities -> areas). */
  deliveryLocationsAdmin: (): string => `${NAMESPACE}:admin:delivery-locations:states`,
  /** Public checkout location picker (states -> cities -> active areas). */
  deliveryLocationsPublic: (): string => `${NAMESPACE}:delivery-locations:public`,
} as const

/**
 * Builds a stable, deterministic cache key fragment from a validated public
 * product query. Only the fields that change the underlying query result are
 * included, and the search term is lower-cased, so `/products?Search=Flour`
 * and `/products?search=flour` share an entry.
 */
export const browseParamsKey = (params: {
  category?: string
  search?: string
  sort?: string
  page: number
  limit: number
}): string => {
  const parts = [
    params.category ? params.category.toLowerCase().trim() : 'all',
    params.sort ? params.sort : 'newest',
    params.page,
    params.limit,
    params.search ? params.search.toLowerCase().trim() : '',
  ]
  return parts.join(':')
}