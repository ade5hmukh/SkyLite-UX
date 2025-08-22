import { consola } from "consola";
import { defineEventHandler, readBody } from "h3";

import type { Integration } from "~/types/database";

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event);
    const { integrationId, integrationType, force = false } = body;

    if (!integrationId || !integrationType) {
      throw createError({
        statusCode: 400,
        message: "integrationId and integrationType are required",
      });
    }

    consola.info(`Triggering manual sync for ${integrationType} integration ${integrationId} (force: ${force})`);

    const { setupIntegrationSync } = await import("../../plugins/syncManager");
    const prisma = await import("~/lib/prisma").then(m => m.default);
    const integration = await prisma.integration.findUnique({
      where: { id: integrationId },
    });

    if (!integration) {
      throw createError({
        statusCode: 404,
        message: "Integration not found",
      });
    }

    if (!integration.enabled) {
      throw createError({
        statusCode: 400,
        message: "Integration is not enabled",
      });
    }

    // Trigger immediate sync by calling setupIntegrationSync with immediate flag
    await setupIntegrationSync(integration as Integration, true);

    consola.success(`Successfully triggered sync for ${integrationType} integration ${integrationId}`);

    return {
      success: true,
      message: "Integration sync triggered successfully",
      integrationId,
      integrationType,
    };
  }
  catch (error) {
    consola.error("Failed to trigger integration sync:", error);
    throw createError({
      statusCode: 500,
      message: "Failed to trigger integration sync",
    });
  }
});
