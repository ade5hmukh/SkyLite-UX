import { addDays, format, parseISO } from "date-fns";
import { formatInTimeZone, fromZonedTime } from "date-fns-tz";

export function getAppTimezone(): string {
  return String(useRuntimeConfig().public.tz || "America/Los_Angeles");
}

/** Calendar day (YYYY-MM-DD) of `date` in the app timezone. */
export function getAppDayKey(date: Date = new Date()): string {
  return formatInTimeZone(date, getAppTimezone(), "yyyy-MM-dd");
}

/** Day of week (0 = Sunday) of `date` in the app timezone. */
export function getAppWeekday(date: Date = new Date()): number {
  return Number(formatInTimeZone(date, getAppTimezone(), "i")) % 7;
}

/** Local time of day (HH:mm) of `date` in the app timezone. */
export function getAppTimeOfDay(date: Date = new Date()): string {
  return formatInTimeZone(date, getAppTimezone(), "HH:mm");
}

export function formatAppTime(date: Date): string {
  return formatInTimeZone(date, getAppTimezone(), "h:mm a");
}

/** The next `weekday` strictly after `after`'s day, as 23:59:59.999 in the app timezone (how due dates are stored). */
export function getNextWeekdayDueDate(weekday: number, after: Date = new Date()): Date {
  const today = parseISO(getAppDayKey(after));
  const daysAhead = ((weekday - today.getDay() + 7) % 7) || 7;
  return fromZonedTime(`${format(addDays(today, daysAhead), "yyyy-MM-dd")}T23:59:59.999`, getAppTimezone());
}
