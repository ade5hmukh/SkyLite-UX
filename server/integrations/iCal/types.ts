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
  uid: string;
  summary: string;
  description?: string;
  start: Date;
  end?: Date;
  location?: string;
  attendees?: ICalAttendee[];
  allDay?: boolean;
  rrule?: string;
};

export type ICalAttendee = {
  name?: string;
  email: string;
  role?: string;
  status?: string;
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
  label?: string;
  rrule?: string;
};
