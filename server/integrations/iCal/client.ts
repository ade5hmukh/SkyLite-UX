import consola from "consola";
import ical from "ical.js";

import type { ICalEvent } from "./types";

// Each page render requests every feed (validate + getEvents), so feeds are served from
// memory and refreshed in the background once stale.
const FEED_FRESH_MS = 5 * 60 * 1000;
const FEED_EVICT_MS = 60 * 60 * 1000;

type FeedCacheEntry = {
  fetchedAt: number;
  lastUsed: number;
  events: Promise<ICalEvent[]>;
  refreshing: boolean;
};

const feedCache = new Map<string, FeedCacheEntry>();

export class ICalServerService {
  constructor(private integrationId: string, private url: string) {}

  private normalizeUrl(url: string): string {
    // Convert webcal:// to https:// and webcals:// to https://
    if (url.startsWith("webcal://")) {
      return url.replace("webcal://", "https://");
    }
    if (url.startsWith("webcals://")) {
      return url.replace("webcals://", "https://");
    }
    return url;
  }

  async fetchEventsFromUrl(url: string): Promise<ICalEvent[]> {
    const normalizedUrl = this.normalizeUrl(url);
    const now = Date.now();

    for (const [key, entry] of feedCache) {
      if (now - entry.lastUsed > FEED_EVICT_MS)
        feedCache.delete(key);
    }

    const cached = feedCache.get(normalizedUrl);
    if (cached) {
      cached.lastUsed = now;
      if (now - cached.fetchedAt > FEED_FRESH_MS && !cached.refreshing) {
        cached.refreshing = true;
        this.downloadEvents(normalizedUrl, url)
          .then((events) => {
            cached.events = Promise.resolve(events);
            cached.fetchedAt = Date.now();
          })
          .catch(error => consola.warn(`ICalServerService: Refresh failed, keeping cached events for integration ${this.integrationId}:`, error))
          .finally(() => {
            cached.refreshing = false;
          });
      }
      return cached.events;
    }

    const events = this.downloadEvents(normalizedUrl, url);
    feedCache.set(normalizedUrl, { fetchedAt: now, lastUsed: now, events, refreshing: false });
    events.catch(() => {
      if (feedCache.get(normalizedUrl)?.events === events)
        feedCache.delete(normalizedUrl);
    });
    return events;
  }

  private async downloadEvents(normalizedUrl: string, url: string): Promise<ICalEvent[]> {
    consola.debug(`ICalServerService: Fetching events from ${normalizedUrl} (original: ${url})`);

    const response = await fetch(normalizedUrl);

    if (!response.ok) {
      const errorMessage = `Failed to fetch calendar: ${response.status} ${response.statusText}`;
      consola.error(`ICalServerService: ${errorMessage}`);
      throw new Error(errorMessage);
    }

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
    // Falls back to DURATION, or one day for all-day events, when DTEND is missing
    const dtend = dtstart ? new ical.Event(vevent).endDate : null;

    const startUTC = dtstart
      ? dtstart.convertToZone(ical.TimezoneService.get("UTC")).toString()
      : new Date().toISOString().replace(".000", "");
    const endUTC = dtend
      ? dtend.convertToZone(ical.TimezoneService.get("UTC")).toString()
      : new Date().toISOString().replace(".000", "");

    return {
      type: "VEVENT",
      uid: vevent.getFirstPropertyValue("uid") as string || "",
      summary: vevent.getFirstPropertyValue("summary") as string || "",
      description: vevent.getFirstPropertyValue("description") as string || "",
      dtstart: startUTC,
      dtend: endUTC,
      location: vevent.getFirstPropertyValue("location") as string || undefined,
      attendees: vevent.getAllSubcomponents("attendee")?.map((attendee: ical.Component) => ({
        cn: attendee.getFirstPropertyValue("cn") as string || "",
        mailto: attendee.getFirstPropertyValue("email") as string || "",
        role: attendee.getFirstPropertyValue("role") as string || "REQ-PARTICIPANT",
      })) || undefined,
      rrule: vevent.getFirstPropertyValue("rrule")
        ? {
            freq: (vevent.getFirstPropertyValue("rrule") as ical.Recur).freq,
            ...(vevent.getFirstPropertyValue("rrule") as ical.Recur).interval && {
              interval: (vevent.getFirstPropertyValue("rrule") as ical.Recur).interval,
            },
            ...((vevent.getFirstPropertyValue("rrule") as ical.Recur).getComponent("byday")?.length && {
              byday: (vevent.getFirstPropertyValue("rrule") as ical.Recur).getComponent("byday") as string[],
            }),
            ...((vevent.getFirstPropertyValue("rrule") as ical.Recur).getComponent("bymonth")?.length && {
              bymonth: (vevent.getFirstPropertyValue("rrule") as ical.Recur).getComponent("bymonth") as number[],
            }),
            ...(typeof (vevent.getFirstPropertyValue("rrule") as ical.Recur).count === "number" && {
              count: (vevent.getFirstPropertyValue("rrule") as ical.Recur).count as number,
            }),
            ...(vevent.getFirstPropertyValue("rrule") as ical.Recur).until && {
              until: (vevent.getFirstPropertyValue("rrule") as ical.Recur).until?.toString(),
            },
          }
        : undefined,
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

      if (!dtstart) {
        return null;
      }

      const originalStart = dtstart.toJSDate();
      const originalEnd = new ical.Event(vevent).endDate.toJSDate();
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

      // Convert to UTC and format as iCal string
      const startUTC = ical.Time.fromJSDate(start, true).toString();
      const endUTC = ical.Time.fromJSDate(end, true).toString();

      const eventInstance: ICalEvent = {
        type: "VEVENT",
        uid: `${vevent.getFirstPropertyValue("uid")}-${occurrenceTime.toICALString()}`,
        summary: vevent.getFirstPropertyValue("summary") as string || "",
        description: vevent.getFirstPropertyValue("description") as string || "",
        dtstart: startUTC,
        dtend: endUTC,
        location: vevent.getFirstPropertyValue("location") as string || undefined,
        attendees: vevent.getAllSubcomponents("attendee")?.map((attendee: ical.Component) => ({
          cn: attendee.getFirstPropertyValue("cn") as string || "",
          mailto: attendee.getFirstPropertyValue("email") as string || "",
          role: attendee.getFirstPropertyValue("role") as string || "REQ-PARTICIPANT",
        })) || undefined,
        rrule: vevent.getFirstPropertyValue("rrule")
          ? {
              freq: (vevent.getFirstPropertyValue("rrule") as ical.Recur).freq,
              ...(vevent.getFirstPropertyValue("rrule") as ical.Recur).interval && {
                interval: (vevent.getFirstPropertyValue("rrule") as ical.Recur).interval,
              },
              ...((vevent.getFirstPropertyValue("rrule") as ical.Recur).getComponent("byday")?.length && {
                byday: (vevent.getFirstPropertyValue("rrule") as ical.Recur).getComponent("byday") as string[],
              }),
              ...((vevent.getFirstPropertyValue("rrule") as ical.Recur).getComponent("bymonth")?.length && {
                bymonth: (vevent.getFirstPropertyValue("rrule") as ical.Recur).getComponent("bymonth") as number[],
              }),
              ...(typeof (vevent.getFirstPropertyValue("rrule") as ical.Recur).count === "number" && {
                count: (vevent.getFirstPropertyValue("rrule") as ical.Recur).count as number,
              }),
              ...(vevent.getFirstPropertyValue("rrule") as ical.Recur).until && {
                until: (vevent.getFirstPropertyValue("rrule") as ical.Recur).until?.toString(),
              },
            }
          : undefined,
      };
      return eventInstance;
    }
    catch (error) {
      consola.warn("ICalServerService: Failed to create recurring event instance:", error);
      return null;
    }
  }
}
