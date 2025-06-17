import type { IntegrationService, IntegrationStatus } from "~/types/integrations";
import { integrationRegistry, registerIntegration } from "~/types/integrations";
import { MealieService as ServerMealieService, type MealieShoppingListItem } from "../../../server/utils/mealie";
import type { ShoppingList, ShoppingListItem } from "~/types/database";

// Register the integration
registerIntegration({
  type: "shopping",
  service: "mealie",
  requiredFields: ["apiKey", "baseUrl"],
  capabilities: ["addItems", "deleteItems", "editItems", "getItems", "getLists"],
  icon: "https://cdn.jsdelivr.net/gh/selfhst/icons/svg/mealie.svg",
});

export class MealieService implements IntegrationService {
  private apiKey: string;
  private baseUrl: string;
  private integrationId: string;
  private status: IntegrationStatus = {
    isConnected: false,
    lastChecked: new Date()
  };
  private serverService: ServerMealieService;

  constructor(integrationId: string, apiKey: string, baseUrl: string) {
    this.integrationId = integrationId;
    this.apiKey = apiKey;
    this.baseUrl = baseUrl;
    this.serverService = new ServerMealieService(integrationId);
  }

  async initialize(): Promise<void> {
    await this.validate();
  }

  async validate(): Promise<boolean> {
    try {
      // Use the server service to test connection
      await this.serverService.getShoppingLists();
      
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
    const config = integrationRegistry.get("shopping:mealie");
    return config?.capabilities || [];
  }

  // Mealie-specific methods using server service
  async getShoppingLists(): Promise<ShoppingList[]> {
    const response = await this.serverService.getShoppingLists();
    
    // Transform Mealie response to our database format
    return response.items.map((mealieList) => ({
      id: mealieList.id,
      name: mealieList.name,
      order: 0, // Mealie doesn't have order, default to 0
      createdAt: new Date(mealieList.createdAt),
      updatedAt: new Date(mealieList.updatedAt),
      items: mealieList.listItems.map((mealieItem) => ({
        id: mealieItem.id,
        name: mealieItem.food?.name || mealieItem.display || "Unknown Item",
        checked: mealieItem.checked,
        order: mealieItem.position,
        notes: mealieItem.note || null,
        quantity: mealieItem.quantity,
        unit: mealieItem.unit?.name || null,
        label: mealieItem.label?.name || null
      } as ShoppingListItem)),
      _count: {
        items: mealieList.listItems.length
      }
    }));
  }

  async getShoppingList(id: string): Promise<ShoppingList> {
    const mealieList = await this.serverService.getShoppingList(id);
    
    return {
      id: mealieList.id,
      name: mealieList.name,
      order: 0, // Mealie doesn't have order, default to 0
      createdAt: new Date(mealieList.createdAt),
      updatedAt: new Date(mealieList.updatedAt),
      items: mealieList.listItems.map((mealieItem) => ({
        id: mealieItem.id,
        name: mealieItem.food?.name || mealieItem.display || "Unknown Item",
        checked: mealieItem.checked,
        order: mealieItem.position,
        notes: mealieItem.note || null,
        quantity: mealieItem.quantity,
        unit: mealieItem.unit?.name || null,
        label: mealieItem.label?.name || null
      } as ShoppingListItem)),
      _count: {
        items: mealieList.listItems.length
      }
    };
  }

  async createShoppingList(name: string) {
    return await this.serverService.createShoppingList({ name });
  }

  async updateShoppingList(id: string, name: string) {
    return await this.serverService.updateShoppingList(id, { name });
  }

  async deleteShoppingList(id: string) {
    return await this.serverService.deleteShoppingList(id);
  }

  async addItemToList(listId: string, item: {
    name: string;
    quantity: number;
    unit?: string;
    notes?: string;
  }): Promise<ShoppingListItem> {
    // Convert to Mealie format - only include required fields for creation
    const mealieItem = {
      shoppingListId: listId,
      quantity: item.quantity,
      note: item.notes || "",
      food: { name: item.name },
      isFood: true,
      disableAmount: false,
      checked: false
    } as any; // Use any to bypass strict typing for API compatibility

    const result = await this.serverService.createShoppingListItems([mealieItem]);
    const createdItem = result[0];
    
    if (!createdItem) {
      throw new Error("Failed to create shopping list item");
    }
    
    // Transform back to our database format
    return {
      id: createdItem.id,
      name: createdItem.food?.name || createdItem.display || "Unknown Item",
      checked: createdItem.checked,
      order: createdItem.position,
      notes: createdItem.note || null,
      quantity: createdItem.quantity,
      unit: createdItem.unit?.name || null,
      label: createdItem.label?.name || null
    };
  }

  async getFoods() {
    return await this.serverService.getFoods();
  }

  async createFood(data: { name: string, pluralName?: string }) {
    return await this.serverService.createFood(data);
  }

  async getUnits() {
    return await this.serverService.getUnits();
  }

  async createUnit(data: { name: string, pluralName?: string }) {
    return await this.serverService.createUnit(data);
  }

  async updateShoppingListItem(item: any) {
    return await this.serverService.updateShoppingListItem([item]);
  }

  async deleteShoppingListItems(ids: string[]) {
    return await this.serverService.deleteShoppingListItems(ids);
  }
} 