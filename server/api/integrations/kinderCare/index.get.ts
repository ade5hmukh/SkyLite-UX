import { addDays } from "date-fns";
import { createError, defineEventHandler } from "h3";

import { getKinderCareMenuDays, isKinderCareConfigured, KinderCareLoginError } from "../../../integrations/kinderCare/client";

export default defineEventHandler(async () => {
  if (!isKinderCareConfigured()) {
    throw createError({ statusCode: 400, message: "KinderCare isn't set up on the server. Set NUXT_KINDERCARE_SESSION and restart." });
  }

  try {
    const days = await getKinderCareMenuDays(getAppDayKey(), getAppDayKey(addDays(new Date(), 13)));
    return { days };
  }
  catch (error) {
    throw createError({
      statusCode: 400,
      message: error instanceof KinderCareLoginError ? error.message : "Couldn't reach KinderCare. Try again later.",
    });
  }
});
