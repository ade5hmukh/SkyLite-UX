import { consola } from "consola";

// End of the points week (Friday midnight): expire points older than this week, then start a new week
export default defineEventHandler(async (_event) => {
  try {
    consola.info("🔄 Ending the points week for all users...");
    const { resetCount, expiredTotal } = await expireOldPoints();
    consola.info(`✅ Weekly points reset complete: ${resetCount} users updated, ${expiredTotal} points expired`);

    return {
      success: true,
      resetCount,
      expiredTotal,
      message: `Successfully reset weekly points for ${resetCount} user(s)`,
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
