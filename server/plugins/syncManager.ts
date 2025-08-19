import type { H3Event } from "h3";

import { consola } from "consola";
import { defineNitroPlugin } from "nitropack/runtime/plugin";

import type { CalendarEvent } from "../../app/types/calendar";
import type { Integration, ShoppingList, Todo } from "../../app/types/database";

import { integrationConfigs } from "../../app/integrations/integrationConfig";
import { createIntegrationService, registerIntegration } from "../../app/types/integrations";

// Types for sync management
type SyncInterval = {
  integrationId: string;
  interval: NodeJS.Timeout;
  lastSync: Date;
  config: typeof integrationConfigs[0];
};

type SyncEvent = {
  type: "integration_sync";
  integrationId: string;
  integrationType: string;
  service: string;
  data: unknown;
  timestamp: Date;
  success: boolean;
  error?: string;
};

type ConnectedClient = {
  event: H3Event;
  lastActivity: Date;
};

// Define specific integration service types
type ShoppingIntegrationService = {
  getShoppingLists: () => Promise<ShoppingList[]>;
  addItemToList?: (listId: string, item: unknown) => Promise<unknown>;
  updateShoppingListItem?: (itemId: string, updates: unknown) => Promise<unknown>;
  toggleItem?: (itemId: string, checked: boolean) => Promise<void>;
  deleteShoppingListItems?: (ids: string[]) => Promise<void>;
};

type TodoIntegrationService = {
  getTodos: () => Promise<Todo[]>;
  addTodo?: (todo: unknown) => Promise<unknown>;
  updateTodo?: (todoId: string, updates: unknown) => Promise<unknown>;
  deleteTodo?: (todoId: string) => Promise<void>;
};

type CalendarIntegrationService = {
  getEvents: () => Promise<CalendarEvent[]>;
  addEvent?: (event: unknown) => Promise<unknown>;
  updateEvent?: (eventId: string, updates: unknown) => Promise<unknown>;
  deleteEvent?: (eventId: string) => Promise<void>;
};

type TypedIntegrationService
  = | ShoppingIntegrationService
    | TodoIntegrationService
    | CalendarIntegrationService;

// Global state for sync management
const syncIntervals = new Map<string, SyncInterval>();
const connectedClients = new Set<ConnectedClient>();
const integrationServices = new Map<string, TypedIntegrationService>();

// Initialize the sync manager
export default defineNitroPlugin(async (nitroApp) => {
  consola.info("Initializing sync manager...");

  // Register integrations for server-side sync
  consola.info("Registering integrations for server-side sync...");
  integrationConfigs.forEach((config) => {
    registerIntegration(config);
  });
  consola.success(`Registered ${integrationConfigs.length} integrations for server-side sync`);

  // Set up periodic cleanup of disconnected clients
  setInterval(() => {
    const now = new Date();
    const disconnectedClients: ConnectedClient[] = [];

    connectedClients.forEach((client) => {
      // Remove clients inactive for more than 5 minutes
      if (now.getTime() - client.lastActivity.getTime() > 5 * 60 * 1000) {
        disconnectedClients.push(client);
      }
    });

    disconnectedClients.forEach((client) => {
      connectedClients.delete(client);
    });

    if (disconnectedClients.length > 0) {
      consola.info(`Cleaned up ${disconnectedClients.length} disconnected clients`);
    }
  }, 60 * 1000); // Check every minute

  // Initialize sync for existing integrations
  await initializeIntegrationSync();

  // Handle nitro app lifecycle
  nitroApp.hooks.hook("close", () => {
    consola.info("Shutting down sync manager...");
    clearAllSyncIntervals();
  });
});

// Initialize sync for all enabled integrations
async function initializeIntegrationSync() {
  try {
    const prisma = await import("../../app/lib/prisma").then(m => m.default);
    const integrations = await prisma.integration.findMany({
      where: { enabled: true },
    });

    for (const integration of integrations) {
      await setupIntegrationSync(integration as Integration);
    }

    consola.info(`Initialized sync for ${integrations.length} integrations`);
  }
  catch (error) {
    consola.error("Failed to initialize integration sync:", error);
  }
}

// Set up sync for a specific integration
export async function setupIntegrationSync(integration: Integration) {
  try {
    const config = integrationConfigs.find(
      c => c.type === integration.type && c.service === integration.service,
    );

    if (!config) {
      consola.warn(`No config found for integration ${integration.id} (${integration.type}:${integration.service})`);
      return;
    }

    // Clear existing interval if any
    clearIntegrationSync(integration.id);

    // Create integration service
    const service = await createIntegrationService(integration);
    if (!service) {
      consola.warn(`Failed to create service for integration ${integration.id}`);
      return;
    }

    await service.initialize();
    integrationServices.set(integration.id, service as unknown as TypedIntegrationService);

    // Set up sync interval (treating syncInterval as minutes)
    const interval = setInterval(async () => {
      await performIntegrationSync(integration, config, service as unknown as TypedIntegrationService);
    }, config.syncInterval * 60 * 1000);

    syncIntervals.set(integration.id, {
      integrationId: integration.id,
      interval,
      lastSync: new Date(),
      config,
    });

    consola.info(`Set up sync for integration ${integration.name} (${integration.id}) - interval: ${config.syncInterval} minutes (no immediate sync)`);
  }
  catch (error) {
    consola.error(`Failed to set up sync for integration ${integration.id}:`, error);
  }
}

// Perform sync for a specific integration
async function performIntegrationSync(
  integration: Integration,
  config: typeof integrationConfigs[0],
  service: TypedIntegrationService,
) {
  const syncStart = new Date();
  let success = false;
  let error: string | undefined;
  let data: unknown = null;

  try {
    consola.debug(`Syncing integration ${integration.name} (${integration.id})...`);

    // Fetch fresh data based on integration type
    switch (integration.type) {
      case "calendar":
        data = await (service as CalendarIntegrationService).getEvents();
        break;
      case "shopping":
        data = await (service as ShoppingIntegrationService).getShoppingLists();
        break;
      case "todo":
        data = await (service as TodoIntegrationService).getTodos();
        break;
      default:
        consola.warn(`Unknown integration type: ${integration.type}`);
        return;
    }

    success = true;
    consola.debug(`Successfully synced integration ${integration.name} (${integration.id})`);
  }
  catch (err) {
    error = err instanceof Error ? err.message : String(err);
    consola.error(`Failed to sync integration ${integration.name} (${integration.id}):`, err);
  }
  finally {
    // Update last sync time
    const syncInterval = syncIntervals.get(integration.id);
    if (syncInterval) {
      syncInterval.lastSync = syncStart;
    }

    // Broadcast sync event to connected clients
    const syncEvent: SyncEvent = {
      type: "integration_sync",
      integrationId: integration.id,
      integrationType: integration.type,
      service: integration.service,
      data,
      timestamp: syncStart,
      success,
      error,
    };

    broadcastToClients(syncEvent);
  }
}

// Broadcast event to all connected clients
function broadcastToClients(event: SyncEvent) {
  if (connectedClients.size === 0) {
    return;
  }

  const eventData = `data: ${JSON.stringify(event)}\n\n`;
  const disconnectedClients: ConnectedClient[] = [];

  connectedClients.forEach((client) => {
    try {
      // Update last activity
      client.lastActivity = new Date();

      // Send the event
      client.event.node.res.write(eventData);
    }
    catch (err) {
      consola.warn("Failed to send event to client, marking for cleanup:", err);
      disconnectedClients.push(client);
    }
  });

  // Clean up disconnected clients
  disconnectedClients.forEach((client) => {
    connectedClients.delete(client);
  });
}

// Clear sync for a specific integration
function clearIntegrationSync(integrationId: string) {
  const syncInterval = syncIntervals.get(integrationId);
  if (syncInterval) {
    clearInterval(syncInterval.interval);
    syncIntervals.delete(integrationId);
    integrationServices.delete(integrationId);
    consola.info(`Cleared sync for integration ${integrationId}`);
  }
}

// Clear all sync intervals
function clearAllSyncIntervals() {
  syncIntervals.forEach((syncInterval) => {
    clearInterval(syncInterval.interval);
  });
  syncIntervals.clear();
  integrationServices.clear();
  connectedClients.clear();
  consola.info("Cleared all sync intervals");
}

// Register a new client connection
export function registerClient(event: H3Event) {
  const client: ConnectedClient = {
    event,
    lastActivity: new Date(),
  };
  connectedClients.add(client);
  consola.info(`New client connected. Total clients: ${connectedClients.size}`);
}

// Unregister a client connection
export function unregisterClient(event: H3Event) {
  const clientToRemove = Array.from(connectedClients).find(
    client => client.event === event,
  );
  if (clientToRemove) {
    connectedClients.delete(clientToRemove);
    consola.info(`Client disconnected. Total clients: ${connectedClients.size}`);
  }
}

// Public API for managing integrations
export const syncManager = {
  setupIntegrationSync,
  clearIntegrationSync,
  clearAllSyncIntervals,
  registerClient,
  unregisterClient,
  getConnectedClientsCount: () => connectedClients.size,
  getActiveSyncIntervals: () => Array.from(syncIntervals.keys()),
};
