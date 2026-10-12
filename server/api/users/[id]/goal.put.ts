// Body: { rewardId } to pick a big reward to save for, or { rewardId: null } to clear it.
export default defineEventHandler(async (event) => {
  const userId = getRouterParam(event, "id");
  const body = await readBody<{ rewardId?: string | null }>(event);
  if (!userId)
    throw createError({ statusCode: 400, message: "User ID is required" });
  return setSavingGoal(userId, body?.rewardId || null);
});
