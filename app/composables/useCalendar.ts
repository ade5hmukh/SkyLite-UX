import type { DateValue } from "@internationalized/date";

import { consola } from "consola";
import { format } from "date-fns";
import ical from "ical.js";

import type { CalendarEvent, PlaceholderEvent } from "~/types/calendar";
import type { Integration } from "~/types/database";

import { useStableDate } from "~/composables/useStableDate";
import { useSyncManager } from "~/composables/useSyncManager";

export function useCalendar() {
  const spanningEventLanes = new Map<string, number>();

  const { data: nativeEvents } = useNuxtData<CalendarEvent[]>("calendar-events");

  const { integrations } = useIntegrations();

  const { getSyncDataByType, getCachedIntegrationData } = useSyncManager();

  const { getStableDate, parseStableDate } = useStableDate();

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

  function createICalTime(date: Date, isUTC: boolean = false): ical.Time {
    return ical.Time.fromJSDate(date, isUTC);
  }

  function isSameLocalDay(a: Date, b: Date): boolean {
    try {
      const browserTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const timezone = ical.TimezoneService.get(browserTimezone);

      if (!timezone) {
        return isSameUtcDay(a, b);
      }

      const timeA = createICalTime(a, true);
      const timeB = createICalTime(b, true);

      const localA = timeA.convertToZone(timezone);
      const localB = timeB.convertToZone(timezone);

      return localA.year === localB.year
        && localA.month === localB.month
        && localA.day === localB.day;
    }
    catch (error) {
      consola.debug("Use Calendar: ical.js comparison failed, using UTC fallback:", error);
      return isSameUtcDay(a, b);
    }
  }

  function isLocalDayInRange(day: Date, start: Date, end: Date): boolean {
    try {
      const browserTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const timezone = ical.TimezoneService.get(browserTimezone);

      if (!timezone) {
        return day.getTime() >= start.getTime() && day.getTime() < end.getTime();
      }

      const timeDay = createICalTime(day, true);
      const timeStart = createICalTime(start, true);
      const timeEnd = createICalTime(end, true);

      const localDay = timeDay.convertToZone(timezone);
      const localStart = timeStart.convertToZone(timezone);
      const localEnd = timeEnd.convertToZone(timezone);

      const dayMidnight = new Date(localDay.year, localDay.month - 1, localDay.day);
      const startMidnight = new Date(localStart.year, localStart.month - 1, localStart.day);
      const endMidnight = new Date(localEnd.year, localEnd.month - 1, localEnd.day);

      return dayMidnight.getTime() >= startMidnight.getTime()
        && dayMidnight.getTime() < endMidnight.getTime();
    }
    catch (error) {
      consola.debug("Use Calendar: ical.js comparison failed, using UTC fallback:", error);
      return day.getTime() >= start.getTime() && day.getTime() < end.getTime();
    }
  }

  function createLocalDate(year: number, month: number, day: number): Date {
    const utcTime = Date.UTC(year, month, day);
    return new Date(utcTime);
  }

  function getLocalWeekDays(startDate: Date): Date[] {
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
    const localDate = getLocalTimeFromUTC(date);
    const firstDayOfMonth = new Date(localDate.getFullYear(), localDate.getMonth(), 1);
    const lastDayOfMonth = new Date(localDate.getFullYear(), localDate.getMonth() + 1, 0);

    const startDate = new Date(firstDayOfMonth.getTime());
    const dayOfWeek = startDate.getDay();
    startDate.setDate(startDate.getDate() - dayOfWeek);

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
    const days: Date[] = [];
    const localDate = getLocalTimeFromUTC(date);

    for (let i = -15; i < 0; i++) {
      const day = new Date(localDate.getTime());
      day.setDate(localDate.getDate() + i);
      days.push(day);
    }

    for (let i = 0; i < 15; i++) {
      const day = new Date(localDate.getTime());
      day.setDate(localDate.getDate() + i);
      days.push(day);
    }

    return days;
  }

  function getLocalTimeFromUTC(utcDate: Date): Date {
    try {
      const browserTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

      const timezone = ical.TimezoneService.get(browserTimezone);
      if (timezone) {
        const utcTime = createICalTime(utcDate, true);

        const localTime = utcTime.convertToZone(timezone);
        return localTime.toJSDate();
      }

      return new Date(utcDate.getTime());
    }
    catch (error) {
      consola.warn("Use Calendar: ical.js timezone conversion failed, using fallback:", error);
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
      const endDate = new Date(end.getTime());
      endDate.setDate(endDate.getDate() - 1);

      const year = endDate.getFullYear();
      const month = (endDate.getMonth() + 1).toString().padStart(2, "0");
      const day = endDate.getDate().toString().padStart(2, "0");
      return `${year}-${month}-${day}`;
    }
    else {
      const startLocal = getLocalTimeFromUTC(start);
      const endLocal = getLocalTimeFromUTC(end);

      const startDay = new Date(startLocal.getTime());
      startDay.setHours(0, 0, 0, 0);
      const endDay = new Date(endLocal.getTime());
      endDay.setHours(0, 0, 0, 0);

      if (startDay.getTime() === endDay.getTime()) {
        return start.toISOString().split("T")[0]!;
      }
      else {
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

  const allEvents = computed(() => {
    const events: CalendarEvent[] = [];

    if (nativeEvents.value) {
      events.push(...nativeEvents.value);
    }

    const calendarIntegrations = (integrations.value as readonly Integration[] || []).filter(integration =>
      integration.type === "calendar" && integration.enabled,
    );

    calendarIntegrations.forEach((integration) => {
      try {
        const integrationEvents = getCachedIntegrationData("calendar", integration.id) as CalendarEvent[];
        if (integrationEvents && Array.isArray(integrationEvents)) {
          events.push(...integrationEvents);
        }
      }
      catch (error) {
        consola.warn(`Use Calendar: Failed to get calendar events for integration ${integration.id}:`, error);
      }
    });

    const result = combineEvents(events);

    return result;
  });

  const calendarSyncStatus = computed(() => {
    return getSyncDataByType("calendar", []);
  });

  const refreshCalendarData = async () => {
    try {
      await refreshNuxtData("calendar-events");

      consola.debug("Use Calendar: Calendar data refreshed successfully");
    }
    catch (error) {
      consola.error("Use Calendar: Failed to refresh calendar data:", error);
    }
  };

  const getIntegrationEvents = (integrationId: string): CalendarEvent[] => {
    try {
      const events = getCachedIntegrationData("calendar", integrationId) as CalendarEvent[];
      return events && Array.isArray(events) ? events : [];
    }
    catch (error) {
      consola.warn(`Use Calendar: Failed to get events for integration ${integrationId}:`, error);
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
        .sort() as string[];

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
      const startTime = parseStableDate(event.start).getTime();
      const endTime = parseStableDate(event.end).getTime();
      const key = `${event.title}-${startTime}-${endTime}-${event.location || ""}-${event.description || ""}`;

      if (eventMap.has(key)) {
        const existingEvent = eventMap.get(key)!;

        const existingUserIds = new Set(existingEvent.users?.map(u => u.id) || []);
        const newUsers = event.users?.filter(u => !existingUserIds.has(u.id)) || [];
        const allUsers = [...(existingEvent.users || []), ...newUsers];
        existingEvent.users = allUsers.sort((a, b) => a.id.localeCompare(b.id));

        existingEvent.color = getEventUserColors(existingEvent);
      }
      else {
        const newEvent = {
          ...event,
          color: getEventUserColors(event),
        };
        eventMap.set(key, newEvent);
      }
    });

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

          const reversedColors = visibleColors.reverse();
          colorStops = reversedColors.map(({ color: c, start, end }) => {
            const lightenedColor = /^#(?:[0-9A-F]{3}){1,2}$/i.test(c) ? lightenColor(c, 0.4) : c;
            const flippedStart = 100 - end;
            const flippedEnd = 100 - start;
            return `${lightenedColor} ${flippedStart}%, ${lightenedColor} ${flippedEnd}%`;
          }).join(", ");
        }
        else {
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
    return isSameUtcDay(date, getStableDate());
  }

  function isFirstDay(day: Date, event: CalendarEvent) {
    const eventStart = parseStableDate(event.start);

    const browserTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const timezone = ical.TimezoneService.get(browserTimezone);

    if (!timezone) {
      consola.warn("Use Calendar: Browser timezone not registered with ical.js, using UTC fallback for isFirstDay");
      return isSameUtcDay(day, eventStart);
    }

    return isSameLocalDay(day, eventStart);
  }

  function isLastDay(day: Date, event: CalendarEvent) {
    const eventStart = parseStableDate(event.start);
    const eventEnd = parseStableDate(event.end);

    const browserTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const timezone = ical.TimezoneService.get(browserTimezone);

    if (!timezone) {
      consola.warn("Use Calendar: Browser timezone not registered with ical.js, using UTC fallback for isLastDay");
      if (isSameUtcDay(eventStart, eventEnd)) {
        return isSameUtcDay(day, eventStart);
      }
      const dayBeforeEnd = new Date(eventEnd.getTime() - 24 * 60 * 60 * 1000);
      return isSameUtcDay(day, dayBeforeEnd);
    }

    if (isSameLocalDay(eventStart, eventEnd)) {
      return isSameLocalDay(day, eventStart);
    }

    const dayBeforeEnd = new Date(eventEnd.getTime() - 24 * 60 * 60 * 1000);
    return isSameLocalDay(day, dayBeforeEnd);
  }

  function isFirstVisibleDay(day: Date, event: CalendarEvent, visibleDays: Date[]): boolean {
    if (isFirstDay(day, event)) {
      return true;
    }

    const firstVisibleDay = visibleDays[0];
    if (!firstVisibleDay) {
      return false;
    }

    const eventStart = parseStableDate(event.start);

    const browserTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const timezone = ical.TimezoneService.get(browserTimezone);

    if (!timezone) {
      consola.warn("Use Calendar: Browser timezone not registered with ical.js, using UTC fallback for isFirstVisibleDay");
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

    const eventStartLocal = getLocalTimeFromUTC(eventStart);
    const eventStartDay = new Date(eventStartLocal.getTime());
    eventStartDay.setHours(0, 0, 0, 0);

    const firstVisibleDayLocal = getLocalTimeFromUTC(firstVisibleDay);
    const firstVisibleDayMidnight = new Date(firstVisibleDayLocal.getTime());
    firstVisibleDayMidnight.setHours(0, 0, 0, 0);

    if (eventStartDay.getTime() < firstVisibleDayMidnight.getTime()) {
      const eventDaysInView = visibleDays.filter((visibleDay) => {
        const eventsForDay = getAllEventsForDay([event], visibleDay);
        return eventsForDay.length > 0;
      });

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
    return getLocalMonthWeeks(currentDate);
  }

  function getAgendaEventsForDay(events: CalendarEvent[], day: Date): CalendarEvent[] {
    return events
      .filter((event) => {
        const eventStart = parseStableDate(event.start);
        const eventEnd = parseStableDate(event.end);

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

    if (event.allDay) {
      return !isSameLocalDay(eventStart, eventEnd);
    }

    return !isSameLocalDay(eventStart, eventEnd);
  }

  function getAllEventsForDay(events: CalendarEvent[], day: Date): CalendarEvent[] {
    const result = events.filter((event) => {
      const eventStart = parseStableDate(event.start);
      const eventEnd = parseStableDate(event.end);

      const isSameStart = isSameLocalDay(day, eventStart);
      const isInRange = isLocalDayInRange(day, eventStart, eventEnd);

      return isSameStart || isInRange;
    });

    return result;
  }

  function isPlaceholderEvent(event: CalendarEvent): boolean {
    return event.id.startsWith("__placeholder_") || (event as PlaceholderEvent).isPlaceholder === true;
  }

  function createPlaceholderEvent(position: number): PlaceholderEvent {
    return {
      id: `__placeholder_${position}`,
      title: "",
      start: new Date(0),
      end: new Date(0),
      allDay: false,
      isPlaceholder: true,
      position,
    };
  }

  function assignSpanningEventLanes(allEvents: CalendarEvent[]): Map<string, number> {
    const spanningEvents = allEvents.filter(isMultiDayEvent);

    const sortedSpanningEvents = spanningEvents.sort((a, b) => {
      const aStart = parseStableDate(a.start).getTime();
      const bStart = parseStableDate(b.start).getTime();
      const timeComparison = aStart - bStart;
      if (timeComparison !== 0)
        return timeComparison;
      return a.id.localeCompare(b.id);
    });

    const lanes: Array<{ eventId: string; start: Date; end: Date }> = [];
    const eventLaneMap = new Map<string, number>();

    sortedSpanningEvents.forEach((event) => {
      const eventStart = parseStableDate(event.start);
      const eventEnd = parseStableDate(event.end);

      let laneIndex = 0;
      let placed = false;

      while (!placed) {
        if (laneIndex >= lanes.length) {
          lanes.push({ eventId: event.id, start: eventStart, end: eventEnd });
          eventLaneMap.set(event.id, laneIndex);
          placed = true;
        }
        else {
          const laneEvent = lanes[laneIndex];
          if (!laneEvent) {
            laneIndex++;
            continue;
          }
          const laneStart = laneEvent.start;
          const laneEnd = laneEvent.end;

          const noOverlap = eventEnd <= laneStart || eventStart >= laneEnd;

          if (noOverlap) {
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

    spanningEventLanes.clear();
    eventLaneMap.forEach((lane, eventId) => {
      spanningEventLanes.set(eventId, lane);
    });

    return eventLaneMap;
  }

  function sortEventsWithLanes(events: CalendarEvent[]): CalendarEvent[] {
    const spanningEvents = events.filter(isMultiDayEvent);
    const singleDayEvents = events.filter(event => !isMultiDayEvent(event));

    const sortedSingleDay = singleDayEvents.sort((a, b) => {
      const timeComparison = parseStableDate(a.start).getTime() - parseStableDate(b.start).getTime();
      if (timeComparison !== 0)
        return timeComparison;
      return a.id.localeCompare(b.id);
    });

    const spanningByLane = new Map<number, CalendarEvent>();
    spanningEvents.forEach((event) => {
      const lane = spanningEventLanes.get(event.id) ?? 999;
      spanningByLane.set(lane, event);
    });

    const result: CalendarEvent[] = [];
    let singleDayIndex = 0;

    const maxLane = Math.max(...Array.from(spanningByLane.keys()), -1);

    for (let position = 0; position <= maxLane; position++) {
      const spanningEventInLane = spanningByLane.get(position);

      if (spanningEventInLane) {
        result.push(spanningEventInLane);
      }
      else if (singleDayIndex < sortedSingleDay.length) {
        const singleDayEvent = sortedSingleDay[singleDayIndex];
        if (singleDayEvent) {
          result.push(singleDayEvent);
        }
        singleDayIndex++;
      }
      else {
        result.push(createPlaceholderEvent(position));
      }
    }

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
    allEvents: readonly(allEvents),
    calendarSyncStatus: readonly(calendarSyncStatus),
    nativeEvents: readonly(nativeEvents),

    refreshCalendarData,
    getIntegrationEvents,

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

    createLocalDate,
    getLocalWeekDays,
    getLocalMonthWeeks,
    getLocalAgendaDays,
  };
}
