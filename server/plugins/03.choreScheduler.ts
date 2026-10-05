import { consola } from "consola";

export default defineNitroPlugin((_nitroApp) => {
  const isProduction = process.env.NODE_ENV === "production";
  const isDevelopment = !isProduction;

  consola.info(`🔄 Chore Scheduler: ${isProduction ? "Production" : "Development"} mode - running at midnight`);

  // Function to calculate milliseconds until next midnight
  function getMillisecondsUntilMidnight() {
    const now = new Date();
    const midnight = new Date(now);
    midnight.setHours(24, 0, 0, 0); // Set to next midnight
    return midnight.getTime() - now.getTime();
  }

  // Function to run midnight resets
  async function runMidnightResets() {
    try {
      consola.info("⏰ Running midnight resets (chores + daily points)...");
      const startedAt = new Date();

      // Save the day that just ended before anything is reset or cleared
      let reportSaved = false;
      try {
        const endedDay = getAppDayKey(new Date(startedAt.getTime() - 6 * 60 * 60 * 1000));
        const reports = await buildLiveReports(endedDay);
        await saveDailyReports(reports);
        reportSaved = true;
        consola.info(`📒 Saved ${reports.length} daily report(s) for ${endedDay}`);
      }
      catch (error) {
        consola.error("❌ Failed to save daily reports, keeping finished to-dos:", error);
      }

      // Reset recurring chores
      const choreResponse = await $fetch("/api/chores/reset-recurring", {
        method: "POST",
      });
      consola.info(`✅ Chore reset: ${choreResponse.resetCount} chores reset`);

      if (reportSaved) {
        const clearedCount = await clearFinishedDayItems(startedAt);
        consola.info(`✅ Cleared ${clearedCount} one-off item(s) from the lists`);
      }

      // Reset daily points
      const pointsResponse = await $fetch("/api/points/reset-daily", {
        method: "POST",
      });
      consola.info(`✅ Daily points reset: ${pointsResponse.resetCount} users reset`);

      // Check if it's Sunday for weekly reset
      const now = new Date();
      if (now.getDay() === 0) { // 0 = Sunday
        const weeklyResponse = await $fetch("/api/points/reset-weekly", {
          method: "POST",
        });
        consola.info(`✅ Weekly points reset: ${weeklyResponse.resetCount} users reset`);
      }

      // Schedule next reset
      scheduleNextReset();
    }
    catch (error) {
      consola.error("❌ Failed to run midnight resets:", error);
      // Still schedule next reset even if this one failed
      scheduleNextReset();
    }
  }

  // Function to schedule the next midnight reset
  function scheduleNextReset() {
    const msUntilMidnight = getMillisecondsUntilMidnight();
    const nextMidnight = new Date(Date.now() + msUntilMidnight);

    consola.info(`⏰ Next midnight reset scheduled for: ${nextMidnight.toLocaleString()}`);

    setTimeout(() => {
      runMidnightResets();
    }, msUntilMidnight);
  }

  // Start the scheduler
  if (isProduction || isDevelopment) {
    scheduleNextReset();
    setTimeout(() => {
      backfillDailyReports().catch(error => consola.error("❌ Failed to backfill daily reports:", error));
    }, 30_000);
  }
});
