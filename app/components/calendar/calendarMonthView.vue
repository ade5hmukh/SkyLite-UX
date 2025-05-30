<script setup lang="ts">
import { format, isSameDay } from "date-fns";
import { nextTick, onMounted, watch } from "vue";

import type { CalendarEvent } from "~/utils/calendarTypes";

import { getAllEventsForDay, sortEvents } from "~/utils/calendarUtils";

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

function scrollToCurrentDay() {
  const today = new Date();
  const todayElement = document.querySelector(`[data-date="${format(today, "yyyy-MM-dd")}"]`);
  if (todayElement) {
    const headerHeight = 80; // Approximate height of the header
    const padding = 20; // Additional padding
    const elementPosition = todayElement.getBoundingClientRect().top;
    const offsetPosition = elementPosition + window.pageYOffset - headerHeight - padding;

    window.scrollTo({
      top: offsetPosition,
      behavior: "smooth",
    });
  }
}

// Scroll to current day when component is mounted
onMounted(() => {
  scrollToCurrentDay();
});

// Watch for changes in weeks and scroll to current day
watch(() => props.weeks, () => {
  nextTick(() => {
    scrollToCurrentDay();
  });
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

function handleEventClick(event: CalendarEvent, e: MouseEvent) {
  emit("eventClick", event, e);
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
          :data-date="format(day, 'yyyy-MM-dd')"
          class="group flex h-full flex-col border border-gray-200 dark:border-gray-700 last:border-r-0"
          :class="{
            'bg-gray-100/25 dark:bg-gray-800/25 text-gray-600 dark:text-gray-400': !isCurrentMonth,
          }"
        >
          <div
            class="mt-1 inline-flex h-6 w-6 items-center justify-center rounded-full text-sm"
            :class="{
              'bg-primary text-white': isToday(day),
              'text-gray-600 dark:text-gray-400': !isToday(day),
            }"
          >
            {{ format(day, 'd') }}
          </div>
          <div
            :ref="cellRef"
            class="h-[calc((var(--event-height)+var(--event-gap))*5)] overflow-y-auto px-2 py-1 space-y-1 relative z-10 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
          >
            <template v-for="event in sortEvents(getAllEventsForDay(events, day))" :key="`${event.id}-${day.toISOString().slice(0, 10)}`">
              <CalendarEventItem
                :event="event"
                view="month"
                :is-first-day="isFirstDay(day, event)"
                :is-last-day="isLastDay(day, event)"
                :class="{
                  'rounded-l rounded-r-none -mr-2 !w-[calc(100%+0.5rem)]': isFirstDay(day, event) && !isLastDay(day, event),
                  'rounded-r rounded-l-none -ml-2 !w-[calc(100%+0.5rem)]': !isFirstDay(day, event) && isLastDay(day, event),
                  'rounded-none -ml-2 -mr-2 !w-[calc(100%+1rem)]': !isFirstDay(day, event) && !isLastDay(day, event),
                  'rounded': isFirstDay(day, event) && isLastDay(day, event),
                }"
                @click="(e) => handleEventClick(event, e)"
              >
                <div v-if="isFirstDay(day, event)" class="invisible">
                  <span v-if="!event.allDay">
                    {{ format(new Date(event.start), 'h:mm') }}
                  </span>
                  {{ event.title }}
                </div>
              </CalendarEventItem>
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
        </div>
      </div>
    </div>
  </div>
</template>
