import consola from "consola";

import type { CalendarEvent } from "~/types/calendar";
import type { CalendarIntegrationService, IntegrationStatus } from "~/types/integrations";

import { integrationRegistry } from "~/types/integrations";

import type { ICalEventResponse } from "../../../server/integrations/iCal/types";

import { ICalServerService } from "../../../server/integrations/iCal";

export class ICalService implements CalendarIntegrationService {
  private integrationId: string;
  private baseUrl: string;
  private eventColor?: string;
  private user?: string[];
  private useUserColors: boolean;

  private status: IntegrationStatus = {
    isConnected: false,
    lastChecked: new Date(),
  };

  private serverService: ICalServerService;

  constructor(
    integrationId: string,
    baseUrl: string,
    eventColor: string = "sky",
    user?: string[],
    useUserColors: boolean = false,
  ) {
    this.integrationId = integrationId;
    this.baseUrl = baseUrl;
    this.eventColor = eventColor;
    this.user = user;
    this.useUserColors = useUserColors;
    this.serverService = new ICalServerService(integrationId, baseUrl);

    // Update status with current date
    this.status.lastChecked = new Date();
  }

  async initialize(): Promise<void> {
    await this.validate();
  }

  async validate(): Promise<boolean> {
    try {
      await $fetch<{ events: ICalEventResponse[] }>("/api/integrations/iCal", { query: { baseUrl: this.baseUrl } });

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
      await $fetch<{ events: ICalEventResponse[] }>("/api/integrations/iCal", { query: { baseUrl: this.baseUrl } });

      this.status = {
        isConnected: true,
        lastChecked: new Date(),
      };

      return true;
    }
    catch (error) {
      consola.error("iCal connection test error:", error);
      this.status = {
        isConnected: false,
        lastChecked: new Date(),
        error: error instanceof Error ? error.message : "Unknown error",
      };
      return false;
    }
  }

  async getCapabilities(): Promise<string[]> {
    const config = integrationRegistry.get("calendar:ical");
    return config?.capabilities || [];
  }

  async getEvents(): Promise<CalendarEvent[]> {
    const result = await $fetch<{ events: ICalEventResponse[] }>("/api/integrations/iCal", { query: { baseUrl: this.baseUrl } });

    // Get users if useUserColors is enabled
    let users: any[] = [];
    if (this.useUserColors && this.user && this.user.length > 0) {
      try {
        const allUsers = await $fetch("/api/users");
        if (allUsers) {
          users = allUsers.filter((user: any) => this.user?.includes(user.id));
        }
      }
      catch (error) {
        consola.warn("Failed to fetch users for iCal integration:", error);
      }
    }

    return result.events.map((event) => {
      // The server now provides UTC dates for consistency
      // For all-day events: ensure UTC day boundaries
      // For timed events: use the UTC dates as provided
      const start = event.allDay
        ? (() => {
            const startDate = new Date(event.start);
            // Create UTC midnight date for the start day
            return new Date(Date.UTC(startDate.getUTCFullYear(), startDate.getUTCMonth(), startDate.getUTCDate(), 0, 0, 0, 0));
          })()
        : new Date(event.start);

      const end = event.allDay
        ? (() => {
            const endDate = new Date(event.end);
            // Create UTC end-of-day date for the end day
            // For all-day events, the end date is inclusive, so we set it to the end of the day
            return new Date(Date.UTC(endDate.getUTCFullYear(), endDate.getUTCMonth(), endDate.getUTCDate(), 23, 59, 59, 999));
          })()
        : new Date(event.end);

      // Determine color based on useUserColors setting
      let color: string | string[];
      if (this.useUserColors && users.length > 0) {
        // Use user profile colors
        const userColors = users.map((user: any) => user.color).filter(Boolean);
        if (userColors.length > 0) {
          color = userColors.length === 1 ? userColors[0] : userColors;
        }
        else {
          color = this.eventColor || "sky";
        }
      }
      else {
        // Use event color
        color = this.eventColor || "sky";
      }

      return {
        id: event.uid,
        title: event.summary,
        description: event.description || "",
        start,
        end,
        allDay: event.allDay || false,
        color,
        label: event.label,
        location: event.location,
        users: this.useUserColors ? users : undefined,
      };
    });
  }
}

export function createICalService(
  integrationId: string,
  baseUrl: string,
  eventColor: string = "sky",
  user?: string | string[],
  useUserColors: boolean = false,
): ICalService {
  return new ICalService(integrationId, baseUrl, eventColor, user as string[], useUserColors);
}
