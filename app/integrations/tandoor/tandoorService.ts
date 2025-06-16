import type { IntegrationService, IntegrationStatus } from "~/types/integrations";
import { registerIntegration } from "~/types/integrations";

// Register the integration
registerIntegration({
  type: "shopping",
  service: "tandoor",
  requiredFields: ["apiKey", "baseUrl"],
  capabilities: ["shopping-lists", "recipes", "meal-planning"]
});

export class TandoorService implements IntegrationService {
  private apiKey: string;
  private baseUrl: string;
  private integrationId: string;
  private status: IntegrationStatus = {
    isConnected: false,
    lastChecked: new Date()
  };

  constructor(integrationId: string, apiKey: string, baseUrl: string) {
    this.integrationId = integrationId;
    this.apiKey = apiKey;
    this.baseUrl = baseUrl;
  }

  async initialize(): Promise<void> {
    await this.validate();
  }

  async validate(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/api/`, {
        headers: {
          "Authorization": `Bearer ${this.apiKey}`
        }
      });
      
      this.status = {
        isConnected: response.ok,
        lastChecked: new Date(),
        error: response.ok ? undefined : `HTTP ${response.status}`
      };
      
      return response.ok;
    } catch (error) {
      this.status = {
        isConnected: false,
        lastChecked: new Date(),
        error: error instanceof Error ? error.message : "Unknown error"
      };
      return false;
    }
  }

  async getStatus(): Promise<IntegrationStatus> {
    return this.status;
  }

  async testConnection(): Promise<boolean> {
    return this.validate();
  }

  async getCapabilities(): Promise<string[]> {
    return ["shopping-lists", "recipes", "meal-planning"];
  }

  // Tandoor-specific methods
  async getShoppingLists() {
    // Implementation
  }

  async getRecipes() {
    // Implementation
  }
} 