/**
 * Redis cache smoke test.
 *
 * Proves the cache-aside layer is safe in every Redis state:
 *   1. value correctness through getOrSet (fetch always consulted on miss),
 *   2. graceful degradation when Redis is configured but unreachable,
 *   3. repeat reads are served from Redis when it is reachable,
 *   4. pattern invalidation + domain invalidators never throw.
 *
 * The test is deterministic without a real Redis: when REDIS_URL is not
 * configured it uses a dead port so the graceful-fallback path is exercised.
 *
 * Run with: npm run test:cache
 */

// Set REDIS_URL *before* any module that reads the environment is imported
// (dotenv will not override an existing var). Prefer a configured Redis;
// otherwise point at a dead port to prove a broken cache never breaks a read.
const configuredUrl = (process.env.REDIS_URL ?? '').trim()
const testUrl = configuredUrl || 'redis://127.0.0.1:6399'
process.env.REDIS_URL = testUrl

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
  // Imported after REDIS_URL is set so env.redis reflects the test URL.
  const { env } = await import('../src/config/env.js')
  const {
    getOrSet,
    setCached,
    getCached,
    invalidatePattern,
    isRedisReady,
    closeRedis,
  } = await import('../src/modules/cache/index.js')
  const {
    invalidateProductCaches,
    invalidateCategoryCaches,
    invalidateFeaturedCaches,
  } = await import('../src/modules/cache/index.js')

  console.info(`Redis cache smoke test (url=${testUrl}, enabled=${env.redis.enabled})`)

  // getRedis fires connect() asynchronously; give it a bounded window to reach
  // "ready" so cache-hit behaviour can be verified when a real Redis is up.
  for (let attempt = 0; attempt < 30 && !isRedisReady(); attempt += 1) {
    await new Promise((resolve) => setTimeout(resolve, 100))
  }

  const KEY = 'afvc:smoke:value'
  let fetchCount = 0

  // --- 1. getOrSet: value correctness ---------------------------------------
  const first = await getOrSet({
    key: KEY,
    ttlSeconds: 60,
    fetch: async () => {
      fetchCount += 1
      return { products: [{ id: 'p1', name: 'Smoke flour' }], total: 1 }
    },
  })
  assertEqual(first, { products: [{ id: 'p1', name: 'Smoke flour' }], total: 1 }, 'getOrSet returns fetched value (miss/degraded path)')
  assertEqual(fetchCount, 1, 'fetch called exactly once on first read')

  // --- 2. repeat read behavior ----------------------------------------------
  // When Redis is up this is a cache hit (fetch NOT called again); when it is
  // down the value is recomputed but still correct — both are valid outcomes.
  const second = await getOrSet({
    key: KEY,
    ttlSeconds: 60,
    fetch: async () => {
      fetchCount += 1
      return { products: [{ id: 'p1', name: 'Smoke flour' }], total: 1 }
    },
  })
  assertEqual(second, { products: [{ id: 'p1', name: 'Smoke flour' }], total: 1 }, 'repeat read returns the same value')
  if (isRedisReady()) {
    assertEqual(fetchCount, 1, 'repeat read served from cache (cache hit, no fetch)')
  } else {
    assertTrue(fetchCount === 2, `graceful degradation while Redis unavailable (fetchCount=${fetchCount}) — allowed because Redis is not ready`)
    console.info(`INFO Redis unreachable at ${testUrl}; fallback path exercised. Install Redis and set REDIS_URL to also verify cache-hit behaviour (npm run test:cache).`)
  }

  // --- 3. TTL respected (only when Redis is up) ------------------------------
  if (isRedisReady()) {
    await setCached('afvc:smoke:ttl', { ok: true }, 1)
    const pendingHit = await getCached<{ ok: boolean }>('afvc:smoke:ttl')
    assertTrue(pendingHit.hit && pendingHit.value?.ok === true, 'value stored WITH TTL is readable')

    // Wait just past the 1s TTL and confirm expiry.
    await new Promise((resolve) => setTimeout(resolve, 1100))
    const expired = await getCached<{ ok: boolean }>('afvc:smoke:ttl')
    assertTrue(!expired.hit || expired.value === null, 'entry expired after its TTL')

    // --- 4. pattern invalidation works ---------------------------------------
    await setCached('afvc:smoke:one', { n: 1 }, 300)
    await setCached('afvc:smoke:two', { n: 2 }, 300)
    await invalidatePattern('afvc:smoke:*')
    const afterOne = await getCached('afvc:smoke:one')
    const afterTwo = await getCached('afvc:smoke:two')
    assertTrue(!afterOne.hit, 'pattern invalidation removed key 1')
    assertTrue(!afterTwo.hit, 'pattern invalidation removed key 2')
    await invalidatePattern('afvc:smoke:ttl') // tidy up
  }

  // --- 5. domain invalidators never throw (even with Redis down) -------------
  await invalidateProductCaches()
  await invalidateCategoryCaches()
  await invalidateFeaturedCaches()
  assertTrue(true, 'domain invalidators complete without throwing while Redis is unavailable')

  await closeRedis()

  if (failures > 0) {
    console.error(`${failures} cache smoke test(s) failed`)
    process.exit(1)
  }
  console.info('All cache smoke tests passed')
}

main().catch((error: unknown) => {
  console.error('Cache smoke test crashed', error)
  process.exit(1)
})