import prisma from "~/lib/prisma";

export default defineEventHandler(async (event) => {
  try {
    const id = getRouterParam(event, "id");

    if (!id) {
      throw createError({
        statusCode: 400,
        message: "Reward ID is required",
      });
    }

    // Get reward details before deletion for logging
    const reward = await prisma.reward.findUnique({
      where: { id },
    });

    if (!reward) {
      throw createError({
        statusCode: 404,
        message: "Reward not found",
      });
    }

    await prisma.reward.delete({
      where: { id },
    });

    // Log the activity
    try {
      await prisma.activityLog.create({
        data: {
          level: "INFO",
          serviceName: "rewards",
          message: `Deleted reward: ${reward.title}`,
          entityType: "reward",
          entityId: reward.id,
          entityName: reward.title,
          metadata: {
            pointCost: reward.pointCost,
            category: reward.category,
          },
        },
      });
    }
    catch (logError) {
      console.error("Failed to log activity:", logError);
    }

    return { success: true };
  }
  catch (error) {
    throw createError({
      statusCode: 500,
      message: `Failed to delete reward: ${error}`,
    });
  }
});

