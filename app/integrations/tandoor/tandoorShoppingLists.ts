import type { IntegrationService, IntegrationStatus } from "~/types/integrations";
import { integrationRegistry } from "~/types/integrations";
import { TandoorService as ServerTandoorService } from "../../../server/utils/tandoor";
import type { ShoppingList, ShoppingListItem } from "~/types/database";
import { consola } from "consola";

export class TandoorService implements IntegrationService {
  private apiKey: string;
  private baseUrl: string;
  private integrationId: string;
  private status: IntegrationStatus = {
    isConnected: false,
    lastChecked: new Date()
  };
  private serverService: ServerTandoorService;

  constructor(integrationId: string, apiKey: string, baseUrl: string) {
    this.integrationId = integrationId;
    this.apiKey = apiKey;
    this.baseUrl = baseUrl;
    this.serverService = new ServerTandoorService(integrationId);
  }

  async initialize(): Promise<void> {
    await this.validate();
  }

  async validate(): Promise<boolean> {
    try {
      // Use the server service to test connection
      await this.serverService.getShoppingListEntries();
      
      this.status = {
        isConnected: true,
        lastChecked: new Date()
      };
      
      return true;
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
    try {
      // For connection testing, make a direct API call instead of using the server proxy
      // since the integration doesn't exist in the database yet
      const response = await fetch(`${this.baseUrl}/api/shopping-list-entry/`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
          'Host': 'localhost', // Tandoor requires localhost as the Host header
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        consola.error('Tandoor API error:', response.status, response.statusText, errorText);
        this.status = {
          isConnected: false,
          lastChecked: new Date(),
          error: `API error: ${response.status} ${response.statusText}`
        };
        return false;
      }

      // Try to parse the response to ensure it's valid JSON
      const data = await response.json();
      
      this.status = {
        isConnected: true,
        lastChecked: new Date()
      };
      
      return true;
    } catch (error) {
      consola.error('Tandoor connection test error:', error);
      this.status = {
        isConnected: false,
        lastChecked: new Date(),
        error: error instanceof Error ? error.message : "Unknown error"
      };
      return false;
    }
  }

  async getCapabilities(): Promise<string[]> {
    const config = integrationRegistry.get("shopping:tandoor");
    return config?.capabilities || [];
  }

  // Tandoor-specific methods using server service
  async getShoppingLists(): Promise<ShoppingList[]> {
    try {
      // Tandoor doesn't have separate lists, so we return the entries as a single list
      const entries = await this.serverService.getShoppingListEntries();
      
      // Add null/undefined checks
      if (!entries || !Array.isArray(entries)) {
        consola.warn('Tandoor service returned invalid entries:', entries);
        return [];
      }
      
      // Transform Tandoor entries to our database format
      const items: ShoppingListItem[] = entries.map((entry, index) => ({
        id: entry.id.toString(),
        name: entry.food?.name || "Unknown Item",
        checked: entry.checked,
        order: entry.order || index,
        notes: null, // Tandoor doesn't have notes field
        quantity: entry.amount,
        unit: entry.unit?.name || null,
        label: null // Tandoor doesn't have labels
      }));

      return [{
        id: "default",
        name: "Shopping List",
        order: 0,
        createdAt: new Date(), // Tandoor doesn't provide list creation date
        updatedAt: new Date(), // Tandoor doesn't provide list update date
        items,
        _count: {
          items: items.length
        }
      }];
    } catch (error) {
      consola.error('Error fetching Tandoor shopping lists:', error);
      return [];
    }
  }

  async getShoppingListEntries() {
    return await this.serverService.getShoppingListEntries();
  }

  async getShoppingListEntry(id: number) {
    return await this.serverService.getShoppingListEntry(id);
  }

  async createShoppingListEntry(data: {
    food: { name: string };
    unit?: { name: string };
    amount: string;
    list_recipe?: number;
  }) {
    return await this.serverService.createShoppingListEntry(data);
  }

  async updateShoppingListEntry(id: number, data: {
    amount?: string;
    checked?: boolean;
    order?: number;
  }) {
    return await this.serverService.updateShoppingListEntry(id, data);
  }

  async deleteShoppingListEntry(id: number) {
    return await this.serverService.deleteShoppingListEntry(id);
  }

  async searchFoods(query: string) {
    return await this.serverService.searchFoods(query);
  }

  async getUnits() {
    return await this.serverService.getUnits();
  }

  async addItemToList(listId: string, item: {
    name: string;
    quantity: number;
    unit?: string;
    notes?: string;
  }): Promise<ShoppingListItem> {
    // Convert to Tandoor format
    const tandoorItem = {
      food: { name: item.name },
      unit: item.unit ? { name: item.unit } : undefined,
      amount: item.quantity.toString(),
      list_recipe: undefined
    };

    const createdEntry = await this.serverService.createShoppingListEntry(tandoorItem);
    
    // Transform back to our database format
    return {
      id: createdEntry.id.toString(),
      name: createdEntry.food.name,
      checked: createdEntry.checked,
      order: createdEntry.order,
      notes: null, // Tandoor doesn't support notes
      quantity: createdEntry.amount,
      unit: createdEntry.unit?.name || null,
      label: null // Tandoor doesn't support labels
    };
  }

  async getShoppingList(id: string): Promise<ShoppingList> {
    // For Tandoor, we only have one list, so we return the same as getShoppingLists
    const lists = await this.getShoppingLists();
    const list = lists.find(l => l.id === id);
    
    if (!list) {
      throw new Error(`Shopping list with id ${id} not found`);
    }
    
    return list;
  }

  async toggleItem(itemId: string, checked: boolean): Promise<ShoppingListItem> {
    try {
      // Update the shopping list entry
      const updatedEntry = await this.serverService.updateShoppingListEntry(parseInt(itemId), {
        checked: checked
      });
      
      // Transform back to our database format
      return {
        id: updatedEntry.id.toString(),
        name: updatedEntry.food.name,
        checked: updatedEntry.checked,
        order: updatedEntry.order,
        notes: null, // Tandoor doesn't support notes
        quantity: updatedEntry.amount,
        unit: updatedEntry.unit?.name || null,
        label: null // Tandoor doesn't support labels
      };
    } catch (error) {
      consola.error(`Error toggling item ${itemId}:`, error);
      throw new Error(`Failed to toggle item: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
} 