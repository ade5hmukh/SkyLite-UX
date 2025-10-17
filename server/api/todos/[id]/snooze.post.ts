import prisma from "~/lib/prisma";
import { consola } from "consola";

// Snooze a recurring todo until a specific date
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

    if (!body.snoozedUntil) {
      throw createError({
        statusCode: 400,
        message: "snoozedUntil date is required",
      });
    }

    const snoozedUntil = new Date(body.snoozedUntil);

    const todo = await prisma.todo.update({
      where: { id },
      data: {
        snoozedUntil,
      },
    });

    consola.info(`⏸️ Snoozed todo "${todo.title}" until ${snoozedUntil}`);

    return {
      success: true,
      message: `Todo snoozed until ${snoozedUntil.toLocaleDateString()}`,
      todo,
    };
  }
  catch (error) {
    consola.error("❌ Failed to snooze todo:", error);
    throw createError({
      statusCode: 500,
      message: `Failed to snooze todo: ${error}`,
    });
  }
});

