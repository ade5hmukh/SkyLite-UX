-- AlterTable
ALTER TABLE "users" ADD COLUMN "savedPoints" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "savingGoalId" TEXT;

-- AlterTable
ALTER TABLE "reward_redemptions" ADD COLUMN "pointsFromSaved" INTEGER NOT NULL DEFAULT 0;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_savingGoalId_fkey" FOREIGN KEY ("savingGoalId") REFERENCES "rewards"("id") ON DELETE SET NULL ON UPDATE CASCADE;
