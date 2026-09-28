import { consola } from "consola";

export type NtfyMessage = {
  title: string;
  message: string;
  tags?: string[];
  priority?: 1 | 2 | 3 | 4 | 5;
};

function getNtfyConfig() {
  const config = useRuntimeConfig().ntfy as { url?: string; topic?: string; token?: string } | undefined;
  const url = String(config?.url || "").trim().replace(/\/+$/, "");
  const topic = String(config?.topic || "").trim();
  const token = String(config?.token || "").trim();
  return { url, topic, token };
}

export function isNtfyConfigured() {
  const { url, topic } = getNtfyConfig();
  return Boolean(url && topic);
}

/** Publishes to ntfy. The server URL, topic and token are never logged. */
export async function sendNtfy(notification: NtfyMessage): Promise<boolean> {
  const { url, topic, token } = getNtfyConfig();
  if (!url || !topic) {
    return false;
  }

  try {
    // JSON publishing (POST to the server root) allows non-ASCII titles, unlike the Title header.
    await $fetch(url, {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      body: {
        topic,
        title: notification.title,
        message: notification.message,
        tags: notification.tags,
        priority: notification.priority,
      },
      timeout: 10_000,
    });
    return true;
  }
  catch (error) {
    const status = (error as { statusCode?: number }).statusCode;
    consola.warn(`Notifications: ntfy publish failed${status ? ` (HTTP ${status})` : ""}`);
    return false;
  }
}
