<script setup lang="ts">
import { format, isSameMonth } from "date-fns";

import type { CalendarEvent } from "~/types/calendar";

import { useCalendar } from "~/composables/useCalendar";

const props = defineProps<{
  currentDate: Date;
  events: CalendarEvent[];
  eventHeight?: number;
}>();

const emit = defineEmits<{
  (e: "eventCreate", date: Date): void;
  (e: "eventClick", event: CalendarEvent, mouseEvent: MouseEvent): void;
  (e: "dateSelect", date: Date): void;
}>();

const { isToday, isSelectedDate: _isSelectedDate, handleDateSelect: _handleDateSelect, getMiniCalendarWeeks, getAllEventsForDay, getAgendaEventsForDay } = useCalendar();

const miniCalendarWeeks = computed(() => getMiniCalendarWeeks(props.currentDate));

const todaysEvents = computed(() => getAgendaEventsForDay(props.events, props.currentDate));

function isSelectedDate(date: Date) {
  return _isSelectedDate(date, props.currentDate);
}

function handleDateSelect(date: Date) {
  _handleDateSelect(date, emit);
}

function handleEventClick(event: CalendarEvent, e: MouseEvent) {
  emit("eventClick", event, e);
}
</script>

<template>
  <div class="flex h-full w-full">
    <div class="w-[30%] flex-shrink-0 border-r border-gray-200 dark:border-gray-700">
      <div class="p-4">
        <div class="flex items-center justify-center mb-4">
          <h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100">
            <NuxtTime
              :datetime="currentDate"
              month="long"
              year="numeric"
            />
          </h3>
        </div>
        <div class="grid grid-cols-7 gap-1 mb-2">
          <div
            v-for="day in ['S', 'M', 'T', 'W', 'T', 'F', 'S']"
            :key="day"
            class="text-center text-xs font-medium text-gray-500 dark:text-gray-400 py-2"
          >
            {{ day }}
          </div>
        </div>
        <div class="grid grid-cols-7 gap-1">
          <button
            v-for="day in miniCalendarWeeks.flat()"
            :key="day.toISOString()"
            type="button"
            class="relative aspect-square flex items-center justify-center text-sm transition-colors rounded-md hover:bg-gray-100 dark:hover:bg-gray-800"
            :class="{
              'text-gray-400 dark:text-gray-600': !isSameMonth(day, currentDate),
              'text-gray-900 dark:text-gray-100': isSameMonth(day, currentDate) && !isToday(day) && !isSelectedDate(day),
              'bg-primary text-white font-semibold': isSelectedDate(day),
              'bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400 font-medium': isToday(day) && !isSelectedDate(day),
            }"
            @click="handleDateSelect(day)"
          >
            <NuxtTime :datetime="day" day="numeric" />
            <span
              v-show="getAllEventsForDay(events, day).length > 0"
              class="absolute bottom-1 left-1/2 transform -translate-x-1/2"
            >
              <span class="w-1 h-1 bg-current rounded-full opacity-60" />
            </span>
          </button>
        </div>
      </div>
    </div>
    <div class="w-[70%] flex-1">
      <div class="h-full">
        <div class="flex items-center p-4 border-b border-gray-200 dark:border-gray-700">
          <div class="flex items-center gap-3">
            <div
              class="inline-flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold"
              :class="{
                'bg-primary text-white': isToday(currentDate),
                'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400': !isToday(currentDate),
              }"
            >
              <NuxtTime :datetime="currentDate" day="numeric" />
            </div>
            <div>
              <h2 class="text-base font-semibold text-gray-900 dark:text-gray-100">
                <NuxtTime :datetime="currentDate" weekday="long" />
              </h2>
              <p class="text-xs text-gray-500 dark:text-gray-400">
                <NuxtTime
                  :datetime="currentDate"
                  month="long"
                  day="numeric"
                  year="numeric"
                />
              </p>
            </div>
          </div>
        </div>
        <div class="p-4">
          <div v-show="todaysEvents.length === 0" class="text-center py-8">
            <UIcon name="i-lucide-calendar-off" class="w-8 h-8 text-gray-400 dark:text-gray-600 mx-auto mb-2" />
            <h3 class="text-sm font-medium text-gray-900 dark:text-gray-100">
              No events today
            </h3>
          </div>
          <CalendarEventItem
            v-for="event in todaysEvents"
            :key="event.id"
            :event="event"
            view="agenda"
            class="mb-2"
            @click="(e) => handleEventClick(event, e)"
          />
        </div>
      </div>
    </div>
  </div>
</template>
