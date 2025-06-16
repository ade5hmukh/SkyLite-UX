import prisma from "~/lib/prisma";

export default defineEventHandler(async (event) => {
  try {
    const userId = getRouterParam(event, "id");

    if (!userId) {
      throw createError({
        statusCode: 400,
        message: "User ID is required",
      });
    }

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        todoColumn: {
          include: {
            todos: true,
          },
        },
      },
    });

    if (!existingUser) {
      throw createError({
        statusCode: 404,
        message: "User not found",
      });
    }

    // Delete user and associated todo column in a transaction
    await prisma.$transaction(async (tx) => {
      // If the user has a todo column with todos, delete them
      if (existingUser.todoColumn && existingUser.todoColumn.todos.length > 0) {
        // Delete all todos in the user's column
        await tx.todo.deleteMany({
          where: { todoColumnId: existingUser.todoColumn.id },
        });
      }

      // Delete the user's todo column (if exists)
      if (existingUser.todoColumn) {
        await tx.todoColumn.delete({
          where: { id: existingUser.todoColumn.id },
        });
      }

      // Delete the user
      await tx.user.delete({
        where: { id: userId },
      });
    });

    return { success: true };
  }
  catch (error) {
    throw createError({
      statusCode: 500,
      message: `Failed to delete user: ${error}`,
    });
  }
});
