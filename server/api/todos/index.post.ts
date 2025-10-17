import prisma from "~/lib/prisma";

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event);

    const maxOrder = await prisma.todo.aggregate({
      where: {
        todoColumnId: body.todoColumnId || null,
        completed: false,
      },
      _max: {
        order: true,
      },
    });

    const todo = await prisma.todo.create({
      data: {
        title: body.title,
        description: body.description,
        priority: body.priority || "MEDIUM",
        dueDate: body.dueDate ? new Date(body.dueDate) : null,
        todoColumnId: body.todoColumnId,
        order: (maxOrder._max.order || 0) + 1,
        isChore: body.isChore ?? false,
        choreType: body.choreType ?? null,
        choreIcon: body.choreIcon ?? null,
        points: body.points ?? 0,
        recurring: body.recurring ?? false,
        recurringPattern: body.recurringPattern ?? "DAILY",
        recurringDaysOfWeek: body.recurringDaysOfWeek ?? [],
        recurringDayOfMonth: body.recurringDayOfMonth ?? null,
      },
      include: {
        todoColumn: {
          select: {
            id: true,
            name: true,
            order: true,
            isDefault: true,
            user: {
              select: {
                id: true,
                name: true,
                avatar: true,
              },
            },
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
          message: `Created ${todo.isChore ? "chore" : "todo"}: ${todo.title}`,
          userId: todo.todoColumn?.user?.id || null,
          username: todo.todoColumn?.user?.name || null,
          entityType: "todo",
          entityId: todo.id,
          entityName: todo.title,
          metadata: {
            priority: todo.priority,
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

    return todo;
  }
  catch (error) {
    throw createError({
      statusCode: 500,
      message: `Failed to create todo: ${error}`,
    });
  }
});
