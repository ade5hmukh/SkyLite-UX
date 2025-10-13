import { PrismaClient } from "@prisma/client";
import { consola } from "consola";
import { createError, defineEventHandler, getQuery } from "h3";

import { GoogleCalendarServerService } from "../../../integrations/googleCalendar/client";
import type { GoogleCalendarSettings } from "../../../integrations/googleCalendar/types";

const prisma = new PrismaClient();

export default defineEventHandler(async (event) => {
  const integrationId = getQuery(event).integrationId as string;
  const tempApiKey = getQuery(event).apiKey as string | undefined;
  const tempCalendarId = getQuery(event).calendarId as string | undefined;

  if (!integrationId || typeof integrationId !== "string") {
    throw createError({
      statusCode: 400,
      message: "integrationId is required",
    });
  }

  let apiKey: string;
  let calendarId: string;

  if (integrationId === "temp" || integrationId.startsWith("temp-")) {
    if (!tempApiKey || typeof tempApiKey !== "string") {
      throw createError({
        statusCode: 400,
        message: "apiKey is required for temporary integration testing",
      });
    }
    if (!tempCalendarId || typeof tempCalendarId !== "string") {
      throw createError({
        statusCode: 400,
        message: "calendarId is required for temporary integration testing",
      });
    }
    apiKey = tempApiKey;
    calendarId = tempCalendarId;
  }
  else {
    const integration = await prisma.integration.findFirst({
      where: {
        id: integrationId,
        type: "calendar",
        service: "Google Calendar",
        enabled: true,
      },
    });

    if (!integration || !integration.apiKey) {
      throw createError({
        statusCode: 404,
        message: "Google Calendar integration not found or not configured",
      });
    }

    if (integration.type !== "calendar" || integration.service !== "Google Calendar") {
      throw createError({
        statusCode: 400,
        message: "Invalid integration type for Google Calendar API",
      });
    }

    const settings = integration.settings as GoogleCalendarSettings | null;
    if (!settings?.calendarId) {
      throw createError({
        statusCode: 400,
        message: "Calendar ID not configured for this integration",
      });
    }

    apiKey = integration.apiKey;
    calendarId = settings.calendarId;
  }

  const service = new GoogleCalendarServerService(integrationId, apiKey, calendarId);
  try {
    const events = await service.fetchEvents();
    return { events };
  }
  catch (error) {
    consola.error("Integrations Google Calendar Index: Failed to fetch events:", error);
    throw createError({
      statusCode: 400,
      message: error instanceof Error ? error.message : "Failed to fetch Google Calendar events",
    });
  }
});


