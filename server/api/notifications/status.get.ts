import { defineEventHandler } from "h3";

export default defineEventHandler(() => {
  const config = (useRuntimeConfig().ntfy ?? {}) as { eventLeadMinutes?: number; morningTime?: string; eveningTime?: string };
  return {
    configured: isNtfyConfigured(),
    eventLeadMinutes: Number(config.eventLeadMinutes) || 30,
    morningTime: config.morningTime || "07:00",
    eveningTime: config.eveningTime || "19:30",
  };
});
