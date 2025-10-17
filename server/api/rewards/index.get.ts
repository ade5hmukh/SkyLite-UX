import prisma from "~/lib/prisma";

export default defineEventHandler(async (_event) => {
  try {
    const rewards = await prisma.reward.findMany({
      where: {
        enabled: true, // Only show enabled rewards by default
      },
      orderBy: [
        { order: "asc" },
        { pointCost: "asc" },
      ],
      include: {
        _count: {
          select: { redemptions: true },
        },
      },
    });

    return rewards;
  }
  catch (error) {
    throw createError({
      statusCode: 500,
      message: `Failed to fetch rewards: ${error}`,
    });
  }
});

