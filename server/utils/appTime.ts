import { formatInTimeZone } from "date-fns-tz";

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
