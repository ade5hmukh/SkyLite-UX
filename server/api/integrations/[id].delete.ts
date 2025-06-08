import prisma from "~/lib/prisma";

export default defineEventHandler(async (event) => {
  try {
    const integrationId = getRouterParam(event, "id");

    if (!integrationId) {
      throw createError({
        statusCode: 400,
        message: "Integration ID is required",
      });
    }

    await prisma.integration.delete({
      where: { id: integrationId },
    });

    return { success: true };
  }
  catch (error) {
    throw createError({
      statusCode: 500,
      message: `Failed to delete integration: ${error}`,
    });
  }
});
