import { consola } from "consola";
import { defineEventHandler, readBody } from "h3";

import type { Integration } from "~/types/database";

export default defineEventHandler(async (event) => {
  try {
    const integration = await readBody<Integration>(event);

    consola.info(`Registering integration for sync: ${integration.name} (${integration.id})`);

    // Import the sync manager functions
    const { setupIntegrationSync } = await import("../../plugins/syncManager");

    // Set up sync for the new integration
    await setupIntegrationSync(integration);

    consola.success(`Successfully registered integration for sync: ${integration.name}`);

    return { success: true, message: "Integration registered for sync" };
  }
  catch (error) {
    consola.error("Failed to register integration for sync:", error);
    throw createError({
      statusCode: 500,
      statusMessage: "Failed to register integration for sync",
    });
  }
});
