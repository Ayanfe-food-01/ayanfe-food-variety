import { PrismaClient } from '@prisma/client';
export const prisma = new PrismaClient();
export async function verifyDatabaseConnection() {
    await prisma.$queryRaw `SELECT 1`;
}
export async function closeDatabase() {
    await prisma.$disconnect();
}
