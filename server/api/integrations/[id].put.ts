import { PrismaClient } from "@prisma/client";
import { createError, defineEventHandler, readBody } from "h3";

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
      const connectionTestResult = await testIntegrationConnection(
        updatedData.type, 
        updatedData.service, 
        updatedData.apiKey, 
        updatedData.baseUrl
      );
      
      if (!connectionTestResult.success) {
        throw createError({
          statusCode: 400,
          message: `Connection test failed: ${connectionTestResult.error}`,
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
    console.error("Error updating integration:", error);
    throw createError({
      statusCode: error.statusCode || 500,
      message: error.message || "Failed to update integration",
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
