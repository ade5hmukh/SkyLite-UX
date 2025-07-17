import type { ShoppingList, ShoppingListItem, CreateShoppingListItemInput, UpdateShoppingListItemInput } from "~/types/database";
import type { IntegrationService } from "~/types/integrations";
import { useIntegrations } from "./useIntegrations";
import { consola } from "consola";
import type { JsonObject } from "type-fest";

export function useShoppingIntegrations() {
  const { integrations, loading: integrationsLoading, error: integrationsError, getService } = useIntegrations();
  
  const { data: shoppingLists } = useNuxtData<ShoppingList[]>('shopping-lists');
  
  const loading = ref(false);
  const error = ref<string | null>(null);
  const syncing = ref(false);
  const initialFetchError = ref<Error | null>(null);
  
  const autoSyncTimer = ref<NodeJS.Timeout | null>(null);
  const lastSyncTime = ref<Date | null>(null);

  const shoppingIntegrations = computed(() => {
    return integrations.value.filter(integration => 
      integration.type === "shopping" && integration.enabled
    );
  });

  const shoppingServices = computed(() => {
    const services: Map<string, IntegrationService> = new Map();
    shoppingIntegrations.value.forEach(integration => {
      const service = getService(integration.id);
      if (service) {
        services.set(integration.id, service);
      }
    });
    return services;
  });

  const optimisticallyUpdateItem = (itemId: string, updates: Partial<ShoppingListItem>) => {
    if (!shoppingLists.value) return;
    
    shoppingLists.value = shoppingLists.value.map((list: ShoppingList) => ({
      ...list,
      items: list.items?.map((item: ShoppingListItem) => 
        item.id === itemId 
          ? { ...item, ...updates }
          : item
      ) || []
    }));
  };

  const getShoppingLists = async () => {
    loading.value = true;
    error.value = null;
    
    try {
      const allLists: ShoppingList[] = [];
      const integrationErrors: Array<{ integrationId: string; integrationName: string; error: Error }> = [];
      
      for (const [integrationId, service] of shoppingServices.value) {
        try {
          const lists = await (service as unknown as { getShoppingLists?: () => Promise<ShoppingList[]> }).getShoppingLists?.();
          
          if (!lists || !Array.isArray(lists)) {
            consola.warn(`Integration ${integrationId} returned invalid shopping lists:`, lists);
            continue;
          }
          
          const listsWithIntegration = lists.map((list: ShoppingList) => ({
            ...list,
            integrationId,
            integrationName: shoppingIntegrations.value.find(i => i.id === integrationId)?.name || 'Unknown'
          }));
          allLists.push(...listsWithIntegration);
        } catch (err) {
          const integrationName = shoppingIntegrations.value.find(i => i.id === integrationId)?.name || 'Unknown';
          consola.error(`Error fetching lists from integration ${integrationId}:`, err);
          integrationErrors.push({ integrationId, integrationName, error: err instanceof Error ? err : new Error(String(err)) });
        }
      }
      
      shoppingLists.value = allLists;
      
      if (integrationErrors.length > 0) {
        throw integrationErrors[0]?.error || new Error('Integration error occurred');
      }
    } catch (err) {
      error.value = "Failed to fetch shopping lists from integrations";
      consola.error("Error fetching shopping lists:", err);
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const addItemToList = async (
    integrationId: string, 
    listId: string, 
    itemData: CreateShoppingListItemInput
  ): Promise<ShoppingListItem> => {
    const service = shoppingServices.value.get(integrationId);
    if (!service) {
      throw new Error(`Integration service not found for ${integrationId}`);
    }
    
    const optimisticItem: ShoppingListItem = {
      id: `temp-${Date.now()}`,
      name: itemData.name || itemData.notes || "Unknown",
      checked: false,
      order: 0,
      notes: itemData.notes || null,
      quantity: itemData.quantity || 1,
      unit: itemData.unit || null,
      label: null,
      food: null,
      integrationData: {} as JsonObject
    };
    
    if (shoppingLists.value) {
      shoppingLists.value = shoppingLists.value.map((list: ShoppingList) => {
        if (list.id === listId) {
          return {
            ...list,
            items: [...(list.items || []), optimisticItem]
          };
        }
        return list;
      });
    }
    
    try {
      const item = await (service as unknown as { addItemToList?: (listId: string, itemData: CreateShoppingListItemInput) => Promise<ShoppingListItem> }).addItemToList?.(listId, {
        name: itemData.name || itemData.notes || "Unknown",
        quantity: itemData.quantity ?? 0,
        unit: itemData.unit || null,
        notes: itemData.notes || null,
        checked: false,
        order: 0,
        label: null,
        food: null
      });
      
      if (shoppingLists.value && item) {
        shoppingLists.value = shoppingLists.value.map((list: ShoppingList) => {
          if (list.id === listId) {
            return {
              ...list,
              items: list.items?.map((listItem: ShoppingListItem) => 
                listItem.id === optimisticItem.id ? {
                  ...item,
                  checked: item.checked ?? false,
                  order: item.order ?? 0,
                  notes: item.notes ?? null,
                  quantity: item.quantity ?? itemData.quantity ?? 0,
                  unit: item.unit ?? null,
                  label: item.label ?? null
                } : listItem
              ) || []
            };
          }
          return list;
        });
      }
      
      if (!item) {
        throw new Error("Failed to add item to list");
      }
      
      return item;
    } catch (err) {
      if (shoppingLists.value) {
        shoppingLists.value = shoppingLists.value.map((list: ShoppingList) => {
          if (list.id === listId) {
            return {
              ...list,
              items: list.items?.filter((listItem: ShoppingListItem) => 
                listItem.id !== optimisticItem.id
              ) || []
            };
          }
          return list;
        });
      }
      
      consola.error(`Error adding item to list ${listId} in integration ${integrationId}:`, err);
      throw err;
    }
  };

  const updateShoppingListItem = async (
    integrationId: string,
    itemId: string, 
    updates: UpdateShoppingListItemInput
  ): Promise<ShoppingListItem> => {
    const service = shoppingServices.value.get(integrationId);
    if (!service) {
      throw new Error(`Integration service not found for ${integrationId}`);
    }
    
    const originalItem = shoppingLists.value?.flatMap(list => list.items || []).find(item => item.id === itemId);
    
    optimisticallyUpdateItem(itemId, updates);
    
    try {
      const updatedItem = await (service as unknown as { updateShoppingListItem?: (itemId: string, updates: UpdateShoppingListItemInput) => Promise<ShoppingListItem> }).updateShoppingListItem?.(itemId, updates);
      
      if (!updatedItem) {
        throw new Error("Service does not support updating shopping list items");
      }
      
      return updatedItem;
    } catch (err) {
      consola.error(`Error updating item ${itemId} in integration ${integrationId}:`, err);
      
      if (originalItem) {
        optimisticallyUpdateItem(itemId, originalItem);
      }
      throw err;
    }
  };

  const toggleItem = async (integrationId: string, itemId: string, checked: boolean): Promise<void> => {
    const service = shoppingServices.value.get(integrationId);
    if (!service) {
      throw new Error(`Integration service not found for ${integrationId}`);
    }
    
    optimisticallyUpdateItem(itemId, { checked });
    
    try {
      await (service as unknown as { toggleItem?: (itemId: string, checked: boolean) => Promise<void> }).toggleItem?.(itemId, checked);
    } catch (err) {
      consola.error(`Error toggling item ${itemId} in integration ${integrationId}:`, err);
      
      optimisticallyUpdateItem(itemId, { checked: !checked });
      
      throw err;
    }
  };

  const clearCompletedItems = async (integrationId: string, listId: string): Promise<void> => {
    const service = shoppingServices.value.get(integrationId);
    if (!service) {
      throw new Error(`Integration service not found for ${integrationId}`);
    }
    
    try {
      const list = shoppingLists.value?.find((l: ShoppingList) => l.id === listId);
      
      if (!list) {
        throw new Error(`List ${listId} not found`);
      }
      
      const checkedItemIds = list.items
        ?.filter((item: ShoppingListItem) => item.checked)
        .map((item: ShoppingListItem) => item.id) || [];
      
      if (checkedItemIds.length === 0) {
        return;
      }
      
      if (shoppingLists.value) {
        shoppingLists.value = shoppingLists.value.map((list: ShoppingList) => {
          if (list.id === listId) {
            return {
              ...list,
              items: list.items?.filter((item: ShoppingListItem) => !item.checked) || []
            };
          }
          return list;
        });
      }
      
      await (service as unknown as { deleteShoppingListItems?: (ids: string[]) => Promise<void> }).deleteShoppingListItems?.(checkedItemIds);
      
    } catch (err) {
      await getShoppingLists();
      
      consola.error(`Error clearing completed items from list ${listId} in integration ${integrationId}:`, err);
      throw err;
    }
  };

  const syncShoppingLists = async () => {
    syncing.value = true;
    error.value = null;
    
    try {
      await getShoppingLists();
      lastSyncTime.value = new Date();
    } catch (err) {
      error.value = "Failed to sync shopping lists";
      consola.error("Error syncing shopping lists:", err);
      throw err;
    } finally {
      syncing.value = false;
    }
  };

  const startAutoSync = () => {
    if (autoSyncTimer.value) {
      clearInterval(autoSyncTimer.value);
    }
    
    // Start new timer - 15 minutes = 900,000 milliseconds
    autoSyncTimer.value = setInterval(async () => {
      consola.info('Auto-syncing shopping lists...');
      await syncShoppingLists();
    }, 15 * 60 * 1000);
    
    consola.info('Auto-sync started for shopping lists (every 15 minutes)');
  };

  const stopAutoSync = () => {
    if (autoSyncTimer.value) {
      clearInterval(autoSyncTimer.value);
      autoSyncTimer.value = null;
      consola.info('Auto-sync stopped for shopping lists');
    }
  };

  onMounted(async () => {
    if (integrationsLoading.value) {
      await new Promise<void>((resolve) => {
        const unwatch = watch(integrationsLoading, (newLoading) => {
          if (!newLoading) {
            unwatch();
            resolve();
          }
        });
      });
    }
    
    try {
      await getShoppingLists();
    } catch (error) {
      initialFetchError.value = error instanceof Error ? error : new Error(String(error));
      consola.error('Initial fetch failed:', error);
    }
    startAutoSync();
  });

  onUnmounted(() => {
    stopAutoSync();
  });

  return {
    shoppingLists: readonly(shoppingLists),
    shoppingIntegrations: readonly(shoppingIntegrations),
    shoppingServices: readonly(shoppingServices),
    loading: readonly(loading),
    syncing: readonly(syncing),
    integrationsLoading: readonly(integrationsLoading),
    lastSyncTime: readonly(lastSyncTime),
    error: readonly(error),
    integrationsError: readonly(integrationsError),
    initialFetchError: readonly(initialFetchError),
    getShoppingLists,
    addItemToList,
    updateShoppingListItem,
    toggleItem,
    clearCompletedItems,
    syncShoppingLists,
    startAutoSync,
    stopAutoSync,
  };
}
