import { consola } from "consola";

// End of the points week (Friday midnight): points older than this week move to the savings jar
export default defineEventHandler(async (_event) => {
  try {
    consola.info("🔄 Ending the points week for all users...");
    const { resetCount, movedTotal } = await rollOverOldPoints();
    consola.info(`✅ Weekly points reset complete: ${resetCount} users updated, ${movedTotal} points moved to savings jars`);

    return {
      success: true,
      resetCount,
      movedTotal,
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
