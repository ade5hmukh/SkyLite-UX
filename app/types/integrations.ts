import type { Integration } from "./database";

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

// Factory to create integration service instances
export function createIntegrationService(integration: Integration): IntegrationService | null {
  const key = `${integration.type}:${integration.service}`;
  const config = integrationRegistry.get(key);
  
  if (!config) {
    console.warn(`No integration implementation found for ${key}`);
    return null;
  }
  
  // Import and instantiate the appropriate service
  // This will be implemented by each integration
  return null;
} 