import { PrismaClient } from "@prisma/client";
import { createError, defineEventHandler, getQuery, readBody } from "h3";

const prisma = new PrismaClient();

export default defineEventHandler(async (event) => {
  const pathParts = event.context.params?.path;
  if (!pathParts) {
    throw createError({
      statusCode: 400,
      statusMessage: "Invalid path",
    });
  }

  const method = event.method;
  const query = getQuery(event);
  const body = method !== "GET" ? await readBody(event) : undefined;

  if (method === "POST" && !body) {
    throw createError({
      statusCode: 400,
      statusMessage: "Request body is required for POST requests",
    });
  }

  console.warn("DEBUG: Server received request:", {
    method,
    path: pathParts,
    query,
    body,
  });

  // Get integration ID from query parameter
  const integrationId = query.integrationId as string;
  if (!integrationId) {
    throw createError({
      statusCode: 400,
      statusMessage: "integrationId query parameter is required",
    });
  }

  // Find the specific integration
  const integration = await prisma.integration.findFirst({
    where: {
      id: integrationId,
      type: "shopping",
      enabled: true,
    },
  });

  if (!integration || !integration.baseUrl) {
    throw createError({
      statusCode: 404,
      statusMessage: "Tandoor integration not found or not configured",
    });
  }

  // Verify that this is a Tandoor integration
  if (integration.type !== "shopping" || !integration.baseUrl.includes("tandoor")) {
    throw createError({
      statusCode: 400,
      statusMessage: "Invalid integration type for Tandoor API",
    });
  }

  const baseUrl = integration.baseUrl.endsWith("/") ? integration.baseUrl.slice(0, -1) : integration.baseUrl;
  const path = Array.isArray(pathParts) ? pathParts.join("/") : pathParts;

  // Remove integrationId from query params before forwarding to Tandoor
  const { integrationId: _, ...restQuery } = query;
  const url = `${baseUrl}/api/${path}${Object.keys(restQuery).length ? `?${new URLSearchParams(restQuery as any).toString()}` : ""}`;

  console.warn("DEBUG: Server forwarding request to Tandoor:", {
    url,
    method,
    headers: {
      ...(integration.apiKey && { "Authorization": `Bearer ${integration.apiKey}` }),
      "Content-Type": "application/json",
      "Host": "localhost",
    },
    body,
  });

  try {
    const fixedUrl = url.charAt(url.length) === "/" ? url : `${url}/`;
    console.warn("DEBUG: Fixed URL:", fixedUrl);
    
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "Host": "localhost",
    };
    
    if (integration.apiKey) {
      headers["Authorization"] = `Bearer ${integration.apiKey}`;
    }
    
    const response = await fetch(fixedUrl, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    console.warn("DEBUG: Tandoor API response:", response);

    if (!response.ok) {
      const errorText = await response.text();
      console.error("DEBUG: Tandoor API error response:", errorText);
      throw createError({
        statusCode: response.status,
        statusMessage: `Tandoor API error: ${response.status} ${response.statusText} - ${errorText}`,
      });
    }

    return await response.json();
  }
  catch (error: any) {
    console.error("Error proxying request to Tandoor:", error);
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.message || "Failed to proxy request to Tandoor",
    });
  }
});
