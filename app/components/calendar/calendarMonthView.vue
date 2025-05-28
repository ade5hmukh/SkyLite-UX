<script setup lang="ts">
import { format, isSameDay } from "date-fns";

import type { CalendarEvent } from "~/utils/calendarTypes";

import { getEventsForDay, sortEvents } from "~/utils/calendarUtils";

const props = defineProps<{
  weeks: Date[][];
  events: CalendarEvent[];
  isCurrentMonth: boolean;
  cellId: string;
  isReferenceCell?: boolean;
  visibleCount?: number;
  remainingCount?: number;
  hasMore?: boolean;
  defaultStartHour?: number;
  eventHeight?: number;
}>();

const emit = defineEmits<{
  (e: "eventCreate", date: Date): void;
  (e: "eventClick", event: CalendarEvent, mouseEvent: MouseEvent): void;
  (e: "eventUpdate", event: CalendarEvent): void;
}>();

const contentRef = useState<HTMLElement | null>("calendarContentRef", () => null);

const cellRef = computed(() => props.isReferenceCell ? contentRef : undefined);

const allEvents = computed(() => {
  return props.events;
});

function isToday(date: Date) {
  return isSameDay(date, new Date());
}

function isFirstDay(day: Date, event: CalendarEvent) {
  return isSameDay(day, new Date(event.start));
}

function isLastDay(day: Date, event: CalendarEvent) {
  return isSameDay(day, new Date(event.end));
}

function onEventCreate(date: Date) {
  emit("eventCreate", date);
}

function handleEventClick(event: CalendarEvent, e: MouseEvent) {
  emit("eventClick", event, e);
}

function handleEventDrop(event: CalendarEvent) {
  emit("eventUpdate", event);
}
</script>

<template>
  <div class="h-full w-full">
    <!-- Days of week header -->
    <div class="sticky top-[80px] z-30 grid grid-cols-7 border-b border-gray-200 dark:border-gray-700 bg-gray-100/80 dark:bg-gray-800/80 backdrop-blur-md">
      <div
        v-for="day in ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']"
        :key="day"
        class="py-2 text-center text-sm font-medium text-gray-600 dark:text-gray-400"
      >
        {{ day }}
      </div>
    </div>
    <!-- Calendar grid -->
    <div class="grid h-full w-full grid-cols-7">
      <div
        v-for="(week, weekIndex) in weeks"
        :key="weekIndex"
        class="contents"
      >
        <div
          v-for="day in week"
          :key="day.toString()"
          class="group flex h-full flex-col border border-gray-200 dark:border-gray-700 last:border-r-0"
          :class="{
            'bg-gray-100/25 dark:bg-gray-800/25 text-gray-600 dark:text-gray-400': !isCurrentMonth,
          }"
        >
          <div class="mt-1 inline-flex h-6 w-6 items-center justify-center rounded-full text-sm"
            :class="{
              'bg-primary text-white': isToday(day),
              'text-gray-600 dark:text-gray-400': !isToday(day)
            }"
          >
            {{ format(day, 'd') }}
          </div>
          <div
            :ref="cellRef"
            class="min-h-[calc((var(--event-height)+var(--event-gap))*2)] sm:min-h-[calc((var(--event-height)+var(--event-gap))*3)] lg:min-h-[calc((var(--event-height)+var(--event-gap))*4)]"
          >
            <template v-for="event in sortEvents(getEventsForDay(events, day))" :key="event.id">
              <template v-if="!isFirstDay(day, event)">
                <CalendarEventItem
                  :key="`spanning-${event.id}-${day.toISOString().slice(0, 10)}`"
                  :event="event"
                  view="month"
                  :is-first-day="isFirstDay(day, event)"
                  :is-last-day="isLastDay(day, event)"
                  @click="(e: MouseEvent) => handleEventClick(event, e)"
                >
                  <div class="invisible">
                    <span v-if="!event.allDay">
                      {{ format(new Date(event.start), 'h:mm') }}
                    </span>
                    {{ event.title }}
                  </div>
                </CalendarEventItem>
              </template>
              <template v-else>
                <CalendarEventItem
                  :key="event.id"
                  :event="event"
                  view="month"
                  :is-first-day="isFirstDay(day, event)"
                  :is-last-day="isLastDay(day, event)"
                  @click="(e: MouseEvent) => handleEventClick(event, e)"
                />
              </template>
            </template>

            <Popover v-if="hasMore" modal>
              <PopoverTrigger as-child>
                <button
                  class="mt-[var(--event-gap)] h-[var(--event-height)] w-full justify-start px-1 text-[10px] sm:px-2 sm:text-xs text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md transition-colors"
                  @click.stop
                >
                  <span>
                    + {{ remainingCount }}
                    <span class="max-sm:sr-only">more</span>
                  </span>
                </button>
              </PopoverTrigger>
              <PopoverContent
                align="center"
                class="w-52 p-3 bg-white dark:bg-gray-900 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700"
                :style="{
                  '--event-height': `${eventHeight}px`,
                }"
              >
                <div class="space-y-2">
                  <div class="text-sm font-medium">
                    {{ format(day, 'EEE d') }}
                  </div>
                  <div class="space-y-1">
                    <CalendarEventItem
                      v-for="event in sortEvents(allEvents)"
                      :key="event.id"
                      :event="event"
                      view="month"
                      :is-first-day="isFirstDay(day, event)"
                      :is-last-day="isLastDay(day, event)"
                      @click="(e) => handleEventClick(event, e)"
                    />
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          </div>
          <CalendarDroppableCell
            :id="cellId"
            :date="day"
            :time="defaultStartHour ?? 0"
            class="absolute inset-0"
            @click="() => {
              const startTime = new Date(day);
              startTime.setHours(defaultStartHour ?? 0, 0, 0);
              onEventCreate(startTime);
            }"
            @drop="handleEventDrop"
          />
        </div>
      </div>
    </div>
  </div>
</template>
