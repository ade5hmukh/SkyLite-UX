import type { Integration } from "~/types/database";
import type { IntegrationSyncData, SyncConnectionStatus, SyncStatus } from "~/types/sync";

export function useSyncManager() {
  const nuxtApp = useNuxtApp();

  const syncData = useState<IntegrationSyncData>("sync-data");
  const connectionStatus = useState<SyncConnectionStatus>("sync-connection-status");
  const lastHeartbeat = useState<Date | null>("sync-last-heartbeat");

  const getSyncData = (integrationId: string) => {
    return syncData.value?.[integrationId];
  };

  const getAllSyncData = () => {
    return syncData.value || {};
  };

  const getConnectionStatus = () => {
    return connectionStatus.value || "disconnected";
  };

  const getLastHeartbeat = () => {
    return lastHeartbeat.value;
  };

  const isConnected = () => {
    return connectionStatus.value === "connected";
  };

  const getCachedIntegrationData = (integrationType: string, integrationId: string) => {
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

  const reconnect = () => {
    if (nuxtApp.$reconnectSync && typeof nuxtApp.$reconnectSync === "function") {
      nuxtApp.$reconnectSync();
    }
  };

  const getSyncStatus = (): SyncStatus => {
    const data = getAllSyncData();
    const status: SyncStatus = {
      totalIntegrations: Object.keys(data).length,
      successfulSyncs: 0,
      failedSyncs: 0,
      lastSyncTime: null,
      integrations: {},
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

  const getSyncDataByType = (integrationType: string, integrationsList?: Integration[]) => {
    const data = getAllSyncData();
    const integrations = integrationsList || [];

    return integrations
      .filter((integration: Integration) => integration.type === integrationType)
      .map((integration: Integration) => ({
        integration,
        syncData: data[integration.id],
        cachedData: getCachedIntegrationData(integrationType, integration.id),
      }))
      .filter(item => item.syncData);
  };

  const getShoppingSyncData = (integrationsList?: Integration[]) => {
    return getSyncDataByType("shopping", integrationsList);
  };

  const getCalendarSyncData = (integrationsList?: Integration[]) => {
    return getSyncDataByType("calendar", integrationsList);
  };

  const getTodoSyncData = (integrationsList?: Integration[]) => {
    return getSyncDataByType("todo", integrationsList);
  };

  const hasFreshData = (integrationId: string) => {
    const data = getSyncData(integrationId);
    if (!data || !data.success)
      return false;

    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    return data.lastSync > fiveMinutesAgo;
  };

  const getConnectionHealth = () => {
    const status = getConnectionStatus();
    const heartbeat = getLastHeartbeat();

    if (status === "connected" && heartbeat) {
      const heartbeatAge = Date.now() - heartbeat.getTime();
      const isHealthy = heartbeatAge < 60000;

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
    syncData: readonly(syncData),
    connectionStatus: readonly(connectionStatus),
    lastHeartbeat: readonly(lastHeartbeat),

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
