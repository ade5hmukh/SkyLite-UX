import { consola } from "consola";

import prisma from "~/lib/prisma";
import { BIG_REWARD_CATEGORY } from "~/types/rewards";

export function isBigReward(reward: { category: string | null }) {
  return reward.category === BIG_REWARD_CATEGORY;
}

/** Spends expiring points first; big rewards top up from the savings jar. */
export async function redeemReward(rewardId: string, userId: string, options: { notes?: string | null; source?: string } = {}) {
  const reward = await prisma.reward.findUnique({ where: { id: rewardId } });
  if (!reward)
    throw createError({ statusCode: 404, message: "Reward not found" });
  if (!reward.enabled)
    throw createError({ statusCode: 400, message: "This reward is not currently available" });

  const redemption = await prisma.$transaction(async (tx) => {
    const [user] = await tx.$queryRaw<{ name: string; points: number; savedPoints: number; savingGoalId: string | null }[]>`
      SELECT "name", "points", "savedPoints", "savingGoalId" FROM "users" WHERE "id" = ${userId} FOR UPDATE`;
    if (!user)
      throw createError({ statusCode: 404, message: "User not found" });

    const available = user.points + (isBigReward(reward) ? user.savedPoints : 0);
    if (available < reward.pointCost) {
      throw createError({
        statusCode: 400,
        message: `Not enough points. You have ${available} points but need ${reward.pointCost} points.`,
      });
    }

    const fromPoints = Math.min(user.points, reward.pointCost);
    const fromSaved = reward.pointCost - fromPoints;
    await tx.user.update({
      where: { id: userId },
      data: {
        points: { decrement: fromPoints },
        savedPoints: { decrement: fromSaved },
        ...(user.savingGoalId === reward.id ? { savingGoalId: null } : {}),
      },
    });

    return tx.rewardRedemption.create({
      data: {
        rewardId: reward.id,
        userId,
        pointsSpent: reward.pointCost,
        pointsFromSaved: fromSaved,
        status: "PENDING",
        notes: options.notes || null,
      },
      include: {
        reward: true,
        user: { select: { id: true, name: true, avatar: true, points: true, savedPoints: true } },
      },
    });
  });

  try {
    await prisma.activityLog.create({
      data: {
        level: "INFO",
        serviceName: "rewards",
        message: `${redemption.user.name} redeemed: ${reward.title} (-${reward.pointCost} points)`,
        userId,
        username: redemption.user.name,
        entityType: "reward_redemption",
        entityId: redemption.id,
        entityName: reward.title,
        metadata: {
          rewardId: reward.id,
          pointsSpent: reward.pointCost,
          pointsFromSaved: redemption.pointsFromSaved,
          remainingPoints: redemption.user.points,
          remainingSaved: redemption.user.savedPoints,
          source: options.source ?? "app",
        },
      },
    });
  }
  catch (error) {
    consola.warn("Rewards: Failed to log redemption:", error);
  }

  return redemption;
}

/** Moves points between spendable points and the savings jar. Positive saves; negative takes back out. */
export async function moveSavings(userId: string, amount: number) {
  if (!Number.isInteger(amount) || amount === 0)
    throw createError({ statusCode: 400, message: "Amount must be a whole number" });

  const { count } = amount > 0
    ? await prisma.user.updateMany({
        where: { id: userId, points: { gte: amount } },
        data: { points: { decrement: amount }, savedPoints: { increment: amount } },
      })
    : await prisma.user.updateMany({
        where: { id: userId, savedPoints: { gte: -amount } },
        data: { points: { increment: -amount }, savedPoints: { decrement: -amount } },
      });
  if (count === 0)
    throw createError({ statusCode: 400, message: "Not enough points" });

  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: { id: true, name: true, points: true, savedPoints: true },
  });
  await prisma.activityLog.create({
    data: {
      level: "INFO",
      serviceName: "rewards",
      message: amount > 0
        ? `${user.name} saved ${amount} points in the savings jar`
        : `Took ${-amount} points out of ${user.name}'s savings jar`,
      userId,
      username: user.name,
      entityType: "user",
      entityId: userId,
      entityName: user.name,
      metadata: { amount, points: user.points, savedPoints: user.savedPoints },
    },
  }).catch(error => consola.warn("Rewards: Failed to log savings move:", error));
  return user;
}

export async function setSavingGoal(userId: string, rewardId: string | null) {
  if (rewardId) {
    const reward = await prisma.reward.findUnique({ where: { id: rewardId } });
    if (!reward || !reward.enabled || !isBigReward(reward))
      throw createError({ statusCode: 400, message: "Only big rewards can be a savings goal" });
  }
  return prisma.user.update({
    where: { id: userId },
    data: { savingGoalId: rewardId },
    select: { id: true, savingGoalId: true },
  });
}

/**
 * Friday midnight: points can be spent for two weekends; anything older than the week that just ended
 * moves into the savings jar (oldest points count as spent first). Nothing earned is ever lost.
 */
export async function rollOverOldPoints() {
  const users = await prisma.user.findMany({ select: { id: true, name: true, points: true, pointsThisWeek: true } });
  let movedTotal = 0;
  for (const user of users) {
    const moved = Math.max(0, user.points - Math.max(0, user.pointsThisWeek));
    await prisma.$executeRaw`UPDATE "users" SET
      "savedPoints" = "savedPoints" + GREATEST("points" - GREATEST("pointsThisWeek", 0), 0),
      "points" = LEAST("points", GREATEST("pointsThisWeek", 0)),
      "pointsThisWeek" = 0,
      "updatedAt" = NOW()
      WHERE "id" = ${user.id}`;
    if (moved > 0) {
      movedTotal += moved;
      await prisma.activityLog.create({
        data: {
          level: "INFO",
          serviceName: "rewards",
          message: `${moved} unspent points moved to ${user.name}'s savings jar`,
          userId: user.id,
          username: user.name,
          entityType: "user",
          entityId: user.id,
          entityName: user.name,
          metadata: { moved },
        },
      }).catch(error => consola.warn("Rewards: Failed to log rolled-over points:", error));
    }
  }
  return { resetCount: users.length, movedTotal };
}
