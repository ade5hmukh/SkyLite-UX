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

const { isToday, getAllEventsForDay, handleEventClick: _handleEventClick, getLocalWeekDays } = useCalendar();

const allDays = computed(() => {
  const start = props.startDate || getStableDate();
  const sunday = new Date(start.getTime());
  const dayOfWeek = sunday.getDay();
  sunday.setDate(sunday.getDate() - dayOfWeek);

  const days = [];
  for (let i = 0; i < 14; i++) {
    const day = new Date(sunday.getTime());
    day.setDate(sunday.getDate() + i);
    days.push(day);
  }
  return days;
});

const rows = computed(() => {
  const result = [];
  for (let i = 0; i < 4; i++) {
    result.push(allDays.value.slice(i * 4, (i + 1) * 4));
  }
  return result;
});

function handleEventClick(event: CalendarEvent, e: MouseEvent) {
  _handleEventClick(event, e, emit);
}
</script>

<template>
  <div class="w-full">
    <div class="grid grid-cols-4 grid-rows-4 border border-default">
      <template v-for="(row, rowIndex) in rows" :key="`row-${rowIndex}`">
        <div
          v-for="day in row"
          :key="day.toISOString()"
          class="relative border-r border-b border-default last:border-r-0 flex flex-col"
          style="height: 250px;"
          :class="{
            'bg-muted/25': !isToday(day),
            'bg-info/10': isToday(day),
          }"
        >
          <div class="flex items-center justify-between p-3 border-b border-default flex-shrink-0">
            <div class="text-lg font-semibold text-muted">
              <NuxtTime :datetime="day" weekday="short" />
            </div>
            <div
              class="inline-flex h-10 w-10 items-center justify-center rounded-full text-lg font-bold"
              :class="{
                'bg-primary text-white': isToday(day),
                'text-muted': !isToday(day),
              }"
            >
              <NuxtTime :datetime="day" day="numeric" />
            </div>
          </div>
          <div
            class="overflow-y-auto px-2 py-2 space-y-1.5 relative z-10 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] flex flex-col"
            style="height: 200px;"
          >
            <div
              v-for="(event) in getAllEventsForDay(events, day)"
              :key="event.id"
              class="rounded"
            >
              <CalendarEventItem
                :event="event"
                view="twoweeks"
                :current-day="day"
                class="rounded"
                @click="(e) => handleEventClick(event, e)"
              />
            </div>
            <div
              v-show="getAllEventsForDay(events, day).length === 0"
              class="flex flex-col items-center justify-center gap-2 text-muted flex-1"
            >
              <UIcon name="i-lucide-calendar-off" class="w-10 h-10" />
              <span class="text-lg text-muted">
                {{ isToday(day) ? 'No events' : 'No events' }}
              </span>
            </div>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>

