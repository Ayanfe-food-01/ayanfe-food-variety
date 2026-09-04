import { Prisma, PrismaClient } from '@prisma/client'
import { env } from '../config/env.js'

// Transient database failures caused by serverless cold-start latency, pool
// saturation, and dropped/idle connections on the pooled endpoint. Requests
// hitting these may or may not have taken effect, so only idempotently-guarded
// writes may retry on them; the error middleware surfaces them to clients as
// 503 "store temporarily busy" everywhere else.
export const PRISMA_TRANSIENT_DB_CODES: ReadonlySet<string> = new Set([
  'P1001', // Can't reach database server
  'P1002', // Connection timed out
  'P1017', // Server closed the connection unexpectedly
  'P2024', // Connection pool timed out
  'P2028', // Transaction was rolled back under load
])

export function isTransientDatabaseError(error: unknown): boolean {
  if (error instanceof Prisma.PrismaClientKnownRequestError && PRISMA_TRANSIENT_DB_CODES.has(error.code)) {
    return true
  }
  // Connection-level failures (refused, pool/socket timeout) are thrown as
  // classes Prisma does not export, so they are recognised by their stable
  // class name instead of instanceof.
  return error instanceof Error && error.constructor.name.startsWith('PrismaClientConnection')
}

// Neon's serverless Postgres can pause and take tens of seconds to warm up,
// and its pooled endpoint can hold connections during cold multi-query work.
// The engine defaults for waiting on the connection pool (10s) and socket
// connect (5s) are too tight for that startup latency and surface transient
// failures (P2024/P2028) even when the SQL itself succeeds. These are
// intentionally raised to give the pool time to recover; they never change
// what a transaction commits, so integrity and row-lock behaviour are
// unaffected.
const configureDatabaseUrl = (input: string): string => {
  const url = new URL(input)
  if (!url.searchParams.has('connect_timeout')) {
    url.searchParams.set('connect_timeout', '30')
  }
  if (!url.searchParams.has('pool_timeout')) {
    url.searchParams.set('pool_timeout', '30')
  }
  return url.toString()
}

// Runtime DATABASE_URL override: the Prisma schema defaults to DATABASE_URL and
// the env module ensures it is set at startup.
export const prisma = new PrismaClient({
  datasources: {
    db: {
      url: configureDatabaseUrl(env.databaseUrl),
    },
  },
  transactionOptions: {
    // Time (ms) the pool may take to hand over a connection for an
    // interactive transaction before the engine gives up.
    maxWait: 30_000,
    // Total budget (ms) for an interactive transaction. Long-running
    // multi-query transactions (admin payment verification, checkout) can
    // legitimately take tens of seconds under serverless cold latency.
    // Individual calls may still pass their own tighter defaults.
    timeout: 90_000,
  },
})

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms))

// Startup probe. Neon's pooled endpoint can cold-start or shed the first
// connections, so a single transient failure would otherwise abort boot.
// Bounded retries give the pool time to warm up before the app reports the
// database as unreachable.
const STARTUP_RETRIES = 5
const STARTUP_RETRY_DELAY_MS = 1500

export async function verifyDatabaseConnection(): Promise<void> {
  let lastError: unknown
  for (let attempt = 1; attempt <= STARTUP_RETRIES; attempt += 1) {
    try {
      await prisma.$queryRaw`SELECT 1`
      return
    } catch (error) {
      lastError = error
      if (!isTransientDatabaseError(error) || attempt === STARTUP_RETRIES) {
        throw error
      }
      await sleep(STARTUP_RETRY_DELAY_MS * attempt)
    }
  }
  throw lastError
}

export async function closeDatabase(): Promise<void> {
  await prisma.$disconnect()
}