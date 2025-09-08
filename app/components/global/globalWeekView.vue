<script setup lang="ts">
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

const { isToday, getAllEventsForDay, assignSpanningEventLanes, sortEvents, handleEventClick: _handleEventClick, getLocalWeekDays } = useCalendar();

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

  return result;
}

const nextWeekEventCount = computed(() => {
  const uniqueEvents = new Set<string>();

  nextWeekDays.value.forEach((day) => {
    const dayEvents = getAllEventsForDay(props.events, day);
    dayEvents.forEach((event) => {
      uniqueEvents.add(event.id);
    });
  });

  return uniqueEvents.size;
});

function isLastDay(day: Date) {
  return day.toISOString() === nextWeekDays.value[0]?.toISOString();
}
</script>

<template>
  <div class="w-full">
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
        <div class="flex items-center justify-between p-2 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
          <div class="text-sm font-medium text-gray-600 dark:text-gray-400">
            <NuxtTime :datetime="day" weekday="short" />
          </div>
          <div
            class="inline-flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold"
            :class="{
              'bg-primary text-white': isToday(day),
              'text-gray-600 dark:text-gray-400': !isToday(day),
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
            class="flex flex-col items-center justify-center gap-1 text-gray-400 dark:text-gray-600 flex-1"
          >
            <UIcon name="i-lucide-calendar-off" class="w-8 h-8" />
            <span class="text-lg text-gray-500 dark:text-gray-400">
              {{ isToday(day) ? 'No events today' : 'No events' }}
            </span>
          </div>
        </div>
      </div>
      <div
        v-for="day in secondRow"
        :key="day.toISOString()"
        class="relative border-r border-gray-200 dark:border-gray-700 last:border-r-0 flex flex-col"
        style="height: 300px;"
        :class="{
          'bg-gray-100/25 dark:bg-gray-800/25': day && !isToday(day) && !isLastDay(day),
          'bg-blue-100/10 dark:bg-blue-900/10': day && isToday(day),
          'bg-primary-100/20 dark:bg-primary-800/20': day && isLastDay(day),
        }"
      >
        <template v-if="day && !isLastDay(day)">
          <div class="flex items-center justify-between p-2 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
            <div class="text-sm font-medium text-gray-600 dark:text-gray-400">
              <NuxtTime :datetime="day" weekday="short" />
            </div>
            <div
              class="inline-flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold"
              :class="{
                'bg-primary text-white': isToday(day),
                'text-gray-600 dark:text-gray-400': !isToday(day),
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
              class="flex flex-col items-center justify-center gap-1 text-gray-400 dark:text-gray-600 flex-1"
            >
              <UIcon name="i-lucide-calendar-off" class="w-6 h-6" />
              <span class="text-md text-gray-500 dark:text-gray-400">
                {{ isToday(day) ? 'No events today' : 'No events' }}
              </span>
            </div>
          </div>
        </template>

        <template v-else-if="day && isLastDay(day)">
          <div class="flex items-center justify-between p-2 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
            <div class="text-sm font-medium text-primary-600 dark:text-primary-400">
              Next Week
            </div>
            <div class="inline-flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold bg-primary-500 text-white">
              <UIcon name="i-lucide-calendar-days" class="w-4 h-4" />
            </div>
          </div>
          <div
            class="overflow-y-auto px-2 py-1 space-y-1 relative z-10 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] flex flex-col"
            style="height: 240px;"
          >
            <div class="flex flex-col items-center justify-center gap-2 text-primary-600 dark:text-primary-400 flex-1">
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
