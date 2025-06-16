import type { IntegrationService, IntegrationStatus } from "~/types/integrations";
import { registerIntegration } from "~/types/integrations";

// Register the integration
registerIntegration({
  type: "shopping",
  service: "mealie",
  requiredFields: ["apiKey", "baseUrl"],
  capabilities: ["shopping-lists", "recipes", "meal-planning", "categories"]
});

export class MealieService implements IntegrationService {
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
      const response = await fetch(`${this.baseUrl}/api/app/about`, {
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
    return ["shopping-lists", "recipes", "meal-planning", "categories"];
  }

  // Mealie-specific methods
  async getShoppingLists() {
    const response = await fetch(`${this.baseUrl}/api/shopping/lists`, {
      headers: {
        "Authorization": `Bearer ${this.apiKey}`
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch shopping lists: ${response.statusText}`);
    }

    return response.json();
  }

  async getRecipes() {
    const response = await fetch(`${this.baseUrl}/api/recipes`, {
      headers: {
        "Authorization": `Bearer ${this.apiKey}`
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch recipes: ${response.statusText}`);
    }

    return response.json();
  }

  async getCategories() {
    const response = await fetch(`${this.baseUrl}/api/categories`, {
      headers: {
        "Authorization": `Bearer ${this.apiKey}`
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch categories: ${response.statusText}`);
    }

    return response.json();
  }

  async createShoppingList(name: string) {
    const response = await fetch(`${this.baseUrl}/api/shopping/lists`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${this.apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ name })
    });

    if (!response.ok) {
      throw new Error(`Failed to create shopping list: ${response.statusText}`);
    }

    return response.json();
  }

  async addItemToList(listId: string, item: {
    name: string;
    quantity: number;
    unit?: string;
    notes?: string;
  }) {
    const response = await fetch(`${this.baseUrl}/api/shopping/lists/${listId}/items`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${this.apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(item)
    });

    if (!response.ok) {
      throw new Error(`Failed to add item to list: ${response.statusText}`);
    }

    return response.json();
  }
} 