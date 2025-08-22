import type { DateValue } from "@internationalized/date";

import { consola } from "consola";
import { format } from "date-fns";
import ical from "ical.js";

import type { CalendarEvent } from "~/types/calendar";
import type { Integration } from "~/types/database";

import { useStableDate } from "~/composables/useStableDate";
import { useSyncManager } from "~/composables/useSyncManager";

// Timezone is now registered in appInit.ts plugin at startup

export function useCalendar() {
  const spanningEventLanes = new Map<string, number>();

  // Timezone is now registered in appInit.ts plugin at startup
  // We use a hybrid approach: timezone-aware comparison when available, UTC fallback when not
  // This ensures better user experience while maintaining SSR consistency

  // Get calendar events from Nuxt cache
  const { data: nativeEvents } = useNuxtData<CalendarEvent[]>("calendar-events");

  // Get integrations for calendar data
  const { integrations } = useIntegrations();

  // Get sync data for integrations
  const { getSyncDataByType, getCachedIntegrationData } = useSyncManager();

  // Use global stable date
  const { getStableDate, parseStableDate } = useStableDate();

  // UTC comparison helpers (kept for fallback scenarios)
  function getUtcMidnightTime(date: Date): number {
    return Date.UTC(
      date.getUTCFullYear(),
      date.getUTCMonth(),
      date.getUTCDate(),
      0,
      0,
      0,
      0,
    );
  }

  function isSameUtcDay(a: Date, b: Date): boolean {
    return getUtcMidnightTime(a) === getUtcMidnightTime(b);
  }

  // Unified ical.js-based comparison helpers
  function createICalTime(date: Date, isUTC: boolean = false): ical.Time {
    return ical.Time.fromJSDate(date, isUTC);
  }

  function isSameLocalDay(a: Date, b: Date): boolean {
    try {
      const browserTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const timezone = ical.TimezoneService.get(browserTimezone);

      if (!timezone) {
        // Fallback to UTC comparison if timezone not available
        return isSameUtcDay(a, b);
      }

      // Convert both dates to the same timezone for comparison
      const timeA = createICalTime(a, true); // Assume UTC input
      const timeB = createICalTime(b, true); // Assume UTC input

      const localA = timeA.convertToZone(timezone);
      const localB = timeB.convertToZone(timezone);

      // Compare year, month, and day in the local timezone
      return localA.year === localB.year
        && localA.month === localB.month
        && localA.day === localB.day;
    }
    catch (error) {
      consola.debug("ical.js comparison failed, using UTC fallback:", error);
      return isSameUtcDay(a, b);
    }
  }

  function isLocalDayInRange(day: Date, start: Date, end: Date): boolean {
    try {
      const browserTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const timezone = ical.TimezoneService.get(browserTimezone);

      if (!timezone) {
        // Fallback to UTC comparison if timezone not available
        // Note: iCal DTEND is exclusive, so we use >= start and < end
        return day.getTime() >= start.getTime() && day.getTime() < end.getTime();
      }

      // Convert all dates to the same timezone for comparison
      const timeDay = createICalTime(day, true);
      const timeStart = createICalTime(start, true);
      const timeEnd = createICalTime(end, true);

      const localDay = timeDay.convertToZone(timezone);
      const localStart = timeStart.convertToZone(timezone);
      const localEnd = timeEnd.convertToZone(timezone);

      // Create midnight times for day comparison
      const dayMidnight = new Date(localDay.year, localDay.month - 1, localDay.day);
      const startMidnight = new Date(localStart.year, localStart.month - 1, localStart.day);
      const endMidnight = new Date(localEnd.year, localEnd.month - 1, localEnd.day);

      // iCal standard: DTSTART is inclusive, DTEND is exclusive
      // So an event from Aug 1 to Aug 3 should appear on Aug 1 and Aug 2, but not Aug 3
      return dayMidnight.getTime() >= startMidnight.getTime()
        && dayMidnight.getTime() < endMidnight.getTime();
    }
    catch (error) {
      consola.debug("ical.js comparison failed, using UTC fallback:", error);
      // Note: iCal DTEND is exclusive, so we use >= start and < end
      return day.getTime() >= start.getTime() && day.getTime() < end.getTime();
    }
  }

  // Calendar date construction functions (timezone-consistent)
  function createLocalDate(year: number, month: number, day: number): Date {
    // Create a date in the local timezone using the browser's timezone
    // This ensures consistency with our timezone-aware event filtering

    // Convert to UTC while preserving the intended local time
    // This matches the pattern used in our server-side UTC conversion
    const utcTime = Date.UTC(year, month, day);
    return new Date(utcTime);
  }

  function getLocalWeekDays(startDate: Date): Date[] {
    // Build week days using local timezone for consistency with event filtering
    const days: Date[] = [];
    const start = getLocalTimeFromUTC(startDate);

    for (let i = 0; i < 8; i++) {
      const day = new Date(start.getTime());
      day.setDate(start.getDate() + i);
      days.push(day);
    }

    return days;
  }

  function getLocalMonthWeeks(date: Date): Date[][] {
    // Build month weeks using local timezone for consistency with event filtering
    const localDate = getLocalTimeFromUTC(date);
    const firstDayOfMonth = new Date(localDate.getFullYear(), localDate.getMonth(), 1);
    const lastDayOfMonth = new Date(localDate.getFullYear(), localDate.getMonth() + 1, 0);

    // Find the start of the week containing the first day of month
    const startDate = new Date(firstDayOfMonth.getTime());
    const dayOfWeek = startDate.getDay();
    startDate.setDate(startDate.getDate() - dayOfWeek);

    // Find the end of the week containing the last day of month
    const endDate = new Date(lastDayOfMonth.getTime());
    const endDayOfWeek = endDate.getDay();
    endDate.setDate(endDate.getDate() + (6 - endDayOfWeek));

    const weeks: Date[][] = [];
    const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;

    for (let dayIndex = 0; dayIndex < totalDays; dayIndex += 7) {
      const week: Date[] = [];
      for (let i = 0; i < 7; i++) {
        const dayDate = new Date(startDate.getTime());
        dayDate.setDate(startDate.getDate() + dayIndex + i);
        week.push(dayDate);
      }
      weeks.push(week);
    }

    return weeks;
  }

  function getLocalAgendaDays(date: Date): Date[] {
    // Build agenda days using local timezone for consistency with event filtering
    const days: Date[] = [];
    const localDate = getLocalTimeFromUTC(date);

    // Add 15 days before the current date
    for (let i = -15; i < 0; i++) {
      const day = new Date(localDate.getTime());
      day.setDate(localDate.getDate() + i);
      days.push(day);
    }

    // Add 15 days after the current date
    for (let i = 0; i < 15; i++) {
      const day = new Date(localDate.getTime());
      day.setDate(localDate.getDate() + i);
      days.push(day);
    }

    return days;
  }

  // Timestamp handling functions for UI components
  function getLocalTimeFromUTC(utcDate: Date): Date {
    // Convert UTC date to local time for display using ical.js
    try {
      // Get browser's timezone
      const browserTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

      // Try to get the registered timezone
      const timezone = ical.TimezoneService.get(browserTimezone);
      if (timezone) {
        // Create an ical.js Time object from the UTC date
        const utcTime = createICalTime(utcDate, true); // true = UTC

        // Convert to the registered timezone
        const localTime = utcTime.convertToZone(timezone);
        return localTime.toJSDate();
      }

      // Fallback to original method if timezone not registered
      return new Date(utcDate.getTime());
    }
    catch (error) {
      // Fallback to original method if ical.js conversion fails
      consola.warn("ical.js timezone conversion failed, using fallback:", error);
      return new Date(utcDate.getTime());
    }
  }

  function getLocalTimeString(utcDate: Date, options?: Intl.DateTimeFormatOptions): string {
    const localDate = getLocalTimeFromUTC(utcDate);
    const defaultOptions: Intl.DateTimeFormatOptions = {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    };
    return localDate.toLocaleTimeString("en-US", { ...defaultOptions, ...options });
  }

  function getLocalDateString(utcDate: Date, options?: Intl.DateTimeFormatOptions): string {
    const localDate = getLocalTimeFromUTC(utcDate);
    const defaultOptions: Intl.DateTimeFormatOptions = {
      year: "numeric",
      month: "short",
      day: "numeric",
    };
    return localDate.toLocaleDateString("en-US", { ...defaultOptions, ...options });
  }

  function getEventDisplayTime(event: CalendarEvent): {
    startTime: string;
    endTime: string;
    startDate: string;
    endDate: string;
    isSameDay: boolean;
    isAllDay: boolean;
  } {
    const start = parseStableDate(event.start);
    const end = parseStableDate(event.end);

    const isSameDay = isSameUtcDay(start, end);
    const isAllDay = event.allDay || false;

    if (isAllDay) {
      return {
        startTime: "All day",
        endTime: "All day",
        startDate: getLocalDateString(start),
        endDate: getLocalDateString(end),
        isSameDay,
        isAllDay,
      };
    }

    return {
      startTime: getLocalTimeString(start),
      endTime: getLocalTimeString(end),
      startDate: getLocalDateString(start),
      endDate: getLocalDateString(end),
      isSameDay,
      isAllDay,
    };
  }

  function getEventStartTimeForInput(event: CalendarEvent): string {
    const start = parseStableDate(event.start);
    const localStart = getLocalTimeFromUTC(start);
    const hours = localStart.getHours().toString().padStart(2, "0");
    const minutes = localStart.getMinutes().toString().padStart(2, "0");
    return `${hours}:${minutes}`;
  }

  function getEventEndTimeForInput(event: CalendarEvent): string {
    const end = parseStableDate(event.end);
    const localEnd = getLocalTimeFromUTC(end);
    const hours = localEnd.getHours().toString().padStart(2, "0");
    const minutes = localEnd.getMinutes().toString().padStart(2, "0");

    return `${hours}:${minutes}`;
  }

  function getEventEndDateForInput(event: CalendarEvent): string {
    const start = parseStableDate(event.start);
    const end = parseStableDate(event.end);

    if (event.allDay) {
      // For all-day events, follow iCal standard: DTEND is exclusive
      // An event with DTEND:20251027 actually ends on 20251026
      // So we need to subtract one day from the stored end date
      const endDate = new Date(end.getTime());
      endDate.setDate(endDate.getDate() - 1);

      // Format as YYYY-MM-DD
      const year = endDate.getFullYear();
      const month = (endDate.getMonth() + 1).toString().padStart(2, "0");
      const day = endDate.getDate().toString().padStart(2, "0");
      return `${year}-${month}-${day}`;
    }
    else {
      // For timed events, check if they span midnight UTC but should be displayed as single-day
      const startLocal = getLocalTimeFromUTC(start);
      const endLocal = getLocalTimeFromUTC(end);

      // If the event starts and ends on the same local day (even if it spans midnight UTC),
      // show the end date as the same as the start date
      const startDay = new Date(startLocal.getTime());
      startDay.setHours(0, 0, 0, 0);
      const endDay = new Date(endLocal.getTime());
      endDay.setHours(0, 0, 0, 0);

      if (startDay.getTime() === endDay.getTime()) {
        // Same local day, show end date as start date
        return start.toISOString().split("T")[0]!;
      }
      else {
        // Different local days, this is a true multi-day event
        // Return the LOCAL end date by constructing the date string from local components
        const year = endLocal.getFullYear();
        const month = (endLocal.getMonth() + 1).toString().padStart(2, "0");
        const day = endLocal.getDate().toString().padStart(2, "0");
        return `${year}-${month}-${day}`;
      }
    }
  }

  function createLocalDateTime(dateValue: DateValue, timeString: string, timezone: string): Date {
    const [hours = 0, minutes = 0] = timeString.split(":").map(Number);
    const localDate = dateValue.toDate(timezone);
    localDate.setHours(hours, minutes, 0, 0);
    return localDate;
  }

  function convertLocalToUTC(localDate: Date): Date {
    // Convert local time to UTC while preserving the intended local time
    const utcTime = Date.UTC(
      localDate.getFullYear(),
      localDate.getMonth(),
      localDate.getDate(),
      localDate.getHours(),
      localDate.getMinutes(),
      localDate.getSeconds(),
      localDate.getMilliseconds(),
    );
    return new Date(utcTime);
  }

  // Computed property that combines native and integration events
  const allEvents = computed(() => {
    const events: CalendarEvent[] = [];

    // Add native events
    if (nativeEvents.value) {
      events.push(...nativeEvents.value);
    }

    // Add integration events
    const calendarIntegrations = (integrations.value as readonly Integration[] || []).filter(integration =>
      integration.type === "calendar" && integration.enabled,
    );

    calendarIntegrations.forEach((integration) => {
      try {
        // Get cached integration data using the same cache key as sync manager
        const integrationEvents = getCachedIntegrationData("calendar", integration.id) as CalendarEvent[];
        if (integrationEvents && Array.isArray(integrationEvents)) {
          events.push(...integrationEvents);
        }
      }
      catch (error) {
        consola.warn(`Failed to get calendar events for integration ${integration.id}:`, error);
      }
    });

    const result = combineEvents(events);

    return result;
  });

  // Computed property for sync status of calendar integrations
  const calendarSyncStatus = computed(() => {
    return getSyncDataByType("calendar", []);
  });

  // Function to refresh calendar data
  const refreshCalendarData = async () => {
    try {
      // Refresh native events
      await refreshNuxtData("calendar-events");

      // Note: Integration data is refreshed automatically via sync manager
      consola.info("Calendar data refreshed successfully");
    }
    catch (error) {
      consola.error("Failed to refresh calendar data:", error);
    }
  };

  // Function to get events for a specific integration
  const getIntegrationEvents = (integrationId: string): CalendarEvent[] => {
    try {
      const events = getCachedIntegrationData("calendar", integrationId) as CalendarEvent[];
      return events && Array.isArray(events) ? events : [];
    }
    catch (error) {
      consola.warn(`Failed to get events for integration ${integrationId}:`, error);
      return [];
    }
  };

  function getEventUserColors(
    event: CalendarEvent,
    options: {
      eventColor: string;
      useUserColors?: boolean;
      defaultColor: string;
    } = { eventColor: "#06b6d4", defaultColor: "#06b6d4" },
  ): string | string[] {
    const { eventColor, useUserColors = true, defaultColor } = options;

    if (useUserColors && event.users && event.users.length > 0) {
      const userColors = event.users
        .map(user => user.color)
        .filter(color => color && color !== null)
        .sort() as string[]; // Sort colors for deterministic ordering

      if (userColors.length > 1) {
        return userColors;
      }
      else if (userColors.length === 1) {
        const result = userColors[0] || defaultColor;
        return result;
      }
    }

    if (Array.isArray(event.color)) {
      return event.color;
    }

    const result = (typeof event.color === "string" ? event.color : null) || eventColor || defaultColor;
    return result;
  }

  function combineEvents(events: CalendarEvent[]): CalendarEvent[] {
    const eventMap = new Map<string, CalendarEvent>();

    events.forEach((event) => {
      // Use stable date parsing for consistent SSR/client rendering
      const startTime = parseStableDate(event.start).getTime();
      const endTime = parseStableDate(event.end).getTime();
      const key = `${event.title}-${startTime}-${endTime}-${event.location || ""}-${event.description || ""}`;

      if (eventMap.has(key)) {
        const existingEvent = eventMap.get(key)!;

        // Merge users without changing the event structure
        const existingUserIds = new Set(existingEvent.users?.map(u => u.id) || []);
        const newUsers = event.users?.filter(u => !existingUserIds.has(u.id)) || [];
        const allUsers = [...(existingEvent.users || []), ...newUsers];
        // Sort users by ID for deterministic ordering
        existingEvent.users = allUsers.sort((a, b) => a.id.localeCompare(b.id));

        // Update color based on combined users
        existingEvent.color = getEventUserColors(existingEvent);
      }
      else {
        // Create a new event with stable properties
        const newEvent = {
          ...event,
          color: getEventUserColors(event),
        };
        eventMap.set(key, newEvent);
      }
    });

    // Sort events by start time to ensure consistent ordering
    const result = Array.from(eventMap.values()).sort((a, b) => {
      const aStart = parseStableDate(a.start).getTime();
      const bStart = parseStableDate(b.start).getTime();
      return aStart - bStart;
    });

    return result;
  }

  function lightenColor(hex: string, amount: number = 0.3): string {
    const color = hex.replace("#", "");

    const r = Number.parseInt(color.substring(0, 2), 16);
    const g = Number.parseInt(color.substring(2, 4), 16);
    const b = Number.parseInt(color.substring(4, 6), 16);

    const lightenedR = Math.round(r + (255 - r) * amount);
    const lightenedG = Math.round(g + (255 - g) * amount);
    const lightenedB = Math.round(b + (255 - b) * amount);

    const toHex = (n: number) => n.toString(16).padStart(2, "0");
    return `#${toHex(lightenedR)}${toHex(lightenedG)}${toHex(lightenedB)}`;
  }

  function getTextColor(hex: string): string {
    const color = hex.replace("#", "");

    const r = Number.parseInt(color.substring(0, 2), 16);
    const g = Number.parseInt(color.substring(2, 4), 16);
    const b = Number.parseInt(color.substring(4, 6), 16);

    const sRGB = [r, g, b].map((c) => {
      c = c / 255;
      return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
    });

    const luminance = 0.2126 * sRGB[0]! + 0.7152 * sRGB[1]! + 0.0722 * sRGB[2]!;

    return luminance > 0.5 ? "black" : "white";
  }

  function getLuminance(hex: string): number {
    const color = hex.replace("#", "");

    const r = Number.parseInt(color.substring(0, 2), 16);
    const g = Number.parseInt(color.substring(2, 4), 16);
    const b = Number.parseInt(color.substring(4, 6), 16);

    const sRGB = [r, g, b].map((c) => {
      c = c / 255;
      return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
    });

    return 0.2126 * sRGB[0]! + 0.7152 * sRGB[1]! + 0.0722 * sRGB[2]!;
  }

  function getAverageTextColor(colors: string[]): string {
    const validColors = colors.filter(c => /^#(?:[0-9A-F]{3}){1,2}$/i.test(c));
    if (validColors.length === 0)
      return "white";

    const totalLuminance = validColors.reduce((sum, color) => {
      return sum + getLuminance(color);
    }, 0);

    const averageLuminance = totalLuminance / validColors.length;

    return averageLuminance > 0.2 ? "black" : "white";
  }

  function getEventColorClasses(
    color?: string | string[],
    spanningInfo?: {
      event?: CalendarEvent;
      currentDay?: Date;
      isFirstDay?: boolean;
      isLastDay?: boolean;
    },
  ): string | { style: string } {
    if (Array.isArray(color)) {
      if (color.length > 1) {
        let colorStops: string;

        if (spanningInfo && spanningInfo.event && spanningInfo.currentDay
          && !(spanningInfo.isFirstDay === true && spanningInfo.isLastDay === true)) {
          const eventStart = parseStableDate(spanningInfo.event.start);
          const eventEnd = parseStableDate(spanningInfo.event.end);

          const totalDays = Math.floor((eventEnd.getTime() - eventStart.getTime()) / (1000 * 60 * 60 * 24)) + 1;
          const dayDiff = Math.floor((spanningInfo.currentDay.getTime() - eventStart.getTime()) / (1000 * 60 * 60 * 24));

          const daysPerColor = totalDays / color.length;

          const visibleColors: Array<{ color: string; start: number; end: number }> = [];

          // Edge case: when days == colors
          if (totalDays === color.length) {
            const currentColor = color[dayDiff];
            const nextColor = color[dayDiff + 1];

            if (currentColor) {
              const baseSplit = 75;
              const dayOffset = dayDiff * 2;
              const adjustedSplit = Math.min(baseSplit + dayOffset, 100);

              visibleColors.push({
                color: currentColor,
                start: 0,
                end: nextColor ? adjustedSplit : 100,
              });
            }

            if (nextColor) {
              const baseSplit = 75;
              const dayOffset = dayDiff * 2;
              const adjustedSplit = Math.min(baseSplit + dayOffset, 100);

              visibleColors.push({
                color: nextColor,
                start: adjustedSplit,
                end: 100,
              });
            }
          }
          else {
            // Original logic for overlapping colors
            color.forEach((c, colorIndex) => {
              const colorStartDay = colorIndex * daysPerColor;
              const colorEndDay = (colorIndex + 1) * daysPerColor;

              if (colorStartDay <= dayDiff + 1 && colorEndDay >= dayDiff) {
                const dayStart = Math.max(0, colorStartDay - dayDiff);
                const dayEnd = Math.min(1, colorEndDay - dayDiff);

                visibleColors.push({
                  color: c,
                  start: dayStart * 100,
                  end: dayEnd * 100,
                });
              }
            });
          }

          // Reverse colors and flip percentages to compensate for -45deg visual reversal
          const reversedColors = visibleColors.reverse();
          colorStops = reversedColors.map(({ color: c, start, end }) => {
            const lightenedColor = /^#(?:[0-9A-F]{3}){1,2}$/i.test(c) ? lightenColor(c, 0.4) : c;
            const flippedStart = 100 - end;
            const flippedEnd = 100 - start;
            return `${lightenedColor} ${flippedStart}%, ${lightenedColor} ${flippedEnd}%`;
          }).join(", ");
        }
        else {
          // Non-spanning event - using original logic
          const stripeWidth = 100 / color.length;
          colorStops = color.map((c, index) => {
            const start = index * stripeWidth;
            const end = (index + 1) * stripeWidth;
            const lightenedColor = /^#(?:[0-9A-F]{3}){1,2}$/i.test(c) ? lightenColor(c, 0.4) : c;
            return `${lightenedColor} ${start}%, ${lightenedColor} ${end}%`;
          }).join(", ");
        }

        const textColor = getAverageTextColor(color);
        const shadowColor = textColor === "black" ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.5)";

        const result = {
          style: `background: linear-gradient(-45deg, ${colorStops}); color: ${textColor}; text-shadow: 0 1px 2px ${shadowColor};`,
        };

        return result;
      }
      else if (color.length === 1) {
        const singleColor = color[0];
        if (singleColor && /^#(?:[0-9A-F]{3}){1,2}$/i.test(singleColor)) {
          const lightenedColor = lightenColor(singleColor, 0.4);
          const textColor = getTextColor(lightenedColor);
          const shadowColor = textColor === "black" ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.5)";
          return { style: `background-color: ${lightenedColor}; color: ${textColor}; text-shadow: 0 1px 2px ${shadowColor};` };
        }
      }
      color = "sky";
    }

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
        if (typeof eventColor === "string" && /^#(?:[0-9A-F]{3}){1,2}$/i.test(eventColor)) {
          const lightenedColor = lightenColor(eventColor, 0.4);
          const textColor = getTextColor(lightenedColor);
          const shadowColor = textColor === "black" ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.5)";
          return { style: `background-color: ${lightenedColor}; color: ${textColor}; text-shadow: 0 1px 2px ${shadowColor};` };
        }
        return "bg-blue-200/50 hover:bg-blue-200/40 text-blue-900/90 dark:bg-blue-400/25 dark:hover:bg-blue-400/20 dark:text-blue-200 shadow-blue-700/8 backdrop-blur-[2px]";
    }
  }

  function isToday(date: Date) {
    // Use UTC-normalized day for deterministic SSR/CSR
    return isSameUtcDay(date, getStableDate());
  }

  function isFirstDay(day: Date, event: CalendarEvent) {
    // Use stable date parsing for consistent SSR/client rendering
    const eventStart = parseStableDate(event.start);

    // Always use timezone-aware comparison with ical.js convertToZone
    const browserTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const timezone = ical.TimezoneService.get(browserTimezone);

    if (!timezone) {
      consola.warn("Browser timezone not registered with ical.js, using UTC fallback for isFirstDay");
      return isSameUtcDay(day, eventStart);
    }

    return isSameLocalDay(day, eventStart);
  }

  function isLastDay(day: Date, event: CalendarEvent) {
    // Use stable date parsing for consistent SSR/client rendering
    const eventStart = parseStableDate(event.start);
    const eventEnd = parseStableDate(event.end);

    // Always use timezone-aware comparison with ical.js convertToZone
    const browserTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const timezone = ical.TimezoneService.get(browserTimezone);

    if (!timezone) {
      consola.warn("Browser timezone not registered with ical.js, using UTC fallback for isLastDay");
      // For single-day events, the last day is the same as the first day
      if (isSameUtcDay(eventStart, eventEnd)) {
        return isSameUtcDay(day, eventStart);
      }
      // iCal DTEND is exclusive, so the last day is the day before the end date
      const dayBeforeEnd = new Date(eventEnd.getTime() - 24 * 60 * 60 * 1000);
      return isSameUtcDay(day, dayBeforeEnd);
    }

    // For single-day events, the last day is the same as the first day
    if (isSameLocalDay(eventStart, eventEnd)) {
      return isSameLocalDay(day, eventStart);
    }
    
    // iCal DTEND is exclusive, so the last day is the day before the end date
    // An event ending on Aug 3 should have its last day on Aug 2
    const dayBeforeEnd = new Date(eventEnd.getTime() - 24 * 60 * 60 * 1000);
    return isSameLocalDay(day, dayBeforeEnd);
  }

  function isFirstVisibleDay(day: Date, event: CalendarEvent, visibleDays: Date[]): boolean {
    // If it's the actual first day, always show title
    if (isFirstDay(day, event)) {
      return true;
    }

    // Get first visible day in the view
    const firstVisibleDay = visibleDays[0];
    if (!firstVisibleDay) {
      return false;
    }

    const eventStart = parseStableDate(event.start);

    // Always use timezone-aware comparison with ical.js convertToZone
    const browserTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const timezone = ical.TimezoneService.get(browserTimezone);

    if (!timezone) {
      consola.warn("Browser timezone not registered with ical.js, using UTC fallback for isFirstVisibleDay");
      // Fallback to UTC comparison
      if (getUtcMidnightTime(eventStart) < getUtcMidnightTime(firstVisibleDay)) {
        const eventDaysInView = visibleDays.filter((visibleDay) => {
          const eventsForDay = getAllEventsForDay([event], visibleDay);
          return eventsForDay.length > 0;
        });
        const firstEventDay = eventDaysInView[0];
        return firstEventDay ? isSameUtcDay(day, firstEventDay) : false;
      }
      return false;
    }

    // Use local midnight for timezone-aware events
    const eventStartLocal = getLocalTimeFromUTC(eventStart);
    const eventStartDay = new Date(eventStartLocal.getTime());
    eventStartDay.setHours(0, 0, 0, 0);

    const firstVisibleDayLocal = getLocalTimeFromUTC(firstVisibleDay);
    const firstVisibleDayMidnight = new Date(firstVisibleDayLocal.getTime());
    firstVisibleDayMidnight.setHours(0, 0, 0, 0);

    if (eventStartDay.getTime() < firstVisibleDayMidnight.getTime()) {
      // Find the first day this event appears in the current view
      const eventDaysInView = visibleDays.filter((visibleDay) => {
        const eventsForDay = getAllEventsForDay([event], visibleDay);
        return eventsForDay.length > 0;
      });

      // Return true if this is the first day the event appears in current view
      const firstEventDay = eventDaysInView[0];
      return firstEventDay ? isSameLocalDay(day, firstEventDay) : false;
    }

    return false;
  }

  function handleEventClick(
    calendarEvent: CalendarEvent,
    e: MouseEvent,
    emit: (name: "eventClick", event: CalendarEvent, e: MouseEvent) => void,
  ) {
    emit("eventClick", calendarEvent, e);
  }

  function scrollToDate(date: Date, view: "month" | "week" | "day" | "agenda") {
    if (view === "month") {
      const dateElement = document.querySelector(`[data-date="${format(date, "yyyy-MM-dd")}"]`);
      if (dateElement) {
        const headerHeight = 80;
        const padding = 20;
        const elementPosition = dateElement.getBoundingClientRect().top;
        const offsetPosition = elementPosition + window.pageYOffset - headerHeight - padding;

        window.scrollTo({
          top: offsetPosition,
          behavior: "smooth",
        });
      }
    }
    else if (view === "agenda") {
      const targetDate = format(date, "yyyy-MM-dd");
      const dateElement = document.querySelector(`[data-date="${targetDate}"]`);

      if (dateElement) {
        const headerHeight = 80;
        const padding = 20;
        const elementPosition = dateElement.getBoundingClientRect().top;
        const offsetPosition = elementPosition + window.pageYOffset - headerHeight - padding;

        window.scrollTo({
          top: offsetPosition,
          behavior: "smooth",
        });
      }
    }
  }

  function computedEventHeight(view: "month" | "week" | "day", customHeight?: number) {
    const defaultHeights = {
      month: 40,
      week: 64,
      day: 48,
    };

    return customHeight || defaultHeights[view];
  }

  function isSelectedDate(date: Date, selectedDate: Date) {
    return isSameUtcDay(date, selectedDate);
  }

  function handleDateSelect(date: Date, emit: (event: "dateSelect", date: Date) => void) {
    emit("dateSelect", date);
  }

  function getMiniCalendarWeeks(currentDate: Date): Date[][] {
    // Use our timezone-consistent function for mini calendar weeks
    return getLocalMonthWeeks(currentDate);
  }

  function getAgendaEventsForDay(events: CalendarEvent[], day: Date): CalendarEvent[] {
    return events
      .filter((event) => {
        const eventStart = parseStableDate(event.start);
        const eventEnd = parseStableDate(event.end);

        // Use unified ical.js-based comparison logic
        // Note: iCal DTEND is exclusive, so we don't check isSameLocalDay(day, eventEnd)
        // An event ending on Aug 3 should not appear on Aug 3 (it ends at the start of Aug 3)
        return (
          isSameLocalDay(day, eventStart)
          || isLocalDayInRange(day, eventStart, eventEnd)
        );
      })
      .sort((a, b) => {
        const aStart = parseStableDate(a.start).getTime();
        const bStart = parseStableDate(b.start).getTime();
        return aStart - bStart;
      });
  }

  function isMultiDayEvent(event: CalendarEvent): boolean {
    const eventStart = parseStableDate(event.start);
    const eventEnd = parseStableDate(event.end);
    
    // All-day events are always multi-day if they span multiple calendar days
    if (event.allDay) {
      return !isSameLocalDay(eventStart, eventEnd);
    }
    
    // For timed events, check if they span across calendar days in local timezone
    // An event from 11 PM to 1 AM should be considered multi-day
    return !isSameLocalDay(eventStart, eventEnd);
  }

  function getAllEventsForDay(events: CalendarEvent[], day: Date): CalendarEvent[] {
    const result = events.filter((event) => {
      const eventStart = parseStableDate(event.start);
      const eventEnd = parseStableDate(event.end);

      // Use unified ical.js-based comparison logic
      // iCal standard: DTSTART is inclusive, DTEND is exclusive
      const isSameStart = isSameLocalDay(day, eventStart);
      const isInRange = isLocalDayInRange(day, eventStart, eventEnd);

      // An event should appear on its start day OR any day within its range
      // The isLocalDayInRange function now correctly handles the exclusive end date
      return isSameStart || isInRange;
    });

    return result;
  }

  type PlaceholderEvent = CalendarEvent & {
    isPlaceholder?: boolean;
  };

  function isPlaceholderEvent(event: CalendarEvent): boolean {
    return event.id.startsWith("__placeholder_") || (event as PlaceholderEvent).isPlaceholder === true;
  }

  function createPlaceholderEvent(position: number): PlaceholderEvent {
    return {
      id: `__placeholder_${position}`,
      title: "",
      start: new Date(0), // Use epoch date for consistency
      end: new Date(0), // Use epoch date for consistency
      allDay: false,
      isPlaceholder: true,
    };
  }

  function assignSpanningEventLanes(allEvents: CalendarEvent[]): Map<string, number> {
    const spanningEvents = allEvents.filter(isMultiDayEvent);

    // Sort spanning events by start time, then by ID for consistency
    const sortedSpanningEvents = spanningEvents.sort((a, b) => {
      const aStart = parseStableDate(a.start).getTime();
      const bStart = parseStableDate(b.start).getTime();
      const timeComparison = aStart - bStart;
      if (timeComparison !== 0)
        return timeComparison;
      return a.id.localeCompare(b.id);
    });

    // Track occupied lanes by date ranges
    const lanes: Array<{ eventId: string; start: Date; end: Date }> = [];
    const eventLaneMap = new Map<string, number>();

    sortedSpanningEvents.forEach((event) => {
      const eventStart = parseStableDate(event.start);
      const eventEnd = parseStableDate(event.end);

      // Find the first available lane that doesn't conflict
      let laneIndex = 0;
      let placed = false;

      while (!placed) {
        if (laneIndex >= lanes.length) {
          // Create a new lane
          lanes.push({ eventId: event.id, start: eventStart, end: eventEnd });
          eventLaneMap.set(event.id, laneIndex);
          placed = true;
        }
        else {
          // Check if this lane is free for our date range
          const laneEvent = lanes[laneIndex];
          if (!laneEvent) {
            laneIndex++;
            continue;
          }
          const laneStart = laneEvent.start;
          const laneEnd = laneEvent.end;

          // Events don't overlap if one ends before the other starts
          const noOverlap = eventEnd <= laneStart || eventStart >= laneEnd;

          if (noOverlap) {
            // Lane is available, update it with our event
            lanes[laneIndex] = { eventId: event.id, start: eventStart, end: eventEnd };
            eventLaneMap.set(event.id, laneIndex);
            placed = true;
          }
          else {
            laneIndex++;
          }
        }
      }
    });

    // Update global lane assignments
    spanningEventLanes.clear();
    eventLaneMap.forEach((lane, eventId) => {
      spanningEventLanes.set(eventId, lane);
    });

    return eventLaneMap;
  }

  function sortEventsWithLanes(events: CalendarEvent[]): CalendarEvent[] {
    const spanningEvents = events.filter(isMultiDayEvent);
    const singleDayEvents = events.filter(event => !isMultiDayEvent(event));

    // Sort single-day events by time
    const sortedSingleDay = singleDayEvents.sort((a, b) => {
      const timeComparison = parseStableDate(a.start).getTime() - parseStableDate(b.start).getTime();
      if (timeComparison !== 0)
        return timeComparison;
      return a.id.localeCompare(b.id);
    });

    // Group spanning events by their assigned lanes
    const spanningByLane = new Map<number, CalendarEvent>();
    spanningEvents.forEach((event) => {
      const lane = spanningEventLanes.get(event.id) ?? 999;
      spanningByLane.set(lane, event);
    });

    const result: CalendarEvent[] = [];
    let singleDayIndex = 0;

    const maxLane = Math.max(...Array.from(spanningByLane.keys()), -1);

    // Fill positions 0 through maxLane, ensuring spanning events are in correct positions
    for (let position = 0; position <= maxLane; position++) {
      const spanningEventInLane = spanningByLane.get(position);

      if (spanningEventInLane) {
        // Place the spanning event in its assigned lane
        result.push(spanningEventInLane);
      }
      else if (singleDayIndex < sortedSingleDay.length) {
        // Use a single-day event as padding to maintain spanning event positions
        const singleDayEvent = sortedSingleDay[singleDayIndex];
        if (singleDayEvent) {
          result.push(singleDayEvent);
        }
        singleDayIndex++;
      }
      else {
        // No single-day events available for padding, use an invisible placeholder
        result.push(createPlaceholderEvent(position));
      }
    }

    // Add any remaining single-day events
    while (singleDayIndex < sortedSingleDay.length) {
      const remainingEvent = sortedSingleDay[singleDayIndex];
      if (remainingEvent) {
        result.push(remainingEvent);
      }
      singleDayIndex++;
    }

    return result;
  }

  function sortEvents(events: CalendarEvent[]): CalendarEvent[] {
    if (spanningEventLanes.size > 0) {
      return sortEventsWithLanes(events);
    }

    return [...events].sort((a, b) => {
      const aIsMultiDay = isMultiDayEvent(a);
      const bIsMultiDay = isMultiDayEvent(b);

      if (aIsMultiDay && !bIsMultiDay)
        return -1;
      if (!aIsMultiDay && bIsMultiDay)
        return 1;

      return parseStableDate(a.start).getTime() - parseStableDate(b.start).getTime();
    });
  }

  return {
    // Data access
    allEvents: readonly(allEvents),
    calendarSyncStatus: readonly(calendarSyncStatus),
    nativeEvents: readonly(nativeEvents),

    // Data management functions
    refreshCalendarData,
    getIntegrationEvents,

    // Utility functions
    isToday,
    isFirstDay,
    isLastDay,
    isFirstVisibleDay,
    handleEventClick,
    scrollToDate,
    computedEventHeight,
    isSelectedDate,
    handleDateSelect,
    getMiniCalendarWeeks,
    getAgendaEventsForDay,
    isMultiDayEvent,
    getAllEventsForDay,
    createPlaceholderEvent,
    isPlaceholderEvent,
    assignSpanningEventLanes,
    sortEventsWithLanes,
    sortEvents,
    lightenColor,
    getTextColor,
    getLuminance,
    getAverageTextColor,
    getEventColorClasses,
    combineEvents,
    getEventUserColors,

    // Timestamp handling functions
    getLocalTimeFromUTC,
    getLocalTimeString,
    getLocalDateString,
    getEventDisplayTime,
    getEventStartTimeForInput,
    getEventEndTimeForInput,
    getEventEndDateForInput,
    createLocalDateTime,
    convertLocalToUTC,
    isSameLocalDay,
    isLocalDayInRange,

    // Calendar date construction functions (timezone-consistent)
    createLocalDate,
    getLocalWeekDays,
    getLocalMonthWeeks,
    getLocalAgendaDays,
  };
}
