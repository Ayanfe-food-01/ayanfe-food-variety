-- CreateEnum
CREATE TYPE "AuthProvider" AS ENUM ('PASSWORD', 'GOOGLE');

-- AlterTable
ALTER TABLE "users"
ADD COLUMN "auth_provider" "AuthProvider" NOT NULL DEFAULT 'PASSWORD',
ADD COLUMN "google_subject" VARCHAR(255);

-- CreateIndex
CREATE UNIQUE INDEX "users_google_subject_key" ON "users"("google_subject");