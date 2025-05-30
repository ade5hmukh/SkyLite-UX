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

const daysWithEvents = computed(() => {
  return props.days.filter(day => getAgendaEventsForDay(props.events, day).length > 0);
});

function isToday(date: Date) {
  return isSameDay(date, new Date());
}

function handleEventClick(event: CalendarEvent, e: MouseEvent) {
  emit("eventClick", event, e);
}

function scrollToCurrentDay() {
  const today = new Date();
  const todayElement = document.querySelector(`[data-date="${format(today, 'yyyy-MM-dd')}"]`);
  if (todayElement) {
    const headerHeight = 80; // Approximate height of the header
    const padding = 20; // Additional padding
    const elementPosition = todayElement.getBoundingClientRect().top;
    const offsetPosition = elementPosition + window.pageYOffset - headerHeight - padding;

    window.scrollTo({
      top: offsetPosition,
      behavior: 'smooth'
    });
  }
}

// Scroll to current day when component is mounted
onMounted(() => {
  scrollToCurrentDay();
});

// Watch for changes in days and scroll to current day
watch(() => props.days, () => {
  nextTick(() => {
    scrollToCurrentDay();
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
        v-for="day in daysWithEvents"
        :key="day.toString()"
        :data-date="format(day, 'yyyy-MM-dd')"
        class="border-gray-200 dark:border-gray-700 relative my-12 border-t border-r"
      >
        <span
          class="bg-white dark:bg-gray-900 absolute -top-3 left-0 flex h-6 items-center pe-4 text-[10px] uppercase sm:pe-4 sm:text-xs"
          :class="{ 'font-medium text-gray-900 dark:text-gray-100': isToday(day), 'text-gray-600 dark:text-gray-400': !isToday(day) }"
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
      </div>
    </template>
  </div>
</template>