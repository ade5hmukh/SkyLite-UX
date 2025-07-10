import { PrismaClient } from "@prisma/client";
import { createError, defineEventHandler, readBody } from "h3";
import { consola } from "consola";

const prisma = new PrismaClient();

export default defineEventHandler(async (event) => {
  try {
    const id = event.context.params?.id;
    if (!id) {
      throw createError({
        statusCode: 400,
        message: "Integration ID is required",
      });
    }

    const body = await readBody(event);
    const { name, type, service, apiKey, baseUrl, icon, enabled, settings } = body;

    // Check if API key or base URL is being updated
    if (apiKey || baseUrl) {
      // Get current integration to merge with updates
      const currentIntegration = await prisma.integration.findUnique({
        where: { id }
      });

      if (!currentIntegration) {
        throw createError({
          statusCode: 404,
          message: "Integration not found",
        });
      }

      // Merge current data with updates
      const updatedData = {
        ...currentIntegration,
        ...(name && { name }),
        ...(type && { type }),
        ...(service && { service }),
        ...(apiKey && { apiKey }),
        ...(baseUrl && { baseUrl }),
        ...(icon !== undefined && { icon }),
        ...(enabled !== undefined && { enabled }),
        ...(settings && { settings }),
      };

      // Test connection before updating
      const { createIntegrationService } = await import("~/types/integrations");
      const tempIntegration = {
        id: "temp",
        type: updatedData.type,
        service: updatedData.service,
        apiKey: updatedData.apiKey,
        baseUrl: updatedData.baseUrl,
        enabled: true,
        name: updatedData.name || "Temp",
        icon: updatedData.icon || null,
        settings: updatedData.settings || {},
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      const integrationService = await createIntegrationService(tempIntegration);
      if (!integrationService) {
        throw createError({
          statusCode: 400,
          message: `Unsupported integration type: ${updatedData.type}:${updatedData.service}`,
        });
      }
      
      const connectionSuccess = await integrationService.testConnection?.();
      if (!connectionSuccess) {
        const status = await integrationService.getStatus();
        throw createError({
          statusCode: 400,
          message: `Connection test failed: ${status.error || 'Unknown error'}`,
        });
      }
    }

    // Update the integration
    const integration = await prisma.integration.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(type && { type }),
        ...(service && { service }),
        ...(apiKey && { apiKey }),
        ...(baseUrl && { baseUrl }),
        ...(icon !== undefined && { icon }),
        ...(enabled !== undefined && { enabled }),
        ...(settings && { settings }),
      },
    });

    return integration;
  } catch (error: any) {
    consola.error("Error updating integration:", error);
    throw createError({
      statusCode: error.statusCode || 500,
      message: error.message || "Failed to update integration",
    });
  }
});


