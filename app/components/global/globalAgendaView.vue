<script setup lang="ts">
import { format } from "date-fns";

import type { CalendarEvent } from "~/types/calendar";

import { useCalendar } from "~/composables/useCalendar";

const props = defineProps<{
  days: Date[];
  events: CalendarEvent[];
}>();

const emit = defineEmits<{
  (e: "eventClick", event: CalendarEvent, mouseEvent: MouseEvent): void;
}>();

const { isToday, handleEventClick: _handleEventClick, scrollToDate, getAgendaEventsForDay } = useCalendar();

const hasEvents = computed(() => {
  return props.events.length > 0;
});

function handleEventClick(event: CalendarEvent, e: MouseEvent) {
  _handleEventClick(event, e, emit);
}

onMounted(() => {
  scrollToDate(new Date(), "agenda");
});

watch(() => props.days, () => {
  nextTick(() => {
    scrollToDate(new Date(), "agenda");
  });
});
</script>

<template>
  <div class="border-gray-200 dark:border-gray-700 border-t ps-4 h-full w-full">
    <div v-if="!hasEvents" class="flex min-h-[70svh] flex-col items-center justify-center py-16 text-center">
      <UIcon name="i-lucide-calendar-off" class="size-8" />
      <h3 class="text-lg font-medium text-gray-900 dark:text-gray-100">
        No events found
      </h3>
      <p class="text-gray-600 dark:text-gray-400">
        There are no events scheduled for this time period.
      </p>
    </div>
    <template v-else>
      <div
        v-for="day in days"
        :key="day.toString()"
        :data-date="format(day, 'yyyy-MM-dd')"
        class="border-gray-200 dark:border-gray-700 relative my-12 border-t border-r"
      >
        <span class="bg-white dark:bg-gray-900 absolute -top-3 left-0 flex h-6 items-center pe-4 text-[10px] uppercase sm:pe-4 sm:text-xs">
          <span
            class="inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold mr-2"
            :class="{
              'bg-primary text-white': isToday(day),
              'text-gray-600 dark:text-gray-400': !isToday(day),
            }"
          >
            {{ format(day, 'd') }}
          </span>
          <span :class="{ 'font-medium text-gray-900 dark:text-gray-100': isToday(day), 'text-gray-600 dark:text-gray-400': !isToday(day) }">
            {{ format(day, "MMM, EEEE") }}
          </span>
        </span>
        <div class="mt-6 space-y-2">
          <div v-if="getAgendaEventsForDay(events, day).length === 0 && isToday(day)" class="text-center py-8">
            <div class="flex items-center justify-center gap-2 text-gray-400 dark:text-gray-600">
              <UIcon name="i-lucide-calendar-off" class="w-6 h-6" />
              <span class="text-md font-medium text-gray-900 dark:text-gray-100">No events today</span>
            </div>
          </div>
          <div v-if="getAgendaEventsForDay(events, day).length === 0 && !isToday(day)" class="text-center py-8">
            <div class="flex items-center justify-center gap-2 text-gray-400 dark:text-gray-600">
              <UIcon name="i-lucide-calendar-off" class="w-6 h-6" />
              <span class="text-md font-medium text-gray-900 dark:text-gray-100">No events</span>
            </div>
          </div>
          <CalendarEventItem
            v-for="event in getAgendaEventsForDay(events, day)"
            :key="event.id"
            :event="event"
            view="agenda"
            @click="(e) => handleEventClick(event, e)"
          />
        </div>
      </div>
    </template>
  </div>
</template>
