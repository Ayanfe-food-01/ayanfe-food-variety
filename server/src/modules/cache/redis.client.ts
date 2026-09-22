import { createClient } from 'redis'
import { env } from '../../config/env.js'

/**
 * Redis client singleton.
 *
 * Responsibilities:
 *  - Read-only credentials (via REDIS_URL) come from the environment; nothing
 *    here is ever exposed to the frontend.
 *  - Lazy singleton creation — the first cache operation opens the connection,
 *    so a cold process does not block boot when Redis is down.
 *  - Automatic reconnection with exponential backoff (capped), so a brief
 *    Redis outage self-heals without restarting the app.
 *  - Graceful degradation: commands fail fast instead of being queued
 *    forever against a dead server (`disableOfflineQueue: true`), and every
 *    cache helper swallows Redis errors so the application always falls back
 *    to the database.
 */

/** Backoff ramp for reconnect attempts: 500ms, 1s, 2s ... capped at 8s. */
const RECONNECT_BASE_DELAY_MS = 500
const RECONNECT_MAX_DELAY_MS = 8_000
/** Give up after this many failed reconnect attempts and stay offline. */
const RECONNECT_MAX_RETRIES = 30

/** Short-armed operations so a hung peer never stalls a request thread. */
export const CACHE_COMMAND_TIMEOUT_MS = 2_000

let client: RedisClient | null = null
let connectRequested = false
// Set during graceful shutdown so the reconnect strategy stops retrying a
// connection we are deliberately tearing down.
let shuttingDown = false

/** The concrete type returned by `createClient` (full command library). */
type RedisClient = ReturnType<typeof createClient>

/**
 * Returns true when Redis caching is configured *and* enabled. This is the
 * master switch that every cache helper checks before touching the network.
 */
export const isCacheEnabled = (): boolean => env.redis.enabled

const buildClient = (): RedisClient => {
  const instance = createClient({
    url: env.redis.url,
    // Fail commands immediately while the socket is down rather than
    // buffering them in the offline queue — a queued-silently command can
    // otherwise block request latency indefinitely once Redis goes away.
    disableOfflineQueue: true,
    socket: {
      connectTimeout: CACHE_COMMAND_TIMEOUT_MS,
      // Node redis calls this after every lost connection. Return a delay in
      // ms to retry, or an Error to stop trying. Errors are logged but never
      // crash the process below.
      reconnectStrategy: (retries: number) => {
        if (shuttingDown || retries > RECONNECT_MAX_RETRIES) {
          return new Error(`Redis reconnect aborted for ${shuttingDown ? 'shutdown' : 'max retries'}`)
        }
        return Math.min(
          RECONNECT_BASE_DELAY_MS * 2 ** retries,
          RECONNECT_MAX_DELAY_MS,
        )
      },
    },
  })

  instance.on('error', (error: Error) => {
    // Redis failures are expected to happen (outage, deployment, config); the
    // whole point of the cache layer is that traffic still flows when they do.
    // Log for observability, never throw — request handlers keep working off
    // the database.
    console.warn(JSON.stringify({ event: 'redis_error', message: error.message }))
  })

  instance.on('reconnecting', () => {
    console.info(JSON.stringify({ event: 'redis_reconnecting' }))
  })

  instance.on('ready', () => {
    console.info(JSON.stringify({ event: 'redis_ready' }))
  })

  instance.on('end', () => {
    console.info(JSON.stringify({ event: 'redis_end' }))
  })

  return instance
}

/**
 * Lazily creates and connects the shared Redis client. Safe to call on every
 * request — returns the existing client once created. Never rejects; a failed
 * connection simply leaves the client in a "connect later" state so the next
 * operation retries through node redis's own reconnect strategy.
 */
export const getRedis = (): RedisClient | null => {
  if (!isCacheEnabled()) return null

  if (!client) {
    // A previous close() (e.g. after tests) must not leave the new client in
    // "shutdown" mode, otherwise this fresh instance would immediately abort.
    shuttingDown = false
    client = buildClient()
  }
  if (!connectRequested) {
    connectRequested = true
    void client.connect().catch((error: unknown) => {
      // First-connect failures (e.g. Redis not yet deployed) should not crash
      // boot. node redis will keep retrying per reconnectStrategy.
      console.warn(JSON.stringify({
        event: 'redis_connect_failed',
        message: error instanceof Error ? error.message : String(error),
      }))
    })
  }
  return client
}

/**
 * True when the underlying socket is open and ready for commands. All cache
 * helpers gate on this before issuing a command, which together with
 * disableOfflineQueue keeps calls fast and non-blocking while offline.
 */
export const isRedisReady = (): boolean => {
  const instance = getRedis()
  return instance !== null && instance.isReady
}

/**
 * Closes the shared client. Called during graceful shutdown. Uses `disconnect`
 * rather than `quit`: `quit` waits for the peer and can hang or trigger a
 * reconnect when Redis is already gone, while `disconnect` stops the socket and
 * cancels the reconnect loop immediately.
 */
export const closeRedis = async (): Promise<void> => {
  if (!client || !connectRequested) return
  shuttingDown = true
  try {
    client.disconnect()
  } catch (error: unknown) {
    console.warn(JSON.stringify({
      event: 'redis_close_failed',
      message: error instanceof Error ? error.message : String(error),
    }))
  } finally {
    client = null
    connectRequested = false
  }
}