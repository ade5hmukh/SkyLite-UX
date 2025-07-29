<script setup lang="ts">
import { format } from "date-fns";
import { computed } from "vue";

import type { CalendarEvent } from "~/types/calendar";

import { useCalendar } from "~/composables/useCalendar";

const props = defineProps<{
  weeks: Date[][];
  events: CalendarEvent[];
  isCurrentMonth: boolean;
  cellId: string;
  remainingCount?: number;
  hasMore?: boolean;
  eventHeight?: number;
}>();

const emit = defineEmits<{
  (e: "eventCreate", date: Date): void;
  (e: "eventClick", event: CalendarEvent, mouseEvent: MouseEvent): void;
}>();

const { isToday, isFirstDay, isLastDay, isFirstVisibleDay, handleEventClick: _handleEventClick, scrollToDate, getAllEventsForDay, isPlaceholderEvent, assignSpanningEventLanes, sortEvents, computedEventHeight: getEventHeight } = useCalendar();

const computedEventHeight = computed(() => getEventHeight("month", props.eventHeight));

const eventGap = 4;

watch(() => props.events, (events) => {
  assignSpanningEventLanes(events);
}, { immediate: true });

const allEvents = computed(() => {
  return props.events;
});

onMounted(() => {
  scrollToDate(new Date(), "month");
});

watch(() => props.weeks, () => {
  nextTick(() => {
    scrollToDate(new Date(), "month");
  });
});

function handleEventClick(event: CalendarEvent, e: MouseEvent) {
  _handleEventClick(event, e, emit);
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
            'bg-blue-100/10 dark:bg-blue-900/10': isToday(day),
          }"
        >
          <div class="flex justify-end items-center p-0.5">
            <div
              class="inline-flex h-6 w-6 items-center justify-center rounded-full text-sm"
              :class="{
                'bg-primary text-white': isToday(day),
                'text-gray-600 dark:text-gray-400': !isToday(day),
              }"
            >
              {{ format(day, 'd') }}
            </div>
          </div>
          <div class="border-b border-gray-200 dark:border-gray-700 mb-1" />
          <div
            class="overflow-y-auto px-2 py-1 space-y-1 relative z-10 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] flex flex-col"
            :style="{ height: `${(computedEventHeight + eventGap) * 3}px` }"
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
                view="month"
                :is-first-day="isFirstVisibleDay(day, event, props.weeks.flat())"
                :is-last-day="isLastDay(day, event)"
                :current-day="day"
                :class="{
                  'rounded-l rounded-r-none -mr-3 !w-[calc(100%+0.75rem)]': isFirstDay(day, event) && !isLastDay(day, event),
                  'rounded-r rounded-l-none -ml-3 !w-[calc(100%+0.75rem)]': !isFirstDay(day, event) && isLastDay(day, event),
                  'rounded-none -ml-3 -mr-3 !w-[calc(100%+1.5rem)]': !isFirstDay(day, event) && !isLastDay(day, event),
                  'rounded': isFirstDay(day, event) && isLastDay(day, event),
                }"
                @click="(e) => handleEventClick(event, e)"
              >
                <div v-if="isFirstVisibleDay(day, event, props.weeks.flat())" class="invisible">
                  <span v-if="!event.allDay">
                    {{ format(new Date(event.start), 'h:mm') }}
                  </span>
                  {{ event.title }}
                </div>
              </CalendarEventItem>
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

            <UPopover v-if="hasMore">
              <UButton
                variant="ghost"
                class="w-full justify-start px-1 text-[10px] sm:px-2 sm:text-xs text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md transition-colors"
                :style="{ marginTop: `${eventGap}px`, height: `${computedEventHeight}px` }"
                @click.stop
              >
                <span>
                  + {{ remainingCount }}
                  <span class="max-sm:sr-only">more</span>
                </span>
              </UButton>

              <template #panel>
                <div
                  class="w-52 p-3 bg-white dark:bg-gray-900 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700"
                >
                  <div class="space-y-2">
                    <div class="text-sm font-medium">
                      {{ format(day, 'EEE d') }}
                    </div>
                    <div class="space-y-1">
                      <template v-for="event in sortEvents(allEvents)" :key="event.id">
                        <!-- Invisible placeholder for spacing in popover -->
                        <div
                          v-if="isPlaceholderEvent(event)"
                          class="opacity-0 pointer-events-none"
                          :style="{ height: `${computedEventHeight}px` }"
                        />
                        <!-- Regular event in popover -->
                        <CalendarEventItem
                          v-else
                          :event="event"
                          view="month"
                          :is-first-day="isFirstVisibleDay(day, event, props.weeks.flat())"
                          :is-last-day="isLastDay(day, event)"
                          @click="(e) => handleEventClick(event, e)"
                        />
                      </template>
                    </div>
                  </div>
                </div>
              </template>
            </UPopover>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
