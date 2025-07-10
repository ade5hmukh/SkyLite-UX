import { PrismaClient } from "@prisma/client";
import { createError, defineEventHandler, readBody } from "h3";
import { consola } from "consola";
import { integrationRegistry } from "~/types/integrations";

const prisma = new PrismaClient();

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event);
    const { name, type, service, apiKey, baseUrl, icon, enabled, settings } = body;

    // Validate required fields based on integration registry
    const integrationKey = `${type}:${service}`;
    
    const integrationConfig = integrationRegistry.get(integrationKey);
    
    if (!integrationConfig) {
      throw createError({
        statusCode: 400,
        message: `Unsupported integration type: ${integrationKey}`,
      });
    }

    // Check required fields from registry
    const missingFields = integrationConfig.requiredFields.filter(field => {
      if (field === 'apiKey') return !apiKey;
      if (field === 'baseUrl') return !baseUrl;
      if (field === 'name') return !name;
      if (field === 'type') return !type;
      if (field === 'service') return !service;
      return false;
    });

    if (missingFields.length > 0) {
      throw createError({
        statusCode: 400,
        message: `Missing required fields: ${missingFields.join(', ')}`,
      });
    }

    // Test connection before creating the integration
    const { createIntegrationService } = await import("~/types/integrations");
    const tempIntegration = {
      id: "temp",
      type,
      service,
      apiKey: apiKey || '',
      baseUrl,
      enabled: true,
      name: name || "Temp",
      icon: icon || null,
      settings: settings || {},
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    const integrationService = await createIntegrationService(tempIntegration);
    if (!integrationService) {
      throw createError({
        statusCode: 400,
        message: `Unsupported integration type: ${type}:${service}`,
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

    // Create the integration
    const integration = await prisma.integration.create({
      data: {
        name,
        type,
        service,
        apiKey,
        baseUrl,
        icon,
        enabled,
        settings,
      },
    });

    return integration;
  } catch (error: any) {
    consola.error("Error creating integration:", error);
    throw createError({
      statusCode: error.statusCode || 500,
      message: error.message || "Failed to create integration",
    });
  }
});


