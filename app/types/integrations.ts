import type { Integration } from "./database";
import { integrationConfigs, getServiceFactories } from "~/integrations/integrationConfig";
import { consola } from "consola";

export interface IntegrationService {
  // Core service methods
  initialize(): Promise<void>;
  validate(): Promise<boolean>;
  getStatus(): Promise<IntegrationStatus>;
  
  // Optional methods that integrations can implement
  testConnection?(): Promise<boolean>;
  getCapabilities?(): Promise<string[]>;
}

export interface IntegrationStatus {
  isConnected: boolean;
  lastChecked: Date;
  error?: string;
}

export interface IntegrationConfig {
  type: string;
  service: string;
  requiredFields: string[];
  optionalFields?: string[];
  capabilities?: string[];
  icon: string;
}

// Registry to store all available integration configurations
export const integrationRegistry = new Map<string, IntegrationConfig>();

// Simple registration function
export function registerIntegration(config: IntegrationConfig) {
  const key = `${config.type}:${config.service}`;
  integrationRegistry.set(key, config);
}

// Register all integration configurations
for (const config of integrationConfigs) {
  const key = `${config.type}:${config.service}`;
  integrationRegistry.set(key, config);
}

// Factory to create integration service instances
export async function createIntegrationService(integration: Integration): Promise<IntegrationService | null> {
  try {
    const key = `${integration.type}:${integration.service}`;
    const serviceFactory = getServiceFactories().find(sf => sf.key === key);
    
    if (!serviceFactory) {
      consola.warn(`No service factory found for integration type: ${key}`);
      return null;
    }
    
    return serviceFactory.factory(integration.id, integration.apiKey || "", integration.baseUrl || "");
  }
  catch (error) {
    consola.error(`Failed to create integration service for ${integration.type}:${integration.service}:`, error);
    return null;
  }
} 