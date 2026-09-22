import { isRedisReady, getRedis, CACHE_COMMAND_TIMEOUT_MS } from './redis.client.js'
import { env } from '../../config/env.js'

/**
 * High-level cache-aside helpers.
 *
 * Every operation here is best-effort: Redis failures degrade to a plain
 * database read/write and are logged as `cache_error` so they show up in
 * monitoring without ever surfacing to the user. Request latency is also
 * guarded because commands carry a timeout and node redis fails queued
 * commands immediately while the socket is down.
 *
 * Metrics logged (structured JSON, matching the app's logging convention):
 *   - `cache_hit`      -> value was served from Redis, DB untouched
 *   - `cache_miss`     -> value was not in Redis, loaded from DB and re-cached
 *   - `cache_error`    -> Redis failed (hit, set, or invalidation); DB is used
 *   - `cache_disabled` -> caching is switched off; straight DB read
 *   - `cache_invalidated` -> SCAN-based pattern invalidation completed
 *
 * `cache_down` is rate-limited: every request hits `getCached` while Redis is
 * unavailable, and logging the same fact on every one of those requests would
 * flood the logs during an outage. Config-level disablement (`cache_disabled`)
 * is a conscious deployment choice and is logged per call.
 */

const log = (event: string, extra: Record<string, unknown>): void => {
  console.info(JSON.stringify({ event, ...extra }))
}

const warn = (event: string, extra: Record<string, unknown>): void => {
  console.warn(JSON.stringify({ event, ...extra }))
}

/**
 * Attaches a hard timeout to a Redis command. If the command does not settle
 * within `ms`, the promise resolves with `fallback` so a hung peer can never
 * stall a request. Redis normally fails fast itself because the offline queue
 * is disabled, but first-connect hangs need this backstop.
 */
const withTimeout = <T>(command: Promise<T>, fallback: T): Promise<T> =>
  Promise.race([
    command,
    new Promise<T>((resolve) => setTimeout(() => resolve(fallback), CACHE_COMMAND_TIMEOUT_MS)),
  ])

const safeDeserialize = <T>(raw: string | null | undefined): T | null => {
  if (raw === null || raw === undefined) return null
  try {
    return JSON.parse(raw) as T
  } catch {
    // Corrupt payloads are treated as misses; the next read re-populates.
    return null
  }
}

// During a Redis outage every request crosses getCached; log that once per
// window instead of once per request.
const CACHE_DOWN_WARN_INTERVAL_MS = 60_000
let lastCacheDownWarn = 0

const warnCacheDown = (): void => {
  const now = Date.now()
  if (now - lastCacheDownWarn < CACHE_DOWN_WARN_INTERVAL_MS) return
  lastCacheDownWarn = now
  warn('cache_down', {
    message: 'Redis unavailable; serving from the database until it recovers.',
  })
}

/**
 * Cache-aside read: returns `{ hit, value }`. `hit === false` means the key
 * was absent (or Redis failed) and the caller should load from the database.
 */
export async function getCached<T>(key: string): Promise<{ hit: boolean; value: T | null }> {
  if (!isRedisReady()) {
    if (!env.redis.enabled) {
      log('cache_disabled', { key })
    } else {
      warnCacheDown()
    }
    return { hit: false, value: null }
  }

  const client = getRedis()
  if (!client) return { hit: false, value: null }

  try {
    const raw = await withTimeout(client.get(key), null)
    if (raw === null) {
      log('cache_miss', { key })
      return { hit: false, value: null }
    }
    const value = safeDeserialize<T>(raw)
    log('cache_hit', { key })
    return { hit: true, value }
  } catch (error: unknown) {
    warn('cache_error', {
      key,
      operation: 'get',
      message: error instanceof Error ? error.message : String(error),
    })
    return { hit: false, value: null }
  }
}

/**
 * Stores a JSON value under `key` with a TTL in seconds. Returns false when
 * Redis is unavailable or the write fails — again, never an error for callers.
 */
export async function setCached<T>(key: string, value: T, ttlSeconds: number): Promise<boolean> {
  if (!isRedisReady()) return false

  const client = getRedis()
  if (!client) return false

  try {
    const serialized = JSON.stringify(value)
    await withTimeout(client.set(key, serialized, { EX: ttlSeconds }), 'OK')
    return true
  } catch (error: unknown) {
    warn('cache_error', {
      key,
      operation: 'set',
      message: error instanceof Error ? error.message : String(error),
    })
    return false
  }
}

/**
 * Removes one key. Best-effort, never throws.
 */
export async function deleteCachedKey(key: string): Promise<void> {
  if (!isRedisReady()) return
  const client = getRedis()
  if (!client) return

  try {
    await withTimeout(client.unlink(key), 0)
  } catch (error: unknown) {
    warn('cache_error', {
      key,
      operation: 'unlink',
      message: error instanceof Error ? error.message : String(error),
    })
  }
}

/**
 * Deletes every key matching a glob pattern (e.g. `afvc:products:*`).
 *
 * Uses SCAN + UNLINK instead of KEYS so the operation never blocks the Redis
 * server, which matters as the key count grows. Keys are deleted in bounded
 * batches. Best-effort: failures are logged and swallowed.
 */
export async function invalidatePattern(pattern: string): Promise<void> {
  if (!isRedisReady()) return
  const client = getRedis()
  if (!client) return

  const SCAN_BATCH = 100
  let scanned = 0
  try {
    for await (const key of client.scanIterator({ MATCH: pattern, COUNT: SCAN_BATCH })) {
      scanned += 1
      await withTimeout(client.unlink(key), 0)
    }
    log('cache_invalidated', { pattern, deleted: scanned })
  } catch (error: unknown) {
    warn('cache_error', {
      pattern,
      operation: 'invalidate',
      message: error instanceof Error ? error.message : String(error),
    })
  }
}

/**
 * The canonical cache-aside entrypoint.
 *
 *   1. look `key` up in Redis                 -> on hit, return the value
 *   2. on miss (or Redis failure) run `fetch`
 *   3. store the freshly computed value for `ttlSeconds`
 *   4. return the value
 *
 * A Redis outage therefore never changes behaviour: `fetch` runs and the
 * response is correct, only slightly slower while Redis is down.
 */
export async function getOrSet<T>(options: {
  key: string
  ttlSeconds: number
  fetch: () => Promise<T>
}): Promise<T> {
  const { key, ttlSeconds, fetch } = options

  const cached = await getCached<T>(key)
  if (cached.hit && cached.value !== null) {
    return cached.value
  }

  const value = await fetch()

  // Re-cache best-effort. A failed set is logged but never blocks the reply.
  await setCached(key, value, ttlSeconds)
  return value
}