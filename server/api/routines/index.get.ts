import { PrismaClient } from "@prisma/client";
import { consola } from "consola";
import { createError, defineEventHandler } from "h3";

const prisma = new PrismaClient();

export default defineEventHandler(async () => {
  try {
    const day = getAppDayKey();
    const weekday = getAppWeekday();

    const routines = await prisma.routine.findMany({
      include: {
        ...routineInclude,
        completions: { where: { day } },
      },
      orderBy: [{ order: "asc" }, { createdAt: "asc" }],
    });

    return {
      day,
      weekday,
      routines: routines.map(({ completions, ...routine }) => ({
        ...routine,
        scheduledToday: routine.daysOfWeek.length === 0 || routine.daysOfWeek.includes(weekday),
        progress: {
          completedStepIds: completions[0]?.completedStepIds ?? [],
          completedAt: completions[0]?.completedAt ?? null,
        },
      })),
    };
  }
  catch (error) {
    consola.error("Routines: Failed to fetch routines:", error);
    throw createError({ statusCode: 500, message: "Failed to fetch routines" });
  }
});
