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
    return result.events.map((event) => {
      const start = event.allDay
        ? (() => {
            const utcDate = new Date(event.start || new Date());
            return new Date(utcDate.getUTCFullYear(), utcDate.getUTCMonth(), utcDate.getUTCDate());
          })()
        : (event.start ? new Date(event.start) : new Date());
      const end = event.allDay
        ? (() => {
            const utcDate = new Date(event.end);
            const endDate = new Date(utcDate.getUTCFullYear(), utcDate.getUTCMonth(), utcDate.getUTCDate());
            return new Date(endDate.getTime() - 24 * 60 * 60 * 1000);
          })()
        : new Date(event.end);

      return {
        id: event.uid,
        title: event.summary,
        description: event.description || "",
        start,
        end,
        allDay: event.allDay || false,
        color: this.eventColor || "sky",
        label: event.label,
        location: event.location,
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
