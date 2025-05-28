<script setup lang="ts">
import { format, getHours, isBefore, isSameDay } from "date-fns";

import type { CalendarEvent } from "~/utils/calendarTypes";

import { getAllEventsForDay, sortEvents } from "~/utils/calendarUtils";

const props = defineProps<{
  days: Date[];
  events: CalendarEvent[];
  weekStart: Date;
  defaultStartHour?: number;
  eventHeight?: number;
  showAllDaySection?: boolean;
}>();

const emit = defineEmits<{
  (e: "eventCreate", date: Date): void;
  (e: "eventClick", event: CalendarEvent, mouseEvent: MouseEvent): void;
  (e: "eventUpdate", event: CalendarEvent): void;
}>();

// Generate hours array for the time grid
const hours = computed(() => {
  const result = [];
  for (let i = 0; i < 24; i++) {
    const date = new Date();
    date.setHours(i, 0, 0, 0);
    result.push(date);
  }
  return result;
});

// Filter all-day events
const allDayEvents = computed(() => {
  return props.events.filter(event => event.allDay);
});

// Process events for positioning in the week view
const processedDayEvents = computed(() => {
  return props.days.map((day) => {
    const dayEvents = getAllEventsForDay(props.events, day).filter(event => !event.allDay);
    return sortEvents(dayEvents).map((event, index) => {
      const eventStart = new Date(event.start);
      const eventEnd = new Date(event.end);
      const startHour = getHours(eventStart);
      const endHour = getHours(eventEnd);
      const duration = endHour - startHour;

      return {
        event,
        top: startHour * 60, // Convert hours to minutes for positioning
        height: duration * 60, // Convert duration to minutes
        left: 0, // You might want to implement overlapping event logic
        width: 1,
        zIndex: index + 1,
      };
    });
  });
});

// Current time indicator
const currentTimeVisible = computed(() => {
  const now = new Date();
  return props.days.some(day => isSameDay(day, now));
});

const currentTimePosition = computed(() => {
  const now = new Date();
  const hours = now.getHours();
  const minutes = now.getMinutes();
  return ((hours + minutes / 60) / 24) * 100;
});

function isToday(date: Date) {
  return isSameDay(date, new Date());
}

function getDayAllDayEvents(day: Date) {
  return allDayEvents.value.filter((event) => {
    const eventStart = new Date(event.start);
    const eventEnd = new Date(event.end);
    return (
      isSameDay(day, eventStart)
      || (day > eventStart && day < eventEnd)
      || isSameDay(day, eventEnd)
    );
  });
}

function shouldShowEventTitle(day: Date, _dayIndex: number, event: CalendarEvent) {
  const eventStart = new Date(event.start);
  const isFirstDay = isSameDay(day, eventStart);
  const isFirstVisibleDay = _dayIndex === 0 && isBefore(eventStart, props.weekStart);
  return isFirstDay || isFirstVisibleDay;
}

function handleEventClick(event: CalendarEvent, mouseEvent: MouseEvent) {
  emit("eventClick", event, mouseEvent);
}

function handleQuarterHourClick(day: Date, hour: number, quarter: number) {
  const startTime = new Date(day);
  startTime.setHours(hour);
  startTime.setMinutes(quarter * 15);
  emit("eventCreate", startTime);
}

function handleEventDrop(event: CalendarEvent) {
  emit("eventUpdate", event);
}
</script>

<template>
  <div data-slot="week-view" class="flex h-full w-full flex-col">
    <div class="sticky top-[80px] z-30 grid h-16 w-full grid-cols-7 border-y border-gray-200 dark:border-gray-700 bg-gray-100/80 dark:bg-gray-800/80 backdrop-blur-md uppercase">
      <div
        v-for="day in days"
        :key="day.toString()"
        class="py-2 text-center text-xs text-gray-600 dark:text-gray-400"
        :class="{
          'text-gray-900 dark:text-gray-100 font-medium': isToday(day),
        }"
      >
        <span class="sm:hidden" aria-hidden="true">
          {{ format(day, "E")[0] }} {{ format(day, "d") }}
        </span>
        <span class="max-sm:hidden">{{ format(day, "EEE dd") }}</span>
      </div>
    </div>

    <div v-if="showAllDaySection" class="w-full border-b border-gray-200 dark:border-gray-700 bg-gray-100/50 dark:bg-gray-800/50">
      <div class="grid w-full grid-cols-8">
        <div class="relative border-r border-gray-200 dark:border-gray-700">
          <span class="absolute bottom-0 left-0 h-6 w-16 max-w-full pe-2 text-right text-[10px] text-gray-600 dark:text-gray-400 sm:pe-4 sm:text-xs">
            All day
          </span>
        </div>
        <div
          v-for="(day, dayIndex) in days"
          :key="day.toString()"
          class="relative border-r border-gray-200 dark:border-gray-700 p-1 last:border-r-0"
          :class="{
            'bg-blue-100/10 dark:bg-blue-900/10': isToday(day),
          }"
        >
          <CalendarEventItem
            v-for="event in getDayAllDayEvents(day)"
            :key="`spanning-${event.id}`"
            :event="event"
            view="month"
            :is-first-day="isSameDay(day, new Date(event.start))"
            :is-last-day="isSameDay(day, new Date(event.end))"
            @click="(e) => handleEventClick(event, e)"
          >
            <div
              class="truncate"
              :class="[
                !shouldShowEventTitle(day, dayIndex, event) && 'invisible',
              ]"
              :aria-hidden="!shouldShowEventTitle(day, dayIndex, event)"
            >
              {{ event.title }}
            </div>
          </CalendarEventItem>
        </div>
      </div>
    </div>

    <div class="grid h-[calc(100%-4rem)] w-full flex-1 grid-cols-8 overflow-hidden">
      <div class="grid h-full auto-cols-fr border-r border-gray-200 dark:border-gray-700">
        <div
          v-for="(hour, index) in hours"
          :key="hour.toString()"
          class="relative min-h-[var(--week-cells-height)] border-b border-gray-200 dark:border-gray-700 last:border-b-0"
        >
          <span
            v-if="index > 0"
            class="absolute -top-3 left-0 flex h-6 w-16 max-w-full items-center justify-end bg-white dark:bg-gray-900 pe-2 text-[10px] text-gray-600 dark:text-gray-400 sm:pe-4 sm:text-xs"
          >
            {{ format(hour, "h a") }}
          </span>
        </div>
      </div>

      <div
        v-for="(day, dayIndex) in days"
        :key="day.toString()"
        class="relative grid h-full auto-cols-fr border-r border-gray-200 dark:border-gray-700 last:border-r-0"
        :class="{
          'bg-blue-100/10 dark:bg-blue-900/10': isToday(day),
        }"
      >
        <!-- Positioned events -->
        <div
          v-for="positionedEvent in processedDayEvents[dayIndex]"
          :key="positionedEvent.event.id"
          class="absolute z-10 px-0.5"
          :style="{
            top: `${positionedEvent.top}px`,
            height: `${positionedEvent.height}px`,
            left: `${positionedEvent.left * 100}%`,
            width: `${positionedEvent.width * 100}%`,
            zIndex: positionedEvent.zIndex,
          }"
          @click.stop
        >
          <div class="h-full w-full">
            <CalendarDraggableEvent
              :event="positionedEvent.event"
              view="week"
              :show-time="true"
              :height="positionedEvent.height"
              @click="(e) => handleEventClick(positionedEvent.event, e)"
            />
          </div>
        </div>

        <!-- Current time indicator -->
        <div
          v-if="currentTimeVisible && isToday(day)"
          class="pointer-events-none absolute right-0 left-0 z-20"
          :style="{ top: `${currentTimePosition}%` }"
        >
          <div class="relative flex items-center">
            <div class="absolute -left-1 h-2 w-2 rounded-full bg-red-500" />
            <div class="h-[2px] w-full bg-red-500" />
          </div>
        </div>

        <div
          v-for="hour in hours"
          :key="hour.toString()"
          class="relative min-h-[var(--week-cells-height)] border-b border-gray-200 dark:border-gray-700 last:border-b-0"
        >
          <CalendarDroppableCell
            v-for="quarter in [0, 1, 2, 3]"
            :id="`week-cell-${day.toISOString()}-${getHours(hour) + quarter * 0.25}`"
            :key="`${hour.toString()}-${quarter}`"
            :date="day"
            :time="getHours(hour) + quarter * 0.25"
            :class="quarter === 0 ? 'top-0' : quarter === 1 ? 'top-[calc(var(--week-cells-height)/4)]' : quarter === 2 ? 'top-[calc(var(--week-cells-height)/4*2)]' : 'top-[calc(var(--week-cells-height)/4*3)]'"
            @click="handleQuarterHourClick(day, getHours(hour), quarter)"
            @drop="handleEventDrop"
          />
        </div>
      </div>
    </div>
  </div>
</template>
