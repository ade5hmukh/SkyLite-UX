import type { IntegrationService, IntegrationStatus } from "~/types/integrations";
import { registerIntegration, integrationRegistry } from "~/types/integrations";
import { TandoorService as ServerTandoorService } from "../../../server/utils/tandoor";
import type { ShoppingList, ShoppingListItem } from "~/types/database";

// Register the integration
registerIntegration({
  type: "shopping",
  service: "tandoor",
  requiredFields: ["apiKey", "baseUrl"],
  capabilities: ["addItems", "deleteItems", "editItems", "getItems", "getLists"],
  icon: "https://cdn.jsdelivr.net/gh/selfhst/icons/svg/tandoor-recipes.svg",
});

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
    this.serverService = new ServerTandoorService(apiKey, baseUrl, integrationId);
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
    return this.validate();
  }

  async getCapabilities(): Promise<string[]> {
    const config = integrationRegistry.get("shopping:tandoor");
    return config?.capabilities || [];
  }

  // Tandoor-specific methods using server service
  async getShoppingLists(): Promise<ShoppingList[]> {
    // Tandoor doesn't have separate lists, so we return the entries as a single list
    const entries = await this.serverService.getShoppingListEntries();
    
    // Transform Tandoor entries to our database format
    const items: ShoppingListItem[] = entries.map((entry, index) => ({
      id: entry.id.toString(),
      name: entry.food.name,
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
} 