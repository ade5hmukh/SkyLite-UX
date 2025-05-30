<script setup lang="ts">
import { format, getHours, isSameDay, startOfDay, addHours, differenceInMinutes } from "date-fns";

const props = defineProps<{
  currentDate: Date;
  events: CalendarEvent[];
  showAllDaySection?: boolean;
  defaultStartHour?: number;
  eventHeight?: number;
}>();

const emit = defineEmits<{
  (e: "eventCreate", date: Date): void;
  (e: "eventClick", event: CalendarEvent, mouseEvent: MouseEvent): void;
  (e: "eventUpdate", event: CalendarEvent): void;
}>();

// Generate hours array for the time grid
const hours = computed(() => {
  const result = [];
  for (let i = 0; i < 24; i++) {
    const date = new Date();
    date.setHours(i, 0, 0, 0);
    result.push(date);
  }
  return result;
});

// Filter all-day events
const allDayEvents = computed(() => {
  return props.events.filter((event) => {
    if (!event.allDay)
      return false;
    const eventStart = new Date(event.start);
    const eventEnd = new Date(event.end);
    // Set times to start and end of day for proper comparison
    const currentDateStart = new Date(props.currentDate);
    currentDateStart.setHours(0, 0, 0, 0);
    const currentDateEnd = new Date(props.currentDate);
    currentDateEnd.setHours(23, 59, 59, 999);

    // Check if the current date falls within the event's date range
    return eventStart <= currentDateEnd && eventEnd >= currentDateStart;
  });
});

// Process events for positioning
const positionedEvents = computed(() => {
  const dayEvents = getEventsForDay(props.events, props.currentDate);
  const sortedEvents = sortEvents(dayEvents)
    .filter(event => !event.allDay)
    .sort((a, b) => {
      const aStart = new Date(a.start);
      const bStart = new Date(b.start);
      const aEnd = new Date(a.end);
      const bEnd = new Date(b.end);

      // First sort by start time
      if (aStart < bStart) return -1;
      if (aStart > bStart) return 1;

      // If start times are equal, sort by duration (longer events first)
      const aDuration = differenceInMinutes(aEnd, aStart);
      const bDuration = differenceInMinutes(bEnd, bStart);
      return bDuration - aDuration;
    });

  // Calculate positions for each event
  const positionedEvents = [];
  const dayStart = startOfDay(props.currentDate);

  // Track columns for overlapping events
  const columns = [];

  sortedEvents.forEach((event) => {
    const eventStart = new Date(event.start);
    const eventEnd = new Date(event.end);

    // Adjust start and end times if they're outside this day
    const adjustedStart = isSameDay(props.currentDate, eventStart)
      ? eventStart
      : dayStart;
    const adjustedEnd = isSameDay(props.currentDate, eventEnd)
      ? eventEnd
      : addHours(dayStart, 24);

    // Calculate top position and height
    const startHour = getHours(adjustedStart) + adjustedStart.getMinutes() / 60;
    const endHour = getHours(adjustedEnd) + adjustedEnd.getMinutes() / 60;

    // Calculate top and height in minutes
    const top = startHour * 60;
    const height = (endHour - startHour) * 60;

    // Find a column for this event
    let columnIndex = 0;
    let placed = false;

    while (!placed) {
      const col = columns[columnIndex] || [];
      if (col.length === 0) {
        columns[columnIndex] = col;
        placed = true;
      } else {
        const overlaps = col.some((c) => {
          const colStart = new Date(c.event.start);
          const colEnd = new Date(c.event.end);
          return (
            (adjustedStart >= colStart && adjustedStart < colEnd) ||
            (adjustedEnd > colStart && adjustedEnd <= colEnd) ||
            (adjustedStart <= colStart && adjustedEnd >= colEnd)
          );
        });
        if (!overlaps) {
          placed = true;
        } else {
          columnIndex++;
        }
      }
    }

    // Ensure column is initialized before pushing
    const currentColumn = columns[columnIndex] || [];
    columns[columnIndex] = currentColumn;
    currentColumn.push({ event, end: adjustedEnd });

    // Calculate width and left position based on number of columns
    const width = columnIndex === 0 ? 1 : 0.9;
    const left = columnIndex === 0 ? 0 : columnIndex * 0.1;

    positionedEvents.push({
      event,
      top,
      height,
      left,
      width,
      zIndex: 10 + columnIndex, // Higher columns get higher z-index
    });
  });

  return positionedEvents;
});

// Current time indicator
const currentTimeVisible = computed(() => {
  return isSameDay(props.currentDate, new Date());
});

const currentTimePosition = computed(() => {
  const now = new Date();
  const hours = now.getHours();
  const minutes = now.getMinutes();
  return ((hours + minutes / 60) / 24) * 100;
});

function scrollToCurrentTime() {
  if (!currentTimeVisible.value)
    return;

  const now = new Date();
  const hours = now.getHours();
  const currentHourElement = document.querySelector(`[data-hour="${hours}"]`);

  if (currentHourElement) {
    const headerHeight = 80; // Approximate height of the header
    const padding = 20; // Additional padding
    const elementPosition = currentHourElement.getBoundingClientRect().top;
    const offsetPosition = elementPosition + window.pageYOffset - headerHeight - padding;

    window.scrollTo({
      top: offsetPosition,
      behavior: "smooth",
    });
  }
}

// Scroll to current time when component is mounted
onMounted(() => {
  scrollToCurrentTime();
});

// Watch for changes in currentDate and scroll to current time
watch(() => props.currentDate, () => {
  nextTick(() => {
    scrollToCurrentTime();
  });
});

function handleEventClick(event: CalendarEvent, e: MouseEvent) {
  emit("eventClick", event, e);
}
</script>

<template>
  <div data-slot="day-view" class="flex h-full w-full flex-col">
    <div v-if="showAllDaySection" class="border-gray-200 dark:border-gray-700 bg-gray-100/50 dark:bg-gray-800/50 border-t">
      <div class="grid grid-cols-[3rem_1fr] sm:grid-cols-[4rem_1fr]">
        <div class="relative">
          <span class="text-gray-600 dark:text-gray-400 absolute bottom-0 left-0 h-6 w-16 max-w-full pe-2 text-right text-[10px] sm:pe-4 sm:text-xs">
            All day
          </span>
        </div>
        <div class="border-gray-200 dark:border-gray-700 relative border-r p-1 last:border-r-0">
          <CalendarEventItem
            v-for="event in allDayEvents"
            :key="`spanning-${event.id}`"
            :event="event"
            view="month"
            :is-first-day="isSameDay(currentDate, new Date(event.start))"
            :is-last-day="isSameDay(currentDate, new Date(event.end))"
            @click="(e) => handleEventClick(event, e)"
          >
            <div>{{ event.title }}</div>
          </CalendarEventItem>
        </div>
      </div>
    </div>

    <div class="border-gray-200 dark:border-gray-700 grid flex-1 grid-cols-[3rem_1fr] border-t sm:grid-cols-[4rem_1fr] overflow-hidden">
      <div class="grid h-full">
        <div
          v-for="(hour, index) in hours"
          :key="hour.toString()"
          class="border-gray-200 dark:border-gray-700 relative h-[var(--week-cells-height)] border-b last:border-b-0"
        >
          <span
            v-if="index > 0"
            class="bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-400 absolute -top-3 left-0 flex h-6 w-16 max-w-full items-center justify-end pe-2 text-[10px] sm:pe-4 sm:text-xs"
          >
            {{ format(hour, "h a") }}
          </span>
        </div>
      </div>

      <div class="relative grid h-full">
        <!-- Positioned events -->
        <div
          v-for="positionedEvent in positionedEvents"
          :key="positionedEvent.event.id"
          class="absolute z-10 px-0.5"
          :style="{
            top: `${positionedEvent.top}px`,
            height: `${positionedEvent.height}px`,
            left: `${positionedEvent.left * 100}%`,
            width: `${positionedEvent.width * 100}%`,
            zIndex: positionedEvent.zIndex,
          }"
        >
          <div class="h-full w-full">
            <CalendarEventItem
              :event="positionedEvent.event"
              view="day"
              :show-time="true"
              @click="(e) => handleEventClick(positionedEvent.event, e)"
            >
              <div>{{ positionedEvent.event.title }}</div>
            </CalendarEventItem>
          </div>
        </div>

        <!-- Current time indicator -->
        <div
          v-if="currentTimeVisible"
          class="pointer-events-none absolute right-0 left-0 z-20"
          :style="{ top: `${currentTimePosition}%` }"
        >
          <div class="relative flex items-center">
            <div class="bg-red-500 absolute -left-1 h-2 w-2 rounded-full" />
            <div class="bg-red-500 h-[2px] w-full" />
          </div>
        </div>

        <!-- Time grid -->
        <div
          v-for="hour in hours"
          :key="hour.toString()"
          :data-hour="getHours(hour)"
          class="border-gray-200 dark:border-gray-700 relative h-[var(--week-cells-height)] border-b last:border-b-0"
        />
      </div>
    </div>
  </div>
</template>
