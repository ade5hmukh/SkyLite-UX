import { PrismaClient } from "@prisma/client";
import { addDays } from "date-fns";
import { formatInTimeZone, fromZonedTime } from "date-fns-tz";

const prisma = new PrismaClient();

export function getDayBounds(dayKey: string) {
  const start = fromZonedTime(`${dayKey}T00:00:00`, getAppTimezone());
  const nextDayKey = formatInTimeZone(addDays(start, 1), getAppTimezone(), "yyyy-MM-dd");
  const end = fromZonedTime(`${nextDayKey}T00:00:00`, getAppTimezone());
  return { start, end };
}

function withPeople(text: string, people: string[]) {
  return people.length ? `${text} (${people.join(", ")})` : text;
}

/** Plain-text agenda for one day, or null when there's nothing on it. */
export async function buildDaySummary(dayKey: string): Promise<{ title: string; message: string } | null> {
  const { start, end } = getDayBounds(dayKey);
  const weekday = getAppWeekday(start);

  const [events, todos, routines] = await Promise.all([
    getAgendaEvents(start, end).then(all => eventsOnDay(all, dayKey)),
    prisma.todo.findMany({
      where: { completed: false, isChore: false, dueDate: { gte: start, lt: end } },
      include: { todoColumn: { include: { user: { select: { name: true } } } } },
      orderBy: { dueDate: "asc" },
    }),
    prisma.routine.findMany({
      where: { enabled: true },
      include: { user: { select: { name: true } } },
      orderBy: { order: "asc" },
    }),
  ]);

  const todaysRoutines = routines.filter(routine => routine.daysOfWeek.length === 0 || routine.daysOfWeek.includes(weekday));
  if (!events.length && !todos.length) {
    return null;
  }

  const sections: string[] = [];
  if (events.length) {
    sections.push(["Events:", ...events.map(event =>
      `• ${event.allDay ? "All day" : formatAppTime(event.start)}: ${withPeople(event.title, event.people)}`)].join("\n"));
  }
  if (todos.length) {
    sections.push(["Due:", ...todos.map(todo =>
      `• ${withPeople(todo.title, todo.todoColumn?.user ? [todo.todoColumn.user.name] : [])}`)].join("\n"));
  }
  if (todaysRoutines.length) {
    sections.push(`Routines: ${todaysRoutines.map(routine => withPeople(routine.name, routine.user ? [routine.user.name] : [])).join(", ")}`);
  }

  return {
    title: formatInTimeZone(start, getAppTimezone(), "EEEE, MMM d"),
    message: sections.join("\n\n"),
  };
}
