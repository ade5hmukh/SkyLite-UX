import { addDays, format, parseISO, startOfWeek } from "date-fns";

import type { SchoolMenuDay, SchoolMenuMeal } from "../schoolMenu/client";

const KINDERCARE_BASE = "https://classroom.kindercare.com";
const WEEK_CACHE_MS = 3 * 60 * 60 * 1000;
const REQUEST_TIMEOUT_MS = 20_000;

export class KinderCareLoginError extends Error {
  constructor() {
    super("KinderCare login expired. Paste a fresh _himama_session cookie into NUXT_KINDERCARE_SESSION.");
  }
}

const cache = new Map<string, { expires: number; value: Promise<SchoolMenuDay[]> }>();

function getSession() {
  const session = useRuntimeConfig().kindercare?.session?.trim() ?? "";
  if (!session)
    throw new Error("KinderCare isn't set up on the server. Set NUXT_KINDERCARE_SESSION.");
  return session.replace(/^_himama_session=/, "");
}

export function isKinderCareConfigured() {
  return !!useRuntimeConfig().kindercare?.session?.trim();
}

/** Daycare meals between two YYYY-MM-DD dates (inclusive), one calendar week page at a time. */
export async function getKinderCareMenuDays(fromDay: string, toDay: string): Promise<SchoolMenuDay[]> {
  const session = getSession();
  const days: SchoolMenuDay[] = [];
  let weekStart = startOfWeek(parseISO(fromDay), { weekStartsOn: 1 });
  while (format(weekStart, "yyyy-MM-dd") <= toDay) {
    days.push(...await getWeek(session, format(weekStart, "yyyy-MM-dd")));
    weekStart = addDays(weekStart, 7);
  }
  return days.filter(day => day.date >= fromDay && day.date <= toDay);
}

function getWeek(session: string, weekStart: string): Promise<SchoolMenuDay[]> {
  const now = Date.now();
  const hit = cache.get(weekStart);
  if (hit && hit.expires > now)
    return hit.value;

  const value = (async () => {
    const response = await fetch(`${KINDERCARE_BASE}/calendars/weekly?date=${weekStart}`, {
      headers: { Cookie: `_himama_session=${session}`, Accept: "text/html" },
      redirect: "manual",
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    if (response.status >= 300 && response.status < 400)
      throw new KinderCareLoginError();
    if (!response.ok)
      throw new Error(`KinderCare returned ${response.status}`);
    const html = await response.text();
    if (/<input[^>]+name="password"/i.test(html))
      throw new KinderCareLoginError();
    return parseWeek(html, weekStart);
  })();

  cache.set(weekStart, { expires: now + WEEK_CACHE_MS, value });
  value.catch(() => cache.delete(weekStart));
  return value;
}

/**
 * Days on the page run Monday to Sunday from weekStart, each with id="day_<day of month>".
 * The site's HTML optimizer drops attribute quotes where it can, so quotes are optional throughout.
 */
function parseWeek(html: string, weekStart: string): SchoolMenuDay[] {
  const start = parseISO(weekStart);
  const dayStarts = [...html.matchAll(/\bid="?day_(\d+)\b/g)];
  const days: SchoolMenuDay[] = [];

  dayStarts.forEach((match, index) => {
    const date = addDays(start, index);
    if (Number(match[1]) !== date.getDate())
      return;
    const section = html.slice(match.index, dayStarts[index + 1]?.index ?? html.length);
    const meals = parseMeals(section);
    if (meals.length)
      days.push({ date: format(date, "yyyy-MM-dd"), meals });
  });

  return days;
}

function parseMeals(section: string): SchoolMenuMeal[] {
  const meals: SchoolMenuMeal[] = [];
  const blocks = section.split(/<div class="?weekday-block\s/).slice(1).filter(block => block.startsWith("meal-item"));
  for (const block of blocks) {
    for (const item of block.split(/weekday-block__item__header/).slice(1)) {
      const header = item.match(/^[^>]*>([^<]*)</)?.[1];
      const content = item.match(/data-content=(?:"([^"]*)"|([^\s>]+))/);
      const lines = decodeEntities(content?.[1] ?? content?.[2] ?? "")
        .split(/\r?\n/)
        .map(line => line.replace(/\s+/g, " ").trim())
        .filter(Boolean);
      const [dish, ...rest] = lines;
      if (!dish)
        continue;
      // Entries read "Dish / (vegetarian swap) / component / component…".
      const isAlternative = (line: string) => /^\(.*\)$/.test(line);
      meals.push({
        name: decodeEntities(header ?? "").trim() || "Meal",
        items: [
          { name: dish, alternative: false },
          ...rest.filter(isAlternative).map(line => ({ name: line.slice(1, -1).trim(), alternative: true })),
        ],
        details: rest.filter(line => !isAlternative(line)),
      });
    }
  }
  return meals;
}

function decodeEntities(value: string) {
  return value
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCharCode(Number.parseInt(code, 16)))
    .replace(/&quot;/g, "\"")
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&");
}
