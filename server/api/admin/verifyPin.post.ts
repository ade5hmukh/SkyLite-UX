export default defineEventHandler(async (event) => {
  const body = await readBody<{ pin?: unknown }>(event);
  const pin = typeof body?.pin === "string" ? body.pin : "";

  const result = checkParentPin(pin);
  if (result === "locked") {
    throw createError({ statusCode: 429, message: "Too many attempts. Try again in a minute." });
  }
  return { valid: result === "valid" };
});
