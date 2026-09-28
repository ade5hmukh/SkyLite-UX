import { createError, defineEventHandler, readBody } from "h3";

export default defineEventHandler(async (event) => {
  if (!isNtfyConfigured()) {
    throw createError({ statusCode: 503, message: "ntfy isn't set up. Add NUXT_NTFY_URL and NUXT_NTFY_TOPIC." });
  }

  const body = await readBody<{ type?: string }>(event).catch(() => ({ type: undefined }));

  if (body?.type === "today") {
    const summary = await buildDaySummary(getAppDayKey());
    const sent = await sendNtfy(summary
      ? { title: `Today: ${summary.title}`, message: summary.message, tags: ["spiral_calendar"] }
      : { title: "Today", message: "Nothing on the calendar and no to-dos due today.", tags: ["spiral_calendar"] });
    return { sent };
  }

  const sent = await sendNtfy({
    title: "SkyLite test",
    message: "Reminders from SkyLite will arrive here.",
    tags: ["white_check_mark"],
  });
  return { sent };
});
