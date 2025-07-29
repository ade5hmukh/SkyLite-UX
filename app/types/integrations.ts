import consola from "consola";

import type { DialogField, ICalSettings, IntegrationSettingsField } from "~/integrations/integrationConfig";
import type { CalendarEvent } from "~/types/calendar";

import { getServiceFactories, integrationConfigs } from "~/integrations/integrationConfig";

import type { Integration } from "./database";

export type IntegrationService = {
  initialize: () => Promise<void>;
  validate: () => Promise<boolean>;
  getStatus: () => Promise<IntegrationStatus>;

  testConnection?: () => Promise<boolean>;
  getCapabilities?: () => Promise<string[]>;
};

export type IntegrationStatus = {
  isConnected: boolean;
  lastChecked: Date;
  error?: string;
};

export type CalendarIntegrationService = IntegrationService & {
  getEvents: () => Promise<CalendarEvent[]>;
  // Future: addEvent, updateEvent, deleteEvent
};

export type IntegrationConfig = {
  type: string;
  service: string;
  settingsFields: IntegrationSettingsField[];
  capabilities: string[];
  icon: string;
  files: string[];
  dialogFields: DialogField[];
};

export const integrationRegistry = new Map<string, IntegrationConfig>();

export function registerIntegration(config: IntegrationConfig) {
  const key = `${config.type}:${config.service}`;
  integrationRegistry.set(key, config);
}

let isInitialized = false;

function ensureInitialized() {
  if (!isInitialized) {
    for (const config of integrationConfigs) {
      const key = `${config.type}:${config.service}`;
      integrationRegistry.set(key, config);
    }
    isInitialized = true;
  }
}

export async function createIntegrationService(integration: Integration): Promise<IntegrationService | null> {
  ensureInitialized();
  try {
    const key = `${integration.type}:${integration.service}`;
    const serviceFactory = getServiceFactories().find(sf => sf.key === key);

    if (!serviceFactory) {
      consola.warn(`No service factory found for integration type: ${key}`);
      return null;
    }

    return serviceFactory.factory(integration.id, integration.apiKey || "", integration.baseUrl || "", integration.settings as ICalSettings);
  }
  catch (error) {
    consola.error(`Failed to create integration service for ${integration.type}:${integration.service}:`, error);
    return null;
  }
}
