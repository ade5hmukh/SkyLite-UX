<script setup lang="ts">
import { onMounted, watch } from "vue";

import type { CalendarEvent } from "~/types/calendar";
import type { Integration } from "~/types/database";

import { useAlertToast } from "~/composables/useAlertToast";
import { useCalendar } from "~/composables/useCalendar";
import { useCalendarEvents } from "~/composables/useCalendarEvents";
import { useCalendarIntegrations } from "~/composables/useCalendarIntegrations";
import { integrationRegistry } from "~/types/integrations";

const { calendarEvents: integrationEvents, calendarIntegrations, loading: integrationLoading, error: integrationError, getCalendarEvents } = useCalendarIntegrations();
const { events: localEvents, loading: localLoading, error: localError, createEvent, updateEvent, deleteEvent } = useCalendarEvents();
const { getEventUserColors } = useCalendar();
const { showError, showSuccess } = useAlertToast();

const allEvents = computed(() => {
  const local = localEvents.value || [];
  const integration = integrationEvents.value || [];
  return [...local, ...integration] as CalendarEvent[];
});

const loading = computed(() => {
  return integrationLoading.value || localLoading.value;
});

const error = computed(() => {
  return integrationError.value || localError.value;
});

onMounted(async () => {
  await getCalendarEvents();
});

watch(error, (err) => {
  if (err) {
    showError("Calendar Error", err);
  }
});

async function handleEventAdd(event: CalendarEvent) {
  try {
    if (!event.integrationId) {
      const eventColor = getEventUserColors(event);

      await createEvent({
        title: event.title,
        description: event.description,
        start: event.start,
        end: event.end,
        allDay: event.allDay,
        color: eventColor,
        label: event.label,
        location: event.location,
        users: event.users,
      });
      showSuccess("Event Created", "Local event created successfully");
    }
    else {
      // TODO: Implement add event to integration if supported
      showError("Not Supported", "Adding events to this integration is not yet supported");
    }
  }
  catch {
    showError("Failed to Create Event", "Failed to create the event. Please try again.");
  }
}

async function handleEventUpdate(event: CalendarEvent) {
  try {
    if (!event.integrationId) {
      const eventColor = getEventUserColors(event);

      await updateEvent(event.id, {
        title: event.title,
        description: event.description,
        start: event.start,
        end: event.end,
        allDay: event.allDay,
        color: eventColor,
        label: event.label,
        location: event.location,
        users: event.users,
      });
      showSuccess("Event Updated", "Local event updated successfully");
    }
    else {
      // TODO: Implement update event in integration if supported
      showError("Not Supported", "Updating events in this integration is not yet supported");
    }
  }
  catch {
    showError("Failed to Update Event", "Failed to update the event. Please try again.");
  }
}

async function handleEventDelete(eventId: string) {
  try {
    const event = allEvents.value.find(e => e.id === eventId);

    if (!event) {
      showError("Event Not Found", "The event could not be found.");
      return;
    }

    if (!event.integrationId) {
      await deleteEvent(eventId);
      showSuccess("Event Deleted", "Local event deleted successfully");
    }
    else {
      // TODO: Implement delete event from integration if supported
      showError("Not Supported", "Deleting events from this integration is not yet supported");
    }
  }
  catch {
    showError("Failed to Delete Event", "Failed to delete the event. Please try again.");
  }
}

function getEventIntegrationCapabilities(event: CalendarEvent): { capabilities: string[]; serviceName?: string } | undefined {
  if (!event.integrationId)
    return undefined;

  const integration = (calendarIntegrations.value as Integration[]).find(i => i.id === event.integrationId);
  if (!integration)
    return undefined;

  const config = integrationRegistry.get(`${integration.type}:${integration.service}`);
  return {
    capabilities: config?.capabilities || [],
    serviceName: integration.service,
  };
}
</script>

<template>
  <div>
    <CalendarMainView
      :events="allEvents"
      initial-view="week"
      class="h-[calc(100vh-2rem)]"
      :loading="loading"
      :get-integration-capabilities="getEventIntegrationCapabilities"
      @event-add="handleEventAdd"
      @event-update="handleEventUpdate"
      @event-delete="handleEventDelete"
    />
  </div>
</template>
