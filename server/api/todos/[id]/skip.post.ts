import prisma from "~/lib/prisma";
import { consola } from "consola";

// Mark a recurring todo to skip the next occurrence
export default defineEventHandler(async (event) => {
  try {
    const id = getRouterParam(event, "id");

    if (!id) {
      throw createError({
        statusCode: 400,
        message: "Todo ID is required",
      });
    }

    const todo = await prisma.todo.update({
      where: { id },
      data: {
        skipNext: true,
      },
    });

    consola.info(`⏭️ Marked todo "${todo.title}" to skip next occurrence`);

    return {
      success: true,
      message: "Todo will skip next occurrence",
      todo,
    };
  }
  catch (error) {
    consola.error("❌ Failed to mark todo for skip:", error);
    throw createError({
      statusCode: 500,
      message: `Failed to mark todo for skip: ${error}`,
    });
  }
});

