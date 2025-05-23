<script setup lang="ts">
import type { CalendarEvent } from "~/utils/calendarTypes";

// Sample events data
const events = ref<CalendarEvent[]>([
  {
    id: "1",
    title: "Team Meeting",
    description: "Weekly team sync",
    start: new Date(new Date().setHours(10, 0, 0, 0)),
    end: new Date(new Date().setHours(11, 30, 0, 0)),
    color: "blue",
    location: "Conference Room A",
  },
  {
    id: "2",
    title: "Project Deadline",
    description: "Submit final deliverables",
    start: new Date(new Date().setDate(new Date().getDate() + 1)),
    end: new Date(new Date().setDate(new Date().getDate() + 1)),
    allDay: true,
    color: "orange",
  },
  {
    id: "3",
    title: "Client Presentation",
    description: "Present new features to client",
    start: new Date(new Date().setDate(new Date().getDate() - 2)),
    end: new Date(new Date().setDate(new Date().getDate() - 2)),
    allDay: true,
    color: "violet",
    location: "Virtual Meeting",
  },
  {
    id: "4",
    title: "Code Review",
    description: "Review pull requests",
    start: new Date(new Date().setHours(8, 0, 0, 0)),
    end: new Date(new Date().setHours(10, 0, 0, 0)),
    color: "emerald",
    location: "Engineering Hub",
  },
]);

function handleEventAdd(event: CalendarEvent) {
  events.value.push(event);
}

function handleEventUpdate(event: CalendarEvent) {
  const index = events.value.findIndex(e => e.id === event.id);
  if (index !== -1) {
    events.value[index] = { ...event };
  }
}

function handleEventDelete(eventId: string) {
  const index = events.value.findIndex(e => e.id === eventId);
  if (index !== -1) {
    events.value.splice(index, 1);
  }
}
</script>

<template>
  <!-- New unified calendar view -->
  <CalendarMainView
    :events="events"
    initial-view="week"
    class="h-[calc(100vh-2rem)]"
    @event-add="handleEventAdd"
    @event-update="handleEventUpdate"
    @event-delete="handleEventDelete"
  />
</template>
