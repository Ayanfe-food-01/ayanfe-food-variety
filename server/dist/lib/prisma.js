import { PrismaClient } from '@prisma/client';
import { env } from '../config/env.js';
// Prisma's schema keeps DATABASE_URL as its generation-time default. The
// runtime override lets hosted deployments use the explicit external
// NEON_DATABASE_URL variable without exposing or duplicating that secret.
export const prisma = new PrismaClient({
    datasources: {
        db: {
            url: env.databaseUrl,
        },
    },
});
export async function verifyDatabaseConnection() {
    await prisma.$queryRaw `SELECT 1`;
}
export async function closeDatabase() {
    await prisma.$disconnect();
}
