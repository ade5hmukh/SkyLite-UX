import type { IntegrationService, IntegrationStatus } from "~/types/integrations";
import { integrationRegistry } from "~/types/integrations";
import { MealieService as ServerMealieService } from "../../../server/utils/mealieShoppingLists";
import type { ShoppingList, ShoppingListItem } from "~/types/database";
import { consola } from "consola";

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
    try {
      // For connection testing, make a direct API call instead of using the server proxy
      // since the integration doesn't exist in the database yet
      const response = await fetch(`${this.baseUrl}/api/households/shopping/lists`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        consola.error('Mealie API error:', response.status, response.statusText, errorText);
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
      consola.error('Mealie connection test error:', error);
      this.status = {
        isConnected: false,
        lastChecked: new Date(),
        error: error instanceof Error ? error.message : "Unknown error"
      };
      return false;
    }
  }

  async getCapabilities(): Promise<string[]> {
    const config = integrationRegistry.get("shopping:mealie");
    return config?.capabilities || [];
  }

  // Mealie-specific methods using server service
  async getShoppingLists(): Promise<ShoppingList[]> {
    try {
      const response = await this.serverService.getShoppingLists();
      
      // Add null/undefined checks
      if (!response || !response.items || !Array.isArray(response.items)) {
        consola.warn('Mealie service returned invalid response:', response);
        return [];
      }
      
      // Transform Mealie response to our database format
      // We need to fetch each list individually to get its items
      const shoppingLists: ShoppingList[] = [];
      
      for (const mealieList of response.items) {
        try {
          // Get the full list with items
          const fullList = await this.serverService.getShoppingList(mealieList.id);
          
          shoppingLists.push({
            id: fullList.id,
            name: fullList.name,
            order: 0, // Mealie doesn't have order, default to 0
            createdAt: new Date(fullList.createdAt),
            updatedAt: new Date(fullList.updatedAt),
            items: fullList.listItems?.map((mealieItem) => ({
              id: mealieItem.id,
              name: mealieItem.food?.name || mealieItem.note || "Unknown Item",
              checked: mealieItem.checked,
              order: mealieItem.position,
              notes: mealieItem.note === mealieItem.display || mealieItem.quantity > 0 ? null : mealieItem.note,
              quantity: mealieItem.quantity,
              unit: mealieItem.unit?.name || null,
              label: mealieItem.label?.name || null,
              integrationData: mealieItem as any // Store the complete original Mealie data
            } as ShoppingListItem)) || [],
            _count: {
              items: fullList.listItems?.length || 0
            }
          });
        } catch (listError) {
          consola.error(`Error fetching list ${mealieList.id}:`, listError);
          // Continue with other lists even if one fails
        }
      }
      
      return shoppingLists;
    } catch (error) {
      consola.error('Error fetching Mealie shopping lists:', error);
      throw error; // Re-throw the error so useShoppingIntegrations can handle it
    }
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
    // Convert to Mealie format with the correct schema for creation
    const mealieItem = {
      quantity: Math.max(1, item.quantity), // Ensure quantity is 1 or more
      unit: null, // Should be null for creation
      food: null, // Should be null for creation
      note: item.name, // Use the item name as the note
      isFood: false, 
      disableAmount: true, 
      display: item.name,
      shoppingListId: listId,
      checked: false,
      position: 0,
      foodId: null,
      labelId: null,
      unitId: null,
      extras: {},
      id: null,
      recipeReferences: []
    };

    // Send single item object, not array
    const createdItem = await this.serverService.createShoppingListItem(mealieItem);
    
    if (!createdItem) {
      throw new Error("Failed to create shopping list item");
    }
    
    // Transform back to our database format
    return {
      id: createdItem.id || '',
      name: createdItem.food?.name || createdItem.note || createdItem.display || item.name || "Unknown Item",
      checked: createdItem.checked,
      order: createdItem.position,
      notes: createdItem.note === createdItem.display || createdItem.quantity > 0 ? null : createdItem.note,
      quantity: createdItem.quantity,
      unit: createdItem.unit?.name || null,
      label: createdItem.label?.name || null,
      integrationData: createdItem as any // Store the complete original Mealie data
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

  async updateShoppingListItem(itemId: string, updates: any): Promise<ShoppingListItem> {
    try {
      // We need to find the item in one of the lists to get its full data
      const lists = await this.getShoppingLists();
      let targetItem: any = null;
      
      // Find the item across all lists
      for (const list of lists) {
        const item = list.items?.find(i => i.id === itemId);
        if (item) {
          targetItem = item;
          break;
        }
      }
      
      if (!targetItem) {
        throw new Error(`Item ${itemId} not found in any shopping list`);
      }
      
      // Use the stored original Mealie data and apply updates
      const originalData = targetItem.integrationData;
      if (!originalData) {
        throw new Error(`No integration data found for item ${itemId}`);
      }
      
      const updateData = {
        ...originalData,
        ...updates // Apply the updates
      };
      
      // Use the individual item update method
      const updatedItem = await this.serverService.updateShoppingListItemById(itemId, updateData);
      
      // Transform back to our database format
      return {
        id: updatedItem.id || '',
        name: updatedItem.food?.name || updatedItem.display || "Unknown Item",
        checked: updatedItem.checked,
        order: updatedItem.position,
        notes: updatedItem.note || null,
        quantity: updatedItem.quantity,
        unit: updatedItem.unit?.name || null,
        label: updatedItem.label?.name || null,
        integrationData: updatedItem as any // Store the updated data
      };
    } catch (error) {
      consola.error(`Error updating item ${itemId}:`, error);
      throw new Error(`Failed to update item: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async deleteShoppingListItems(ids: string[]) {
    return await this.serverService.deleteShoppingListItems(ids);
  }

  async toggleItem(itemId: string, checked: boolean): Promise<ShoppingListItem> {
    try {
      // We need to find the item in one of the lists to get its full data
      const lists = await this.getShoppingLists();
      let targetItem: any = null;
      
      // Find the item across all lists
      for (const list of lists) {
        const item = list.items?.find(i => i.id === itemId);
        if (item) {
          targetItem = item;
          break;
        }
      }
      
      if (!targetItem) {
        throw new Error(`Item ${itemId} not found in any shopping list`);
      }
      
      // Use the stored original Mealie data and only update the checked status
      const originalData = targetItem.integrationData;
      if (!originalData) {
        throw new Error(`No integration data found for item ${itemId}`);
      }
      
      const updateData = {
        ...originalData,
        checked: checked // Only change the checked status
      };
      
      // Use the new individual item update method
      const updatedItem = await this.serverService.updateShoppingListItemById(itemId, updateData);
      
      // Transform back to our database format
      return {
        id: updatedItem.id || '',
        name: updatedItem.food?.name || updatedItem.display || "Unknown Item",
        checked: updatedItem.checked,
        order: updatedItem.position,
        notes: updatedItem.note || null,
        quantity: updatedItem.quantity,
        unit: updatedItem.unit?.name || null,
        label: updatedItem.label?.name || null,
        integrationData: updatedItem as any // Store the updated data
      };
    } catch (error) {
      consola.error(`Error toggling item ${itemId}:`, error);
      throw new Error(`Failed to toggle item: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

// Factory function for creating MealieService instances
export const createMealieService = (integrationId: string, apiKey: string, baseUrl: string): MealieService => {
  return new MealieService(integrationId, apiKey, baseUrl);
}; 