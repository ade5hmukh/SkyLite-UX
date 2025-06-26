import { PrismaClient } from "@prisma/client";
import { createError, defineEventHandler, readBody } from "h3";

const prisma = new PrismaClient();

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event);
    const { name, type, service, apiKey, baseUrl, icon, enabled, settings } = body;

    // Validate required fields
    if (!name || !type || !service || !apiKey || !baseUrl) {
      throw createError({
        statusCode: 400,
        message: "Missing required fields: name, type, service, apiKey, baseUrl",
      });
    }

    // Test connection before creating the integration
    const connectionTestResult = await testIntegrationConnection(type, service, apiKey, baseUrl);
    
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
    if (type === "shopping" && service === "mealie") {
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
      const response = await fetch(`${baseUrl}/api/shopping-list-entry/`, {
        method: 'GET',
        headers: {
          'Authorization': `Token ${apiKey}`,
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
