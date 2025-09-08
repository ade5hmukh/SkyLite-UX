import consola from "consola";
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

    const events: ICalEvent[] = [];

    const now = new Date();
    const startDate = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
    const endDate = new Date(now.getFullYear() + 2, now.getMonth(), now.getDate());

    for (const vevent of vevents) {
      const rrule = vevent.getFirstPropertyValue("rrule");

      if (rrule) {
        const expandedEvents = this.expandRecurringEvent(vevent, startDate, endDate);
        events.push(...expandedEvents);
      }
      else {
        events.push(this.parseICalEvent(vevent));
      }
    }

    return events;
  }

  private parseICalEvent(vevent: ical.Component): ICalEvent {
    const dtstart = vevent.getFirstPropertyValue("dtstart") as ical.Time;
    const dtend = vevent.getFirstPropertyValue("dtend") as ical.Time;

    let start: Date;
    let end: Date;

    if (dtstart && dtend) {
      const isAllDay = dtstart.isDate;

      if (isAllDay) {
        start = new Date(dtstart.year, dtstart.month - 1, dtstart.day, 0, 0, 0);
        end = new Date(dtend.year, dtend.month - 1, dtend.day, 0, 0, 0);
      }
      else {
        const startTime = dtstart.convertToZone(ical.TimezoneService.get("UTC"));
        const endTime = dtend.convertToZone(ical.TimezoneService.get("UTC"));

        start = new Date(startTime.year, startTime.month - 1, startTime.day, startTime.hour, startTime.minute, startTime.second);
        end = new Date(endTime.year, endTime.month - 1, endTime.day, endTime.hour, endTime.minute, endTime.second);
      }
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
      rrule: vevent.getFirstPropertyValue("rrule") as string || undefined,
      attendees: vevent.getAllSubcomponents("attendee")?.map((attendee: ical.Component) => ({
        name: attendee.getFirstPropertyValue("cn") as string || "",
        email: attendee.getFirstPropertyValue("email") as string || "",
        role: attendee.getFirstPropertyValue("role") as string || "",
        status: attendee.getFirstPropertyValue("partstat") as string || "",
      })) || [],
    };
  }

  private expandRecurringEvent(vevent: ical.Component, startDate: Date, endDate: Date): ICalEvent[] {
    const events: ICalEvent[] = [];

    try {
      const recurrence = vevent.getFirstPropertyValue("rrule");
      const dtstart = vevent.getFirstPropertyValue("dtstart") as ical.Time;

      if (!recurrence || !dtstart) {
        return [this.parseICalEvent(vevent)];
      }

      const expansion = new ical.RecurExpansion({
        component: vevent,
        dtstart,
      });

      let count = 0;
      const maxInstances = 1000;

      while (count < maxInstances) {
        const currentTime = expansion.next();

        if (!currentTime) {
          break;
        }

        const currentDate = currentTime.toJSDate();

        if (currentDate > endDate) {
          break;
        }

        if (currentDate >= startDate) {
          const eventInstance = this.createRecurringEventInstance(vevent, currentTime);
          if (eventInstance) {
            events.push(eventInstance);
          }
        }
        count++;
      }
    }
    catch (error) {
      consola.warn("ICalServerService: Failed to expand recurring event:", error);
      return [this.parseICalEvent(vevent)];
    }

    return events;
  }

  private createRecurringEventInstance(vevent: ical.Component, occurrenceTime: ical.Time): ICalEvent | null {
    try {
      const dtstart = vevent.getFirstPropertyValue("dtstart") as ical.Time;
      const dtend = vevent.getFirstPropertyValue("dtend") as ical.Time;

      if (!dtstart) {
        return null;
      }

      const originalStart = dtstart.toJSDate();
      const originalEnd = dtend ? dtend.toJSDate() : originalStart;
      const duration = originalEnd.getTime() - originalStart.getTime();

      const newStart = occurrenceTime.toJSDate();
      const newEnd = new Date(newStart.getTime() + duration);

      const isAllDay = dtstart.isDate;

      let start: Date;
      let end: Date;

      if (isAllDay) {
        start = new Date(Date.UTC(newStart.getUTCFullYear(), newStart.getUTCMonth(), newStart.getUTCDate(), 0, 0, 0, 0));
        end = new Date(Date.UTC(newEnd.getUTCFullYear(), newEnd.getUTCMonth(), newEnd.getUTCDate(), 0, 0, 0, 0));
      }
      else {
        start = newStart;
        end = newEnd;
      }

      const eventInstance = {
        uid: `${vevent.getFirstPropertyValue("uid")}-${occurrenceTime.toICALString()}`,
        summary: vevent.getFirstPropertyValue("summary") as string || "",
        description: vevent.getFirstPropertyValue("description") as string || "",
        start,
        end,
        location: vevent.getFirstPropertyValue("location") as string || "",
        allDay: isAllDay,
        rrule: vevent.getFirstPropertyValue("rrule") as string || undefined,
        attendees: vevent.getAllSubcomponents("attendee")?.map((attendee: ical.Component) => ({
          name: attendee.getFirstPropertyValue("cn") as string || "",
          email: attendee.getFirstPropertyValue("email") as string || "",
          role: attendee.getFirstPropertyValue("role") as string || "",
          status: attendee.getFirstPropertyValue("partstat") as string || "",
        })) || [],
      };
      return eventInstance;
    }
    catch (error) {
      consola.warn("ICalServerService: Failed to create recurring event instance:", error);
      return null;
    }
  }
}
