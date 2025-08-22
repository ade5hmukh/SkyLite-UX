<script setup lang="ts">
import type { CalendarEvent } from "~/types/calendar";
import type { Integration } from "~/types/database";

import { useAlertToast } from "~/composables/useAlertToast";
import { useCalendar } from "~/composables/useCalendar";
import { useCalendarEvents } from "~/composables/useCalendarEvents";
import { useIntegrations } from "~/composables/useIntegrations";
import { integrationRegistry } from "~/types/integrations";

const { allEvents, getEventUserColors } = useCalendar();
const { showError, showSuccess } = useAlertToast();

async function handleEventAdd(event: CalendarEvent) {
  try {
    if (!event.integrationId) {
      const eventColor = getEventUserColors(event);

      const { createEvent } = useCalendarEvents();
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

      const { updateEvent } = useCalendarEvents();
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
      const { deleteEvent } = useCalendarEvents();
      await deleteEvent(eventId);
      showSuccess("Event Deleted", "Local event deleted successfully");
    }
    else {
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

  const { integrations } = useIntegrations();
  const integration = (integrations.value as readonly Integration[] || []).find(i => i.id === event.integrationId);
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
      :events="allEvents as CalendarEvent[]"
      initial-view="week"
      class="h-[calc(100vh-2rem)]"
      :get-integration-capabilities="getEventIntegrationCapabilities"
      @event-add="handleEventAdd"
      @event-update="handleEventUpdate"
      @event-delete="handleEventDelete"
    />
  </div>
</template>
