import { addDays, endOfWeek, format, isSameDay, startOfWeek } from "date-fns";

import type { CalendarEvent } from "~/types/calendar";

export function useCalendar() {
  const spanningEventLanes = new Map<string, number>();

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
        .filter(color => color && color !== null) as string[];

      if (userColors.length > 1) {
        return userColors;
      }
      else if (userColors.length === 1) {
        return userColors[0] || defaultColor;
      }
    }

    if (Array.isArray(event.color)) {
      return event.color;
    }
    return (typeof event.color === "string" ? event.color : null) || eventColor || defaultColor;
  }

  function combineEvents(events: CalendarEvent[]): CalendarEvent[] {
    const eventMap = new Map<string, CalendarEvent>();

    events.forEach((event) => {
      const key = `${event.title}-${new Date(event.start).getTime()}-${new Date(event.end).getTime()}-${event.location || ""}-${event.description || ""}`;

      if (eventMap.has(key)) {
        const existingEvent = eventMap.get(key)!;

        const existingUserIds = new Set(existingEvent.users?.map(u => u.id) || []);
        const newUsers = event.users?.filter(u => !existingUserIds.has(u.id)) || [];
        existingEvent.users = [...(existingEvent.users || []), ...newUsers];

        existingEvent.color = getEventUserColors(existingEvent);
      }
      else {
        const newEvent = { ...event };
        newEvent.color = getEventUserColors(newEvent);
        eventMap.set(key, newEvent);
      }
    });

    return Array.from(eventMap.values());
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
          const eventStart = new Date(spanningInfo.event.start);
          const eventEnd = new Date(spanningInfo.event.end);

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
          // Non-spanning events use original logic (no reversal needed for single-day events)
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

        return {
          style: `background: linear-gradient(-45deg, ${colorStops}); color: ${textColor}; text-shadow: 0 1px 2px ${shadowColor};`,
        };
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
    return isSameDay(date, new Date());
  }

  function isFirstDay(day: Date, event: CalendarEvent) {
    return isSameDay(day, new Date(event.start));
  }

  function isLastDay(day: Date, event: CalendarEvent) {
    return isSameDay(day, new Date(event.end));
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

    const eventStart = new Date(event.start);

    // If event started before the view and this is the first day we see it
    if (eventStart < firstVisibleDay) {
      // Find the first day this event appears in the current view
      const eventDaysInView = visibleDays.filter((visibleDay) => {
        const eventsForDay = getAllEventsForDay([event], visibleDay);
        return eventsForDay.length > 0;
      });

      // Return true if this is the first day the event appears in current view
      const firstEventDay = eventDaysInView[0];
      return firstEventDay ? isSameDay(day, firstEventDay) : false;
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
    return isSameDay(date, selectedDate);
  }

  function handleDateSelect(date: Date, emit: (event: "dateSelect", date: Date) => void) {
    emit("dateSelect", date);
  }

  function getMiniCalendarWeeks(currentDate: Date): Date[][] {
    const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const lastDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
    const startDate = startOfWeek(firstDayOfMonth, { weekStartsOn: 0 });
    const endDate = endOfWeek(lastDayOfMonth, { weekStartsOn: 0 });
    const weeks: Date[][] = [];
    let date = startDate;

    while (date <= endDate) {
      const week: Date[] = [];
      for (let i = 0; i < 7; i++) {
        week.push(new Date(date));
        date = addDays(date, 1);
      }
      weeks.push(week);
    }

    return weeks;
  }

  function getAgendaEventsForDay(events: CalendarEvent[], day: Date): CalendarEvent[] {
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

  function isMultiDayEvent(event: CalendarEvent): boolean {
    const eventStart = new Date(event.start);
    const eventEnd = new Date(event.end);
    return event.allDay || eventStart.getDate() !== eventEnd.getDate();
  }

  function getAllEventsForDay(events: CalendarEvent[], day: Date): CalendarEvent[] {
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

  type PlaceholderEvent = CalendarEvent & {
    isPlaceholder?: boolean;
  };

  function isPlaceholderEvent(event: CalendarEvent): boolean {
    return event.id.startsWith("__placeholder_") || (event as PlaceholderEvent).isPlaceholder === true;
  }

  function createPlaceholderEvent(position: number): PlaceholderEvent {
    return {
      id: `__placeholder_${position}_${Date.now()}`,
      title: "",
      start: new Date(),
      end: new Date(),
      allDay: false,
      isPlaceholder: true,
    };
  }

  function assignSpanningEventLanes(allEvents: CalendarEvent[]): Map<string, number> {
    const spanningEvents = allEvents.filter(isMultiDayEvent);

    // Sort spanning events by start time, then by ID for consistency
    const sortedSpanningEvents = spanningEvents.sort((a, b) => {
      const timeComparison = new Date(a.start).getTime() - new Date(b.start).getTime();
      if (timeComparison !== 0)
        return timeComparison;
      return a.id.localeCompare(b.id);
    });

    // Track occupied lanes by date ranges
    const lanes: Array<{ eventId: string; start: Date; end: Date }> = [];
    const eventLaneMap = new Map<string, number>();

    sortedSpanningEvents.forEach((event) => {
      const eventStart = new Date(event.start);
      const eventEnd = new Date(event.end);

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
      const timeComparison = new Date(a.start).getTime() - new Date(b.start).getTime();
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

      return new Date(a.start).getTime() - new Date(b.start).getTime();
    });
  }

  return {
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
  };
}
