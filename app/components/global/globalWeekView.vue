<script setup lang="ts">
import { addDays, format } from "date-fns";

import type { CalendarEvent } from "~/types/calendar";

import { useCalendar } from "~/composables/useCalendar";

const props = defineProps<{
  events: CalendarEvent[];
  startDate?: Date;
  eventHeight?: number;
}>();

const emit = defineEmits<{
  (e: "eventCreate", date: Date): void;
  (e: "eventClick", event: CalendarEvent, mouseEvent: MouseEvent): void;
}>();

const weekDays = computed(() => {
  const start = props.startDate || new Date();
  const days = [];
  for (let i = 0; i < 8; i++) {
    days.push(addDays(start, i));
  }
  return days;
});

const firstRow = computed(() => weekDays.value.slice(0, 4));
const secondRow = computed(() => weekDays.value.slice(4, 8));

const { isToday, getAllEventsForDay, isPlaceholderEvent, assignSpanningEventLanes, sortEvents, computedEventHeight: getEventHeight, handleEventClick: _handleEventClick } = useCalendar();

const computedEventHeight = computed(() => getEventHeight("week", props.eventHeight));

watch(() => props.events, (events) => {
  assignSpanningEventLanes(events);
}, { immediate: true });

function handleEventClick(event: CalendarEvent, e: MouseEvent) {
  _handleEventClick(event, e, emit);
}
</script>

<template>
  <div class="w-full">
    <!-- Week Grid Layout -->
    <div class="grid grid-cols-4 grid-rows-2 border border-gray-200 dark:border-gray-700">
      <div
        v-for="day in firstRow"
        :key="day.toISOString()"
        class="relative border-r border-b border-gray-200 dark:border-gray-700 last:border-r-0 flex flex-col"
        style="height: 300px;"
        :class="{
          'bg-gray-100/25 dark:bg-gray-800/25': !isToday(day),
          'bg-blue-100/10 dark:bg-blue-900/10': isToday(day),
        }"
      >
        <!-- Day Header -->
        <div class="flex items-center justify-between p-2 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
          <div class="text-sm font-medium text-gray-600 dark:text-gray-400">
            {{ format(day, 'EEE') }}
          </div>
          <div
            class="inline-flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold"
            :class="{
              'bg-primary text-white': isToday(day),
              'text-gray-600 dark:text-gray-400': !isToday(day),
            }"
          >
            {{ format(day, 'd') }}
          </div>
        </div>

        <!-- Events Container -->
        <div
          class="overflow-y-auto px-2 py-1 space-y-1 relative z-10 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] flex flex-col"
          style="height: 240px;"
        >
          <template v-for="event in sortEvents(getAllEventsForDay(events, day))" :key="`${event.id}-${day.toISOString().slice(0, 10)}`">
            <!-- Invisible placeholder for spacing -->
            <div
              v-if="isPlaceholderEvent(event)"
              class="opacity-0 pointer-events-none"
              :style="{ height: `${computedEventHeight}px` }"
            />
            <!-- Regular event -->
            <CalendarEventItem
              v-else
              :event="event"
              view="week"
              :current-day="day"
              class="rounded"
              @click="(e) => handleEventClick(event, e)"
            />
          </template>

          <!-- No events message -->
          <div v-if="getAllEventsForDay(events, day).length === 0 && !isToday(day)" class="flex flex-col items-center justify-center gap-1 text-gray-400 dark:text-gray-600 flex-1">
            <UIcon name="i-lucide-calendar-off" class="w-8 h-8" />
            <span class="text-lg text-gray-500 dark:text-gray-400">No events</span>
          </div>
          <div v-if="getAllEventsForDay(events, day).length === 0 && isToday(day)" class="flex flex-col items-center justify-center gap-1 text-gray-400 dark:text-gray-600 flex-1">
            <UIcon name="i-lucide-calendar-off" class="w-8 h-8" />
            <span class="text-lg text-gray-500 dark:text-gray-400">No events today</span>
          </div>
        </div>
      </div>

      <div
        v-for="day in secondRow"
        :key="day.toISOString()"
        class="relative border-r border-gray-200 dark:border-gray-700 last:border-r-0 flex flex-col"
        style="height: 300px;"
        :class="{
          'bg-gray-100/25 dark:bg-gray-800/25': !isToday(day),
          'bg-blue-100/10 dark:bg-blue-900/10': isToday(day),
        }"
      >
        <!-- Day Header -->
        <div class="flex items-center justify-between p-2 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
          <div class="text-sm font-medium text-gray-600 dark:text-gray-400">
            {{ format(day, 'EEE') }}
          </div>
          <div
            class="inline-flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold"
            :class="{
              'bg-primary text-white': isToday(day),
              'text-gray-600 dark:text-gray-400': !isToday(day),
            }"
          >
            {{ format(day, 'd') }}
          </div>
        </div>

        <!-- Events Container -->
        <div
          class="overflow-y-auto px-2 py-1 space-y-1 relative z-10 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] flex flex-col"
          style="height: 240px;"
        >
          <template v-for="event in sortEvents(getAllEventsForDay(events, day))" :key="`${event.id}-${day.toISOString().slice(0, 10)}`">
            <!-- Invisible placeholder for spacing -->
            <div
              v-if="isPlaceholderEvent(event)"
              class="opacity-0 pointer-events-none"
              :style="{ height: `${computedEventHeight}px` }"
            />
            <!-- Regular event -->
            <CalendarEventItem
              v-else
              :event="event"
              view="week"
              :current-day="day"
              class="rounded"
              @click="(e) => handleEventClick(event, e)"
            />
          </template>

          <!-- No events message -->
          <div v-if="getAllEventsForDay(events, day).length === 0 && !isToday(day)" class="flex flex-col items-center justify-center gap-1 text-gray-400 dark:text-gray-600 flex-1">
            <UIcon name="i-lucide-calendar-off" class="w-6 h-6" />
            <span class="text-md text-gray-500 dark:text-gray-400">No events</span>
          </div>
          <div v-if="getAllEventsForDay(events, day).length === 0 && isToday(day)" class="flex flex-col items-center justify-center gap-1 text-gray-400 dark:text-gray-600 flex-1">
            <UIcon name="i-lucide-calendar-off" class="w-6 h-6" />
            <span class="text-md text-gray-500 dark:text-gray-400">No events today</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
