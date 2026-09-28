import { PrismaClient } from "@prisma/client";
import { consola } from "consola";

import { ICalServerService } from "../integrations/iCal/client";

const prisma = new PrismaClient();

export type AgendaEvent = {
  title: string;
  start: Date;
  end: Date;
  allDay: boolean;
  /** For all-day events: first and last-exclusive day keys (YYYY-MM-DD). */
  startDay: string;
  endDay: string;
  location: string | null;
  people: string[];
};

type NativeEvent = {
  title: string;
  start: string;
  end: string;
  allDay?: boolean;
  location?: string | null;
  users?: { name: string }[];
};

function isDateOnly(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function toAgendaEvent(title: string, startRaw: string, endRaw: string, allDayHint: boolean, location: string | null, people: string[]): AgendaEvent | null {
  const start = new Date(startRaw);
  const end = new Date(endRaw || startRaw);
  if (Number.isNaN(start.getTime()))
    return null;
  const isMidnightToMidnight = startRaw.includes("T00:00:00") && (endRaw || "").includes("T00:00:00")
    && (end.getTime() - start.getTime()) % (24 * 60 * 60 * 1000) === 0 && end > start;
  const allDay = allDayHint || isDateOnly(startRaw) || isMidnightToMidnight;
  // All-day values are calendar dates; native ones are stored as UTC midnights.
  const startDay = allDay ? startRaw.slice(0, 10) : getAppDayKey(start);
  const endDay = allDay ? (endRaw || startRaw).slice(0, 10) : getAppDayKey(end);
  return { title, start, end: Number.isNaN(end.getTime()) ? start : end, allDay, startDay, endDay, location, people };
}

/** Native and iCal events overlapping [from, to), with recurrences expanded. */
export async function getAgendaEvents(from: Date, to: Date): Promise<AgendaEvent[]> {
  const events: AgendaEvent[] = [];

  try {
    const native = await $fetch<NativeEvent[]>("/api/calendar-events", {
      query: { start: from.toISOString(), end: to.toISOString() },
    });
    for (const event of native) {
      const agendaEvent = toAgendaEvent(event.title, event.start, event.end, !!event.allDay, event.location ?? null, (event.users ?? []).map(user => user.name));
      if (agendaEvent)
        events.push(agendaEvent);
    }
  }
  catch (error) {
    consola.warn("Family agenda: Failed to load native events:", error);
  }

  const [integrations, users] = await Promise.all([
    prisma.integration.findMany({ where: { type: "calendar", service: "iCal", enabled: true } }),
    prisma.user.findMany({ select: { id: true, name: true } }),
  ]);
  const userNames = new Map(users.map(user => [user.id, user.name]));

  for (const integration of integrations) {
    if (!integration.baseUrl)
      continue;
    const settings = (integration.settings ?? {}) as { user?: string[] };
    const people = (settings.user ?? []).map(id => userNames.get(id)).filter((name): name is string => !!name);
    try {
      const feed = await new ICalServerService(integration.id, integration.baseUrl).fetchEventsFromUrl(integration.baseUrl);
      for (const event of feed) {
        const agendaEvent = toAgendaEvent(event.summary, event.dtstart, event.dtend, false, event.location ?? null, people);
        if (agendaEvent)
          events.push(agendaEvent);
      }
    }
    catch {
      consola.warn(`Family agenda: Failed to load calendar integration ${integration.id}`);
    }
  }

  const fromTime = from.getTime();
  const toTime = to.getTime();
  const fromDay = getAppDayKey(from);
  const toDay = getAppDayKey(new Date(toTime - 1));
  return events
    .filter(event => event.allDay
      ? event.startDay <= toDay && event.endDay > fromDay
      : event.start.getTime() < toTime && event.end.getTime() > fromTime)
    .sort((a, b) => a.start.getTime() - b.start.getTime());
}

/** Events that fall on `dayKey` (YYYY-MM-DD, app timezone). */
export function eventsOnDay(events: AgendaEvent[], dayKey: string) {
  return events.filter(event => event.allDay
    ? event.startDay <= dayKey && (event.endDay > dayKey || event.endDay === event.startDay)
    : getAppDayKey(event.start) === dayKey);
}
