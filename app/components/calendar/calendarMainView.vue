<script setup lang="ts">
import type { DropdownMenuItem } from "@nuxt/ui";

import { addDays, addMonths, addWeeks, endOfWeek, isSameMonth, startOfWeek, subMonths, subWeeks } from "date-fns";

import type { CalendarEvent, CalendarView } from "~/types/calendar";

import GlobalFloatingActionButton from "~/components/global/globalFloatingActionButton.vue";
import { useCalendar } from "~/composables/useCalendar";
import { useStableDate } from "~/composables/useStableDate";

const props = defineProps<{
  events?: CalendarEvent[];
  className?: string;
  initialView?: CalendarView;
  class?: string;
  getIntegrationCapabilities?: (event: CalendarEvent) => { capabilities: string[]; serviceName?: string } | undefined;
}>();

const _emit = defineEmits<{
  (e: "eventAdd", event: CalendarEvent): void;
  (e: "eventUpdate", event: CalendarEvent): void;
  (e: "eventDelete", eventId: string): void;
}>();

const { getStableDate } = useStableDate();
const { getEventsForDateRange } = useCalendar();
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

  window.addEventListener("keydown", handleKeyDown, { passive: false });
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
  handleEventCreate(getStableDate());
}

const isCurrentMonth = computed(() => {
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

const filteredEvents = computed(() => {
  if (!props.events)
    return [];

  const now = currentDate.value;
  let start: Date;
  let end: Date;
  let events: CalendarEvent[];

  switch (view.value) {
    case "month": {
      start = new Date(now.getFullYear(), now.getMonth(), 1);
      start.setDate(start.getDate() - 7);
      end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      end.setDate(end.getDate() + 7);
      events = getEventsForDateRange(start, end);
      break;
    }
    case "week": {
      const sunday = new Date(now.getTime());
      const dayOfWeek = sunday.getDay();
      sunday.setDate(sunday.getDate() - dayOfWeek);
      const saturday = new Date(sunday.getTime() + 6 * 24 * 60 * 60 * 1000);
      start = sunday;
      end = saturday;
      events = getEventsForDateRange(start, end);
      break;
    }
    case "day": {
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
      events = getEventsForDateRange(start, end);
      break;
    }
    case "agenda": {
      start = addDays(now, -15);
      end = addDays(now, 15);
      events = getEventsForDateRange(start, end);
      break;
    }
    default:
      events = props.events;
      start = new Date();
      end = new Date();
  }

  return events;
});

function getWeeksForMonth(date: Date) {
  const { getLocalMonthWeeks } = useCalendar();
  return getLocalMonthWeeks(date);
}

function getDaysForAgenda(date: Date) {
  const { getLocalAgendaDays } = useCalendar();
  return getLocalAgendaDays(date);
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
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 py-5 sm:px-4 sticky top-0 z-40 bg-default border-b border-default">
      <div class="flex sm:flex-col max-sm:items-center justify-between gap-1.5">
        <div class="flex items-center gap-1.5">
          <h1 class="font-semibold text-xl">
            <NuxtTime
              v-if="viewTitle === 'month'"
              :datetime="currentDate"
              month="long"
              year="numeric"
            />
            <NuxtTime
              v-else-if="viewTitle === 'week-same-month'"
              :datetime="startOfWeek(currentDate, { weekStartsOn: 0 })"
              month="long"
              year="numeric"
            />
            <span v-else-if="viewTitle === 'week-different-months'">
              <NuxtTime
                :datetime="startOfWeek(currentDate, { weekStartsOn: 0 })"
                month="short"
              /> -
              <NuxtTime
                :datetime="endOfWeek(currentDate, { weekStartsOn: 0 })"
                month="short"
                year="numeric"
              />
            </span>
            <NuxtTime
              v-else-if="viewTitle === 'day'"
              :datetime="currentDate"
              month="long"
              day="numeric"
              year="numeric"
            />
            <NuxtTime
              v-else-if="viewTitle === 'agenda-same-month'"
              :datetime="currentDate"
              month="long"
              year="numeric"
            />
            <span v-else-if="viewTitle === 'agenda-different-months'">
              <NuxtTime
                :datetime="currentDate"
                month="short"
              /> -
              <NuxtTime
                :datetime="addDays(currentDate, 30 - 1)"
                month="short"
                year="numeric"
              />
            </span>
            <NuxtTime
              v-else
              :datetime="currentDate"
              month="long"
              year="numeric"
            />
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
        :events="filteredEvents"
        :is-current-month="isCurrentMonth"
        cell-id="month-cell"
        @event-click="handleEventSelect"
        @event-create="handleEventCreate"
      />
      <GlobalWeekView
        v-if="view === 'week'"
        :start-date="currentDate"
        :events="filteredEvents"
        @event-click="handleEventSelect"
        @event-create="handleEventCreate"
      />
      <GlobalDayView
        v-if="view === 'day'"
        :current-date="currentDate"
        :events="filteredEvents"
        :show-all-day-section="true"
        @event-click="handleEventSelect"
        @event-create="handleEventCreate"
        @date-select="(date) => currentDate = date"
      />
      <GlobalAgendaView
        v-if="view === 'agenda'"
        :days="getDaysForAgenda(currentDate)"
        :events="filteredEvents"
        @event-click="handleEventSelect"
      />
    </div>
  </div>
  <GlobalFloatingActionButton
    icon="i-lucide-plus"
    label="Add new event"
    color="primary"
    size="lg"
    position="bottom-right"
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
