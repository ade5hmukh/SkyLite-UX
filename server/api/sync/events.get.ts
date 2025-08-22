import { consola } from "consola";
import { createError, defineEventHandler, setResponseHeaders } from "h3";

import { syncManager } from "../../plugins/syncManager";

export default defineEventHandler(async (event) => {
  try {
    setResponseHeaders(event, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Cache-Control",
    });

    syncManager.registerClient(event);

    const initialEvent = {
      type: "connection_established",
      timestamp: new Date(),
      message: "Connected to sync stream",
    };

    event.node.res.write(`data: ${JSON.stringify(initialEvent)}\n\n`);

    const activeSyncIntervals = syncManager.getActiveSyncIntervals();
    const statusEvent = {
      type: "sync_status",
      timestamp: new Date(),
      activeIntegrations: activeSyncIntervals,
      connectedClients: syncManager.getConnectedClientsCount(),
    };

    event.node.res.write(`data: ${JSON.stringify(statusEvent)}\n\n`);

    const heartbeatInterval = setInterval(() => {
      try {
        const heartbeatEvent = {
          type: "heartbeat",
          timestamp: new Date(),
        };
        event.node.res.write(`data: ${JSON.stringify(heartbeatEvent)}\n\n`);
      }
      catch {
        consola.warn("Failed to send heartbeat, client may have disconnected");
        clearInterval(heartbeatInterval);
      }
    }, 30000);

    event.node.req.on("close", () => {
      consola.info("Client disconnected from sync stream");
      clearInterval(heartbeatInterval);
      syncManager.unregisterClient(event);
    });

    event.node.req.on("error", (err) => {
      if (import.meta.dev && err.message?.includes("aborted")) {
        consola.debug("Client disconnected (expected during dev)");
      }
      else {
        consola.error("Error in sync stream connection:", err);
      }
      clearInterval(heartbeatInterval);
      syncManager.unregisterClient(event);
    });

    return new Promise(() => {
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
