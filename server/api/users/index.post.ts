import prisma from "~/lib/prisma";

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event);

    const maxOrder = await prisma.todoColumn.aggregate({
      _max: {
        order: true,
      },
    });

    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          name: body.name,
          email: body.email && body.email.trim() ? body.email.trim() : null,
          avatar: body.avatar || null,
          color: body.color || null,
        },
      });

      const todoColumn = await tx.todoColumn.create({
        data: {
          name: user.name,
          userId: user.id,
          isDefault: true,
          order: ((maxOrder._max?.order) || 0) + 1,
        },
      });

      return { user, todoColumn };
    });

    // Log the activity
    try {
      await prisma.activityLog.create({
        data: {
          level: "INFO",
          serviceName: "user",
          message: `Added user: ${result.user.name}`,
          userId: result.user.id,
          username: result.user.name,
          entityType: "user",
          entityId: result.user.id,
          entityName: result.user.name,
        },
      });
    }
    catch (logError) {
      console.error("Failed to log activity:", logError);
    }

    return result.user;
  }
  catch (error) {
    throw createError({
      statusCode: 500,
      message: `Failed to create user: ${error}`,
    });
  }
});
