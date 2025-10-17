import prisma from "~/lib/prisma";

export default defineEventHandler(async (event) => {
  try {
    const id = getRouterParam(event, "id");
    const body = await readBody(event);

    if (!id) {
      throw createError({
        statusCode: 400,
        message: "Redemption ID is required",
      });
    }

    // Get current redemption
    const currentRedemption = await prisma.rewardRedemption.findUnique({
      where: { id },
      include: {
        reward: true,
        user: true,
      },
    });

    if (!currentRedemption) {
      throw createError({
        statusCode: 404,
        message: "Redemption not found",
      });
    }

    // Build update data
    const updateData: any = {};

    if (body.status !== undefined) {
      updateData.status = body.status;

      // If marking as fulfilled, set the fulfilledAt timestamp
      if (body.status === "FULFILLED" && !currentRedemption.fulfilledAt) {
        updateData.fulfilledAt = new Date();
      }

      // If cancelling, refund the points
      if (body.status === "CANCELLED" && currentRedemption.status !== "CANCELLED") {
        await prisma.user.update({
          where: { id: currentRedemption.userId },
          data: {
            points: {
              increment: currentRedemption.pointsSpent,
            },
          },
        });
      }
    }

    if (body.notes !== undefined) {
      updateData.notes = body.notes;
    }

    const redemption = await prisma.rewardRedemption.update({
      where: { id },
      data: updateData,
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

    // Log the activity
    try {
      let message = `Updated redemption status: ${redemption.reward.title} - ${redemption.status}`;

      if (body.status === "FULFILLED") {
        message = `Fulfilled reward: ${redemption.reward.title} for ${redemption.user.name}`;
      }
      else if (body.status === "CANCELLED") {
        message = `Cancelled redemption: ${redemption.reward.title} for ${redemption.user.name} (+${redemption.pointsSpent} refunded)`;
      }

      await prisma.activityLog.create({
        data: {
          level: "INFO",
          serviceName: "rewards",
          message,
          userId: redemption.userId,
          username: redemption.user.name,
          entityType: "reward_redemption",
          entityId: redemption.id,
          entityName: redemption.reward.title,
          metadata: {
            status: redemption.status,
            pointsSpent: redemption.pointsSpent,
            refunded: body.status === "CANCELLED",
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
      message: `Failed to update redemption: ${error}`,
    });
  }
});

