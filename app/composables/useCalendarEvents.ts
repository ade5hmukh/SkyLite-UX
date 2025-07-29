import { consola } from "consola";

import type { CalendarEvent } from "~/types/calendar";

export function useCalendarEvents() {
  const events = ref<CalendarEvent[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);

  const { data: serverEvents } = useNuxtData<CalendarEvent[]>("calendar-events");

  const fetchEvents = async () => {
    loading.value = true;
    error.value = null;
    try {
      const data = await $fetch<CalendarEvent[]>("/api/calendar-events");
      events.value = data || [];
      return events.value;
    }
    catch (err) {
      error.value = "Failed to fetch calendar events";
      consola.error("Error fetching calendar events:", err);
      return [];
    }
    finally {
      loading.value = false;
    }
  };

  watch(serverEvents, (newEvents) => {
    if (newEvents) {
      events.value = newEvents;
    }
  });

  const createEvent = async (eventData: Omit<CalendarEvent, "id">) => {
    try {
      const newEvent = await $fetch<CalendarEvent>("/api/calendar-events", {
        method: "POST",
        body: eventData,
      });
      events.value.unshift(newEvent);
      return newEvent;
    }
    catch (err) {
      error.value = "Failed to create calendar event";
      consola.error("Error creating calendar event:", err);
      throw err;
    }
  };

  const updateEvent = async (id: string, updates: Partial<CalendarEvent>) => {
    try {
      const updatedEvent = await $fetch<CalendarEvent>(`/api/calendar-events/${id}`, {
        method: "PUT",
        body: updates,
      });
      const index = events.value.findIndex(e => e.id === id);
      if (index !== -1) {
        events.value[index] = updatedEvent;
      }
      return updatedEvent;
    }
    catch (err) {
      error.value = "Failed to update calendar event";
      consola.error("Error updating calendar event:", err);
      throw err;
    }
  };

  const deleteEvent = async (id: string) => {
    try {
      await $fetch(`/api/calendar-events/${id}`, {
        method: "DELETE",
      });
      events.value = events.value.filter(e => e.id !== id);
      return true;
    }
    catch (err) {
      error.value = "Failed to delete calendar event";
      consola.error("Error deleting calendar event:", err);
      throw err;
    }
  };

  onMounted(() => {
    fetchEvents();
  });

  return {
    events: readonly(events),
    loading: readonly(loading),
    error: readonly(error),
    fetchEvents,
    createEvent,
    updateEvent,
    deleteEvent,
  };
}
