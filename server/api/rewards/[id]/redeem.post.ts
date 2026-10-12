export default defineEventHandler(async (event) => {
  const rewardId = getRouterParam(event, "id");
  const body = await readBody(event);

  if (!rewardId)
    throw createError({ statusCode: 400, message: "Reward ID is required" });
  if (!body?.userId)
    throw createError({ statusCode: 400, message: "User ID is required" });

  try {
    return await redeemReward(rewardId, body.userId, { notes: body.notes });
  }
  catch (error: any) {
    if (error?.statusCode)
      throw error;
    throw createError({ statusCode: 500, message: `Failed to redeem reward: ${error}` });
  }
});
