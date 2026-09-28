import { PrismaClient } from "@prisma/client";
import { consola } from "consola";
import { createError, defineEventHandler, readBody } from "h3";

const prisma = new PrismaClient();

const MAX_TEXT_LENGTH = 60_000;
const MAX_FILE_BYTES = 12 * 1024 * 1024;
const ALLOWED_FILE_TYPES = new Set(["image/png", "image/jpeg", "image/webp", "image/heic", "image/heif", "application/pdf"]);

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const TIME_PATTERN = /^(?:[01]\d|2[0-3]):[0-5]\d$/;

export type SuggestedEvent = {
  title: string;
  date: string;
  endDate: string | null;
  startTime: string | null;
  endTime: string | null;
  allDay: boolean;
  location: string | null;
  notes: string | null;
  userIds: string[];
};

const RESPONSE_SCHEMA = {
  type: "OBJECT",
  properties: {
    events: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          title: { type: "STRING", description: "Short calendar title, e.g. 'Picture day' or 'Due: Science project'" },
          date: { type: "STRING", description: "Start date, YYYY-MM-DD" },
          endDate: { type: "STRING", nullable: true, description: "Last day for multi-day events, YYYY-MM-DD" },
          startTime: { type: "STRING", nullable: true, description: "24-hour HH:mm, or null if no time is given" },
          endTime: { type: "STRING", nullable: true, description: "24-hour HH:mm, or null" },
          location: { type: "STRING", nullable: true },
          notes: { type: "STRING", nullable: true, description: "One or two short lines: what to bring, cost, sign-up deadline" },
          people: { type: "ARRAY", items: { type: "STRING" }, description: "Family member names this is for, only if clear" },
        },
        required: ["title", "date"],
      },
    },
  },
  required: ["events"],
};

function buildInstructions(today: string, weekday: string, timezone: string, familyNames: string[]) {
  return [
    "You read school emails, newsletters, flyers and messages for a family and list the calendar items in them.",
    `Today is ${weekday}, ${today}. The family's timezone is ${timezone}.`,
    familyNames.length ? `Family members: ${familyNames.join(", ")}.` : "",
    "Rules:",
    "- Include events, activities, days off, early dismissals and deadlines (forms, payments, homework, sign-ups). Title deadlines 'Due: ...'.",
    "- Resolve relative dates ('next Friday', 'tomorrow') against today. If a date has no year, use the next time that date occurs.",
    "- Skip items that ended before today, generic footers, and anything without a date.",
    "- Only set times that are stated. Only list people whose names are clearly mentioned or clearly implied.",
    "- Never invent details. Return an empty list if there's nothing to add.",
  ].filter(Boolean).join("\n");
}

function cleanString(value: unknown, maxLength: number): string | null {
  return typeof value === "string" && value.trim() ? value.trim().slice(0, maxLength) : null;
}

export default defineEventHandler(async (event) => {
  const gemini = (useRuntimeConfig().gemini ?? {}) as { apiKey?: string; model?: string; fallbackModel?: string };
  const apiKey = String(gemini.apiKey || "").trim();
  const model = String(gemini.model || "gemini-3.5-flash").trim();
  const fallbackModel = String(gemini.fallbackModel ?? "gemini-3.1-flash-lite").trim();
  if (!apiKey) {
    throw createError({ statusCode: 503, message: "AI import isn't set up. Add NUXT_GEMINI_API_KEY on the server." });
  }

  const body = await readBody<{ text?: unknown; file?: { mimeType?: unknown; data?: unknown } }>(event);
  const text = typeof body?.text === "string" ? body.text.trim().slice(0, MAX_TEXT_LENGTH) : "";
  const fileType = typeof body?.file?.mimeType === "string" ? body.file.mimeType : "";
  const fileData = typeof body?.file?.data === "string" ? body.file.data : "";

  if (!text && !fileData) {
    throw createError({ statusCode: 400, message: "Paste some text or choose a file." });
  }
  if (fileData) {
    if (!ALLOWED_FILE_TYPES.has(fileType)) {
      throw createError({ statusCode: 400, message: "Use a photo, screenshot or PDF." });
    }
    if (fileData.length * 0.75 > MAX_FILE_BYTES) {
      throw createError({ statusCode: 413, message: "That file is too large (12 MB max)." });
    }
  }

  const users = await prisma.user.findMany({ select: { id: true, name: true } });
  const today = getAppDayKey();
  const weekday = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][getAppWeekday()]!;

  const parts: Record<string, unknown>[] = [];
  if (text)
    parts.push({ text });
  if (fileData)
    parts.push({ inline_data: { mime_type: fileType, data: fileData } });

  const requestBody = {
    systemInstruction: { parts: [{ text: buildInstructions(today, weekday, getAppTimezone(), users.map(user => user.name)) }] },
    contents: [{ role: "user", parts }],
    generationConfig: { responseMimeType: "application/json", responseSchema: RESPONSE_SCHEMA },
  };
  // Google returns 500/503 when a model is overloaded; a lighter model is usually still up.
  const models = [...new Set([model, fallbackModel].filter(Boolean))];

  let responseText = "";
  let lastStatus: number | undefined;
  for (const [index, candidate] of models.entries()) {
    try {
      const response = await $fetch<{ candidates?: { content?: { parts?: { text?: string }[] } }[] }>(
        `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(candidate)}:generateContent`,
        { method: "POST", headers: { "x-goog-api-key": apiKey }, body: requestBody, timeout: 90_000 },
      );
      responseText = response.candidates?.[0]?.content?.parts?.map(part => part.text ?? "").join("") ?? "";
      lastStatus = undefined;
      break;
    }
    catch (error) {
      lastStatus = (error as { statusCode?: number }).statusCode;
      const canFallBack = index < models.length - 1 && (lastStatus === 500 || lastStatus === 503);
      consola.warn(`AI import: Gemini ${candidate} failed${lastStatus ? ` (HTTP ${lastStatus})` : ""}${canFallBack ? ", trying fallback model" : ""}`);
      if (!canFallBack)
        break;
    }
  }
  if (!responseText) {
    throw createError({
      statusCode: 502,
      message: lastStatus === 429
        ? "The AI service is over its free limit. Try again in a minute."
        : lastStatus === 500 || lastStatus === 503
          ? "Google's AI is overloaded right now. Try again in a few minutes."
          : "The AI service didn't respond. Try again.",
    });
  }

  let parsed: { events?: Record<string, unknown>[] };
  try {
    parsed = JSON.parse(responseText || "{}");
  }
  catch {
    consola.warn("AI import: Gemini returned unreadable JSON");
    throw createError({ statusCode: 502, message: "Couldn't read the AI's answer. Try again." });
  }

  const byName = new Map(users.map(user => [user.name.trim().toLowerCase(), user.id]));
  const byFirstName = new Map(users.map(user => [user.name.trim().split(/\s+/)[0]!.toLowerCase(), user.id]));

  const events: SuggestedEvent[] = (parsed.events ?? [])
    .map((raw) => {
      const date = cleanString(raw.date, 10);
      const title = cleanString(raw.title, 200);
      if (!title || !date || !DATE_PATTERN.test(date))
        return null;
      const endDate = cleanString(raw.endDate, 10);
      const startTime = cleanString(raw.startTime, 5);
      const endTime = cleanString(raw.endTime, 5);
      const validStart = startTime && TIME_PATTERN.test(startTime) ? startTime : null;
      const people = Array.isArray(raw.people) ? raw.people.filter((name): name is string => typeof name === "string") : [];
      const userIds = [...new Set(people
        .map(name => name.trim().toLowerCase())
        .map(name => byName.get(name) ?? byFirstName.get(name.split(/\s+/)[0]!))
        .filter((id): id is string => !!id))];
      return {
        title,
        date,
        endDate: endDate && DATE_PATTERN.test(endDate) && endDate >= date ? endDate : null,
        startTime: validStart,
        endTime: validStart && endTime && TIME_PATTERN.test(endTime) && endTime > validStart ? endTime : null,
        allDay: !validStart,
        location: cleanString(raw.location, 200),
        notes: cleanString(raw.notes, 500),
        userIds,
      };
    })
    .filter((suggestion): suggestion is SuggestedEvent => suggestion !== null)
    .slice(0, 50);

  consola.info(`AI import: Suggested ${events.length} event(s)`);
  return { events };
});
