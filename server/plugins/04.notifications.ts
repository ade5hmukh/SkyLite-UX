import { consola } from "consola";
import { addDays } from "date-fns";

type NotificationSettings = {
  eventLeadMinutes: number;
  morningTime: string;
  eveningTime: string;
};

function getSettings(): NotificationSettings {
  const config = (useRuntimeConfig().ntfy ?? {}) as Partial<Record<keyof NotificationSettings, unknown>>;
  const lead = Number(config.eventLeadMinutes);
  const time = (value: unknown, fallback: string) => (typeof value === "string" && /^\d{2}:\d{2}$/.test(value) ? value : fallback);
  return {
    eventLeadMinutes: Number.isFinite(lead) && lead > 0 ? lead : 30,
    morningTime: time(config.morningTime, "07:00"),
    eveningTime: time(config.eveningTime, "19:30"),
  };
}

const sentReminders = new Map<string, number>();

async function sendEventReminders(now: Date, leadMinutes: number) {
  const windowStart = new Date(now.getTime() + (leadMinutes - 1) * 60_000);
  const windowEnd = new Date(now.getTime() + leadMinutes * 60_000);
  const events = await getAgendaEvents(windowStart, new Date(windowEnd.getTime() + 60_000));

  for (const event of events) {
    const startTime = event.start.getTime();
    if (event.allDay || startTime <= windowStart.getTime() || startTime > windowEnd.getTime())
      continue;
    const key = `${event.title}|${startTime}`;
    if (sentReminders.has(key))
      continue;
    sentReminders.set(key, startTime);

    const who = event.people.length ? ` for ${event.people.join(", ")}` : "";
    const where = event.location ? `\n${event.location}` : "";
    await sendNtfy({
      title: `In ${leadMinutes} min: ${event.title}`,
      message: `Starts at ${formatAppTime(event.start)}${who}.${where}`,
      tags: ["calendar"],
    });
  }

  for (const [key, startTime] of sentReminders) {
    if (startTime < now.getTime() - 24 * 60 * 60_000)
      sentReminders.delete(key);
  }
}

async function sendSummary(dayKey: string, heading: string) {
  const summary = await buildDaySummary(dayKey);
  if (!summary)
    return;
  await sendNtfy({ title: `${heading}: ${summary.title}`, message: summary.message, tags: ["spiral_calendar"] });
}

async function tick() {
  const now = new Date();
  const settings = getSettings();
  const timeOfDay = getAppTimeOfDay(now);

  try {
    await sendEventReminders(now, settings.eventLeadMinutes);
    if (timeOfDay === settings.morningTime) {
      await sendSummary(getAppDayKey(now), "Today");
    }
    if (timeOfDay === settings.eveningTime) {
      await sendSummary(getAppDayKey(addDays(now, 1)), "Tomorrow");
    }
  }
  catch (error) {
    consola.warn("Notifications: Reminder check failed:", error);
  }
}

export default defineNitroPlugin(() => {
  if (!isNtfyConfigured()) {
    consola.info("Notifications: ntfy is not configured, reminders are off");
    return;
  }

  const settings = getSettings();
  consola.info(`Notifications: ntfy reminders on (${settings.eventLeadMinutes} min before events, summaries at ${settings.morningTime} and ${settings.eveningTime})`);

  // Align ticks to the start of each minute so summary times match exactly.
  const msToNextMinute = 60_000 - (Date.now() % 60_000) + 500;
  setTimeout(() => {
    tick();
    setInterval(tick, 60_000);
  }, msToNextMinute);
});
