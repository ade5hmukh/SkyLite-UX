import { consola } from "consola";
import { createError, defineEventHandler, setResponseHeaders } from "h3";

import { syncManager } from "../../plugins/syncManager";

export default defineEventHandler(async (event) => {
  try {
    // Set SSE headers
    setResponseHeaders(event, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Cache-Control",
    });

    // Register this client with the sync manager
    syncManager.registerClient(event);

    // Send initial connection event
    const initialEvent = {
      type: "connection_established",
      timestamp: new Date(),
      message: "Connected to sync stream",
    };

    event.node.res.write(`data: ${JSON.stringify(initialEvent)}\n\n`);

    // Send current sync status
    const activeSyncIntervals = syncManager.getActiveSyncIntervals();
    const statusEvent = {
      type: "sync_status",
      timestamp: new Date(),
      activeIntegrations: activeSyncIntervals,
      connectedClients: syncManager.getConnectedClientsCount(),
    };

    event.node.res.write(`data: ${JSON.stringify(statusEvent)}\n\n`);

    // Keep connection alive with periodic heartbeat
    const heartbeatInterval = setInterval(() => {
      try {
        const heartbeatEvent = {
          type: "heartbeat",
          timestamp: new Date(),
        };
        event.node.res.write(`data: ${JSON.stringify(heartbeatEvent)}\n\n`);
      }
      catch (err) {
        consola.warn("Failed to send heartbeat, client may have disconnected");
        clearInterval(heartbeatInterval);
      }
    }, 30000); // Send heartbeat every 30 seconds

    // Handle client disconnect
    event.node.req.on("close", () => {
      consola.info("Client disconnected from sync stream");
      clearInterval(heartbeatInterval);
      syncManager.unregisterClient(event);
    });

    event.node.req.on("error", (err) => {
      // Don't log expected disconnections during development
      if (import.meta.dev && err.message?.includes("aborted")) {
        consola.debug("Client disconnected (expected during dev)");
      }
      else {
        consola.error("Error in sync stream connection:", err);
      }
      clearInterval(heartbeatInterval);
      syncManager.unregisterClient(event);
    });

    // Keep the connection open
    return new Promise(() => {
      // This promise never resolves, keeping the connection alive
    });
  }
  catch (error) {
    consola.error("Error setting up sync stream:", error);
    throw createError({
      statusCode: 500,
      message: "Failed to establish sync stream",
    });
  }
});
