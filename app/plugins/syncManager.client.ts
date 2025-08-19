import { consola } from "consola";

// Types for sync events
type SyncEvent = {
  type: "integration_sync" | "connection_established" | "sync_status" | "heartbeat";
  integrationId?: string;
  integrationType?: string;
  service?: string;
  data?: unknown;
  timestamp: Date;
  success?: boolean;
  error?: string;
  message?: string;
  activeIntegrations?: string[];
  connectedClients?: number;
};

type IntegrationSyncData = {
  [integrationId: string]: {
    data: unknown;
    lastSync: Date;
    success: boolean;
    error?: string;
  };
};

export default defineNuxtPlugin(() => {
  const syncData = useState<IntegrationSyncData>("sync-data", () => ({}));
  const connectionStatus = useState<"connecting" | "connected" | "disconnected" | "error">("sync-connection-status", () => "disconnected");
  const lastHeartbeat = useState<Date | null>("sync-last-heartbeat", () => null);

  // Use native EventSource for SSE connection
  let eventSource: EventSource | null = null;
  const eventSourceData = ref<string | null>(null);
  const eventSourceStatus = ref<"CONNECTING" | "OPEN" | "CLOSED">("CLOSED");
  const eventSourceError = ref<Event | null>(null);

  function connectEventSource() {
    try {
      eventSource = new EventSource("/api/sync/events");

      eventSource.onopen = () => {
        eventSourceStatus.value = "OPEN";
        connectionStatus.value = "connected";
        consola.info("Connected to sync stream");
      };

      eventSource.onmessage = (event) => {
        eventSourceData.value = event.data;
      };

      eventSource.onerror = (error) => {
        eventSourceStatus.value = "CLOSED";
        connectionStatus.value = "error";
        eventSourceError.value = error;
        consola.error("EventSource error:", error);
      };

      eventSourceStatus.value = "CONNECTING";
      connectionStatus.value = "connecting";
    }
    catch (error) {
      consola.error("Failed to create EventSource:", error);
      connectionStatus.value = "error";
    }
  }

  // Connect on plugin initialization
  connectEventSource();

  // Auto-reconnection logic
  let reconnectAttempts = 0;
  const maxReconnectAttempts = 3;
  const reconnectDelay = 1000;

  function attemptReconnect() {
    if (reconnectAttempts >= maxReconnectAttempts) {
      consola.error("Failed to reconnect to sync stream after 3 attempts");
      connectionStatus.value = "error";
      return;
    }

    setTimeout(() => {
      consola.info(`Attempting to reconnect to sync stream (attempt ${reconnectAttempts + 1}/${maxReconnectAttempts})`);
      reconnectAttempts++;
      connectEventSource();
    }, reconnectDelay * reconnectAttempts);
  }

  // Watch for connection status changes
  watch(eventSourceStatus, (newStatus) => {
    switch (newStatus) {
      case "CONNECTING":
        connectionStatus.value = "connecting";
        break;
      case "OPEN":
        connectionStatus.value = "connected";
        reconnectAttempts = 0; // Reset reconnect attempts on successful connection
        break;
      case "CLOSED":
        connectionStatus.value = "disconnected";
        if (reconnectAttempts < maxReconnectAttempts) {
          attemptReconnect();
        }
        break;
    }
  });

  // Watch for SSE data and process events
  watch(eventSourceData, (rawData) => {
    if (!rawData)
      return;

    try {
      const event: SyncEvent = JSON.parse(rawData);
      consola.debug("Received sync event:", event.type, event);

      switch (event.type) {
        case "connection_established":
          consola.info("Connected to sync stream:", event.message);
          break;

        case "sync_status":
          consola.info(`Sync status: ${event.activeIntegrations?.length || 0} active integrations, ${event.connectedClients || 0} connected clients`);
          break;

        case "heartbeat":
          lastHeartbeat.value = new Date(event.timestamp);
          break;

        case "integration_sync":
          if (event.integrationId) {
            // Store sync data in Nuxt cache
            syncData.value[event.integrationId] = {
              data: event.data,
              lastSync: new Date(event.timestamp),
              success: event.success || false,
              error: event.error,
            };

            // Trigger cache updates for specific integration types
            if (event.integrationType && event.success) {
              updateIntegrationCache(event.integrationType, event.integrationId, event.data);
            }

            consola.debug(`Updated sync data for integration ${event.integrationId}:`, {
              success: event.success,
              hasData: !!event.data,
              error: event.error,
            });
          }
          break;
      }
    }
    catch (error) {
      consola.error("Failed to parse sync event:", error, rawData);
    }
  });

  // Watch for connection errors
  watch(eventSourceError, (error) => {
    if (error) {
      consola.error("Sync stream error:", error);
      connectionStatus.value = "error";
    }
  });

  // Function to update integration-specific caches
  function updateIntegrationCache(integrationType: string, integrationId: string, data: unknown) {
    const nuxtApp = useNuxtApp();

    switch (integrationType) {
      case "calendar":
        // Update calendar events cache
        nuxtApp.payload.data = {
          ...nuxtApp.payload.data,
          [`calendar-events-${integrationId}`]: data,
        };
        break;

      case "shopping":
        // Update shopping lists cache
        nuxtApp.payload.data = {
          ...nuxtApp.payload.data,
          [`shopping-lists-${integrationId}`]: data,
        };
        break;

      case "todo":
        // Update todos cache
        nuxtApp.payload.data = {
          ...nuxtApp.payload.data,
          [`todos-${integrationId}`]: data,
        };
        break;
    }
  }

  // Cleanup function
  function cleanup() {
    if (eventSource) {
      eventSource.close();
      eventSource = null;
    }
  }

  // Cleanup on page unload
  if (import.meta.client) {
    window.addEventListener("beforeunload", cleanup);
  }

  // Provide composables for components to access sync data
  return {
    provide: {
      // Get sync data for a specific integration
      getSyncData: (integrationId: string) => {
        return syncData.value[integrationId];
      },

      // Get all sync data
      getAllSyncData: () => {
        return syncData.value;
      },

      // Get connection status
      getSyncConnectionStatus: () => {
        return connectionStatus.value;
      },

      // Get last heartbeat time
      getLastHeartbeat: () => {
        return lastHeartbeat.value;
      },

      // Check if sync is connected
      isSyncConnected: () => {
        return connectionStatus.value === "connected";
      },

      // Get cached data for integration type
      getCachedIntegrationData: (integrationType: string, integrationId: string) => {
        const nuxtApp = useNuxtApp();
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
      },

      // Manual reconnect function
      reconnectSync: () => {
        cleanup();
        reconnectAttempts = 0;
        connectEventSource();
      },
    },
  };
});
