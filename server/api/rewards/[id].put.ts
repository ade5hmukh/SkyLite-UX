import prisma from "~/lib/prisma";

export default defineEventHandler(async (event) => {
  try {
    const id = getRouterParam(event, "id");
    const body = await readBody(event);

    if (!id) {
      throw createError({
        statusCode: 400,
        message: "Reward ID is required",
      });
    }

    // Build update data object
    const updateData: any = {};

    if (body.title !== undefined) updateData.title = body.title;
    if (body.description !== undefined) updateData.description = body.description;
    if (body.icon !== undefined) updateData.icon = body.icon;
    if (body.pointCost !== undefined) updateData.pointCost = body.pointCost;
    if (body.category !== undefined) updateData.category = body.category;
    if (body.color !== undefined) updateData.color = body.color;
    if (body.order !== undefined) updateData.order = body.order;
    if (body.enabled !== undefined) updateData.enabled = body.enabled;

    const reward = await prisma.reward.update({
      where: { id },
      data: updateData,
    });

    // Log the activity
    try {
      await prisma.activityLog.create({
        data: {
          level: "INFO",
          serviceName: "rewards",
          message: `Updated reward: ${reward.title}`,
          entityType: "reward",
          entityId: reward.id,
          entityName: reward.title,
          metadata: {
            changes: Object.keys(updateData),
            pointCost: reward.pointCost,
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
      message: `Failed to update reward: ${error}`,
    });
  }
});

