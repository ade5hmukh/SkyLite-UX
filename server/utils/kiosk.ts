import { consola } from "consola";
import { formatInTimeZone } from "date-fns-tz";

import type { SchoolMenusResponse } from "~/types/schoolMenu";

import prisma from "~/lib/prisma";
import { getMealIcon, getMealParts } from "~/types/schoolMenu";

export type KioskItem = {
  id: string;
  title: string;
  points: number;
  icon: string;
  completed: boolean;
};

export type KioskRoutine = {
  id: string;
  name: string;
  icon: string;
  points: number;
  completed: boolean;
  steps: { id: string; title: string; icon: string | null; done: boolean }[];
};

export type KioskPerson = {
  id: string;
  name: string;
  color: string;
  avatar: string | null;
  points: number;
  pointsToday: number;
  items: KioskItem[];
  routines: KioskRoutine[];
  meals: { dayLabel: string; name: string; icon: string; text: string }[];
};

export type KioskData = {
  today: string;
  dateLabel: string;
  people: KioskPerson[];
  events: { title: string; time: string; location: string | null; people: string[] }[];
  icons: Record<string, string>;
};

const DEFAULT_COLOR = "#06b6d4";
const PAGE_ICONS = ["i-lucide-star", "i-lucide-trophy", "i-lucide-check", "i-lucide-calendar", "i-lucide-map-pin", "i-lucide-party-popper"];

function chooseIcon(icon: string | null | undefined, fallback: string) {
  return icon && icon.startsWith("i-lucide-") ? icon : fallback;
}

async function loadIcons(names: string[]): Promise<Record<string, string>> {
  const unique = [...new Set(names)];
  try {
    const data = await $fetch<{ icons: Record<string, { body: string; width?: number; height?: number }>; width?: number; height?: number }>(
      "/api/_nuxt_icon/lucide.json",
      { query: { icons: unique.map(name => name.replace("i-lucide-", "")).join(",") } },
    );
    const icons: Record<string, string> = {};
    for (const name of unique) {
      const icon = data.icons[name.replace("i-lucide-", "")];
      if (!icon)
        continue;
      const width = icon.width ?? data.width ?? 24;
      const height = icon.height ?? data.height ?? 24;
      icons[name] = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" aria-hidden="true">${icon.body}</svg>`;
    }
    return icons;
  }
  catch (error) {
    consola.warn("Kiosk: Failed to load icons:", error instanceof Error ? error.message : error);
    return {};
  }
}

function getMenuDayLabel(date: string, menus: SchoolMenusResponse) {
  if (date === menus.today)
    return "Today";
  if (date === menus.tomorrow)
    return "Tomorrow";
  return formatInTimeZone(new Date(`${date}T12:00:00Z`), "UTC", "EEEE");
}

/** Everything the kiosk page shows. `who` is an optional comma-separated list of names to include. */
export async function getKioskData(who = ""): Promise<KioskData> {
  const now = new Date();
  const today = getAppDayKey(now);
  const { start, end } = getDayBounds(today);
  const wanted = who.split(",").map(name => name.trim().toLowerCase()).filter(Boolean);

  const [columns, routines, events, menus] = await Promise.all([
    prisma.todoColumn.findMany({
      where: { userId: { not: null } },
      include: {
        user: { select: { id: true, name: true, color: true, avatar: true, points: true, pointsToday: true } },
        todos: { orderBy: { order: "asc" } },
      },
      orderBy: { order: "asc" },
    }),
    prisma.routine.findMany({
      where: { enabled: true, userId: { not: null } },
      include: { steps: { orderBy: { order: "asc" } }, completions: { where: { day: today } } },
      orderBy: { order: "asc" },
    }),
    getAgendaEvents(start, end)
      .then(agenda => eventsOnDay(agenda, today))
      .catch((error) => {
        consola.warn("Kiosk: Failed to load events:", error);
        return [];
      }),
    $fetch<SchoolMenusResponse>("/api/schoolMenu").catch(() => null),
  ]);

  const people: KioskPerson[] = [];
  for (const column of columns) {
    const user = column.user;
    if (!user || (wanted.length > 0 && !wanted.includes(user.name.toLowerCase())))
      continue;

    const items = selectDayTodos(column.todos, today, start, end)
      .map(todo => ({
        id: todo.id,
        title: todo.title,
        points: todo.points,
        icon: chooseIcon(todo.choreIcon, todo.isChore ? "i-lucide-sparkles" : "i-lucide-list-todo"),
        completed: todo.completed,
      }))
      .sort((a, b) => Number(a.completed) - Number(b.completed));

    const personRoutines = routines
      .filter(routine => routine.userId === user.id && (routine.daysOfWeek.length === 0 || routine.daysOfWeek.includes(getAppWeekday(now))))
      .map((routine) => {
        const completion = routine.completions[0];
        const doneIds = new Set(completion?.completedStepIds ?? []);
        return {
          id: routine.id,
          name: routine.name,
          icon: chooseIcon(routine.icon, "i-lucide-list-checks"),
          points: routine.points,
          completed: !!completion?.completedAt,
          steps: routine.steps.map(step => ({ id: step.id, title: step.title, icon: step.icon, done: doneIds.has(step.id) })),
        };
      });

    const meals = (menus?.menus ?? [])
      .filter(menu => menu.people.some(person => person.id === user.id) && menu.days.length > 0)
      .flatMap((menu) => {
        const day = menu.days[0]!;
        return day.meals.map(meal => ({
          dayLabel: getMenuDayLabel(day.date, menus!),
          name: meal.name,
          icon: getMealIcon(meal.name),
          text: getMealParts(meal).map(part => part.separator + part.name).join(""),
        }));
      });

    if (items.length === 0 && personRoutines.length === 0 && wanted.length === 0)
      continue;

    people.push({
      id: user.id,
      name: user.name,
      color: user.color || DEFAULT_COLOR,
      avatar: user.avatar,
      points: user.points,
      pointsToday: user.pointsToday,
      items,
      routines: personRoutines,
      meals,
    });
  }

  const iconNames = [
    ...PAGE_ICONS,
    ...people.flatMap(person => [
      ...person.items.map(item => item.icon),
      ...person.routines.flatMap(routine => [routine.icon, ...routine.steps.map(step => step.icon).filter((icon): icon is string => !!icon?.startsWith("i-lucide-"))]),
      ...person.meals.map(meal => meal.icon),
    ]),
  ];

  return {
    today,
    dateLabel: formatInTimeZone(now, getAppTimezone(), "EEEE, MMMM d"),
    people,
    events: events.map(agendaEvent => ({
      title: agendaEvent.title,
      time: agendaEvent.allDay ? "All day" : formatAppTime(agendaEvent.start),
      location: agendaEvent.location,
      people: agendaEvent.people,
    })),
    icons: await loadIcons(iconNames),
  };
}
