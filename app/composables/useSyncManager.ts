type IntegrationSyncData = {
  [integrationId: string]: {
    data: unknown;
    lastSync: Date;
    success: boolean;
    error?: string;
  };
};

export function useSyncManager() {
  const nuxtApp = useNuxtApp();

  // Access the sync data from the plugin
  const syncData = useState<IntegrationSyncData>("sync-data");
  const connectionStatus = useState<"connecting" | "connected" | "disconnected" | "error">("sync-connection-status");
  const lastHeartbeat = useState<Date | null>("sync-last-heartbeat");

  // Get sync data for a specific integration
  const getSyncData = (integrationId: string) => {
    return syncData.value?.[integrationId];
  };

  // Get all sync data
  const getAllSyncData = () => {
    return syncData.value || {};
  };

  // Get connection status
  const getConnectionStatus = () => {
    return connectionStatus.value || "disconnected";
  };

  // Get last heartbeat time
  const getLastHeartbeat = () => {
    return lastHeartbeat.value;
  };

  // Check if sync is connected
  const isConnected = () => {
    return connectionStatus.value === "connected";
  };

  // Get cached data for integration type
  const getCachedIntegrationData = (integrationType: string, integrationId: string) => {
    // Use consistent cache keys with appInit.ts and sync manager
    let cacheKey: string;
    if (integrationType === "calendar") {
      cacheKey = `${integrationType}-events-${integrationId}`;
    }
    else if (integrationType === "shopping") {
      cacheKey = `${integrationType}-lists-${integrationId}`;
    }
    else if (integrationType === "todo") {
      cacheKey = `${integrationType}s-${integrationId}`;
    }
    else {
      cacheKey = `${integrationType}-${integrationId}`;
    }
    return nuxtApp.payload.data[cacheKey];
  };

  // Manual reconnect function
  const reconnect = () => {
    if (nuxtApp.$reconnectSync && typeof nuxtApp.$reconnectSync === "function") {
      nuxtApp.$reconnectSync();
    }
  };

  // Get sync status for all integrations
  const getSyncStatus = () => {
    const data = getAllSyncData();
    const status = {
      totalIntegrations: Object.keys(data).length,
      successfulSyncs: 0,
      failedSyncs: 0,
      lastSyncTime: null as Date | null,
      integrations: {} as Record<string, {
        lastSync: Date;
        success: boolean;
        error?: string;
        hasData: boolean;
      }>,
    };

    Object.entries(data).forEach(([integrationId, syncInfo]) => {
      if (syncInfo.success) {
        status.successfulSyncs++;
      }
      else {
        status.failedSyncs++;
      }

      if (!status.lastSyncTime || syncInfo.lastSync > status.lastSyncTime) {
        status.lastSyncTime = syncInfo.lastSync;
      }

      status.integrations[integrationId] = {
        lastSync: syncInfo.lastSync,
        success: syncInfo.success,
        error: syncInfo.error,
        hasData: !!syncInfo.data,
      };
    });

    return status;
  };

  // Get sync data for integrations by type
  const getSyncDataByType = (integrationType: string, integrationsList?: any[]) => {
    const data = getAllSyncData();
    const integrations = integrationsList || [];

    return integrations
      .filter((integration: any) => integration.type === integrationType)
      .map((integration: any) => ({
        integration,
        syncData: data[integration.id],
        cachedData: getCachedIntegrationData(integrationType, integration.id),
      }))
      .filter((item: any) => item.syncData); // Only return integrations with sync data
  };

  // Get sync data for shopping integrations
  const getShoppingSyncData = (integrationsList?: any[]) => {
    return getSyncDataByType("shopping", integrationsList);
  };

  // Get sync data for calendar integrations
  const getCalendarSyncData = (integrationsList?: any[]) => {
    return getSyncDataByType("calendar", integrationsList);
  };

  // Get sync data for todo integrations
  const getTodoSyncData = (integrationsList?: any[]) => {
    return getSyncDataByType("todo", integrationsList);
  };

  // Check if an integration has fresh data (within last 5 minutes)
  const hasFreshData = (integrationId: string) => {
    const data = getSyncData(integrationId);
    if (!data || !data.success)
      return false;

    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    return data.lastSync > fiveMinutesAgo;
  };

  // Get connection health status
  const getConnectionHealth = () => {
    const status = getConnectionStatus();
    const heartbeat = getLastHeartbeat();

    if (status === "connected" && heartbeat) {
      const heartbeatAge = Date.now() - heartbeat.getTime();
      const isHealthy = heartbeatAge < 60000; // Heartbeat within last minute

      return {
        status,
        isHealthy,
        heartbeatAge,
        lastHeartbeat: heartbeat,
      };
    }

    return {
      status,
      isHealthy: false,
      heartbeatAge: null,
      lastHeartbeat: heartbeat,
    };
  };

  return {
    // Data access
    syncData: readonly(syncData),
    connectionStatus: readonly(connectionStatus),
    lastHeartbeat: readonly(lastHeartbeat),

    // Functions
    getSyncData,
    getAllSyncData,
    getConnectionStatus,
    getLastHeartbeat,
    isConnected,
    getCachedIntegrationData,
    reconnect,
    getSyncStatus,
    getSyncDataByType,
    getShoppingSyncData,
    getCalendarSyncData,
    getTodoSyncData,
    hasFreshData,
    getConnectionHealth,
  };
}
