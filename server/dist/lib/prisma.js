import { PrismaClient } from '@prisma/client';
import { env } from '../config/env.js';
// Neon's serverless Postgres can pause and take tens of seconds to warm up,
// and its pooled endpoint can hold connections during cold multi-query work.
// The engine defaults for waiting on the connection pool (10s) and socket
// connect (5s) are too tight for that startup latency and surface transient
// failures (P2024/P2028) even when the SQL itself succeeds. These are
// intentionally raised to give the pool time to recover; they never change
// what a transaction commits, so integrity and row-lock behaviour are
// unaffected.
const configureDatabaseUrl = (input) => {
    const url = new URL(input);
    if (!url.searchParams.has('connect_timeout')) {
        url.searchParams.set('connect_timeout', '30');
    }
    if (!url.searchParams.has('pool_timeout')) {
        url.searchParams.set('pool_timeout', '30');
    }
    return url.toString();
};
// Prisma's schema keeps DATABASE_URL as its generation-time default. The
// runtime override lets hosted deployments use the explicit external
// NEON_DATABASE_URL variable without exposing or duplicating that secret.
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
});
export async function verifyDatabaseConnection() {
    await prisma.$queryRaw `SELECT 1`;
}
export async function closeDatabase() {
    await prisma.$disconnect();
}
