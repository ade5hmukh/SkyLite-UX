import type { Prisma, Todo } from "@prisma/client";

import { consola } from "consola";
import { addDays, format, parseISO } from "date-fns";
import { fromZonedTime } from "date-fns-tz";

import type { DailyReportItem } from "~/types/dailyReport";

import prisma from "~/lib/prisma";

const BACKFILL_MAX_DAYS = 60;
const COMPLETION_MESSAGE = /^Completed (chore|todo|routine): (.*?)(?: \(\+(\d+) points\))?$/;

export type BuiltReport = {
  userId: string;
  day: string;
  completed: DailyReportItem[];
  incomplete: DailyReportItem[];
  pointsEarned: number;
  estimated: boolean;
};

export function getDayBounds(day: string) {
  const start = fromZonedTime(`${day}T00:00:00`, getAppTimezone());
  const end = fromZonedTime(`${getNextDay(day)}T00:00:00`, getAppTimezone());
  return { start, end };
}

function getNextDay(day: string): string {
  return format(addDays(parseISO(day), 1), "yyyy-MM-dd");
}

function getWeekdayOf(day: string): number {
  return parseISO(day).getDay();
}

function isRecurringDueOn(todo: Todo, day: string): boolean {
  const pattern = todo.recurringPattern || "DAILY";
  if (pattern === "WEEKLY")
    return todo.recurringDaysOfWeek.length === 0 || todo.recurringDaysOfWeek.includes(getWeekdayOf(day));
  if (pattern === "MONTHLY")
    return Number(day.slice(8, 10)) === (todo.recurringDayOfMonth || 1);
  return true;
}

function isRoutineDueOn(daysOfWeek: number[], day: string): boolean {
  return daysOfWeek.length === 0 || daysOfWeek.includes(getWeekdayOf(day));
}

function todoItem(todo: Todo): DailyReportItem {
  return { title: todo.title, kind: todo.isChore ? "chore" : "todo", points: todo.points };
}

function finishReport(report: BuiltReport): BuiltReport | null {
  if (report.completed.length === 0 && report.incomplete.length === 0)
    return null;
  report.pointsEarned = report.completed.reduce((sum, item) => sum + item.points, 0);
  return report;
}

async function getAssignedRoutines(day: string, end: Date) {
  const routines = await prisma.routine.findMany({
    where: { enabled: true, userId: { not: null }, createdAt: { lt: end } },
    include: {
      steps: { select: { id: true } },
      completions: { where: { day } },
    },
    orderBy: { order: "asc" },
  });
  return routines.filter(routine => isRoutineDueOn(routine.daysOfWeek, day));
}

function addRoutineItems(report: BuiltReport, routines: Awaited<ReturnType<typeof getAssignedRoutines>>) {
  for (const routine of routines.filter(routine => routine.userId === report.userId)) {
    const completion = routine.completions[0];
    if (completion?.completedAt) {
      report.completed.push({ title: routine.name, kind: "routine", points: completion.pointsAwarded });
      continue;
    }
    const doneSteps = completion?.completedStepIds.length ?? 0;
    report.incomplete.push({
      title: routine.name,
      kind: "routine",
      points: routine.points,
      detail: doneSteps > 0 ? `${doneSteps}/${routine.steps.length} steps` : undefined,
    });
  }
}

/** To-dos that belong to `day`: due recurring ones, open one-offs, and anything finished that day. */
export function selectDayTodos(todos: Todo[], day: string, start: Date, end: Date): Todo[] {
  return todos.filter((todo) => {
    const touchedToday = todo.updatedAt >= start && todo.updatedAt < end;
    if (todo.recurring) {
      if (todo.completed)
        return touchedToday || isRecurringDueOn(todo, day);
      return isRecurringDueOn(todo, day) && !(todo.snoozedUntil && todo.snoozedUntil >= end);
    }
    if (todo.completed)
      return touchedToday;
    return !todo.dueDate || todo.dueDate < end;
  });
}

/** Everyone's results for `day` from the current to-do state. Only accurate before the midnight reset. */
export async function buildLiveReports(day: string): Promise<BuiltReport[]> {
  const { start, end } = getDayBounds(day);
  const [columns, routines] = await Promise.all([
    prisma.todoColumn.findMany({
      where: { userId: { not: null } },
      include: { todos: { orderBy: { order: "asc" } } },
    }),
    getAssignedRoutines(day, end),
  ]);

  const reports: BuiltReport[] = [];
  for (const column of columns) {
    const report: BuiltReport = { userId: column.userId!, day, completed: [], incomplete: [], pointsEarned: 0, estimated: false };
    for (const todo of selectDayTodos(column.todos, day, start, end))
      (todo.completed ? report.completed : report.incomplete).push(todoItem(todo));
    addRoutineItems(report, routines);
    const finished = finishReport(report);
    if (finished)
      reports.push(finished);
  }
  return reports;
}

/** Rebuilds a past day from the activity log. Completions are exact; the incomplete list is a best guess. */
export async function buildEstimatedReports(day: string): Promise<BuiltReport[]> {
  const { start, end } = getDayBounds(day);
  const [logs, columns, routines] = await Promise.all([
    prisma.activityLog.findMany({
      where: { timestamp: { gte: start, lt: end }, userId: { not: null } },
      orderBy: { timestamp: "asc" },
    }),
    prisma.todoColumn.findMany({
      where: { userId: { not: null } },
      include: { todos: { where: { recurring: true, createdAt: { lt: end } }, orderBy: { order: "asc" } } },
    }),
    getAssignedRoutines(day, end),
  ]);

  const activeUserIds = new Set(logs.map(log => log.userId!));
  const reports: BuiltReport[] = [];
  for (const column of columns) {
    const userId = column.userId!;
    // Without any activity we can't tell a skipped day from one before the app was in use.
    if (!activeUserIds.has(userId))
      continue;

    const report: BuiltReport = { userId, day, completed: [], incomplete: [], pointsEarned: 0, estimated: true };
    const completedIds = new Set<string>();
    for (const log of logs.filter(log => log.userId === userId)) {
      const match = log.message.match(COMPLETION_MESSAGE);
      if (!match || match[1] === "routine")
        continue;
      const key = log.entityId || match[2]!;
      if (completedIds.has(key))
        continue;
      completedIds.add(key);
      report.completed.push({ title: match[2]!, kind: match[1] as "chore" | "todo", points: Number(match[3] || 0) });
    }
    for (const todo of column.todos) {
      if (!completedIds.has(todo.id) && isRecurringDueOn(todo, day))
        report.incomplete.push(todoItem(todo));
    }
    addRoutineItems(report, routines);
    const finished = finishReport(report);
    if (finished)
      reports.push(finished);
  }
  return reports;
}

export async function saveDailyReports(reports: BuiltReport[]) {
  for (const report of reports) {
    const data = {
      completed: report.completed as Prisma.InputJsonValue,
      incomplete: report.incomplete as Prisma.InputJsonValue,
      pointsEarned: report.pointsEarned,
      estimated: report.estimated,
    };
    await prisma.dailyReport.upsert({
      where: { userId_day: { userId: report.userId, day: report.day } },
      create: { userId: report.userId, day: report.day, ...data },
      update: data,
    });
  }
}

/** Fills days that have no saved report (before this feature, or the server was down at midnight). */
export async function backfillDailyReports() {
  const yesterday = getAppDayKey(addDays(new Date(), -1));
  const firstLog = await prisma.activityLog.findFirst({ orderBy: { timestamp: "asc" }, select: { timestamp: true } });
  if (!firstLog)
    return 0;

  let day = getAppDayKey(firstLog.timestamp);
  const earliest = getAppDayKey(addDays(new Date(), -BACKFILL_MAX_DAYS));
  if (day < earliest)
    day = earliest;

  const savedDays = new Set((await prisma.dailyReport.findMany({
    where: { day: { gte: day } },
    select: { day: true },
    distinct: ["day"],
  })).map(report => report.day));

  let filled = 0;
  for (; day <= yesterday; day = getNextDay(day)) {
    if (savedDays.has(day))
      continue;
    const reports = await buildEstimatedReports(day);
    await saveDailyReports(reports);
    filled += reports.length;
  }
  if (filled > 0)
    consola.info(`📒 Daily reports: rebuilt ${filled} past report(s) from the activity log`);
  return filled;
}

/**
 * One-off items are kept in the day's report, so they can leave the list: finished to-dos and chores,
 * plus unfinished one-off chores whose day has passed. Unfinished custom to-dos carry over.
 */
export async function clearFinishedDayItems(before: Date) {
  const { count } = await prisma.todo.deleteMany({
    where: {
      recurring: false,
      OR: [
        { completed: true, updatedAt: { lt: before } },
        { completed: false, isChore: true, dueDate: { lt: before } },
      ],
    },
  });
  return count;
}
