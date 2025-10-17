import prisma from "~/lib/prisma";
import { consola } from "consola";

// TEST ENDPOINT - manually trigger daily + weekly points reset
export default defineEventHandler(async (_event) => {
  try {
    consola.info("🧪 TEST: Resetting daily and weekly points...");

    // Reset both daily and weekly points
    const result = await prisma.user.updateMany({
      data: {
        pointsToday: 0,
        pointsThisWeek: 0,
      },
    });

    consola.info(`✅ TEST RESET: Reset points for ${result.count} users`);

    return {
      success: true,
      resetCount: result.count,
      message: `Successfully reset daily and weekly points for ${result.count} user(s)`,
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




