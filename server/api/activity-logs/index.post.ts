import prisma from "~/lib/prisma";
import { createError, defineEventHandler, readBody } from "h3";
import { LogLevel } from "@prisma/client";

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event);
    
    // Validate required fields
    if (!body.serviceName || !body.message) {
      throw createError({
        statusCode: 400,
        message: "serviceName and message are required",
      });
    }
    
    // Validate level if provided
    if (body.level && !Object.values(LogLevel).includes(body.level)) {
      throw createError({
        statusCode: 400,
        message: "Invalid log level. Must be INFO, WARNING, or ERROR",
      });
    }
    
    // Create activity log
    const log = await prisma.activityLog.create({
      data: {
        level: body.level || LogLevel.INFO,
        serviceName: body.serviceName,
        message: body.message,
        userId: body.userId || null,
        username: body.username || null,
        entityType: body.entityType || null,
        entityId: body.entityId || null,
        entityName: body.entityName || null,
        metadata: body.metadata || null,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            avatar: true,
          },
        },
      },
    });
    
    return log;
  }
  catch (error) {
    throw createError({
      statusCode: 500,
      message: `Failed to create activity log: ${error}`,
    });
  }
});



