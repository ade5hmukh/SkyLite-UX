import type { JsonObject } from "type-fest";

import { consola } from "consola";

import type { ShoppingList, ShoppingListItem, UpdateShoppingListItemInput } from "~/types/database";
import type { IntegrationService, IntegrationStatus } from "~/types/integrations";

import { useStableDate } from "~/composables/useStableDate";
import { integrationRegistry } from "~/types/integrations";

import { TandoorService as ServerTandoorService } from "../../../server/integrations/tandoor";

export class TandoorService implements IntegrationService {
  private integrationId: string;
  private apiKey: string;
  private baseUrl: string;

  // Global stable date function
  private parseStableDate: (dateInput?: string | Date, fallback?: Date) => Date;

  private status: IntegrationStatus = {
    isConnected: false,
    lastChecked: new Date(),
  };

  private serverService: ServerTandoorService;

  constructor(integrationId: string, apiKey: string, baseUrl: string) {
    this.integrationId = integrationId;
    this.apiKey = apiKey;
    this.baseUrl = baseUrl;
    this.serverService = new ServerTandoorService(integrationId);

    // Initialize stable date function
    const { parseStableDate } = useStableDate();
    this.parseStableDate = parseStableDate;

    // Update status with stable date
    const { getStableDate } = useStableDate();
    this.status.lastChecked = getStableDate();
  }

  async initialize(): Promise<void> {
    await this.validate();
  }

  async validate(): Promise<boolean> {
    try {
      await this.serverService.getShoppingListEntries();

      const { getStableDate } = useStableDate();
      this.status = {
        isConnected: true,
        lastChecked: getStableDate(),
      };

      return true;
    }
    catch (error) {
      const { getStableDate } = useStableDate();
      this.status = {
        isConnected: false,
        lastChecked: getStableDate(),
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
      const url = `${this.baseUrl}/api/shopping-list-entry/`;
      const headers = {
        "Authorization": `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      };
      const response = await fetch(url, {
        method: "GET",
        headers,
      });
      if (!response.ok) {
        const { getStableDate } = useStableDate();
        this.status = {
          isConnected: false,
          lastChecked: getStableDate(),
          error: `API error: ${response.status} ${response.statusText}`,
        };
        return false;
      }
      const { getStableDate } = useStableDate();
      this.status = {
        isConnected: true,
        lastChecked: getStableDate(),
      };
      return true;
    }
    catch (error) {
      const { getStableDate } = useStableDate();
      this.status = {
        isConnected: false,
        lastChecked: getStableDate(),
        error: error instanceof Error ? error.message : "Unknown error",
      };
      return false;
    }
  }

  async getCapabilities(): Promise<string[]> {
    const config = integrationRegistry.get("shopping:tandoor");
    return config?.capabilities || [];
  }

  async getShoppingLists(): Promise<ShoppingList[]> {
    try {
      const entries = await this.serverService.getShoppingListEntries();

      if (!entries || !Array.isArray(entries)) {
        consola.warn("Tandoor service returned invalid entries:", entries);
        return [];
      }

      const items: ShoppingListItem[] = entries.map((entry, index) => ({
        id: entry.id.toString(),
        name: entry.food?.name || "Unknown",
        checked: entry.checked,
        order: entry.order || index,
        notes: null,
        quantity: entry.amount,
        unit: entry.unit?.name || null,
        label: null,
        food: null,
        integrationData: entry as unknown as JsonObject,
      }));

      return [{
        id: "default",
        name: "Shopping List",
        order: 0,
        createdAt: this.parseStableDate(),
        updatedAt: this.parseStableDate(),
        items,
        _count: {
          items: items.length,
        },
      }];
    }
    catch (error) {
      consola.error("Error fetching Tandoor shopping lists:", error);
      throw error;
    }
  }

  async getShoppingList(id: string): Promise<ShoppingList> {
    const lists = await this.getShoppingLists();
    const list = lists.find(l => l.id === id);

    if (!list) {
      throw new Error(`Shopping list with id ${id} not found`);
    }

    return list;
  }

  async addItemToList(listId: string, item: {
    name: string;
    quantity: number;
    unit?: string;
    notes?: string;
  }): Promise<ShoppingListItem> {
    const tandoorItem = {
      food: { name: item.name },
      unit: item.unit ? { name: item.unit } : undefined,
      amount: item.quantity.toString(),
      list_recipe: undefined,
    };

    const createdEntry = await this.serverService.createShoppingListEntry(tandoorItem);

    return {
      id: createdEntry.id.toString(),
      name: createdEntry.food.name,
      checked: createdEntry.checked,
      order: createdEntry.order,
      notes: null,
      quantity: createdEntry.amount,
      unit: createdEntry.unit?.name || null,
      label: null,
      food: null,
      integrationData: createdEntry as unknown as JsonObject,
    };
  }

  async updateShoppingListItem(itemId: string, updates: UpdateShoppingListItemInput): Promise<ShoppingListItem> {
    try {
      const tandoorUpdates: Record<string, unknown> = {};

      if (updates.name !== undefined) {
        tandoorUpdates.food = { name: updates.name };
      }
      if (updates.checked !== undefined) {
        tandoorUpdates.checked = updates.checked;
      }
      if (updates.quantity !== undefined) {
        tandoorUpdates.amount = updates.quantity.toString();
      }
      if (updates.order !== undefined) {
        tandoorUpdates.order = updates.order;
      }

      const updatedEntry = await this.serverService.updateShoppingListEntry(Number.parseInt(itemId), tandoorUpdates);

      return {
        id: updatedEntry.id.toString(),
        name: updatedEntry.food.name,
        checked: updatedEntry.checked,
        order: updatedEntry.order,
        notes: null,
        quantity: updatedEntry.amount,
        unit: updatedEntry.unit?.name || null,
        label: null,
        food: null,
        integrationData: updatedEntry as unknown as JsonObject,
      };
    }
    catch (error) {
      consola.error(`Error updating item ${itemId}:`, error);
      throw new Error(`Failed to update item: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }

  async toggleItem(itemId: string, checked: boolean): Promise<ShoppingListItem> {
    try {
      const updatedEntry = await this.serverService.updateShoppingListEntry(Number.parseInt(itemId), {
        checked,
      });

      return {
        id: updatedEntry.id.toString(),
        name: updatedEntry.food.name,
        checked: updatedEntry.checked,
        order: updatedEntry.order,
        notes: null,
        quantity: updatedEntry.amount,
        unit: updatedEntry.unit?.name || null,
        label: null,
        food: null,
        integrationData: updatedEntry as unknown as JsonObject,
      };
    }
    catch (error) {
      consola.error(`Error toggling item ${itemId}:`, error);
      throw new Error(`Failed to toggle item: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }
}

export function createTandoorService(integrationId: string, apiKey: string, baseUrl: string): TandoorService {
  return new TandoorService(integrationId, apiKey, baseUrl);
}

export function getTandoorFieldsForItem(item: { unit?: unknown } | null | undefined, allFields: { key: string }[]): { key: string }[] {
  if (!item || item.unit === null || item.unit === undefined) {
    return allFields.filter(field => field.key !== "unit");
  }
  return allFields;
}
