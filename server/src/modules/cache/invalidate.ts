import { invalidatePattern } from './cache.service.js'
import { NAMESPACE, cacheKey } from './cache.keys.js'

/**
 * Domain-level cache invalidation.
 *
 * Invalidation is coarse-grained on purpose: a product or category write can
 * change the ordering / membership / availability of every listing, search
 * result and homepage rail, and SCAN-based deletes keep the cost proportional
 * to the (page-bounded) number of cached entries rather than the whole store.
 */

const PRODUCT_PATTERNS = [
  `${NAMESPACE}:products:*`, // listings + search + details
  `${NAMESPACE}:homepage:*`, // featured / popular / new-arrivals / sections + aggregate
] as const

const CATEGORY_PATTERNS = [
  `${NAMESPACE}:categories:*`,
  ...PRODUCT_PATTERNS,
] as const

/**
 * Call after a product is created / updated / deleted / deactivated, or after
 * stock moves (order, cancellation, inventory adjustment). Product writes
 * change everything that lists products, so the whole catalog cache clears.
 */
export const invalidateProductCaches = async (): Promise<void> => {
  await Promise.all(PRODUCT_PATTERNS.map((pattern) => invalidatePattern(pattern)))
}

/**
 * Call after a category is created / updated / deactivated / deleted
 * (public category list, and every product listing that groups by category).
 */
export const invalidateCategoryCaches = async (): Promise<void> => {
  await Promise.all(CATEGORY_PATTERNS.map((pattern) => invalidatePattern(pattern)))
}

/**
 * Call when the featured selection changes. Narrower than a full product
 * invalidation: only the featured rail and the homepage aggregate.
 */
export const invalidateFeaturedCaches = async (): Promise<void> => {
  await Promise.all([
    invalidatePattern(`${NAMESPACE}:homepage:featured:*`),
    invalidatePattern(cacheKey.homepageData()),
  ])
}

/**
 * Debounced variant for very high-frequency write paths (order deductions,
 * cancellations, inventory adjustments). A single order can deduct stock for
 * several line items in close succession, so all of those mutations coalesce
 * into one SCAN-based invalidation instead of N.
 *
 * Invalidation is deliberately not awaited and fires even when the enclosing
 * transaction later rolls back: worst case we cleared an entry that was still
 * valid, which only costs one cache miss.
 */
const COALESCE_MS = 50

let productTimer: NodeJS.Timeout | null = null

export const scheduleProductCacheInvalidation = (): void => {
  if (productTimer) return
  productTimer = setTimeout(() => {
    productTimer = null
    void invalidateProductCaches()
  }, COALESCE_MS)
}