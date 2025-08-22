import ical from "ical.js";

import type { ICalEvent } from "./types";

export class ICalServerService {
  constructor(private integrationId: string, private url: string) {}

  async fetchEventsFromUrl(url: string): Promise<ICalEvent[]> {
    const response = await fetch(url);
    const icalData = await response.text();
    const jcalData = ical.parse(icalData);
    const vcalendar = new ical.Component(jcalData);
    const vevents = vcalendar.getAllSubcomponents("vevent");
    return vevents.map(vevent => this.parseICalEvent(vevent));
  }

  private parseICalEvent(vevent: ical.Component): ICalEvent {
    const dtstart = vevent.getFirstPropertyValue("dtstart") as ical.Time;
    const dtend = vevent.getFirstPropertyValue("dtend") as ical.Time;

    let start: Date;
    let end: Date;

    if (dtstart && dtend) {
      const startTime = dtstart.convertToZone(ical.TimezoneService.get("UTC"));
      const endTime = dtend.convertToZone(ical.TimezoneService.get("UTC"));

      start = startTime.toJSDate();
      end = endTime.toJSDate();
    }
    else {
      start = new Date();
      end = new Date();
    }

    return {
      uid: vevent.getFirstPropertyValue("uid") as string || "",
      summary: vevent.getFirstPropertyValue("summary") as string || "",
      description: vevent.getFirstPropertyValue("description") as string || "",
      start,
      end,
      location: vevent.getFirstPropertyValue("location") as string || "",
      allDay: dtstart?.isDate || false,
      attendees: vevent.getAllSubcomponents("attendee")?.map((attendee: ical.Component) => ({
        name: attendee.getFirstPropertyValue("cn") as string || "",
        email: attendee.getFirstPropertyValue("email") as string || "",
        role: attendee.getFirstPropertyValue("role") as string || "",
        status: attendee.getFirstPropertyValue("partstat") as string || "",
      })) || [],
    };
  }
}
