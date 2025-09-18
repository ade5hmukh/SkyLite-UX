export type ICalEventServer = {
  uid: string;
  summary: string;
  start: Date;
  end?: Date;
};

export type ICalCalendarServer = {
  events: ICalEventServer[];
};

export type ICalEvent = {
  type: "VEVENT";
  uid: string;
  summary: string;
  description?: string;
  location?: string;
  dtstart: string;
  dtend: string;
  attendees?: ICalAttendee[];
  rrule?: {
    freq: string;
    interval?: number;
    byday?: string[];
    bymonth?: number[];
    count?: number;
    until?: string;
  };
};

export type ICalAttendee = {
  cn: string;
  mailto: string;
  role: string;
};

export type ICalCalendar = {
  prodId?: string;
  version?: string;
  events: ICalEvent[];
};

export type ICalEventResponse = {
  uid: string;
  summary: string;
  description?: string;
  start: string | Date;
  end: string | Date;
  location?: string;
  allDay?: boolean;
};
