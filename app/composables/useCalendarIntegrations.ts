import consola from "consola";
import { computed, onMounted, readonly, ref, watch } from "vue";

import type { CalendarEvent } from "~/types/calendar";
import type { CalendarIntegrationService, IntegrationService } from "~/types/integrations";

import { useCalendar } from "./useCalendar";
import { useIntegrations } from "./useIntegrations";
import { useUsers } from "./useUsers";

function isCalendarService(service: IntegrationService | null | undefined): service is CalendarIntegrationService {
  return service !== null && service !== undefined && typeof (service as CalendarIntegrationService).getEvents === "function";
}

export function useCalendarIntegrations() {
  const { combineEvents, getEventUserColors } = useCalendar();
  const { integrations, loading: integrationsLoading, error: integrationsError, getService } = useIntegrations();
  const { users, fetchUsers } = useUsers();

  const loading = ref(false);
  const error = ref<string | null>(null);
  const initialFetchError = ref<Error | null>(null);

  const calendarIntegrations = computed(() =>
    integrations.value.filter(integration =>
      integration.type === "calendar" && integration.enabled,
    ),
  );

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

  const calendarEvents = ref<CalendarEvent[]>([]);

  const getCalendarEvents = async () => {
    loading.value = true;
    error.value = null;
    try {
      if (users.value.length === 0) {
        await fetchUsers();
      }

      const allEvents: CalendarEvent[] = [];
      const integrationErrors: Array<{ integrationId: string; integrationName: string; error: Error }> = [];

      for (const [integrationId, service] of calendarServices.value) {
        try {
          const events = await service.getEvents();
          if (!events || !Array.isArray(events))
            continue;
          const integration = calendarIntegrations.value.find(i => i.id === integrationId);
          const eventColor = integration?.settings?.eventColor as string || "#06b6d4";
          const userIds = integration?.settings?.user as string[] | undefined;
          const useUserColors = integration?.settings?.useUserColors as boolean | undefined;

          const eventUsers = userIds?.map(userId =>
            users.value.find(user => user.id === userId),
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
            integrationId,
            integrationName: integration?.name || "Unknown",
          })));
        }
        catch (err) {
          const integrationName = calendarIntegrations.value.find(i => i.id === integrationId)?.name || "Unknown";
          integrationErrors.push({ integrationId, integrationName, error: err instanceof Error ? err : new Error(String(err)) });
        }
      }

      const combinedEvents = combineEvents(allEvents);
      calendarEvents.value = combinedEvents;

      if (integrationErrors.length > 0) {
        throw integrationErrors[0]?.error || new Error("Integration error occurred");
      }
    }
    catch (err) {
      consola.error("Failed to fetch calendar events from integrations:", err);
      error.value = `Failed to fetch calendar events from integrations: ${err}`;
      throw err;
    }
    finally {
      loading.value = false;
    }
  };

  watch(users, async (newUsers) => {
    if (newUsers.length > 0 && calendarEvents.value.length > 0) {
      consola.info("Users updated, re-processing calendar events...");
      await getCalendarEvents();
    }
  });

  onMounted(async () => {
    if (integrationsLoading.value) {
      await new Promise<void>((resolve) => {
        const unwatch = watch(integrationsLoading, (newLoading) => {
          if (!newLoading) {
            unwatch();
            resolve();
          }
        });
      });
    }
    try {
      await getCalendarEvents();
    }
    catch (err) {
      initialFetchError.value = err instanceof Error ? err : new Error(String(err));
    }
  });

  return {
    calendarEvents: readonly(calendarEvents),
    calendarIntegrations: readonly(calendarIntegrations),
    calendarServices: readonly(calendarServices),
    loading: readonly(loading),
    integrationsLoading: readonly(integrationsLoading),
    error: readonly(error),
    integrationsError: readonly(integrationsError),
    initialFetchError: readonly(initialFetchError),
    getCalendarEvents,
  };
}
