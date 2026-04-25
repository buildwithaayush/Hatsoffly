-- AlterTable
ALTER TABLE "User" ADD COLUMN "emailVerifiedAt" TIMESTAMP(3);

-- Backfill: owners who completed phone verify are treated as email-verified for existing rows
UPDATE "User" SET "emailVerifiedAt" = COALESCE("phoneVerifiedAt", "createdAt") WHERE "emailVerifiedAt" IS NULL;

-- CreateTable
CREATE TABLE "AccountContactChallenge" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "destination" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AccountContactChallenge_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AccountContactChallenge_userId_idx" ON "AccountContactChallenge"("userId");

-- AddForeignKey
ALTER TABLE "AccountContactChallenge" ADD CONSTRAINT "AccountContactChallenge_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
