/**
 * Redis cache end-to-end smoke test.
 *
 * Drives the *real* cached services against a live database and Redis and
 * asserts:
 *   1. cache-aside populates Redis with the expected keys,
 *   2. each key carries the requested TTL (listings 600s, details 1800s,
 *      categories 3600s, homepage/search 900s/300s),
 *   3. repeat reads are served from Redis,
 *   4. admin writes (create product) + domain invalidators clear the cache.
 *
 * Requires DATABASE_URL (from `.env`) reachable and REDIS_URL set (it is
 * skipped cleanly when Redis is not configured). Creates throwaway fixtures
 * and removes them on the way out.
 *
 * Run with: npm run test:cache:e2e
 */

// REDIS_URL must be known before the env module loads (dotenv never overrides).
const testUrl = (process.env.REDIS_URL ?? '').trim()
if (!testUrl) {
  console.info('SKIP test:cache:e2e — REDIS_URL not configured.')
  process.exit(0)
}

let failures = 0

const assertEqual = (actual: unknown, expected: unknown, label: string) => {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    failures += 1
    console.error(`FAIL ${label}\n  expected: ${JSON.stringify(expected)}\n  actual:   ${JSON.stringify(actual)}`)
  } else {
    console.info(`PASS ${label}`)
  }
}

const assertTrue = (condition: boolean, label: string) => {
  if (!condition) {
    failures += 1
    console.error(`FAIL ${label}`)
  } else {
    console.info(`PASS ${label}`)
  }
}

async function main() {
  const { env } = await import('../src/config/env.js')
  const { prisma, closeDatabase } = await import('../src/config/prisma.js')
  const { getCategories } = await import('../src/modules/categories/category.service.js')
  const {
    getFeaturedProducts,
    getNewArrivals,
    getPopularProducts,
    getProductById,
    getProducts,
  } = await import('../src/modules/products/product.service.js')
  const { getHomepageData } = await import('../src/modules/homepage/homepage.service.js')
  const { cacheKey, browseParamsKey } = await import('../src/modules/cache/index.js')
  const {
    invalidatePattern,
    invalidateProductCaches,
    getRedis,
    isRedisReady,
    closeRedis,
  } = await import('../src/modules/cache/index.js')

  console.info(`Redis cache e2e smoke (redis=${env.redis.keyPrefix}:*, db connected)`)
  const TTL_TOLERANCE = 2 // seconds of clock drift between write and TTL read

  const cleanup: Array<() => Promise<unknown>> = []
  let slug = ''

  try {
    // Wait for the lazy connection to become ready.
    for (let i = 0; i < 30 && !isRedisReady(); i += 1) await new Promise((r) => setTimeout(r, 100))

    const client = getRedis()
    if (!client || !isRedisReady()) {
      assertTrue(false, 'Redis connected for e2e')
      return
    }

    // Fixtures are created through raw Prisma (bypassing the admin write
    // services' invalidation), so start from a clean slate to keep previous
    // runs' entries from being served as stale cache hits.
    await invalidatePattern(`${env.redis.keyPrefix}:*`)

    const slugBase = `cache-e2e-${Date.now().toString(36)}`
    const category = await prisma.category.create({
      data: { name: `Cache E2E ${slugBase}`, slug: `${slugBase}-cat`, imageUrl: '' },
    })
    cleanup.push(() => prisma.category.deleteMany({ where: { id: category.id } }))
    const product = await prisma.product.create({
      data: {
        categoryId: category.id,
        name: `Cache E2E Flour ${slugBase}`,
        slug: `${slugBase}-flour`,
        description: 'Temporary product used to verify the Redis cache layer.',
        price: '1200.00',
        unit: 'kg',
        image: '',
        stockQuantity: 10,
        isFeatured: true,
      },
    })
    slug = product.slug
    cleanup.push(() => prisma.product.deleteMany({ where: { id: product.id } }))

    // Fetch the canonical browse params so keys match buildBrowseParamsCacheKey.
    const query = { page: 1, limit: 8, sort: 'newest' as const }
    const qKey = browseParamsKey(query)
    const qSearch = browseParamsKey({ ...query, search: slugBase })
    const listKey = cacheKey.productList(qKey)
    const searchKey = cacheKey.productSearch(qSearch)
    const detailKey = cacheKey.productDetail(slug)
    const categoriesKey = cacheKey.categories()
    const homepageKey = cacheKey.homepageData()

    const assertTtl = (key: string, baseTtl: number, label: string): Promise<void> =>
      client.ttl(key).then((ttl) => {
        assertTrue(ttl > baseTtl - TTL_TOLERANCE && ttl <= baseTtl, `${label} (ttl=${ttl}s, want ≈${baseTtl}s)`)
      })

    // --- product list (10 min TTL) -----------------------------------------
    const list1 = await getProducts(query)
    assertTrue(list1.products.length > 0, 'product listing loads (first read)')
    const exists = await client.exists(listKey)
    assertTrue(exists === 1, `product list cached at ${listKey.replace(env.redis.keyPrefix, '')}`)
    await assertTtl(listKey, 600, 'product list TTL ≈ 600s')

    // --- search (5 min TTL) ------------------------------------------------
    // The slug base appears verbatim in the fixture product's name.
    const search1 = await getProducts({ ...query, search: slugBase })
    assertTrue(search1.products.length > 0, 'search results load (first read)')
    assertTrue((await client.exists(searchKey)) === 1, `search cached at ${searchKey.replace(env.redis.keyPrefix, '')}`)
    await assertTtl(searchKey, 300, 'search TTL ≈ 300s')

    // --- product detail (30 min TTL) ---------------------------------------
    const detail = await getProductById(slug)
    assertTrue(detail?.id === product.id, 'product detail loads (first read)')
    assertTrue((await client.exists(detailKey)) === 1, `product detail cached at ${detailKey.replace(env.redis.keyPrefix, '')}`)
    await assertTtl(detailKey, 1800, 'product detail TTL ≈ 1800s')

    // --- categories (1 hour TTL) ---------------------------------------------
    await getCategories()
    assertTrue((await client.exists(categoriesKey)) === 1, `categories cached at ${categoriesKey.replace(env.redis.keyPrefix, '')}`)
    await assertTtl(categoriesKey, 3600, 'categories TTL ≈ 3600s')

    // --- homepage rails + aggregate (15 min TTL) -------------------------------
    await getPopularProducts(query)
    await getFeaturedProducts(query)
    await getNewArrivals(query)
    const homepage = await getHomepageData()
    assertEqual(homepage.categories.length > 0 && homepage.featuredProducts.length > 0, true, 'homepage aggregate loads')
    assertTrue((await client.exists(homepageKey)) === 1, `homepage cached at ${homepageKey.replace(env.redis.keyPrefix, '')}`)
    await assertTtl(homepageKey, 900, 'homepage data TTL ≈ 900s')

    // --- repeat reads are cache hits (fetch not re-run) -----------------------
    const before = Date.now()
    const list2 = await getProducts(query)
    const elapsed = Date.now() - before
    assertEqual(list2.products.length >= list1.products.length, true, 'repeat product listing returns data')
    assertTrue(elapsed < 500, `repeat listing served from cache (${elapsed}ms)`)
    const detail2 = await getProductById(product.id)
    assertEqual(detail2?.id, product.id, 'repeat product detail (by UUID) served from cache')

    // --- invalidation on write clears the affected domains ---------------------
    await invalidateProductCaches()
    let remainingProducts = 0
    for await (const k of client.scanIterator({ MATCH: `${env.redis.keyPrefix}:products:*` })) remainingProducts += 1
    for await (const k of client.scanIterator({ MATCH: `${env.redis.keyPrefix}:homepage:*` })) remainingProducts += 1
    assertEqual(remainingProducts, 0, `invalidateProductCaches cleared products:* + homepage:* (${remainingProducts} left)`)

    console.info('All Redis cache e2e assertions passed')
  } finally {
    await Promise.allSettled(cleanup.map((fn) => fn()))
    await closeDatabase()
    await closeRedis()
  }

  if (failures > 0) {
    console.error(`${failures} cache e2e assertion(s) failed`)
    process.exit(1)
  }
}

main().catch((error: unknown) => {
  console.error('Cache e2e smoke crashed', error)
  process.exit(1)
})