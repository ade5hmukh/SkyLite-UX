import consola from "consola";

import type { CalendarEvent } from "~/types/calendar";
import type { CalendarIntegrationService, IntegrationStatus, UserWithColor } from "~/types/integrations";

import { integrationRegistry } from "~/types/integrations";

import type { GoogleCalendarEvent } from "../../../server/integrations/googleCalendar/types";

export class GoogleCalendarService implements CalendarIntegrationService {
  private integrationId: string;
  private apiKey: string;
  private calendarId: string;
  private eventColor?: string;
  private user?: string[];
  private useUserColors: boolean;

  private status: IntegrationStatus = {
    isConnected: false,
    lastChecked: new Date(),
  };

  constructor(
    integrationId: string,
    apiKey: string,
    calendarId: string,
    eventColor: string = "sky",
    user?: string[],
    useUserColors: boolean = false,
  ) {
    this.integrationId = integrationId;
    this.apiKey = apiKey;
    this.calendarId = calendarId;
    this.eventColor = eventColor;
    this.user = user;
    this.useUserColors = useUserColors;

    this.status.lastChecked = new Date();
  }

  async initialize(): Promise<void> {
    await this.validate();
  }

  async validate(): Promise<boolean> {
    try {
      const query: Record<string, string> = { integrationId: this.integrationId };
      if (this.integrationId === "temp" || this.integrationId.startsWith("temp-")) {
        query.apiKey = this.apiKey;
        query.calendarId = this.calendarId;
      }
      await $fetch<{ events: GoogleCalendarEvent[] }>("/api/integrations/google-calendar", { query });

      this.status = {
        isConnected: true,
        lastChecked: new Date(),
      };

      return true;
    }
    catch (error) {
      this.status = {
        isConnected: false,
        lastChecked: new Date(),
        error: error instanceof Error ? error.message : "Unknown error",
      };
      return false;
    }
  }

  async getStatus(): Promise<IntegrationStatus> {
    return this.status;
  }

  async testConnection(): Promise<boolean> {
    try {
      const query: Record<string, string> = { integrationId: this.integrationId };
      if (this.integrationId === "temp" || this.integrationId.startsWith("temp-")) {
        query.apiKey = this.apiKey;
        query.calendarId = this.calendarId;
      }
      await $fetch<{ events: GoogleCalendarEvent[] }>("/api/integrations/google-calendar", { query });

      this.status = {
        isConnected: true,
        lastChecked: new Date(),
      };

      return true;
    }
    catch (error) {
      consola.error("GoogleCalendar: Connection test error:", error);
      this.status = {
        isConnected: false,
        lastChecked: new Date(),
        error: error instanceof Error ? error.message : "Unknown error",
      };
      return false;
    }
  }

  async getCapabilities(): Promise<string[]> {
    const config = integrationRegistry.get("calendar:Google Calendar");
    return config?.capabilities || [];
  }

  async getEvents(): Promise<CalendarEvent[]> {
    const query: Record<string, string> = { integrationId: this.integrationId };
    if (this.integrationId === "temp" || this.integrationId.startsWith("temp-")) {
      query.apiKey = this.apiKey;
      query.calendarId = this.calendarId;
    }
    const result = await $fetch<{ events: GoogleCalendarEvent[] }>("/api/integrations/google-calendar", { query });

    let users: UserWithColor[] = [];
    if (this.useUserColors && this.user && this.user.length > 0) {
      try {
        const allUsers = await $fetch<{ id: string; name: string; color: string | null }[]>("/api/users");
        if (allUsers) {
          users = allUsers.filter((user: UserWithColor) => this.user?.includes(user.id));
        }
      }
      catch (error) {
        consola.warn("GoogleCalendar: Failed to fetch users for Google Calendar integration:", error);
      }
    }

    return result.events.map((event) => {
      // Google Calendar uses either dateTime (for timed events) or date (for all-day events)
      const startStr = event.start.dateTime || event.start.date;
      const endStr = event.end.dateTime || event.end.date;

      if (!startStr || !endStr) {
        consola.warn("GoogleCalendar: Event missing start or end time:", event.id);
        return null;
      }

      const start = new Date(startStr);
      const end = new Date(endStr);
      const isAllDay = !event.start.dateTime; // If no dateTime, it's an all-day event

      let color: string | string[] | undefined = this.eventColor || "sky";
      if (this.useUserColors && users.length > 0) {
        const userColors = users.map((user: UserWithColor) => user.color).filter((color): color is string => color !== null);
        if (userColors.length > 0) {
          color = userColors.length === 1 ? userColors[0] : userColors;
        }
        else {
          color = this.eventColor || "sky";
        }
      }
      else {
        color = this.eventColor || "sky";
      }

      return {
        id: event.id,
        title: event.summary || "(No title)",
        description: event.description || "",
        start,
        end,
        allDay: isAllDay,
        color,
        location: event.location,
        integrationId: this.integrationId,
        users: this.useUserColors ? users : undefined,
      };
    }).filter((event): event is CalendarEvent => event !== null);
  }
}

export function createGoogleCalendarService(
  integrationId: string,
  apiKey: string,
  calendarId: string,
  eventColor: string = "sky",
  user?: string | string[],
  useUserColors: boolean = false,
): GoogleCalendarService {
  return new GoogleCalendarService(integrationId, apiKey, calendarId, eventColor, user as string[], useUserColors);
}


