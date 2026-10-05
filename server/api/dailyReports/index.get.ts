import { consola } from "consola";
import { addDays } from "date-fns";

import type { DailyReportEntry, DailyReportItem, DailyReportsResponse } from "~/types/dailyReport";

import prisma from "~/lib/prisma";

import type { BuiltReport } from "../../utils/dailyReports";

const DAY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export default defineEventHandler(async (event): Promise<DailyReportsResponse> => {
  const query = getQuery(event);
  const today = getAppDayKey();
  const from = typeof query.from === "string" && DAY_PATTERN.test(query.from) ? query.from : getAppDayKey(addDays(new Date(), -14));
  const to = typeof query.to === "string" && DAY_PATTERN.test(query.to) ? query.to : today;

  try {
    const [saved, users] = await Promise.all([
      prisma.dailyReport.findMany({
        where: { day: { gte: from, lte: to < today ? to : today } },
        orderBy: { day: "asc" },
      }),
      prisma.user.findMany({
        select: { id: true, name: true, color: true, avatar: true, todoOrder: true },
        orderBy: { todoOrder: "asc" },
      }),
    ]);

    const rows: (BuiltReport & { live: boolean })[] = saved
      .filter(report => report.day !== today)
      .map(report => ({
        userId: report.userId,
        day: report.day,
        completed: report.completed as DailyReportItem[],
        incomplete: report.incomplete as DailyReportItem[],
        pointsEarned: report.pointsEarned,
        estimated: report.estimated,
        live: false,
      }));
    if (from <= today && today <= to) {
      const liveReports = await buildLiveReports(today);
      rows.push(...liveReports.map(report => ({ ...report, live: true })));
    }

    const usersById = new Map(users.map(user => [user.id, user]));
    const reports: DailyReportEntry[] = rows
      .filter(report => usersById.has(report.userId))
      .map((report) => {
        const user = usersById.get(report.userId)!;
        return {
          userId: report.userId,
          userName: user.name,
          userColor: user.color,
          userAvatar: user.avatar,
          day: report.day,
          completed: report.completed,
          incomplete: report.incomplete,
          pointsEarned: report.pointsEarned,
          estimated: report.estimated,
          live: report.live,
        };
      })
      .sort((a, b) => a.day.localeCompare(b.day) || usersById.get(a.userId)!.todoOrder - usersById.get(b.userId)!.todoOrder);

    return { today, reports };
  }
  catch (error) {
    consola.error("Daily reports: failed to load", error);
    throw createError({ statusCode: 500, message: "Failed to load daily reports" });
  }
});
