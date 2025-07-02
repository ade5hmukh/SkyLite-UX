import { PrismaClient } from "@prisma/client";
import { createError, defineEventHandler, readBody } from "h3";
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
    const connectionTestResult = await testIntegrationConnection(type, service, apiKey || '', baseUrl);
    
    if (!connectionTestResult.success) {
      throw createError({
        statusCode: 400,
        message: `Connection test failed: ${connectionTestResult.error}`,
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
    console.error("Error creating integration:", error);
    throw createError({
      statusCode: error.statusCode || 500,
      message: error.message || "Failed to create integration",
    });
  }
});

async function testIntegrationConnection(type: string, service: string, apiKey: string, baseUrl: string): Promise<{ success: boolean; error?: string }> {
  try {
    console.log('Testing connection for:', type, service);
    
    if (type === "shopping" && service === "mealie") {
      console.log('Testing Mealie connection');
      const response = await fetch(`${baseUrl}/api/households/shopping/lists`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        return {
          success: false,
          error: `Mealie API error: ${response.status} ${response.statusText} - ${errorText}`
        };
      }

      // Try to parse the response to ensure it's valid JSON
      await response.json();
      return { success: true };
    }

    if (type === "shopping" && service === "tandoor") {
      console.log('Testing Tandoor connection');
      const response = await fetch(`${baseUrl}/api/shopping-list-entry/`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        return {
          success: false,
          error: `Tandoor API error: ${response.status} ${response.statusText} - ${errorText}`
        };
      }

      // Try to parse the response to ensure it's valid JSON
      await response.json();
      return { success: true };
    }

    console.log('No matching integration type found, returning unsupported error');
    return {
      success: false,
      error: `Unsupported integration type: ${type}:${service}`
    };
  } catch (error) {
    console.error('Connection test error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown connection error"
    };
  }
}
