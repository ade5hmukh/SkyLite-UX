<script setup lang="ts">
import { useEventListener, useIntervalFn } from "@vueuse/core";
import { addDays, addMonths, addWeeks, format, isSameMonth, subMonths, subWeeks } from "date-fns";

import type { CalendarEvent, CalendarView } from "~/types/calendar";
import type { DailyReportsResponse } from "~/types/dailyReport";

import GlobalDateHeader from "~/components/global/globalDateHeader.vue";
import GlobalFloatingActionButton from "~/components/global/globalFloatingActionButton.vue";
import { useCalendar } from "~/composables/useCalendar";
import { useStableDate } from "~/composables/useStableDate";
import { findEventConflicts } from "~/utils/eventConflicts";

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
const { getEventsForDateRange, scrollToDate } = useCalendar();
const currentDate = useState<Date>("calendar-current-date", () => getStableDate());
const view = ref<CalendarView>(props.initialView || "twoweeks");
const isEventDialogOpen = ref(false);
const selectedEvent = ref<CalendarEvent | null>(null);
const { preferences, updatePreferences } = useClientPreferences();

// Track if user has manually navigated away from today
const hasManuallyNavigated = ref(false);

onMounted(() => {
  // Applied after mount so the server-rendered view matches during hydration.
  if (preferences.value.calendarView) {
    view.value = preferences.value.calendarView;
  }
  watch(view, (newView) => {
    updatePreferences({ calendarView: newView });
  });

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
      case "t":
        view.value = "twoweeks";
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

  // Check for date change at midnight and auto-update if user hasn't navigated away
  const checkDateChange = () => {
    const now = new Date();
    const currentDateValue = currentDate.value;

    // If user hasn't manually navigated and we're on a different day, update
    if (!hasManuallyNavigated.value) {
      const currentDay = new Date(currentDateValue.getFullYear(), currentDateValue.getMonth(), currentDateValue.getDate());
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

      if (currentDay.getTime() !== today.getTime()) {
        currentDate.value = now;
      }
    }
  };

  // Check every minute for date change
  const dateCheckInterval = setInterval(checkDateChange, 60000);

  onUnmounted(() => {
    window.removeEventListener("keydown", handleKeyDown);
    clearInterval(dateCheckInterval);
  });
});

function handlePrevious() {
  hasManuallyNavigated.value = true;
  if (view.value === "month") {
    currentDate.value = subMonths(currentDate.value, 1);
  }
  else if (view.value === "week") {
    currentDate.value = subWeeks(currentDate.value, 1);
  }
  else if (view.value === "twoweeks") {
    currentDate.value = subWeeks(currentDate.value, 2);
  }
  else if (view.value === "day") {
    currentDate.value = addDays(currentDate.value, -1);
  }
  else if (view.value === "agenda") {
    currentDate.value = addDays(currentDate.value, -30);
  }
}

function handleNext() {
  hasManuallyNavigated.value = true;
  if (view.value === "month") {
    currentDate.value = addMonths(currentDate.value, 1);
  }
  else if (view.value === "week") {
    currentDate.value = addWeeks(currentDate.value, 1);
  }
  else if (view.value === "twoweeks") {
    currentDate.value = addWeeks(currentDate.value, 2);
  }
  else if (view.value === "day") {
    currentDate.value = addDays(currentDate.value, 1);
  }
  else if (view.value === "agenda") {
    currentDate.value = addDays(currentDate.value, 30);
  }
}

function handleToday() {
  hasManuallyNavigated.value = false;
  currentDate.value = new Date();

  nextTick(() => {
    scrollToDate(new Date(), view.value);
  });
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
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay());
      end = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 6, 23, 59, 59, 999);
      events = getEventsForDateRange(start, end);
      break;
    }
    case "twoweeks": {
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay());
      end = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 13, 23, 59, 59, 999);
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

const conflicts = computed(() => findEventConflicts(filteredEvents.value));
const conflictsOpen = ref(false);

const { refresh: refreshDailyReports } = useFetch<DailyReportsResponse>("/api/dailyReports", {
  key: "daily-reports",
  query: { from: format(addDays(new Date(), -90), "yyyy-MM-dd") },
});
useIntervalFn(refreshDailyReports, 5 * 60 * 1000);
useEventListener("focus", () => refreshDailyReports());

const { data: aiStatus } = useFetch<{ eventImport: boolean }>("/api/ai/status", { key: "ai-status" });
const isImportDialogOpen = ref(false);

function handleImportedEvents(events: CalendarEvent[]) {
  for (const event of events) {
    _emit("eventAdd", event);
  }
  isImportDialogOpen.value = false;
}

function formatConflictTime(event: CalendarEvent) {
  return format(new Date(event.start), "EEE MMM d, h:mm a");
}

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
  <div class="flex h-[calc(100vh-2rem)] w-full flex-col rounded-lg">
    <div class="py-5 sm:px-4 sticky top-0 z-40 bg-default border-b border-default">
      <GlobalDateHeader
        :show-navigation="true"
        :show-view-selector="true"
        :current-date="currentDate"
        :view="view"
        @previous="handlePrevious"
        @next="handleNext"
        @today="handleToday"
        @view-change="(newView) => view = newView"
        @date-change="(newDate) => currentDate = newDate"
      />
      <div v-if="aiStatus?.eventImport || conflicts.length" class="mt-3 flex flex-wrap items-center gap-2">
        <UButton
          v-if="aiStatus?.eventImport"
          color="primary"
          variant="soft"
          size="sm"
          icon="i-lucide-sparkles"
          @click="isImportDialogOpen = true"
        >
          Import from email or flyer
        </UButton>
        <UPopover v-if="conflicts.length" v-model:open="conflictsOpen">
          <UButton
            color="warning"
            variant="soft"
            size="sm"
            icon="i-lucide-triangle-alert"
          >
            {{ conflicts.length }} schedule {{ conflicts.length === 1 ? 'conflict' : 'conflicts' }}
          </UButton>
          <template #content>
            <ul class="p-2 w-80 max-h-96 overflow-y-auto space-y-1" aria-label="Schedule conflicts">
              <li v-for="conflict in conflicts" :key="`${conflict.first.id}|${conflict.second.id}|${new Date(conflict.first.start).getTime()}`">
                <button
                  type="button"
                  class="w-full text-left rounded-md p-2 hover:bg-muted"
                  @click="conflictsOpen = false; handleEventSelect(conflict.first)"
                >
                  <p class="text-xs text-muted">
                    {{ formatConflictTime(conflict.first) }} · {{ conflict.people.join(', ') }}
                  </p>
                  <p class="text-sm text-highlighted">
                    {{ conflict.first.title }}
                  </p>
                  <p class="text-sm text-highlighted">
                    <span class="text-muted">overlaps</span> {{ conflict.second.title }} ({{ format(new Date(conflict.second.start), "h:mm a") }})
                  </p>
                </button>
              </li>
            </ul>
          </template>
        </UPopover>
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
      <GlobalTwoWeeksView
        v-if="view === 'twoweeks'"
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
    :events="props.events"
    :integration-capabilities="selectedEvent && props.getIntegrationCapabilities ? props.getIntegrationCapabilities(selectedEvent)?.capabilities : undefined"
    :integration-service-name="selectedEvent && props.getIntegrationCapabilities ? props.getIntegrationCapabilities(selectedEvent)?.serviceName : undefined"
    @close="isEventDialogOpen = false"
    @save="handleEventSave"
    @delete="handleEventDelete"
  />
  <CalendarImportDialog
    :is-open="isImportDialogOpen"
    @close="isImportDialogOpen = false"
    @add="handleImportedEvents"
  />
</template>
