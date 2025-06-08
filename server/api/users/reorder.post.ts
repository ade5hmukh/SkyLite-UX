import prisma from "~/lib/prisma";

export default defineEventHandler(async (event) => {
  try {
    const { userIds } = await readBody(event);

    if (!Array.isArray(userIds)) {
      throw createError({
        statusCode: 400,
        statusMessage: 'userIds must be an array',
      });
    }

    // Update each user's todoOrder based on their position in the array
    const updates = userIds.map((userId, index) => {
      return prisma.user.update({
        where: { id: userId },
        data: { todoOrder: index },
      });
    });

    await prisma.$transaction(updates);

    return { success: true };
  } catch (error) {
    throw createError({
      statusCode: 500,
      statusMessage: `Failed to reorder users: ${error}`,
    });
  }
}); 