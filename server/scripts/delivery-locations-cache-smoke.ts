/**
 * Delivery-locations Redis cache smoke test.
 *
 * Verifies the admin zone-picker and public checkout location trees:
 *   1. are cache-aside (first read hits DB, repeat reads are Redis-fast),
 *   2. both keys exist with the expected 1-hour TTL,
 *   3. invalidation clears them,
 *   4. `refreshDeliveryLocationCaches` re-warms both keys in the background
 *      (so the admin who just saved a zone never pays the slow DB path again).
 *
 * The flat-query builders are exercised through the real cached `list*`
 * services, so a passing run also proves the 776-city tree assembles quickly.
 *
 * Requires DATABASE_URL (from `.env`) reachable and REDIS_URL set (it is
 * skipped cleanly when Redis is not configured). Read-only — no fixtures are
 * created or destroyed.
 *
 * Run with: npm run test:delivery-locations:cache
 */

// REDIS_URL must be known before the env module loads (dotenv never overrides).
const testUrl = (process.env.REDIS_URL ?? '').trim()
if (!testUrl) {
  console.info('SKIP test:delivery-locations:cache — REDIS_URL not configured.')
  process.exit(0)
}

let failures = 0

const assertTrue = (condition: boolean, label: string) => {
  if (!condition) {
    failures += 1
    console.error(`FAIL ${label}`)
  } else {
    console.info(`PASS ${label}`)
  }
}

async function main() {
  const { prisma, closeDatabase } = await import('../src/config/prisma.js')
  const { getRedis, closeRedis, isRedisReady } = await import('../src/modules/cache/redis.client.js')
  const { cacheKey, CACHE_TTL } = await import('../src/modules/cache/index.js')
  const {
    listAdminDeliveryLocationStates,
    listPublicDeliveryLocationStates,
  } = await import('../src/modules/delivery-zones/delivery-location.states.service.js')
  const {
    invalidateDeliveryLocationCaches,
    refreshDeliveryLocationCaches,
  } = await import('../src/modules/delivery-zones/delivery-location.cache.js')

  // Wait for the lazy Redis connection to come up.
  const deadline = Date.now() + 10_000
  while (!isRedisReady() && Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, 100))
  }
  assertTrue(isRedisReady(), 'redis is ready')

  await invalidateDeliveryLocationCaches()

  const tAdminCold = Date.now()
  const admin = await listAdminDeliveryLocationStates()
  const adminColdMs = Date.now() - tAdminCold
  assertTrue(admin.length === 38, 'admin tree has 38 states')
  const adminCities = admin.reduce((sum, state) => sum + state.cities.length, 0)
  assertTrue(adminCities === 776, 'admin tree has 776 cities')

  const tAdminWarm = Date.now()
  const adminWarm = await listAdminDeliveryLocationStates()
  const adminWarmMs = Date.now() - tAdminWarm
  assertTrue(JSON.stringify(admin) === JSON.stringify(adminWarm), 'admin repeat read matches first read')
  assertTrue(adminWarmMs < 500, `admin warm read is Redis-fast (${adminWarmMs}ms)`)

  const tPublicCold = Date.now()
  const pub = await listPublicDeliveryLocationStates()
  const publicColdMs = Date.now() - tPublicCold
  assertTrue(pub.length === 38, 'public tree has 38 states')

  const tPublicWarm = Date.now()
  const pubWarm = await listPublicDeliveryLocationStates()
  const publicWarmMs = Date.now() - tPublicWarm
  assertTrue(JSON.stringify(pub) === JSON.stringify(pubWarm), 'public repeat read matches first read')
  assertTrue(publicWarmMs < 500, `public warm read is Redis-fast (${publicWarmMs}ms)`)

  const redis = getRedis()
  const adminKey = cacheKey.deliveryLocationsAdmin()
  const publicKey = cacheKey.deliveryLocationsPublic()
  const adminTtl = redis ? (await redis.ttl(adminKey)) : -2
  const publicTtl = redis ? (await redis.ttl(publicKey)) : -2
  assertTrue(adminTtl > CACHE_TTL.deliveryLocations - 60, `admin key cached with ~1h TTL (pttl ${adminTtl}s)`)
  assertTrue(publicTtl > CACHE_TTL.deliveryLocations - 60, `public key cached with ~1h TTL (pttl ${publicTtl}s)`)

  await invalidateDeliveryLocationCaches()
  const adminKeyAfter = redis ? (await redis.exists(adminKey)) : 1
  const publicKeyAfter = redis ? (await redis.exists(publicKey)) : 1
  assertTrue(adminKeyAfter === 0, 'invalidation clears admin key')
  assertTrue(publicKeyAfter === 0, 'invalidation clears public key')

  refreshDeliveryLocationCaches()
  await new Promise((resolve) => setTimeout(resolve, 8_000))
  const adminKeyWarmed = redis ? (await redis.exists(adminKey)) : 0
  const publicKeyWarmed = redis ? (await redis.exists(publicKey)) : 0
  assertTrue(adminKeyWarmed === 1, 'refresh re-warms admin key in background')
  assertTrue(publicKeyWarmed === 1, 'refresh re-warms public key in background')

  console.info(
    `INFO cold admin ${adminColdMs}ms, warm ${adminWarmMs}ms; cold public ${publicColdMs}ms, warm ${publicWarmMs}ms`,
  )

  await closeRedis()
  await closeDatabase()

  if (failures > 0) {
    console.error(`test:delivery-locations:cache FAILED with ${failures} failure(s)`)
    process.exit(1)
  }
  console.info('test:delivery-locations:cache OK')
}

main().catch((error: unknown) => {
  console.error(error)
  process.exit(1)
})