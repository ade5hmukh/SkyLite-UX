import { consola } from "consola";
import { computed, readonly } from "vue";

import type { CalendarEvent } from "~/types/calendar";
import type { CalendarIntegrationService, IntegrationService } from "~/types/integrations";

import { useCalendar } from "./useCalendar";
import { useIntegrations } from "./useIntegrations";
import { useSyncManager } from "./useSyncManager";
import { useUsers } from "./useUsers";

function isCalendarService(service: IntegrationService | null | undefined): service is CalendarIntegrationService {
  return service !== null && service !== undefined && typeof (service as CalendarIntegrationService).getEvents === "function";
}

export function useCalendarIntegrations() {
  const { combineEvents, getEventUserColors, getIntegrationEvents } = useCalendar();
  const { integrations, loading: integrationsLoading, error: integrationsError, getService } = useIntegrations();
  const { users } = useUsers();

  // Get calendar integrations
  const calendarIntegrations = computed(() =>
    integrations.value.filter(integration =>
      integration.type === "calendar" && integration.enabled,
    ),
  );

  // Get calendar services
  const calendarServices = computed(() => {
    const services: Map<string, CalendarIntegrationService> = new Map();
    calendarIntegrations.value.forEach((integration) => {
      const service = getService(integration.id);
      if (isCalendarService(service)) {
        services.set(integration.id, service);
      }
    });
    return services;
  });

  // Get processed calendar events from integrations with user data and colors
  const processedCalendarEvents = computed(() => {
    const allEvents: CalendarEvent[] = [];

    calendarIntegrations.value.forEach((integration) => {
      try {
        // Get events from cache using the same cache key as sync manager
        const events = getIntegrationEvents(integration.id);
        if (!events || !Array.isArray(events))
          return;

        const eventColor = integration.settings?.eventColor as string || "#06b6d4";
        const userIds = integration.settings?.user as string[] | undefined;
        const useUserColors = integration.settings?.useUserColors as boolean | undefined;

        const eventUsers = userIds?.map(userId =>
          users.value?.find(user => user.id === userId),
        ).filter(Boolean).map(user => ({
          id: user!.id,
          name: user!.name,
          avatar: user!.avatar,
          color: user!.color,
        })) || [];

        allEvents.push(...events.map((event: CalendarEvent) => ({
          ...event,
          users: eventUsers,
          color: getEventUserColors(event, { eventColor, useUserColors, defaultColor: "#06b6d4" }),
          integrationId: integration.id,
          integrationName: integration.name || "Unknown",
        })));
      }
      catch (error) {
        consola.warn(`Failed to process calendar events for integration ${integration.id}:`, error);
      }
    });

    return combineEvents(allEvents);
  });

  // Get sync status for calendar integrations
  const calendarSyncStatus = computed(() => {
    const { getCalendarSyncData } = useSyncManager();
    return getCalendarSyncData();
  });

  // Function to get events for a specific integration with processing
  const getProcessedIntegrationEvents = (integrationId: string): CalendarEvent[] => {
    const integration = calendarIntegrations.value.find(i => i.id === integrationId);
    if (!integration)
      return [];

    try {
      const events = getIntegrationEvents(integrationId);
      if (!events || !Array.isArray(events))
        return [];

      const eventColor = integration.settings?.eventColor as string || "#06b6d4";
      const userIds = integration.settings?.user as string[] | undefined;
      const useUserColors = integration.settings?.useUserColors as boolean | undefined;

      const eventUsers = userIds?.map(userId =>
        users.value?.find(user => user.id === userId),
      ).filter(Boolean).map(user => ({
        id: user!.id,
        name: user!.name,
        avatar: user!.avatar,
        color: user!.color,
      })) || [];

      return events.map((event: CalendarEvent) => ({
        ...event,
        users: eventUsers,
        color: getEventUserColors(event, { eventColor, useUserColors, defaultColor: "#06b6d4" }),
        integrationId: integration.id,
        integrationName: integration.name || "Unknown",
      }));
    }
    catch (error) {
      consola.warn(`Failed to process events for integration ${integrationId}:`, error);
      return [];
    }
  };

  return {
    // Data access
    calendarEvents: readonly(processedCalendarEvents),
    calendarIntegrations: readonly(calendarIntegrations),
    calendarServices: readonly(calendarServices),
    calendarSyncStatus: readonly(calendarSyncStatus),

    // Loading states
    integrationsLoading: readonly(integrationsLoading),
    integrationsError: readonly(integrationsError),

    // Functions
    getProcessedIntegrationEvents,
  };
}
