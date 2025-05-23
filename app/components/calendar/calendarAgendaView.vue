<script setup lang="ts">
import { format, isSameDay } from "date-fns";

const props = defineProps<{
  days: Date[];
  events: CalendarEvent[];
}>();

const emit = defineEmits<{
  (e: "eventClick", event: CalendarEvent, mouseEvent: MouseEvent): void;
}>();

const hasEvents = computed(() => {
  return props.events.length > 0;
});

function isToday(date: Date) {
  return isSameDay(date, new Date());
}

function handleEventClick(event: CalendarEvent, e: MouseEvent) {
  emit("eventClick", event, e);
}
</script>

<template>
  <div class="border-base-300 border-t ps-4 h-full w-full">
    <div v-if="!hasEvents" class="flex min-h-[70svh] flex-col items-center justify-center py-16 text-center">
      <UIcon name="i-lucide-calendar-off" class="size-8" />
      <h3 class="text-lg font-medium text-base-content">
        No events found
      </h3>
      <p class="text-base-content/70">
        There are no events scheduled for this time period.
      </p>
    </div>
    <template v-else>
      <div
        v-for="day in days"
        :key="day.toString()"
        class="border-base-300 relative my-12 border-t border-l border-r"
      >
        <template v-if="getAgendaEventsForDay(events, day).length > 0">
          <span
            class="bg-base-100 absolute -top-3 left-0 flex h-6 items-center pe-4 text-[10px] uppercase sm:pe-4 sm:text-xs"
            :class="{ 'font-medium text-base-content': isToday(day), 'text-base-content/70': !isToday(day) }"
          >
            {{ format(day, "d MMM, EEEE") }}
          </span>
          <div class="mt-6 space-y-2">
            <CalendarEventItem
              v-for="event in getAgendaEventsForDay(events, day)"
              :key="event.id"
              :event="event"
              view="agenda"
              @click="(e) => handleEventClick(event, e)"
            />
          </div>
        </template>
      </div>
    </template>
  </div>
</template>
