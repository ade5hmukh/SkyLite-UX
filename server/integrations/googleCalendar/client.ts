import consola from "consola";

import type { GoogleCalendarEvent, GoogleCalendarListResponse } from "./types";

export class GoogleCalendarServerService {
  private static readonly API_BASE = "https://www.googleapis.com/calendar/v3";

  constructor(
    private integrationId: string,
    private apiKey: string,
    private calendarId: string,
  ) {}

  async fetchEvents(): Promise<GoogleCalendarEvent[]> {
    const now = new Date();
    const timeMin = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
    const timeMax = new Date(now.getFullYear() + 2, now.getMonth(), now.getDate());

    const url = new URL(`${GoogleCalendarServerService.API_BASE}/calendars/${encodeURIComponent(this.calendarId)}/events`);
    url.searchParams.set("key", this.apiKey);
    url.searchParams.set("timeMin", timeMin.toISOString());
    url.searchParams.set("timeMax", timeMax.toISOString());
    url.searchParams.set("singleEvents", "true");
    url.searchParams.set("orderBy", "startTime");
    url.searchParams.set("maxResults", "2500");

    consola.debug(`GoogleCalendarServerService: Fetching events from calendar ${this.calendarId}`);

    const response = await fetch(url.toString());

    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage = `Failed to fetch Google Calendar: ${response.status} ${response.statusText}`;
      
      try {
        const errorJson = JSON.parse(errorText);
        if (errorJson.error?.message) {
          errorMessage = errorJson.error.message;
        }
      }
      catch {
        // If we can't parse the error, use the default message
      }

      consola.error(`GoogleCalendarServerService: ${errorMessage}`);
      throw new Error(errorMessage);
    }

    const data: GoogleCalendarListResponse = await response.json();
    return data.items || [];
  }

  async testConnection(): Promise<boolean> {
    try {
      await this.fetchEvents();
      return true;
    }
    catch (error) {
      consola.error("GoogleCalendarServerService: Connection test failed:", error);
      return false;
    }
  }
}


