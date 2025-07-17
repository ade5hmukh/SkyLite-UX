import type { JsonObject } from "type-fest";

import { consola } from "consola";

import type { ShoppingList, ShoppingListItem, UpdateShoppingListItemInput } from "~/types/database";
import type { IntegrationService, IntegrationStatus } from "~/types/integrations";

import { integrationRegistry } from "~/types/integrations";

import { MealieService as ServerMealieService } from "../../../server/integrations/mealie";

export class MealieService implements IntegrationService {
  private apiKey: string;
  private baseUrl: string;
  private integrationId: string;
  private status: IntegrationStatus = {
    isConnected: false,
    lastChecked: new Date(),
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
      await this.serverService.getShoppingLists();

      this.status = {
        isConnected: true,
        lastChecked: new Date(),
      };

      return true;
    }
    catch (error) {
      this.status = {
        isConnected: false,
        lastChecked: new Date(),
        error: error instanceof Error ? error.message : "Unknown error",
      };
      return false;
    }
  }

  async getStatus(): Promise<IntegrationStatus> {
    return this.status;
  }

  async testConnection(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/api/households/shopping/lists`, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        consola.error("Mealie API error:", response.status, response.statusText, errorText);
        this.status = {
          isConnected: false,
          lastChecked: new Date(),
          error: `API error: ${response.status} ${response.statusText}`,
        };
        return false;
      }

      await response.json();

      this.status = {
        isConnected: true,
        lastChecked: new Date(),
      };

      return true;
    }
    catch (error) {
      consola.error("Mealie connection test error:", error);
      this.status = {
        isConnected: false,
        lastChecked: new Date(),
        error: error instanceof Error ? error.message : "Unknown error",
      };
      return false;
    }
  }

  async getCapabilities(): Promise<string[]> {
    const config = integrationRegistry.get("shopping:mealie");
    return config?.capabilities || [];
  }

  async getShoppingLists(): Promise<ShoppingList[]> {
    try {
      const response = await this.serverService.getShoppingLists();

      if (!response || !response.items || !Array.isArray(response.items)) {
        consola.warn("Mealie service returned invalid response:", response);
        return [];
      }

      const shoppingLists: ShoppingList[] = [];

      for (const mealieList of response.items) {
        try {
          const fullList = await this.serverService.getShoppingList(mealieList.id);

          shoppingLists.push({
            id: fullList.id,
            name: fullList.name,
            order: 0,
            createdAt: new Date(fullList.createdAt),
            updatedAt: new Date(fullList.updatedAt),
            items: fullList.listItems?.map(mealieItem => ({
              id: mealieItem.id,
              name: mealieItem.food?.name || mealieItem.note || mealieItem.display || "Unknown",
              checked: mealieItem.checked,
              order: mealieItem.position,
              notes: mealieItem.note,
              quantity: mealieItem.quantity,
              unit: mealieItem.unit?.name || null,
              label: mealieItem.label?.name || null,
              food: mealieItem.food?.name || null,
              integrationData: mealieItem as unknown as JsonObject,
            } as ShoppingListItem)) || [],
            _count: {
              items: fullList.listItems?.length || 0,
            },
          });
        }
        catch (listError) {
          consola.error(`Error fetching list ${mealieList.id}:`, listError);
        }
      }

      return shoppingLists;
    }
    catch (error) {
      consola.error("Error fetching Mealie shopping lists:", error);
      throw error;
    }
  }

  async getShoppingList(id: string): Promise<ShoppingList> {
    const mealieList = await this.serverService.getShoppingList(id);

    return {
      id: mealieList.id,
      name: mealieList.name,
      order: 0,
      createdAt: new Date(mealieList.createdAt),
      updatedAt: new Date(mealieList.updatedAt),
      items: mealieList.listItems.map(mealieItem => ({
        id: mealieItem.id,
        name: mealieItem.food?.name || mealieItem.note || mealieItem.display || "Unknown",
        checked: mealieItem.checked,
        order: mealieItem.position,
        notes: mealieItem.note,
        quantity: mealieItem.quantity,
        unit: mealieItem.unit?.name || null,
        label: mealieItem.label?.name || null,
        food: mealieItem.food?.name || null,
        integrationData: mealieItem as unknown as JsonObject,
      } as ShoppingListItem)),
      _count: {
        items: mealieList.listItems.length,
      },
    };
  }

  async addItemToList(listId: string, item: {
    name: string;
    quantity: number;
    unit?: string;
    notes?: string;
  }): Promise<ShoppingListItem> {
    const mealieItem = {
      quantity: item.quantity || 0,
      unit: null,
      food: null,
      note: item.notes || item.name,
      isFood: false,
      disableAmount: true,
      display: item.quantity > 1 ? item.quantity + item.name : item.name,
      shoppingListId: listId,
      checked: false,
      position: 0,
      foodId: null,
      labelId: null,
      unitId: null,
      extras: {},
      id: null,
      recipeReferences: [],
    };

    const apiResponse = await this.serverService.createShoppingListItem(mealieItem);
    const createdItem = apiResponse.createdItems?.[0];

    if (!createdItem) {
      throw new Error("Mealie did not return a created item");
    }

    return {
      id: createdItem.id || "",
      name: createdItem.food?.name || createdItem.note || createdItem.display || "Unknown",
      checked: createdItem.checked,
      order: createdItem.position,
      notes: createdItem.note,
      quantity: createdItem.quantity ?? item.quantity ?? 0,
      unit: createdItem.unit?.name || null,
      label: createdItem.label?.name || null,
      food: createdItem.food?.name || null,
      integrationData: createdItem as unknown as JsonObject,
    };
  }

  async updateShoppingListItem(itemId: string, updates: UpdateShoppingListItemInput): Promise<ShoppingListItem> {
    try {
      const lists = await this.getShoppingLists();
      let targetItem: ShoppingListItem | null = null;

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

      const originalData = targetItem.integrationData;
      if (!originalData) {
        throw new Error(`No integration data found for item ${itemId}`);
      }

      const mealieUpdates: Record<string, unknown> = {};

      if (updates.quantity !== undefined) {
        mealieUpdates.quantity = updates.quantity;
      }

      if (updates.notes !== undefined) {
        mealieUpdates.note = updates.notes;
      }

      if (updates.checked !== undefined) {
        mealieUpdates.checked = updates.checked;
      }

      if (updates.order !== undefined) {
        mealieUpdates.position = updates.order;
      }

      const updateData = {
        ...originalData,
        ...mealieUpdates,
      };

      const updatedItem = await this.serverService.updateShoppingListItemById(itemId, updateData);

      return {
        id: updatedItem.id || "",
        name: updatedItem.food?.name || updatedItem.note || updatedItem.display || "Unknown",
        checked: updatedItem.checked,
        order: updatedItem.position,
        notes: updatedItem.note,
        quantity: updatedItem.quantity,
        unit: updatedItem.unit?.name || null,
        label: updatedItem.label?.name || null,
        food: updatedItem.food?.name || null,
        integrationData: updatedItem as unknown as JsonObject,
      };
    }
    catch (error) {
      consola.error(`Error updating item ${itemId}:`, error);
      throw new Error(`Failed to update item: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }

  async toggleItem(itemId: string, checked: boolean): Promise<ShoppingListItem> {
    try {
      const lists = await this.getShoppingLists();
      let targetItem: ShoppingListItem | null = null;

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

      const originalData = targetItem.integrationData;
      if (!originalData) {
        throw new Error(`No integration data found for item ${itemId}`);
      }

      const updateData = {
        ...originalData,
        checked,
      };

      const updatedItem = await this.serverService.updateShoppingListItemById(itemId, updateData);

      return {
        id: updatedItem.id || "",
        name: updatedItem.food?.name || updatedItem.note || updatedItem.display || "Unknown",
        checked: updatedItem.checked,
        order: updatedItem.position,
        notes: updatedItem.isFood ? updatedItem.note : null,
        quantity: updatedItem.quantity,
        unit: updatedItem.unit?.name || null,
        label: updatedItem.label?.name || null,
        food: updatedItem.food?.name || null,
        integrationData: updatedItem as unknown as JsonObject,
      };
    }
    catch (error) {
      consola.error(`Error toggling item ${itemId}:`, error);
      throw new Error(`Failed to toggle item: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }

  async deleteShoppingListItems(ids: string[]) {
    return await this.serverService.deleteShoppingListItems(ids);
  }
}

export function createMealieService(integrationId: string, apiKey: string, baseUrl: string): MealieService {
  return new MealieService(integrationId, apiKey, baseUrl);
}

export function getMealieFieldsForItem(item: { integrationData?: JsonObject }, allFields: { key: string }[]): { key: string }[] {
  if (item?.integrationData?.isFood) {
    return allFields.filter(field =>
      ["notes", "quantity", "unit", "food"].includes(field.key),
    );
  }
  else {
    return allFields.filter(field =>
      ["notes", "quantity"].includes(field.key),
    );
  }
}
