<script setup lang="ts">
import { format, getHours, isSameDay } from "date-fns";

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
  return props.events.filter(event => event.allDay);
});

// Process events for positioning
const positionedEvents = computed(() => {
  const dayEvents = getEventsForDay(props.events, props.currentDate);
  return sortEvents(dayEvents)
    .filter(event => !event.allDay)
    .map((event, index) => {
      const eventStart = new Date(event.start);
      const eventEnd = new Date(event.end);
      const startHour = getHours(eventStart);
      const endHour = getHours(eventEnd);
      const duration = endHour - startHour;

      return {
        event,
        top: startHour * 60, // Convert hours to minutes for positioning
        height: duration * 60, // Convert duration to minutes
        left: 0,
        width: 1,
        zIndex: index + 1,
      };
    });
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

function handleEventClick(event: CalendarEvent, e: MouseEvent) {
  emit("eventClick", event, e);
}

function handleQuarterHourClick(hour: number, quarter: number) {
  const startTime = new Date(props.currentDate);
  startTime.setHours(hour);
  startTime.setMinutes(quarter * 15);
  emit("eventCreate", startTime);
}

function handleEventDrop(event: CalendarEvent) {
  emit("eventUpdate", event);
}
</script>

<template>
  <div data-slot="day-view" class="flex h-full w-full flex-col">
    <div v-if="showAllDaySection" class="border-base-300 bg-base-200/50 border-t">
      <div class="grid grid-cols-[3rem_1fr] sm:grid-cols-[4rem_1fr]">
        <div class="relative">
          <span class="text-base-content/70 absolute bottom-0 left-0 h-6 w-16 max-w-full pe-2 text-right text-[10px] sm:pe-4 sm:text-xs">
            All day
          </span>
        </div>
        <div class="border-base-300 relative border-r p-1 last:border-r-0">
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

    <div class="border-base-300 grid flex-1 grid-cols-[3rem_1fr] border-t sm:grid-cols-[4rem_1fr] overflow-hidden">
      <div class="grid h-full">
        <div
          v-for="(hour, index) in hours"
          :key="hour.toString()"
          class="border-base-300 relative h-[var(--week-cells-height)] border-b last:border-b-0"
        >
          <span
            v-if="index > 0"
            class="bg-base-100 text-base-content/70 absolute -top-3 left-0 flex h-6 w-16 max-w-full items-center justify-end pe-2 text-[10px] sm:pe-4 sm:text-xs"
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
            <CalendarDraggableEvent
              :event="positionedEvent.event"
              view="day"
              :show-time="true"
              :height="positionedEvent.height"
              @click="(e) => handleEventClick(positionedEvent.event, e)"
            />
          </div>
        </div>

        <!-- Current time indicator -->
        <div
          v-if="currentTimeVisible"
          class="pointer-events-none absolute right-0 left-0 z-20"
          :style="{ top: `${currentTimePosition}%` }"
        >
          <div class="relative flex items-center">
            <div class="bg-error absolute -left-1 h-2 w-2 rounded-full" />
            <div class="bg-error h-[2px] w-full" />
          </div>
        </div>

        <!-- Time grid -->
        <div
          v-for="hour in hours"
          :key="hour.toString()"
          class="border-base-300 relative h-[var(--week-cells-height)] border-b last:border-b-0"
        >
          <!-- Quarter-hour intervals -->
          <CalendarDroppableCell
            v-for="quarter in [0, 1, 2, 3]"
            :id="`day-cell-${currentDate.toISOString()}-${getHours(hour) + quarter * 0.25}`"
            :key="`${hour.toString()}-${quarter}`"
            :date="currentDate"
            :time="getHours(hour) + quarter * 0.25"
            :class="quarter === 0 ? 'top-0' : quarter === 1 ? 'top-[calc(var(--day-cells-height)/4)]' : quarter === 2 ? 'top-[calc(var(--day-cells-height)/4*2)]' : 'top-[calc(var(--day-cells-height)/4*3)]'"
            @click="handleQuarterHourClick(getHours(hour), quarter)"
            @drop="handleEventDrop"
          />
        </div>
      </div>
    </div>
  </div>
</template>
