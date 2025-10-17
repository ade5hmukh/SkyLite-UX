import prisma from "~/lib/prisma";
import { createError, defineEventHandler, getQuery } from "h3";

export default defineEventHandler(async (event) => {
  try {
    const query = getQuery(event);
    
    // Parse query parameters
    const limit = query.limit ? Number.parseInt(query.limit as string, 10) : 50;
    const offset = query.offset ? Number.parseInt(query.offset as string, 10) : 0;
    const userId = query.userId as string | undefined;
    const serviceName = query.serviceName as string | undefined;
    const level = query.level as string | undefined;
    const startDate = query.startDate as string | undefined;
    const endDate = query.endDate as string | undefined;
    
    // Build where clause
    const where: any = {};
    
    if (userId) {
      where.userId = userId;
    }
    
    if (serviceName) {
      where.serviceName = serviceName;
    }
    
    if (level) {
      where.level = level;
    }
    
    if (startDate || endDate) {
      where.timestamp = {};
      if (startDate) {
        where.timestamp.gte = new Date(startDate);
      }
      if (endDate) {
        where.timestamp.lte = new Date(endDate);
      }
    }
    
    // Fetch logs with pagination
    const [logs, total] = await Promise.all([
      prisma.activityLog.findMany({
        where,
        orderBy: {
          timestamp: "desc",
        },
        take: limit,
        skip: offset,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              avatar: true,
            },
          },
        },
      }),
      prisma.activityLog.count({ where }),
    ]);
    
    return {
      logs,
      total,
      limit,
      offset,
    };
  }
  catch (error) {
    throw createError({
      statusCode: 500,
      message: `Failed to fetch activity logs: ${error}`,
    });
  }
});



