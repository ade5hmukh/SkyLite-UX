import prisma from "~/lib/prisma";
import { consola } from "consola";

export default defineEventHandler(async (_event) => {
  try {
    const now = new Date();
    const today = now.getDay(); // 0 (Sunday) to 6 (Saturday)
    const dayOfMonth = now.getDate(); // 1 to 31
    
    // Get all recurring todos that are completed
    const todos = await prisma.todo.findMany({
      where: {
        recurring: true,
        completed: true,
      },
    });

    let resetCount = 0;
    let skipCount = 0;

    for (const todo of todos) {
      // Check if snoozed
      if (todo.snoozedUntil && todo.snoozedUntil > now) {
        consola.debug(`⏸️ Todo "${todo.title}" is snoozed until ${todo.snoozedUntil}`);
        continue;
      }

      // Check if should skip next occurrence
      if (todo.skipNext) {
        consola.debug(`⏭️ Skipping next occurrence of "${todo.title}"`);
        await prisma.todo.update({
          where: { id: todo.id },
          data: { skipNext: false },
        });
        skipCount++;
        continue;
      }

      // Check if should reset based on pattern
      let shouldReset = false;
      const pattern = todo.recurringPattern || "DAILY";

      switch (pattern) {
        case "DAILY":
          shouldReset = true;
          break;

        case "WEEKLY":
          // Check if today is in the recurring days
          if (todo.recurringDaysOfWeek && todo.recurringDaysOfWeek.length > 0) {
            shouldReset = todo.recurringDaysOfWeek.includes(today);
          }
          else {
            // Default to all days if not specified
            shouldReset = true;
          }
          break;

        case "MONTHLY":
          // Check if today matches the day of month
          if (todo.recurringDayOfMonth) {
            shouldReset = dayOfMonth === todo.recurringDayOfMonth;
          }
          else {
            // Default to first day of month
            shouldReset = dayOfMonth === 1;
          }
          break;
      }

      if (shouldReset) {
        await prisma.todo.update({
          where: { id: todo.id },
          data: {
            completed: false,
            lastResetDate: now,
            snoozedUntil: null, // Clear snooze when resetting
          },
        });
        resetCount++;
        consola.debug(`✅ Reset "${todo.title}" (${pattern})`);
      }
    }

    consola.info(`✅ Reset ${resetCount} recurring chores, skipped ${skipCount}`);

    return {
      success: true,
      resetCount,
      skipCount,
      timestamp: now.toISOString(),
    };
  }
  catch (error) {
    consola.error("❌ Failed to reset recurring chores:", error);
    throw createError({
      statusCode: 500,
      message: `Failed to reset recurring chores: ${error}`,
    });
  }
});




