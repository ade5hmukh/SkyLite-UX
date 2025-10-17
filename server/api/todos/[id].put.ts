import prisma from "~/lib/prisma";

export default defineEventHandler(async (event) => {
  try {
    const id = getRouterParam(event, "id");
    const body = await readBody(event);

    if (!id) {
      throw createError({
        statusCode: 400,
        message: "Todo ID is required",
      });
    }

    // Build update data object, only including fields that are explicitly provided
    const updateData: any = {};
    
    if (body.title !== undefined) updateData.title = body.title;
    if (body.description !== undefined) updateData.description = body.description;
    if (body.completed !== undefined) updateData.completed = body.completed;
    if (body.priority !== undefined) updateData.priority = body.priority;
    if (body.dueDate !== undefined) updateData.dueDate = body.dueDate ? new Date(body.dueDate) : null;
    if (body.todoColumnId !== undefined) updateData.todoColumnId = body.todoColumnId;
    if (body.order !== undefined) updateData.order = body.order;
    if (body.isChore !== undefined) updateData.isChore = body.isChore;
    if (body.choreType !== undefined) updateData.choreType = body.choreType;
    if (body.choreIcon !== undefined) updateData.choreIcon = body.choreIcon;
    if (body.points !== undefined) updateData.points = body.points;
    if (body.recurring !== undefined) updateData.recurring = body.recurring;
    if (body.recurringPattern !== undefined) updateData.recurringPattern = body.recurringPattern;
    if (body.recurringDaysOfWeek !== undefined) updateData.recurringDaysOfWeek = body.recurringDaysOfWeek;
    if (body.recurringDayOfMonth !== undefined) updateData.recurringDayOfMonth = body.recurringDayOfMonth;

    const todo = await prisma.todo.update({
      where: { id },
      data: updateData,
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
      let logMessage = `Updated ${todo.isChore ? "chore" : "todo"}: ${todo.title}`;
      
      // Special message if completing a todo/chore
      if (body.completed !== undefined && body.completed) {
        if (todo.points > 0) {
          logMessage = `Completed ${todo.isChore ? "chore" : "todo"}: ${todo.title} (+${todo.points} points)`;
        }
        else {
          logMessage = `Completed ${todo.isChore ? "chore" : "todo"}: ${todo.title}`;
        }
      }
      
      await prisma.activityLog.create({
        data: {
          level: "INFO",
          serviceName: todo.isChore ? "chore" : "todolist",
          message: logMessage,
          userId: todo.todoColumn?.user?.id || null,
          username: todo.todoColumn?.user?.name || null,
          entityType: "todo",
          entityId: todo.id,
          entityName: todo.title,
          metadata: {
            changes: Object.keys(updateData),
            priority: todo.priority,
            points: todo.points,
            recurring: todo.recurring,
            completed: todo.completed,
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
      message: `Failed to update todo: ${error}`,
    });
  }
});
