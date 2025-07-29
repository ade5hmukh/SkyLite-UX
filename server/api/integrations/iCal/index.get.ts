import { consola } from "consola";

import { ICalServerService } from "../../../integrations/iCal/client";

export default defineEventHandler(async (event) => {
  const icalUrl = getQuery(event).baseUrl;
  if (!icalUrl || typeof icalUrl !== "string") {
    throw createError({
      statusCode: 400,
      message: "baseUrl is required",
    });
  }
  const service = new ICalServerService("api", icalUrl);
  try {
    const events = await service.fetchEventsFromUrl(icalUrl);
    return { events };
  }
  catch (error) {
    consola.error("Failed to fetch iCal events:", error);
    return { events: [], error: error instanceof Error ? error.message : String(error) };
  }
});
