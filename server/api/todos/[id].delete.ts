import prisma from "~/lib/prisma";

export default defineEventHandler(async (event) => {
  try {
    const id = getRouterParam(event, "id");

    if (!id) {
      throw createError({
        statusCode: 400,
        message: "Todo ID is required",
      });
    }

    const todo = await prisma.todo.delete({
      where: { id },
      include: {
        todoColumn: {
          select: {
            name: true,
            user: { select: { id: true, name: true } },
          },
        },
      },
    });

    // Log the activity
    try {
      await prisma.activityLog.create({
        data: {
          level: "INFO",
          serviceName: todo.isChore ? "chore" : "todolist",
          message: `Deleted ${todo.isChore ? "chore" : "todo"}: ${todo.title}`,
          userId: todo.todoColumn?.user?.id || null,
          username: todo.todoColumn?.user?.name || null,
          entityType: "todo",
          entityId: todo.id,
          entityName: todo.title,
          metadata: {
            points: todo.points,
            recurring: todo.recurring,
            columnName: todo.todoColumn?.name,
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
      message: `Failed to delete todo: ${error}`,
    });
  }
});
