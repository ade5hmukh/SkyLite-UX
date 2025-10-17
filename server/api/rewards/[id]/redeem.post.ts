import prisma from "~/lib/prisma";

export default defineEventHandler(async (event) => {
  try {
    const rewardId = getRouterParam(event, "id");
    const body = await readBody(event);
    const userId = body.userId;

    if (!rewardId) {
      throw createError({
        statusCode: 400,
        message: "Reward ID is required",
      });
    }

    if (!userId) {
      throw createError({
        statusCode: 400,
        message: "User ID is required",
      });
    }

    // Get reward details
    const reward = await prisma.reward.findUnique({
      where: { id: rewardId },
    });

    if (!reward) {
      throw createError({
        statusCode: 404,
        message: "Reward not found",
      });
    }

    if (!reward.enabled) {
      throw createError({
        statusCode: 400,
        message: "This reward is not currently available",
      });
    }

    // Get user details
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw createError({
        statusCode: 404,
        message: "User not found",
      });
    }

    // Check if user has enough points
    if (user.points < reward.pointCost) {
      throw createError({
        statusCode: 400,
        message: `Not enough points. You have ${user.points} points but need ${reward.pointCost} points.`,
      });
    }

    // Create redemption and deduct points in a transaction
    const redemption = await prisma.$transaction(async (tx) => {
      // Deduct points from user
      await tx.user.update({
        where: { id: userId },
        data: {
          points: {
            decrement: reward.pointCost,
          },
        },
      });

      // Create redemption record
      const newRedemption = await tx.rewardRedemption.create({
        data: {
          rewardId: reward.id,
          userId: user.id,
          pointsSpent: reward.pointCost,
          status: "PENDING",
          notes: body.notes || null,
        },
        include: {
          reward: true,
          user: {
            select: {
              id: true,
              name: true,
              avatar: true,
              points: true,
            },
          },
        },
      });

      return newRedemption;
    });

    // Log the activity
    try {
      await prisma.activityLog.create({
        data: {
          level: "INFO",
          serviceName: "rewards",
          message: `${user.name} redeemed: ${reward.title} (-${reward.pointCost} points)`,
          userId: user.id,
          username: user.name,
          entityType: "reward_redemption",
          entityId: redemption.id,
          entityName: reward.title,
          metadata: {
            rewardId: reward.id,
            pointsSpent: reward.pointCost,
            remainingPoints: user.points - reward.pointCost,
          },
        },
      });
    }
    catch (logError) {
      console.error("Failed to log activity:", logError);
    }

    return redemption;
  }
  catch (error) {
    if (error.statusCode) {
      throw error;
    }
    throw createError({
      statusCode: 500,
      message: `Failed to redeem reward: ${error}`,
    });
  }
});

