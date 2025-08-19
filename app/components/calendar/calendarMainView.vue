<script setup lang="ts">
import type { DropdownMenuItem } from "@nuxt/ui";

import { addDays, addMonths, addWeeks, endOfWeek, format, isSameMonth, startOfWeek, subMonths, subWeeks } from "date-fns";

import type { CalendarEvent, CalendarView } from "~/types/calendar";

import { useStableDate } from "~/composables/useStableDate";

const props = defineProps<{
  events?: CalendarEvent[];
  className?: string;
  initialView?: CalendarView;
  class?: string;
  loading?: boolean;
  getIntegrationCapabilities?: (event: CalendarEvent) => { capabilities: string[]; serviceName?: string } | undefined;
}>();

const _emit = defineEmits<{
  (e: "eventAdd", event: CalendarEvent): void;
  (e: "eventUpdate", event: CalendarEvent): void;
  (e: "eventDelete", eventId: string): void;
}>();

// Use global stable date
const { getStableDate } = useStableDate();
const currentDate = useState<Date>("calendar-current-date", () => getStableDate());
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
      onSelect: () => {
        view.value = "week";
        // Use a stable date reference to avoid hydration mismatches
        currentDate.value = getStableDate();
      },
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
  // Use a stable date reference to avoid hydration mismatches
  currentDate.value = getStableDate();
}

function handleEventSelect(event: CalendarEvent) {
  selectedEvent.value = event;
  isEventDialogOpen.value = true;
}

function handleEventCreate(date: Date) {
  selectedEvent.value = {
    id: "",
    title: "",
    description: "",
    start: date,
    end: addDays(date, 1),
    allDay: false,
    color: "sky",
  };
  isEventDialogOpen.value = true;
}

function handleEventSave(event: CalendarEvent) {
  if (event.id) {
    _emit("eventUpdate", event);
  }
  else {
    _emit("eventAdd", event);
  }
  isEventDialogOpen.value = false;
  selectedEvent.value = null;
}

function handleEventDelete(eventId: string) {
  _emit("eventDelete", eventId);
  isEventDialogOpen.value = false;
  selectedEvent.value = null;
}

function handleCreateEvent() {
  // Use a stable date reference to avoid hydration mismatches
  handleEventCreate(getStableDate());
}

const isCurrentMonth = computed(() => {
  // Use a stable date reference to avoid hydration mismatches
  return isSameMonth(currentDate.value, getStableDate());
});

const viewTitle = computed(() => {
  if (view.value === "month") {
    return "month";
  }
  else if (view.value === "week") {
    const start = startOfWeek(currentDate.value, { weekStartsOn: 0 });
    const end = endOfWeek(currentDate.value, { weekStartsOn: 0 });
    if (isSameMonth(start, end)) {
      return "week-same-month";
    }
    else {
      return "week-different-months";
    }
  }
  else if (view.value === "day") {
    return "day";
  }
  else if (view.value === "agenda") {
    const start = currentDate.value;
    const end = addDays(currentDate.value, 30 - 1);
    if (isSameMonth(start, end)) {
      return "agenda-same-month";
    }
    else {
      return "agenda-different-months";
    }
  }
  return "month";
});

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
      // Create a new Date object to avoid mutation
      week.push(new Date(currentDate.getTime()));
      currentDate = addDays(currentDate, 1);
    }
    weeks.push(week);
  }

  return weeks;
}

function getDaysForAgenda(date: Date) {
  const days: Date[] = [];
  for (let i = -15; i < 0; i++) {
    days.push(addDays(date, i));
  }
  for (let i = 0; i < 15; i++) {
    days.push(addDays(date, i));
  }
  return days;
}
</script>

<template>
  <div
    class="flex h-full w-full flex-col rounded-lg"
    :class="[className, props.class]"
    :style="{
      '--event-height': '24px',
      '--event-gap': '2px',
      '--week-cells-height': '60px',
    }"
  >
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 py-5 sm:px-4 sticky top-0 z-40 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
      <div class="flex sm:flex-col max-sm:items-center justify-between gap-1.5">
        <div class="flex items-center gap-1.5">
          <h1 class="font-semibold text-xl">
            <NuxtTime v-if="viewTitle === 'month'" :datetime="currentDate" month="long" year="numeric" />
            <NuxtTime v-else-if="viewTitle === 'week-same-month'" :datetime="startOfWeek(currentDate, { weekStartsOn: 0 })" month="long" year="numeric" />
            <span v-else-if="viewTitle === 'week-different-months'">
              <NuxtTime :datetime="startOfWeek(currentDate, { weekStartsOn: 0 })" month="short" /> - 
              <NuxtTime :datetime="endOfWeek(currentDate, { weekStartsOn: 0 })" month="short" year="numeric" />
            </span>
            <NuxtTime v-else-if="viewTitle === 'day'" :datetime="currentDate" month="long" day="numeric" year="numeric" />
            <NuxtTime v-else-if="viewTitle === 'agenda-same-month'" :datetime="currentDate" month="long" year="numeric" />
            <span v-else-if="viewTitle === 'agenda-different-months'">
              <NuxtTime :datetime="currentDate" month="short" /> - 
              <NuxtTime :datetime="addDays(currentDate, 30 - 1)" month="short" year="numeric" />
            </span>
            <NuxtTime v-else :datetime="currentDate" month="long" year="numeric" />
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
    <div class="flex flex-1 flex-col min-h-0">
      <GlobalMonthView
        v-if="view === 'month'"
        :weeks="getWeeksForMonth(currentDate)"
        :events="events || []"
        :is-current-month="isCurrentMonth"
        cell-id="month-cell"
        @event-click="handleEventSelect"
        @event-create="handleEventCreate"
      />
      <GlobalWeekView
        v-if="view === 'week'"
        :start-date="currentDate"
        :events="events || []"
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
        @date-select="(date) => currentDate = date"
      />
      <GlobalAgendaView
        v-if="view === 'agenda'"
        :days="getDaysForAgenda(currentDate)"
        :events="events || []"
        @event-click="handleEventSelect"
      />
    </div>
  </div>
  <UButton
    class="fixed bottom-8 right-8 rounded-full shadow-lg z-50 p-4"
    color="primary"
    size="xl"
    icon="i-lucide-plus"
    aria-label="Add Event"
    :ui="{
      leadingIcon: 'bg-gray-100 dark:bg-gray-800 w-10 h-10',
    }"
    @click="handleCreateEvent"
  />
  <CalendarEventDialog
    :event="selectedEvent"
    :is-open="isEventDialogOpen"
    :integration-capabilities="selectedEvent && props.getIntegrationCapabilities ? props.getIntegrationCapabilities(selectedEvent)?.capabilities : undefined"
    :integration-service-name="selectedEvent && props.getIntegrationCapabilities ? props.getIntegrationCapabilities(selectedEvent)?.serviceName : undefined"
    @close="isEventDialogOpen = false"
    @save="handleEventSave"
    @delete="handleEventDelete"
  />
</template>
