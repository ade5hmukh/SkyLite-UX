import prisma from "~/lib/prisma";

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event);

    // Get the max order for the new reward
    const maxOrder = await prisma.reward.aggregate({
      _max: {
        order: true,
      },
    });

    const reward = await prisma.reward.create({
      data: {
        title: body.title,
        description: body.description || null,
        icon: body.icon || null,
        pointCost: body.pointCost,
        category: body.category || null,
        color: body.color || null,
        order: (maxOrder._max.order || 0) + 1,
        enabled: body.enabled !== undefined ? body.enabled : true,
      },
    });

    // Log the activity
    try {
      await prisma.activityLog.create({
        data: {
          level: "INFO",
          serviceName: "rewards",
          message: `Created reward: ${reward.title} (${reward.pointCost} points)`,
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

    return reward;
  }
  catch (error) {
    throw createError({
      statusCode: 500,
      message: `Failed to create reward: ${error}`,
    });
  }
});

