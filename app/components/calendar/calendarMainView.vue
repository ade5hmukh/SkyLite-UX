<script setup lang="ts">
import type { DropdownMenuItem } from "@nuxt/ui";

import { addDays, addMonths, addWeeks, endOfWeek, format, isSameMonth, startOfWeek, subMonths, subWeeks } from "date-fns";

import type { CalendarEvent, CalendarView } from "~/utils/calendarTypes";

const props = defineProps<{
  events?: CalendarEvent[];
  onEventAdd?: (event: CalendarEvent) => void;
  onEventUpdate?: (event: CalendarEvent) => void;
  onEventDelete?: (eventId: string) => void;
  className?: string;
  initialView?: CalendarView;
}>();

const _emit = defineEmits<{
  (e: "eventAdd", event: CalendarEvent): void;
  (e: "eventUpdate", event: CalendarEvent): void;
  (e: "eventDelete", eventId: string): void;
}>();

// Calendar state
const currentDate = ref(new Date());
const view = ref<CalendarView>(props.initialView || "week");
const isEventDialogOpen = ref(false);
const selectedEvent = ref<CalendarEvent | null>(null);

const items: DropdownMenuItem[][] = [
  [
    {
      label: "Month",
      icon: "i-lucide-calendar-days",
      onSelect: () => view.value = "month",
    },
    {
      label: "Week",
      icon: "i-lucide-calendar-range",
      onSelect: () => view.value = "week",
    },
    {
      label: "Day",
      icon: "i-lucide-calendar-1",
      onSelect: () => view.value = "day",
    },
    {
      label: "Agenda",
      icon: "i-lucide-list",
      onSelect: () => view.value = "agenda",
    },
  ],
];

// Keyboard shortcuts for view switching
onMounted(() => {
  const handleKeyDown = (e: KeyboardEvent) => {
    if (
      isEventDialogOpen.value
      || e.target instanceof HTMLInputElement
      || e.target instanceof HTMLTextAreaElement
      || (e.target instanceof HTMLElement && e.target.isContentEditable)
    ) {
      return;
    }

    switch (e.key.toLowerCase()) {
      case "m":
        view.value = "month";
        break;
      case "w":
        view.value = "week";
        break;
      case "d":
        view.value = "day";
        break;
      case "a":
        view.value = "agenda";
        break;
    }
  };

  window.addEventListener("keydown", handleKeyDown);
  onUnmounted(() => {
    window.removeEventListener("keydown", handleKeyDown);
  });
});

// Navigation handlers
function handlePrevious() {
  if (view.value === "month") {
    currentDate.value = subMonths(currentDate.value, 1);
  }
  else if (view.value === "week") {
    currentDate.value = subWeeks(currentDate.value, 1);
  }
  else if (view.value === "day") {
    currentDate.value = addDays(currentDate.value, -1);
  }
  else if (view.value === "agenda") {
    currentDate.value = addDays(currentDate.value, -30);
  }
}

function handleNext() {
  if (view.value === "month") {
    currentDate.value = addMonths(currentDate.value, 1);
  }
  else if (view.value === "week") {
    currentDate.value = addWeeks(currentDate.value, 1);
  }
  else if (view.value === "day") {
    currentDate.value = addDays(currentDate.value, 1);
  }
  else if (view.value === "agenda") {
    currentDate.value = addDays(currentDate.value, 30);
  }
}

function handleToday() {
  currentDate.value = new Date();
}

// Event handlers
function handleEventSelect(event: CalendarEvent) {
  selectedEvent.value = { ...event };
  isEventDialogOpen.value = true;
}

function handleEventCreate(startTime: Date) {
  // Snap to 15-minute intervals
  const minutes = startTime.getMinutes();
  const remainder = minutes % 15;
  if (remainder !== 0) {
    if (remainder < 7.5) {
      startTime.setMinutes(minutes - remainder);
    }
    else {
      startTime.setMinutes(minutes + (15 - remainder));
    }
    startTime.setSeconds(0);
    startTime.setMilliseconds(0);
  }

  const newEvent: CalendarEvent = {
    id: "",  // Empty ID for new events
    title: "",
    start: startTime,
    end: new Date(startTime.getTime() + 60 * 60 * 1000), // Add 1 hour
    allDay: false,
  };
  selectedEvent.value = newEvent;
  isEventDialogOpen.value = true;
}

function handleEventSave(event: CalendarEvent) {
  // For new events, we should always emit eventAdd
  if (!event.id) {
    _emit('eventAdd', event);
  } else {
    // For existing events, check if it exists in the current events
    const existingEvent = props.events?.find(e => e.id === event.id);
    if (existingEvent) {
      _emit('eventUpdate', event);
    } else {
      _emit('eventAdd', event);
    }
  }
  isEventDialogOpen.value = false;
}

function handleEventDelete(eventId: string) {
  _emit('eventDelete', eventId);
  isEventDialogOpen.value = false;
}

// View title computation
const viewTitle = computed(() => {
  if (view.value === "month") {
    return format(currentDate.value, "MMMM yyyy");
  }
  else if (view.value === "week") {
    const start = startOfWeek(currentDate.value, { weekStartsOn: 0 });
    const end = endOfWeek(currentDate.value, { weekStartsOn: 0 });
    if (isSameMonth(start, end)) {
      return format(start, "MMMM yyyy");
    }
    else {
      return `${format(start, "MMM")} - ${format(end, "MMM yyyy")}`;
    }
  }
  else if (view.value === "day") {
    return format(currentDate.value, "MMMM d, yyyy");
  }
  else if (view.value === "agenda") {
    const start = currentDate.value;
    const end = addDays(currentDate.value, 30 - 1);
    if (isSameMonth(start, end)) {
      return format(start, "MMMM yyyy");
    }
    else {
      return `${format(start, "MMM")} - ${format(end, "MMM yyyy")}`;
    }
  }
  return format(currentDate.value, "MMMM yyyy");
});

// Helper functions for generating dates
function getWeeksForMonth(date: Date) {
  const firstDayOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);
  const lastDayOfMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0);
  const startDate = startOfWeek(firstDayOfMonth, { weekStartsOn: 0 });
  const endDate = endOfWeek(lastDayOfMonth, { weekStartsOn: 0 });
  const weeks: Date[][] = [];
  let currentDate = startDate;

  while (currentDate <= endDate) {
    const week: Date[] = [];
    for (let i = 0; i < 7; i++) {
      week.push(new Date(currentDate));
      currentDate = addDays(currentDate, 1);
    }
    weeks.push(week);
  }

  return weeks;
}

function getDaysForWeek(date: Date) {
  const start = startOfWeek(date, { weekStartsOn: 0 });
  const days: Date[] = [];
  for (let i = 0; i < 7; i++) {
    days.push(addDays(start, i));
  }
  return days;
}

function getDaysForAgenda(date: Date) {
  const days: Date[] = [];
  // Add 15 days before the current date
  for (let i = -15; i < 0; i++) {
    days.push(addDays(date, i));
  }
  // Add the current date and 14 days after
  for (let i = 0; i < 15; i++) {
    days.push(addDays(date, i));
  }
  return days;
}
</script>

<template>
  <div
    class="flex h-full w-full flex-col rounded-lg"
    :class="[className]"
    :style="{
      '--event-height': '24px',
      '--event-gap': '2px',
      '--week-cells-height': '60px',
    }"
  >
    <!-- Calendar header -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 py-5 sm:px-4 sticky top-0 z-40 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
      <div class="flex sm:flex-col max-sm:items-center justify-between gap-1.5">
        <div class="flex items-center gap-1.5">
          <h1 class="font-semibold text-xl">
            {{ viewTitle }}
          </h1>
        </div>
      </div>
      <div class="flex items-center justify-between gap-2">
        <div class="flex items-center justify-between gap-2">
          <div class="flex items-center sm:gap-2 max-sm:order-1">
            <UButton
              icon="i-lucide-chevron-left"
              color="neutral"
              variant="ghost"
              size="xl"
              aria-label="Previous"
              @click="handlePrevious"
            />
            <UButton
              icon="i-lucide-chevron-right"
              color="neutral"
              variant="ghost"
              size="xl"
              aria-label="Next"
              @click="handleNext"
            />
          </div>
          <UButton
            color="primary"
            size="xl"
            @click="handleToday"
          >
            Today
          </UButton>
        </div>
        <div class="flex items-center justify-between gap-2">
          <UDropdownMenu :items="items">
            <UButton
              color="neutral"
              variant="outline"
              size="xl"
              trailing-icon="i-lucide-chevron-down"
            >
              <span class="capitalize">{{ view }}</span>
            </UButton>
          </UDropdownMenu>
        </div>
      </div>
    </div>

    <!-- Calendar views -->
    <div class="flex flex-1 flex-col min-h-0">
      <GlobalMonthView
        v-if="view === 'month'"
        :weeks="getWeeksForMonth(currentDate)"
        :events="events || []"
        :is-current-month="isSameMonth(currentDate, new Date())"
        cell-id="month-cell"
        @event-click="handleEventSelect"
        @event-create="handleEventCreate"
      />
      <GlobalWeekView
        v-if="view === 'week'"
        :days="getDaysForWeek(currentDate)"
        :events="events || []"
        :week-start="startOfWeek(currentDate, { weekStartsOn: 0 })"
        :show-all-day-section="true"
        @event-click="handleEventSelect"
        @event-create="handleEventCreate"
      />
      <GlobalDayView
        v-if="view === 'day'"
        :current-date="currentDate"
        :events="events || []"
        :show-all-day-section="true"
        @event-click="handleEventSelect"
        @event-create="handleEventCreate"
      />
      <GlobalAgendaView
        v-if="view === 'agenda'"
        :days="getDaysForAgenda(currentDate)"
        :events="events || []"
        @event-click="handleEventSelect"
      />
    </div>
  </div>

  <!-- Floating Action Button -->
  <UButton
    class="fixed bottom-8 right-8 rounded-full shadow-lg z-50 p-4"
    color="primary"
    size="xl"
    icon="i-lucide-plus"
    aria-label="Add Event"
    :ui="{
      leadingIcon: 'bg-gray-100 dark:bg-gray-800 w-10 h-10',
    }"
    @click="handleEventCreate(new Date())"
  />

  <!-- Event Dialog -->
  <CalendarEventDialog
    :event="selectedEvent"
    :is-open="isEventDialogOpen"
    @close="isEventDialogOpen = false"
    @save="handleEventSave"
    @delete="handleEventDelete"
  />
</template>
