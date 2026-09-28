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

const HTML_ENTITIES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: "\"", apos: "'", nbsp: " " };

// Google Calendar exports descriptions as HTML; the app renders them as plain text
function htmlToText(value: string): string {
  if (!/<[a-z][^>]*>|&[#a-z0-9]+;/i.test(value)) {
    return value;
  }
  return value
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|li|h[1-6])>/gi, "\n")
    .replace(/<li[^>]*>/gi, "• ")
    .replace(/<a\s[^>]*href="([^"]*)"[^>]*>(.*?)<\/a>/gi, (_, href: string, text: string) => text && text !== href ? `${text} (${href})` : href)
    .replace(/<[^>]+>/g, "")
    .replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (entity, code: string) => {
      if (code[0] === "#") {
        const point = code[1]?.toLowerCase() === "x" ? Number.parseInt(code.slice(2), 16) : Number.parseInt(code.slice(1), 10);
        return Number.isFinite(point) ? String.fromCodePoint(point) : entity;
      }
      return HTML_ENTITIES[code.toLowerCase()] ?? entity;
    })
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

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

    // Changed occurrences of a series are separate VEVENTs sharing the series UID
    const overridesByUid = new Map<string, ical.Component[]>();
    for (const vevent of vevents) {
      if (vevent.hasProperty("recurrence-id")) {
        const uid = vevent.getFirstPropertyValue("uid") as string;
        overridesByUid.set(uid, [...(overridesByUid.get(uid) || []), vevent]);
      }
    }

    const expandedUids = new Set<string>();
    for (const vevent of vevents) {
      if (vevent.hasProperty("recurrence-id")) {
        continue;
      }

      if (vevent.getFirstPropertyValue("rrule")) {
        const uid = vevent.getFirstPropertyValue("uid") as string;
        events.push(...this.expandRecurringEvent(vevent, overridesByUid.get(uid) || [], startDate, endDate));
        expandedUids.add(uid);
      }
      else {
        events.push(this.parseICalEvent(vevent));
      }
    }

    for (const [uid, overrides] of overridesByUid) {
      if (expandedUids.has(uid)) {
        continue;
      }
      for (const override of overrides) {
        if (!this.isCancelled(override)) {
          const recurrenceId = override.getFirstPropertyValue("recurrence-id") as ical.Time;
          events.push({ ...this.parseICalEvent(override), uid: `${uid}-${recurrenceId.toICALString()}` });
        }
      }
    }

    return events;
  }

  private isCancelled(vevent: ical.Component): boolean {
    return String(vevent.getFirstPropertyValue("status") || "").toUpperCase() === "CANCELLED";
  }

  private parseRrule(vevent: ical.Component): ICalEvent["rrule"] {
    const rrule = vevent.getFirstPropertyValue("rrule") as ical.Recur | null;
    if (!rrule) {
      return undefined;
    }
    const byday = rrule.getComponent("byday") as string[];
    const bymonth = rrule.getComponent("bymonth") as number[];
    return {
      freq: rrule.freq,
      ...(rrule.interval && { interval: rrule.interval }),
      ...(byday?.length && { byday }),
      ...(bymonth?.length && { bymonth }),
      ...(typeof rrule.count === "number" && { count: rrule.count }),
      ...(rrule.until && { until: rrule.until.toString() }),
    };
  }

  private parseAttendees(vevent: ical.Component): ICalEvent["attendees"] {
    return vevent.getAllSubcomponents("attendee")?.map((attendee: ical.Component) => ({
      cn: attendee.getFirstPropertyValue("cn") as string || "",
      mailto: attendee.getFirstPropertyValue("email") as string || "",
      role: attendee.getFirstPropertyValue("role") as string || "REQ-PARTICIPANT",
    })) || undefined;
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
      description: htmlToText(vevent.getFirstPropertyValue("description") as string || ""),
      dtstart: startUTC,
      dtend: endUTC,
      location: vevent.getFirstPropertyValue("location") as string || undefined,
      attendees: this.parseAttendees(vevent),
      rrule: this.parseRrule(vevent),
    };
  }

  private expandRecurringEvent(vevent: ical.Component, overrides: ical.Component[], startDate: Date, endDate: Date): ICalEvent[] {
    const events: ICalEvent[] = [];

    try {
      if (!vevent.getFirstPropertyValue("dtstart")) {
        return [this.parseICalEvent(vevent)];
      }

      const series = new ical.Event(vevent);
      for (const override of overrides) {
        series.relateException(override);
      }

      const iterator = series.iterator();
      let count = 0;
      const maxInstances = 1000;

      while (count < maxInstances) {
        const occurrence = iterator.next();

        if (!occurrence) {
          break;
        }

        if (occurrence.toJSDate() > endDate) {
          break;
        }

        const details = series.getOccurrenceDetails(occurrence);
        if (details.startDate.toJSDate() >= startDate && !this.isCancelled(details.item.component)) {
          events.push(this.createRecurringEventInstance(vevent, details));
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

  private createRecurringEventInstance(
    series: ical.Component,
    details: { recurrenceId: ical.Time; item: ical.Event; startDate: ical.Time; endDate: ical.Time },
  ): ICalEvent {
    const occurrence = details.item.component;
    const newStart = details.startDate.toJSDate();
    const newEnd = details.endDate.toJSDate();

    let start: Date;
    let end: Date;

    if (details.startDate.isDate) {
      start = new Date(Date.UTC(newStart.getUTCFullYear(), newStart.getUTCMonth(), newStart.getUTCDate(), 0, 0, 0, 0));
      end = new Date(Date.UTC(newEnd.getUTCFullYear(), newEnd.getUTCMonth(), newEnd.getUTCDate(), 0, 0, 0, 0));
    }
    else {
      start = newStart;
      end = newEnd;
    }

    return {
      type: "VEVENT",
      uid: `${series.getFirstPropertyValue("uid")}-${details.recurrenceId.toICALString()}`,
      summary: occurrence.getFirstPropertyValue("summary") as string || "",
      description: htmlToText(occurrence.getFirstPropertyValue("description") as string || ""),
      dtstart: ical.Time.fromJSDate(start, true).toString(),
      dtend: ical.Time.fromJSDate(end, true).toString(),
      location: occurrence.getFirstPropertyValue("location") as string || undefined,
      attendees: this.parseAttendees(occurrence),
      rrule: this.parseRrule(series),
    };
  }
}
