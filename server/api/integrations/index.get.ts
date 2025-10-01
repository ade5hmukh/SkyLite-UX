import prisma from "~/lib/prisma";

export default defineEventHandler(async (_event) => {
  try {
    const integrations = await prisma.integration.findMany({
      orderBy: {
        createdAt: "desc",
      },
    });

    // Remove sensitive fields before sending to client
    return integrations.map(integration => ({
      id: integration.id,
      name: integration.name,
      type: integration.type,
      service: integration.service,
      icon: integration.icon,
      enabled: integration.enabled,
      settings: integration.settings,
      createdAt: integration.createdAt,
      updatedAt: integration.updatedAt,
      // Explicitly exclude apiKey and baseUrl for security
    }));
  }
  catch (error) {
    throw createError({
      statusCode: 500,
      message: `Failed to fetch integration: ${error}`,
    });
  }
});
