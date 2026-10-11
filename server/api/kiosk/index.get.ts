import { consola } from "consola";

export default defineEventHandler(async (event) => {
  const who = getQuery(event).who;
  setHeader(event, "Cache-Control", "no-store");
  try {
    return await getKioskData(typeof who === "string" ? who : "");
  }
  catch (error) {
    consola.error("Kiosk: Failed to load data:", error);
    throw createError({ statusCode: 500, message: "Failed to load kiosk data" });
  }
});
