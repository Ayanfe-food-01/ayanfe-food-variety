import { getCategories } from '../categories/category.service.js'
import {
  getCategoryProductSections,
  getFeaturedProducts,
  getNewArrivals,
  getPopularProducts,
} from '../products/product.service.js'
import { cacheKey, CACHE_TTL, getOrSet } from '../cache/index.js'
import type { PublicCategoryProductSection, PublicProduct } from '../products/product.types.js'
import type { Category } from '../categories/category.types.js'

/**
 * Aggregated homepage snapshot.
 *
 * The storefront home page renders five data groups in parallel:
 *   - the public category list,
 *   - the popular products rail,
 *   - the featured products rail,
 *   - the new-arrivals rail,
 *   - the per-category product sections.
 *
 * This endpoint bundles all five into a single payload and caches the result
 * as *one* Redis entry (`afvc:homepage:data`) for 15 minutes, so a fast
 * homepage hit is a single round trip instead of five sequential cache reads
 * plus five upstream database queries on a cold start.
 *
 * The entry is invalidated through the same domain invalidators as the rest
 * of the homepage: any product/category/stock change clears `afvc:homepage:*`,
 * which includes this aggregate key.
 */

export interface PublicHomepageData {
  categories: Category[]
  popularProducts: PublicProduct[]
  featuredProducts: PublicProduct[]
  newArrivals: PublicProduct[]
  categorySections: PublicCategoryProductSection[]
}

/**
 * Builds the homepage payload. When `userId`/`includeWholesale` are present
 * the payload is personalised (wishlist flags, wholesale prices) and must not
 * be cached — it is computed fresh on every request. Anonymous visitors get
 * the shared 15-minute cached snapshot.
 */
export async function getHomepageData(
  wishlistUserId?: string,
  includeWholesale = false,
): Promise<PublicHomepageData> {
  const fetchHomepage = (): Promise<PublicHomepageData> =>
    Promise.all([
      getCategories(),
      getPopularProducts({ page: 1, limit: 8, sort: 'newest' }),
      getFeaturedProducts({ page: 1, limit: 8, sort: 'newest' }),
      getNewArrivals({ page: 1, limit: 8, sort: 'newest' }),
      getCategoryProductSections(6),
    ]).then(([categories, popular, featured, newArrivals, categorySections]) => ({
      categories,
      popularProducts: popular.products,
      featuredProducts: featured.products,
      newArrivals: newArrivals.products,
      categorySections,
    }))

  if (wishlistUserId || includeWholesale) {
    return fetchHomepage()
  }

  return getOrSet({
    key: cacheKey.homepageData(),
    ttlSeconds: CACHE_TTL.homepage,
    fetch: fetchHomepage,
  })
}