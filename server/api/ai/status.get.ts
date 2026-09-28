import { defineEventHandler } from "h3";

export default defineEventHandler(() => {
  const gemini = (useRuntimeConfig().gemini ?? {}) as { apiKey?: string };
  return { eventImport: Boolean(String(gemini.apiKey || "").trim()) };
});
