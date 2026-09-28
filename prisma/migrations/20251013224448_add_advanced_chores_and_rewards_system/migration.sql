-- CreateEnum
CREATE TYPE "RecurringPattern" AS ENUM ('DAILY', 'WEEKLY', 'MONTHLY');

-- CreateEnum
CREATE TYPE "RedemptionStatus" AS ENUM ('PENDING', 'FULFILLED', 'CANCELLED');

-- AlterTable
ALTER TABLE "todos" ADD COLUMN     "lastResetDate" TIMESTAMP(3),
ADD COLUMN     "recurring" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "recurringDayOfMonth" INTEGER,
ADD COLUMN     "recurringDaysOfWeek" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
ADD COLUMN     "recurringPattern" "RecurringPattern" DEFAULT 'DAILY',
ADD COLUMN     "skipNext" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "snoozedUntil" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "pointsThisWeek" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "pointsToday" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "rewards" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "icon" TEXT,
    "pointCost" INTEGER NOT NULL,
    "category" TEXT,
    "color" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rewards_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reward_redemptions" (
    "id" TEXT NOT NULL,
    "rewardId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "pointsSpent" INTEGER NOT NULL,
    "status" "RedemptionStatus" NOT NULL DEFAULT 'PENDING',
    "redeemedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fulfilledAt" TIMESTAMP(3),
    "notes" TEXT,

    CONSTRAINT "reward_redemptions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "reward_redemptions_userId_idx" ON "reward_redemptions"("userId");

-- CreateIndex
CREATE INDEX "reward_redemptions_rewardId_idx" ON "reward_redemptions"("rewardId");

-- CreateIndex
CREATE INDEX "reward_redemptions_status_idx" ON "reward_redemptions"("status");

-- AddForeignKey
ALTER TABLE "reward_redemptions" ADD CONSTRAINT "reward_redemptions_rewardId_fkey" FOREIGN KEY ("rewardId") REFERENCES "rewards"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reward_redemptions" ADD CONSTRAINT "reward_redemptions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
