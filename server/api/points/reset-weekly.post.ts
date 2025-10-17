import prisma from "~/lib/prisma";
import { consola } from "consola";

// Reset weekly points for all users (runs on Sunday at midnight)
export default defineEventHandler(async (_event) => {
  try {
    consola.info("🔄 Resetting weekly points for all users...");

    // Reset pointsThisWeek to 0 for all users
    const result = await prisma.user.updateMany({
      data: {
        pointsThisWeek: 0,
      },
    });

    consola.info(`✅ Weekly points reset complete: ${result.count} users updated`);

    return {
      success: true,
      resetCount: result.count,
      message: `Successfully reset weekly points for ${result.count} user(s)`,
      timestamp: new Date().toISOString(),
    };
  }
  catch (error) {
    consola.error("❌ Failed to reset weekly points:", error);
    throw createError({
      statusCode: 500,
      message: `Failed to reset weekly points: ${error}`,
    });
  }
});




