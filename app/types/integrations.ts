import type { Integration } from "./database";
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

// Factory to create integration service instances
export async function createIntegrationService(integration: Integration): Promise<IntegrationService | null> {
  const key = `${integration.type}:${integration.service}`;
  const config = integrationRegistry.get(key);
  
  if (!config) {
    consola.warn(`No integration implementation found for ${key}`);
    return null;
  }
  
  try {
    // Import and instantiate the appropriate service
    if (integration.type === "shopping" && integration.service === "mealie") {
      const { MealieService } = await import("~/integrations/mealie/mealieShoppingLists");
      return new MealieService(integration.id, integration.apiKey || "", integration.baseUrl || "");
    }
    
    if (integration.type === "shopping" && integration.service === "tandoor") {
      const { TandoorService } = await import("~/integrations/tandoor/tandoorShoppingLists");
      return new TandoorService(integration.id, integration.apiKey || "", integration.baseUrl || "");
    }
    
    consola.warn(`No service implementation found for ${key}`);
    return null;
  } catch (error) {
    consola.error(`Error creating integration service for ${key}:`, error);
    return null;
  }
} 