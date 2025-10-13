export type GoogleCalendarEvent = {
  id: string;
  summary: string;
  description?: string;
  start: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };
  end: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };
  location?: string;
  status?: string;
  recurrence?: string[];
  recurringEventId?: string;
  originalStartTime?: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };
  attendees?: Array<{
    email: string;
    displayName?: string;
    responseStatus?: string;
  }>;
  organizer?: {
    email: string;
    displayName?: string;
  };
};

export type GoogleCalendarListResponse = {
  kind: string;
  etag: string;
  summary?: string;
  items: GoogleCalendarEvent[];
  nextPageToken?: string;
  nextSyncToken?: string;
};

export type GoogleCalendarSettings = {
  eventColor?: string;
  user?: string[];
  useUserColors?: boolean;
  calendarId: string;
};


