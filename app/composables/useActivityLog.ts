import type { LogLevel } from "@prisma/client";

export interface ActivityLogInput {
  level?: "INFO" | "WARNING" | "ERROR";
  serviceName: string;
  message: string;
  userId?: string | null;
  username?: string | null;
  entityType?: string | null;
  entityId?: string | null;
  entityName?: string | null;
  metadata?: Record<string, any> | null;
}

export function useActivityLog() {
  /**
   * Log an activity to the database
   * @param input - Activity log input
   */
  async function logActivity(input: ActivityLogInput) {
    try {
      await $fetch("/api/activity-logs", {
        method: "POST",
        body: {
          level: input.level || "INFO",
          serviceName: input.serviceName,
          message: input.message,
          userId: input.userId || null,
          username: input.username || null,
          entityType: input.entityType || null,
          entityId: input.entityId || null,
          entityName: input.entityName || null,
          metadata: input.metadata || null,
        },
      });
    }
    catch (error) {
      console.error("Failed to log activity:", error);
      // Don't throw error to avoid breaking the main flow
    }
  }

  /**
   * Log an INFO level activity
   */
  function logInfo(serviceName: string, message: string, options?: Partial<ActivityLogInput>) {
    return logActivity({
      level: "INFO",
      serviceName,
      message,
      ...options,
    });
  }

  /**
   * Log a WARNING level activity
   */
  function logWarning(serviceName: string, message: string, options?: Partial<ActivityLogInput>) {
    return logActivity({
      level: "WARNING",
      serviceName,
      message,
      ...options,
    });
  }

  /**
   * Log an ERROR level activity
   */
  function logError(serviceName: string, message: string, options?: Partial<ActivityLogInput>) {
    return logActivity({
      level: "ERROR",
      serviceName,
      message,
      ...options,
    });
  }

  /**
   * Fetch activity logs with optional filters
   */
  async function fetchActivityLogs(filters?: {
    limit?: number;
    offset?: number;
    userId?: string;
    serviceName?: string;
    level?: string;
    startDate?: string;
    endDate?: string;
  }) {
    try {
      const query = new URLSearchParams();
      
      if (filters?.limit) query.append("limit", filters.limit.toString());
      if (filters?.offset) query.append("offset", filters.offset.toString());
      if (filters?.userId) query.append("userId", filters.userId);
      if (filters?.serviceName) query.append("serviceName", filters.serviceName);
      if (filters?.level) query.append("level", filters.level);
      if (filters?.startDate) query.append("startDate", filters.startDate);
      if (filters?.endDate) query.append("endDate", filters.endDate);
      
      const response = await $fetch(`/api/activity-logs?${query.toString()}`);
      return response;
    }
    catch (error) {
      console.error("Failed to fetch activity logs:", error);
      throw error;
    }
  }

  return {
    logActivity,
    logInfo,
    logWarning,
    logError,
    fetchActivityLogs,
  };
}



