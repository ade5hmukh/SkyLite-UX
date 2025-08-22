import { consola } from "consola";
import ical from "ical.js";

import type { CalendarEvent } from "~/types/calendar";
import type { Integration, ShoppingListWithItemsAndCount, TodoColumn, TodoWithUser, User } from "~/types/database";
import type { CalendarIntegrationService, IntegrationService } from "~/types/integrations";

import { integrationConfigs } from "~/integrations/integrationConfig";
import { setBrowserTimezone, setTimezoneRegistered } from "~/types/global";
import { createIntegrationService, registerIntegration } from "~/types/integrations";

type ShoppingIntegrationService = IntegrationService & {
  getShoppingLists: () => Promise<ShoppingListWithItemsAndCount[]>;
};

type TodoIntegrationService = IntegrationService & {
  getTodos: () => Promise<TodoWithUser[]>;
};

export default defineNuxtPlugin(async () => {
  consola.start("AppInit plugin: Initializing application...");

  if (import.meta.client) {
    consola.info("AppInit plugin: Initializing timezone registration...");

    try {
      const browserTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      consola.info("AppInit plugin: Detected browser timezone:", browserTimezone);

      const apiUrl = `https://tz.add-to-calendar-technology.com/api/${encodeURIComponent(browserTimezone)}.ics`;
      const { data: vtimezoneBlock, error } = await useFetch(apiUrl, {
        key: `timezone-${browserTimezone}`,
        server: false,
        default: () => null,
      });

      if (error.value) {
        throw new Error(`Failed to fetch timezone data: ${error.value.statusCode || "Unknown error"}`);
      }

      if (!vtimezoneBlock.value) {
        throw new Error("No timezone data received");
      }

      const timezoneComponent = new ical.Component(vtimezoneBlock.value as string);
      const timezone = new ical.Timezone({
        tzid: browserTimezone,
        component: timezoneComponent,
      });

      ical.TimezoneService.register(timezone);
      consola.success("AppInit plugin: Successfully registered timezone:", browserTimezone);

      setTimezoneRegistered(true);
      setBrowserTimezone(browserTimezone);
    }
    catch (error) {
      consola.warn("AppInit plugin: Failed to register timezone, calendar will use fallback:", error);
      setTimezoneRegistered(false);
    }
  }

  consola.info("AppInit plugin: Initializing integration registry...");
  integrationConfigs.forEach((config) => {
    registerIntegration(config);
  });
  consola.success(`AppInit plugin: Registered ${integrationConfigs.length} integrations`);

  consola.start("AppInit plugin: Pre-loading essential data...");

  try {
    consola.info("AppInit plugin: Loading core dependencies...");
    const [_usersResult, _currentUserResult, integrationsResult] = await Promise.all([
      useAsyncData("users", () => $fetch<User[]>("/api/users"), {
        server: true,
        lazy: false,
      }),

      useAsyncData("current-user", () => Promise.resolve(null), {
        server: false,
        lazy: false,
      }),

      useAsyncData("integrations", () => $fetch<Integration[]>("/api/integrations"), {
        server: true,
        lazy: false,
      }),
    ]);

    consola.success("AppInit plugin: Core dependencies loaded successfully");

    consola.info("AppInit plugin: Loading local data...");
    const [_localCalendarResult, _localTodosResult, _localShoppingResult, _todoColumnsResult] = await Promise.all([
      useAsyncData("calendar-events", () => $fetch<CalendarEvent[]>("/api/calendar-events"), {
        server: true,
        lazy: false,
      }),

      useAsyncData("todos", () => $fetch<TodoWithUser[]>("/api/todos"), {
        server: true,
        lazy: false,
      }),

      useAsyncData("native-shopping-lists", () => $fetch<ShoppingListWithItemsAndCount[]>("/api/shopping-lists"), {
        server: true,
        lazy: false,
      }),

      useAsyncData("todo-columns", () => $fetch<TodoColumn[]>("/api/todo-columns"), {
        server: true,
        lazy: false,
      }),
    ]);

    consola.success("AppInit plugin: Local data loaded successfully");

    consola.info("AppInit plugin: Loading integration data concurrently...");
    const integrationDataPromises: ReturnType<typeof useAsyncData>[] = [];

    if (integrationsResult.data.value) {
      const enabledIntegrations = integrationsResult.data.value.filter(integration => integration.enabled);
      consola.info(`AppInit plugin: Found ${enabledIntegrations.length} enabled integrations`);

      for (const integration of enabledIntegrations) {
        consola.info(`AppInit plugin: Processing integration: ${integration.name} (${integration.type})`);

        try {
          if (integration.type === "calendar") {
            integrationDataPromises.push(
              useAsyncData(`calendar-events-${integration.id}`, async () => {
                try {
                  const service = await createIntegrationService(integration);
                  if (!service) {
                    consola.warn(`AppInit plugin: Failed to create service for ${integration.name}`);
                    return [];
                  }

                  await service.initialize();
                  const events = await (service as CalendarIntegrationService).getEvents();
                  return events || [];
                }
                catch (err) {
                  consola.error(`AppInit plugin: Error fetching calendar events for ${integration.name}:`, err);
                  return [];
                }
              }, {
                server: true,
                lazy: false,
              }),
            );
          }
          else if (integration.type === "shopping") {
            integrationDataPromises.push(
              useAsyncData(`shopping-lists-${integration.id}`, async () => {
                try {
                  const service = await createIntegrationService(integration);
                  if (!service) {
                    consola.warn(`AppInit plugin: Failed to create service for ${integration.name}`);
                    return [];
                  }

                  await service.initialize();
                  const lists = await (service as ShoppingIntegrationService).getShoppingLists();
                  return lists || [];
                }
                catch (err) {
                  consola.error(`AppInit plugin: Error fetching shopping lists for ${integration.name}:`, err);
                  return [];
                }
              }, {
                server: true,
                lazy: false,
              }),
            );
          }
          else if (integration.type === "todo") {
            integrationDataPromises.push(
              useAsyncData(`todos-${integration.id}`, async () => {
                try {
                  const service = await createIntegrationService(integration);
                  if (!service) {
                    consola.warn(`AppInit plugin: Failed to create service for ${integration.name}`);
                    return [];
                  }

                  await service.initialize();
                  const todos = await (service as TodoIntegrationService).getTodos();
                  return todos || [];
                }
                catch (err) {
                  consola.error(`AppInit plugin: Error fetching todos for ${integration.name}:`, err);
                  return [];
                }
              }, {
                server: true,
                lazy: false,
              }),
            );
          }
        }
        catch (err) {
          consola.error(`AppInit plugin: Error processing integration ${integration.name}:`, err);
        }
      }
    }

    if (integrationDataPromises.length > 0) {
      consola.info(`AppInit plugin: Loading data for ${integrationDataPromises.length} integrations...`);

      try {
        await Promise.all(integrationDataPromises);
        consola.success("AppInit plugin: Integration data loaded successfully");
      }
      catch (integrationError) {
        consola.error("AppInit plugin: Error loading integration data:", integrationError);
      }
    }

    consola.success("AppInit plugin: All data pre-loaded successfully");
  }
  catch (error) {
    consola.error("AppInit plugin: Error pre-loading data:", error);
  }
});
