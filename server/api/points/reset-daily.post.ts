import prisma from "~/lib/prisma";
import { consola } from "consola";

// Reset daily points for all users (runs at midnight)
export default defineEventHandler(async (_event) => {
  try {
    consola.info("🔄 Resetting daily points for all users...");

    // Reset pointsToday to 0 for all users
    const result = await prisma.user.updateMany({
      data: {
        pointsToday: 0,
      },
    });

    consola.info(`✅ Daily points reset complete: ${result.count} users updated`);

    return {
      success: true,
      resetCount: result.count,
      message: `Successfully reset daily points for ${result.count} user(s)`,
      timestamp: new Date().toISOString(),
    };
  }
  catch (error) {
    consola.error("❌ Failed to reset daily points:", error);
    throw createError({
      statusCode: 500,
      message: `Failed to reset daily points: ${error}`,
    });
  }
});




