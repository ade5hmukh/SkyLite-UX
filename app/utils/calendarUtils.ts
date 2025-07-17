import { isSameDay } from "date-fns";
import type { CalendarEvent, EventColor } from "~/utils/calendarTypes";

export function getEventColorClasses(color?: EventColor | string): string {
  const eventColor = color || "sky";

  switch (eventColor) {
    case "sky":
      return "bg-blue-200/50 hover:bg-blue-200/40 text-blue-900/90 dark:bg-blue-400/25 dark:hover:bg-blue-400/20 dark:text-blue-200 shadow-blue-700/8 backdrop-blur-[2px]";
    case "violet":
      return "bg-violet-200/50 hover:bg-violet-200/40 text-violet-900/90 dark:bg-violet-400/25 dark:hover:bg-violet-400/20 dark:text-violet-200 shadow-violet-700/8 backdrop-blur-[2px]";
    case "rose":
      return "bg-rose-200/50 hover:bg-rose-200/40 text-rose-900/90 dark:bg-rose-400/25 dark:hover:bg-rose-400/20 dark:text-rose-200 shadow-rose-700/8 backdrop-blur-[2px]";
    case "emerald":
      return "bg-emerald-200/50 hover:bg-emerald-200/40 text-emerald-900/90 dark:bg-emerald-400/25 dark:hover:bg-emerald-400/20 dark:text-emerald-200 shadow-emerald-700/8 backdrop-blur-[2px]";
    case "orange":
      return "bg-orange-200/50 hover:bg-orange-200/40 text-orange-900/90 dark:bg-orange-400/25 dark:hover:bg-orange-400/20 dark:text-orange-200 shadow-orange-700/8 backdrop-blur-[2px]";
    default:
      return "bg-blue-200/50 hover:bg-blue-200/40 text-blue-900/90 dark:bg-blue-400/25 dark:hover:bg-blue-400/20 dark:text-blue-200 shadow-blue-700/8 backdrop-blur-[2px]";
  }
}

export function getBorderRadiusClasses(
  isFirstDay: boolean,
  isLastDay: boolean,
): string {
  if (isFirstDay && isLastDay) {
    return "rounded";
  }
  else if (isFirstDay) {
    return "rounded-l rounded-r-none not-in-data-[slot=popover-content]:w-[calc(100%+5px)]";
  }
  else if (isLastDay) {
    return "rounded-r rounded-l-none not-in-data-[slot=popover-content]:w-[calc(100%+4px)] not-in-data-[slot=popover-content]:-translate-x-[4px]"; // Only right end rounded
  }
  else {
    return "rounded-none not-in-data-[slot=popover-content]:w-[calc(100%+9px)] not-in-data-[slot=popover-content]:-translate-x-[4px]"; // No rounded corners
  }
}

export function isMultiDayEvent(event: CalendarEvent): boolean {
  const eventStart = new Date(event.start);
  const eventEnd = new Date(event.end);
  return event.allDay || eventStart.getDate() !== eventEnd.getDate();
}

export function getEventsForDay(
  events: CalendarEvent[],
  day: Date,
): CalendarEvent[] {
  return events
    .filter((event) => {
      const eventStart = new Date(event.start);
      return isSameDay(day, eventStart);
    })
    .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
}

export function sortEvents(events: CalendarEvent[]): CalendarEvent[] {
  return [...events].sort((a, b) => {
    const aIsMultiDay = isMultiDayEvent(a);
    const bIsMultiDay = isMultiDayEvent(b);

    if (aIsMultiDay && !bIsMultiDay)
      return -1;
    if (!aIsMultiDay && bIsMultiDay)
      return 1;

    return new Date(a.start).getTime() - new Date(b.start).getTime();
  });
}

export function getSpanningEventsForDay(
  events: CalendarEvent[],
  day: Date,
): CalendarEvent[] {
  return events.filter((event) => {
    if (!isMultiDayEvent(event))
      return false;

    const eventStart = new Date(event.start);
    const eventEnd = new Date(event.end);

    return (
      !isSameDay(day, eventStart)
      && (isSameDay(day, eventEnd) || (day > eventStart && day < eventEnd))
    );
  });
}

export function getAllEventsForDay(
  events: CalendarEvent[],
  day: Date,
): CalendarEvent[] {
  return events.filter((event) => {
    const eventStart = new Date(event.start);
    const eventEnd = new Date(event.end);
    return (
      isSameDay(day, eventStart)
      || isSameDay(day, eventEnd)
      || (day > eventStart && day < eventEnd)
    );
  });
}

export function getAgendaEventsForDay(
  events: CalendarEvent[],
  day: Date,
): CalendarEvent[] {
  return events
    .filter((event) => {
      const eventStart = new Date(event.start);
      const eventEnd = new Date(event.end);
      return (
        isSameDay(day, eventStart)
        || isSameDay(day, eventEnd)
        || (day > eventStart && day < eventEnd)
      );
    })
    .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
}

export function addHoursToDate(date: Date, hours: number): Date {
  const result = new Date(date);
  result.setHours(result.getHours() + hours);
  return result;
}
