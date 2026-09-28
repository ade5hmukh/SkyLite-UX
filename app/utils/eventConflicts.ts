import type { CalendarEvent } from "~/types/calendar";

export type EventConflict = {
  first: CalendarEvent;
  second: CalendarEvent;
  people: string[];
};

type TimedRange = { start: Date; end: Date };

function overlaps(a: TimedRange, b: TimedRange) {
  return new Date(a.start).getTime() < new Date(b.end).getTime()
    && new Date(b.start).getTime() < new Date(a.end).getTime();
}

function isSameEvent(a: CalendarEvent, b: CalendarEvent) {
  // The same event can arrive from two feeds (e.g. a school calendar and a parent's copy).
  return a.id === b.id
    || (a.title.trim().toLowerCase() === b.title.trim().toLowerCase()
      && new Date(a.start).getTime() === new Date(b.start).getTime());
}

export function sharedPeople(a: CalendarEvent, userIds: string[]): string[] {
  return (a.users ?? []).filter(user => userIds.includes(user.id)).map(user => user.name);
}

/** Timed events that overlap and involve at least one of the same people. */
export function findEventConflicts(events: readonly CalendarEvent[]): EventConflict[] {
  const timed = events
    .filter(event => !event.allDay && event.users?.length)
    .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());

  const conflicts: EventConflict[] = [];
  for (let i = 0; i < timed.length; i++) {
    const first = timed[i]!;
    for (let j = i + 1; j < timed.length; j++) {
      const second = timed[j]!;
      if (new Date(second.start).getTime() >= new Date(first.end).getTime())
        break;
      if (!overlaps(first, second) || isSameEvent(first, second))
        continue;
      const people = sharedPeople(second, (first.users ?? []).map(user => user.id));
      if (people.length)
        conflicts.push({ first, second, people });
    }
  }
  return conflicts;
}

/** Events that would clash with a proposed time for the given people. */
export function findConflictsFor(
  range: TimedRange,
  userIds: string[],
  events: readonly CalendarEvent[],
  ignoreEventId?: string,
): { event: CalendarEvent; people: string[] }[] {
  if (!userIds.length)
    return [];
  return events
    .filter(event => !event.allDay && event.id !== ignoreEventId && overlaps(range, event))
    .map(event => ({ event, people: sharedPeople(event, userIds) }))
    .filter(match => match.people.length > 0);
}
