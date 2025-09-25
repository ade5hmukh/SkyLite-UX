<script setup lang="ts">
import { consola } from "consola";
import { endOfWeek, startOfWeek } from "date-fns";

import type { CalendarEvent } from "~/types/calendar";

import { useCalendar } from "~/composables/useCalendar";
import { useStableDate } from "~/composables/useStableDate";

const props = defineProps<{
  events: CalendarEvent[];
  startDate?: Date;
  eventHeight?: number;
}>();

const emit = defineEmits<{
  (e: "eventCreate", date: Date): void;
  (e: "eventClick", event: CalendarEvent, mouseEvent: MouseEvent): void;
}>();

const { getStableDate } = useStableDate();

const { isToday, getAllEventsForDay, assignSpanningEventLanes, sortEvents, handleEventClick: _handleEventClick, getLocalWeekDays, getEventsForDateRange } = useCalendar();

const weekDays = computed(() => {
  const start = props.startDate || getStableDate();
  const days = getLocalWeekDays(start);

  return days;
});

const nextWeekDays = computed(() => {
  const start = props.startDate || getStableDate();
  const nextWeekStart = new Date(start.getTime() + 7 * 24 * 60 * 60 * 1000);
  return getLocalWeekDays(nextWeekStart);
});

const nextWeekEvents = computed(() => {
  const start = props.startDate || getStableDate();
  const nextWeekStart = new Date(start.getTime() + 7 * 24 * 60 * 60 * 1000);
  const nextWeekEnd = new Date(nextWeekStart.getTime() + 6 * 24 * 60 * 60 * 1000);
  return getEventsForDateRange(nextWeekStart, nextWeekEnd);
});

const firstRow = computed(() => weekDays.value.slice(0, 4));
const secondRow = computed(() => {
  const currentWeekDays = weekDays.value.slice(4, 7);
  const nextWeekFirstDay = nextWeekDays.value[0];
  if (!nextWeekFirstDay) {
    return currentWeekDays;
  }
  return [...currentWeekDays, nextWeekFirstDay];
});

watch(() => props.events, (events) => {
  assignSpanningEventLanes(events);
}, { immediate: true });

function handleEventClick(event: CalendarEvent, e: MouseEvent) {
  _handleEventClick(event, e, emit);
}

function getEventForDayAndPosition(day: Date, position: number): CalendarEvent | null {
  const dayEvents = getAllEventsForDay(props.events, day);
  const sortedEvents = sortEvents(dayEvents);
  const result = sortedEvents[position] || null;

  // Debug logging for event rendering
  if (day.getDay() === 0) { // Sunday
    consola.log(`Sunday ${day.toDateString()} - getEventForDayAndPosition:`, {
      dayEvents: dayEvents.map(e => ({ id: e.id, title: e.title })),
      sortedEvents: sortedEvents.map(e => ({ id: e.id, title: e.title })),
      position,
      result: result ? { id: result.id, title: result.title } : null,
    });
  }

  return result;
}

const nextWeekEventCount = computed(() => {
  const uniqueEvents = new Set<string>();

  nextWeekDays.value.forEach((day) => {
    const dayEvents = getAllEventsForDay(nextWeekEvents.value, day);
    consola.log(`Events for ${day.toDateString()}:`, dayEvents.map(e => ({ id: e.id, title: e.title, start: e.start, end: e.end })));
    dayEvents.forEach((event) => {
      // Use base ID without timestamp suffixes for counting
      const baseId = event.id.split("-")[0] || event.id;
      uniqueEvents.add(baseId);
    });
  });

  // Check specifically for Sunday events that might be missing from the display
  const sundayEvents = nextWeekEvents.value.filter((event) => {
    const eventStart = new Date(event.start);
    const eventEnd = new Date(event.end);
    const sunday = nextWeekDays.value.find(day => day.getDay() === 0); // Find Sunday in next week
    if (!sunday)
      return false;

    const sundayStart = new Date(sunday.getFullYear(), sunday.getMonth(), sunday.getDate());
    const sundayEnd = new Date(sundayStart.getTime() + 24 * 60 * 60 * 1000);

    return eventStart < sundayEnd && eventEnd > sundayStart;
  });

  if (sundayEvents.length > 0) {
    consola.log("Sunday events found:", sundayEvents.map(e => ({ id: e.id, title: e.title, start: e.start, end: e.end })));
  }

  // Debug logging to understand the data structure
  consola.log("Next week events:", nextWeekEvents.value.map(e => ({ id: e.id, title: e.title, start: e.start, end: e.end })));
  consola.log("Next week days:", nextWeekDays.value.map(d => d.toDateString()));
  consola.log("Unique event IDs:", Array.from(uniqueEvents));
  consola.log("Count:", uniqueEvents.size);

  // Compare with main events prop
  consola.log("Main events prop length:", props.events.length);
  consola.log("Main events:", props.events.map(e => ({ id: e.id, title: e.title, start: e.start, end: e.end })));

  // Check what events are available for the current week being displayed
  const currentWeekStart = startOfWeek(props.startDate || getStableDate(), { weekStartsOn: 0 });
  const currentWeekEnd = endOfWeek(props.startDate || getStableDate(), { weekStartsOn: 0 });
  consola.log("Current week being displayed:", currentWeekStart.toDateString(), "to", currentWeekEnd.toDateString());

  const currentWeekEvents = props.events.filter((event) => {
    const eventStart = new Date(event.start);
    const eventEnd = new Date(event.end);
    return eventStart < currentWeekEnd && eventEnd > currentWeekStart;
  });
  consola.log("Events for current week being displayed:", currentWeekEvents.map(e => ({ id: e.id, title: e.title, start: e.start, end: e.end })));

  consola.log("props.startDate:", props.startDate?.toDateString(), "getStableDate():", getStableDate().toDateString());

  // Check our manual calculation
  const manualNextWeekStart = new Date((props.startDate || getStableDate()).getTime() + 7 * 24 * 60 * 60 * 1000);
  const manualNextWeekEnd = new Date(manualNextWeekStart.getTime() + 6 * 24 * 60 * 60 * 1000);
  consola.log("Manual next week range:", manualNextWeekStart.toDateString(), "to", manualNextWeekEnd.toDateString());

  return uniqueEvents.size;
});

function isLastDay(day: Date) {
  return day.toISOString() === nextWeekDays.value[0]?.toISOString();
}
</script>

<template>
  <div class="w-full">
    <div class="grid grid-cols-4 grid-rows-2 border border-default">
      <div
        v-for="day in firstRow"
        :key="day.toISOString()"
        class="relative border-r border-b border-default last:border-r-0 flex flex-col"
        style="height: 300px;"
        :class="{
          'bg-muted/25': !isToday(day),
          'bg-info/10': isToday(day),
        }"
      >
        <div class="flex items-center justify-between p-2 border-b border-default flex-shrink-0">
          <div class="text-sm font-medium text-muted">
            <NuxtTime :datetime="day" weekday="short" />
          </div>
          <div
            class="inline-flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold"
            :class="{
              'bg-primary text-white': isToday(day),
              'text-muted': !isToday(day),
            }"
          >
            <NuxtTime :datetime="day" day="numeric" />
          </div>
        </div>
        <div
          class="overflow-y-auto px-2 py-1 space-y-1 relative z-10 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] flex flex-col"
          style="height: 240px;"
        >
          <div class="rounded">
            <CalendarEventItem
              v-if="getEventForDayAndPosition(day, 0)"
              :event="getEventForDayAndPosition(day, 0)!"
              view="week"
              :current-day="day"
              class="rounded"
              @click="(e) => handleEventClick(getEventForDayAndPosition(day, 0)!, e)"
            />
          </div>
          <div class="rounded">
            <CalendarEventItem
              v-if="getEventForDayAndPosition(day, 1)"
              :event="getEventForDayAndPosition(day, 1)!"
              view="week"
              :current-day="day"
              class="rounded"
              @click="(e) => handleEventClick(getEventForDayAndPosition(day, 1)!, e)"
            />
          </div>
          <div class="rounded">
            <CalendarEventItem
              v-if="getEventForDayAndPosition(day, 2)"
              :event="getEventForDayAndPosition(day, 2)!"
              view="week"
              :current-day="day"
              class="rounded"
              @click="(e) => handleEventClick(getEventForDayAndPosition(day, 2)!, e)"
            />
          </div>
          <div
            v-show="getAllEventsForDay(events, day).length === 0"
            class="flex flex-col items-center justify-center gap-1 text-muted flex-1"
          >
            <UIcon name="i-lucide-calendar-off" class="w-8 h-8" />
            <span class="text-lg text-muted">
              {{ isToday(day) ? 'No events today' : 'No events' }}
            </span>
          </div>
        </div>
      </div>
      <div
        v-for="day in secondRow"
        :key="day.toISOString()"
        class="relative border-r border-default last:border-r-0 flex flex-col"
        style="height: 300px;"
        :class="{
          'bg-muted/25': day && !isToday(day) && !isLastDay(day),
          'bg-info/10': day && isToday(day),
          'bg-primary/20': day && isLastDay(day),
        }"
      >
        <template v-if="day && !isLastDay(day)">
          <div class="flex items-center justify-between p-2 border-b border-default flex-shrink-0">
            <div class="text-sm font-medium text-muted">
              <NuxtTime :datetime="day" weekday="short" />
            </div>
            <div
              class="inline-flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold"
              :class="{
                'bg-primary text-white': isToday(day),
                'text-muted': !isToday(day),
              }"
            >
              <NuxtTime :datetime="day" day="numeric" />
            </div>
          </div>
          <div
            class="overflow-y-auto px-2 py-1 space-y-1 relative z-10 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] flex flex-col"
            style="height: 240px;"
          >
            <div class="rounded">
              <CalendarEventItem
                v-if="getEventForDayAndPosition(day, 0)"
                :event="getEventForDayAndPosition(day, 0)!"
                view="week"
                :current-day="day"
                class="rounded"
                @click="(e) => handleEventClick(getEventForDayAndPosition(day, 0)!, e)"
              />
            </div>
            <div class="rounded">
              <CalendarEventItem
                v-if="getEventForDayAndPosition(day, 1)"
                :event="getEventForDayAndPosition(day, 1)!"
                view="week"
                :current-day="day"
                class="rounded"
                @click="(e) => handleEventClick(getEventForDayAndPosition(day, 1)!, e)"
              />
            </div>
            <div class="rounded">
              <CalendarEventItem
                v-if="getEventForDayAndPosition(day, 2)"
                :event="getEventForDayAndPosition(day, 2)!"
                view="week"
                :current-day="day"
                class="rounded"
                @click="(e) => handleEventClick(getEventForDayAndPosition(day, 2)!, e)"
              />
            </div>
            <div
              v-show="getAllEventsForDay(events, day).length === 0"
              class="flex flex-col items-center justify-center gap-1 text-muted flex-1"
            >
              <UIcon name="i-lucide-calendar-off" class="w-6 h-6" />
              <span class="text-md text-muted">
                {{ isToday(day) ? 'No events today' : 'No events' }}
              </span>
            </div>
          </div>
        </template>

        <template v-else-if="day && isLastDay(day)">
          <div class="flex items-center justify-between p-2 border-b border-default flex-shrink-0">
            <div class="text-sm font-medium text-primary">
              Next Week
            </div>
            <div class="inline-flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold bg-primary text-white">
              <UIcon name="i-lucide-calendar-days" class="w-4 h-4" />
            </div>
          </div>
          <div
            class="overflow-y-auto px-2 py-1 space-y-1 relative z-10 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] flex flex-col"
            style="height: 240px;"
          >
            <div class="flex flex-col items-center justify-center gap-2 text-primary flex-1">
              <div class="text-center">
                <div class="text-lg font-semibold">
                  {{ nextWeekEventCount }}
                </div>
                <div class="text-xs opacity-75">
                  {{ nextWeekEventCount === 1 ? 'event' : 'events' }}
                </div>
              </div>
              <div class="text-xs text-center opacity-75">
                <div class="text-xs opacity-50 mt-2">
                  Coming up next week
                </div>
              </div>
            </div>
          </div>
        </template>
      </div>
    </div>
  </div>
</template>
