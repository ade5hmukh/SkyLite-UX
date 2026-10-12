// Body: { amount, pin? }. A positive amount moves points into the savings jar; taking points out needs the parent PIN.
export default defineEventHandler(async (event) => {
  const userId = getRouterParam(event, "id");
  const body = await readBody<{ amount?: number; pin?: string }>(event);
  if (!userId)
    throw createError({ statusCode: 400, message: "User ID is required" });

  const amount = Number(body?.amount);
  if (amount < 0)
    requireParentPin(body?.pin);
  return moveSavings(userId, amount);
});
