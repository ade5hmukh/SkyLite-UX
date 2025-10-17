import prisma from "~/lib/prisma";

export default defineEventHandler(async (event) => {
  try {
    const query = getQuery(event);
    const userId = query.userId as string | undefined;
    const status = query.status as string | undefined;

    const where: any = {};

    // Filter by user if userId is provided
    if (userId) {
      where.userId = userId;
    }

    // Filter by status if provided
    if (status && ["PENDING", "FULFILLED", "CANCELLED"].includes(status)) {
      where.status = status;
    }

    const redemptions = await prisma.rewardRedemption.findMany({
      where,
      orderBy: {
        redeemedAt: "desc",
      },
      include: {
        reward: true,
        user: {
          select: {
            id: true,
            name: true,
            avatar: true,
            points: true,
          },
        },
      },
    });

    return redemptions;
  }
  catch (error) {
    throw createError({
      statusCode: 500,
      message: `Failed to fetch redemptions: ${error}`,
    });
  }
});

