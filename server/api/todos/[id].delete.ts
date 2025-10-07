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

    await prisma.todo.delete({
      where: { id },
    });

    return { success: true };
  }
  catch (error) {
    throw createError({
      statusCode: 500,
      message: `Failed to delete todo: ${error}`,
    });
  }
});
