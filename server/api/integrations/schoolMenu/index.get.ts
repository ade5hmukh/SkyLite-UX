import { PrismaClient } from "@prisma/client";
import { addDays } from "date-fns";
import { createError, defineEventHandler, getQuery } from "h3";

import { getMenuInfo, getSchoolMenuDays } from "../../../integrations/schoolMenu/client";

const prisma = new PrismaClient();

export default defineEventHandler(async (event) => {
  const query = getQuery(event);
  const integrationId = typeof query.integrationId === "string" ? query.integrationId : "";

  let url = typeof query.baseUrl === "string" ? query.baseUrl : "";
  if (integrationId && integrationId !== "temp" && !integrationId.startsWith("temp-")) {
    const integration = await prisma.integration.findUnique({ where: { id: integrationId } });
    if (!integration || integration.type !== "meal" || integration.service !== "School Menu") {
      throw createError({ statusCode: 404, message: "School menu integration not found" });
    }
    url = integration.baseUrl ?? "";
  }
  if (!url) {
    throw createError({ statusCode: 400, message: "A menu link is required" });
  }

  try {
    const info = await getMenuInfo(url);
    const today = getAppDayKey();
    const days = await getSchoolMenuDays(url, today, getAppDayKey(addDays(new Date(), 13)));
    return { ...info, days };
  }
  catch (error) {
    throw createError({
      statusCode: 400,
      message: error instanceof Error && !("statusCode" in error) ? error.message : "Couldn't reach the school menu site. Check the link and try again.",
    });
  }
});
