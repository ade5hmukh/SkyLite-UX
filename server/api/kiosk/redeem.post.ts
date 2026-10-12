// Body: { rewardId, personId, pin }. A parent confirms every kiosk redemption with the PIN.
export default defineEventHandler(async (event) => {
  const body = await readBody<{ rewardId?: string; personId?: string; pin?: string }>(event);
  if (!body?.rewardId || !body.personId)
    throw createError({ statusCode: 400, message: "rewardId and personId are required" });

  requireParentPin(body.pin);
  const redemption = await redeemReward(body.rewardId, body.personId, { source: "kiosk" });
  return {
    redemptionId: redemption.id,
    points: redemption.user.points,
    savedPoints: redemption.user.savedPoints,
  };
});
