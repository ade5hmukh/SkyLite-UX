import prisma from "~/lib/prisma";
import { consola } from "consola";

// TEST ENDPOINT - manually trigger recurring chore reset
export default defineEventHandler(async (_event) => {
  try {
    consola.info("🧪 MANUAL TEST: Resetting recurring chores...");

    // Reset all recurring todos by setting completed = false
    const result = await prisma.todo.updateMany({
      where: {
        recurring: true,
        completed: true,
      },
      data: {
        completed: false,
      },
    });

    consola.info(`✅ TEST RESET: Reset ${result.count} recurring chores`);

    return {
      success: true,
      resetCount: result.count,
      message: `Successfully reset ${result.count} recurring chore(s)`,
      timestamp: new Date().toISOString(),
    };
  }
  catch (error) {
    consola.error("❌ TEST RESET FAILED:", error);
    throw createError({
      statusCode: 500,
      message: `Failed to test reset: ${error}`,
    });
  }
});




