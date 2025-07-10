import type { ShoppingList, ShoppingListItem, CreateShoppingListItemInput, UpdateShoppingListItemInput } from "~/types/database";
import type { IntegrationService } from "~/types/integrations";
import { useIntegrations } from "./useIntegrations";
import { consola } from "consola";

export function useShoppingIntegrations() {
  const { integrations, loading: integrationsLoading, error: integrationsError, getService } = useIntegrations();
  
  // Use Nuxt data for shopping lists with caching
  const { data: shoppingLists } = useNuxtData<ShoppingList[]>('shopping-lists');
  
  const loading = ref(false);
  const error = ref<string | null>(null);
  const syncing = ref(false);
  const initialFetchError = ref<any>(null);
  
  // Auto-sync timer
  const autoSyncTimer = ref<NodeJS.Timeout | null>(null);
  const lastSyncTime = ref<Date | null>(null);

  // Get shopping integrations
  const shoppingIntegrations = computed(() => {
    return integrations.value.filter(integration => 
      integration.type === "shopping" && integration.enabled
    );
  });

  // Get enabled shopping integration services
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

  // Optimistically update an item in the local state
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

  // Get shopping lists from all integrations
  const getShoppingLists = async () => {
    loading.value = true;
    error.value = null;
    
    try {
      const allLists: ShoppingList[] = [];
      const integrationErrors: Array<{ integrationId: string; integrationName: string; error: any }> = [];
      
      for (const [integrationId, service] of shoppingServices.value) {
        try {
          const lists = await (service as any).getShoppingLists();
          
          // Add null/undefined checks
          if (!lists || !Array.isArray(lists)) {
            consola.warn(`Integration ${integrationId} returned invalid shopping lists:`, lists);
            continue;
          }
          
          // Add integration metadata to each list
          const listsWithIntegration = lists.map((list: any) => ({
            ...list,
            integrationId,
            integrationName: shoppingIntegrations.value.find(i => i.id === integrationId)?.name || 'Unknown'
          }));
          allLists.push(...listsWithIntegration);
        } catch (err) {
          const integrationName = shoppingIntegrations.value.find(i => i.id === integrationId)?.name || 'Unknown';
          consola.error(`Error fetching lists from integration ${integrationId}:`, err);
          integrationErrors.push({ integrationId, integrationName, error: err });
          // Continue with other integrations even if one fails
        }
      }
      
      shoppingLists.value = allLists;
      
      // If any integrations failed, throw the first error to notify the caller
      if (integrationErrors.length > 0) {
        throw integrationErrors[0]?.error || new Error('Integration error occurred');
      }
    } catch (err) {
      error.value = "Failed to fetch shopping lists from integrations";
      consola.error("Error fetching shopping lists:", err);
      throw err; // Re-throw the error so the caller can handle it
    } finally {
      loading.value = false;
    }
  };

  // Add item to a shopping list in an integration
  const addItemToList = async (
    integrationId: string, 
    listId: string, 
    itemData: CreateShoppingListItemInput
  ): Promise<ShoppingListItem> => {
    const service = shoppingServices.value.get(integrationId);
    if (!service) {
      throw new Error(`Integration service not found for ${integrationId}`);
    }
    
    // Create optimistic item
    const optimisticItem: ShoppingListItem = {
      id: `temp-${Date.now()}`, // Temporary ID for optimistic update
      name: itemData.name,
      checked: false,
      order: 0,
      notes: itemData.notes || null,
      quantity: itemData.quantity || 1,
      unit: itemData.unit || null,
      label: null,
      integrationData: {} as any
    };
    
    // Optimistically add the item to the list
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
      const item = await (service as any).addItemToList(listId, {
        name: itemData.name,
        quantity: itemData.quantity || 1,
        unit: itemData.unit || undefined,
        notes: itemData.notes || undefined
      });
      
      // Replace the optimistic item with the real one
      if (shoppingLists.value) {
        shoppingLists.value = shoppingLists.value.map((list: ShoppingList) => {
          if (list.id === listId) {
            return {
              ...list,
              items: list.items?.map((listItem: ShoppingListItem) => 
                listItem.id === optimisticItem.id ? {
                  ...item,
                  checked: item.checked ?? false, // Ensure checked is always defined
                  order: item.order ?? 0,
                  notes: item.notes ?? null,
                  quantity: item.quantity ?? 1,
                  unit: item.unit ?? null,
                  label: item.label ?? null
                } : listItem
              ) || []
            };
          }
          return list;
        });
      }
      
      return item;
    } catch (err) {
      // Revert optimistic update on error
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

  // Update a shopping list item in an integration
  const updateShoppingListItem = async (
    integrationId: string,
    itemId: string, 
    updates: UpdateShoppingListItemInput
  ): Promise<ShoppingListItem> => {
    const service = shoppingServices.value.get(integrationId);
    if (!service) {
      throw new Error(`Integration service not found for ${integrationId}`);
    }
    
    try {
      const updatedItem = await (service as any).updateShoppingListItem?.(itemId, updates);
      
      if (!updatedItem) {
        throw new Error("Service does not support updating shopping list items");
      }
      
      await getShoppingLists();
      return updatedItem;
    } catch (err) {
      consola.error(`Error updating item ${itemId} in integration ${integrationId}:`, err);
      throw err;
    }
  };

  // Toggle item checked status with optimistic updates
  const toggleItem = async (integrationId: string, itemId: string, checked: boolean): Promise<void> => {
    const service = shoppingServices.value.get(integrationId);
    if (!service) {
      throw new Error(`Integration service not found for ${integrationId}`);
    }
    
    // Optimistically update the UI immediately
    optimisticallyUpdateItem(itemId, { checked });
    
    try {
      // Update the server in the background
      await (service as any).toggleItem(itemId, checked);
      
      // Optionally refresh to ensure consistency, but don't block the UI
      // getShoppingLists();
    } catch (err) {
      consola.error(`Error toggling item ${itemId} in integration ${integrationId}:`, err);
      
      // Revert the optimistic update on error
      optimisticallyUpdateItem(itemId, { checked: !checked });
      
      throw err;
    }
  };

  // Clear completed (checked) items from a shopping list
  const clearCompletedItems = async (integrationId: string, listId: string): Promise<void> => {
    const service = shoppingServices.value.get(integrationId);
    if (!service) {
      throw new Error(`Integration service not found for ${integrationId}`);
    }
    
    try {
      // Find the list in our local state to get checked items
      const list = shoppingLists.value?.find((l: ShoppingList) => l.id === listId);
      
      if (!list) {
        throw new Error(`List ${listId} not found`);
      }
      
      // Get all checked item IDs
      const checkedItemIds = list.items
        ?.filter((item: ShoppingListItem) => item.checked)
        .map((item: ShoppingListItem) => item.id) || [];
      
      if (checkedItemIds.length === 0) {
        // No checked items to clear
        return;
      }
      
      // Optimistically remove checked items from the list
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
      
      // Delete the checked items using the service
      await (service as any).deleteShoppingListItems?.(checkedItemIds);
      
      // No need to refresh since we already updated optimistically
    } catch (err) {
      // Revert optimistic update on error
      await getShoppingLists();
      
      consola.error(`Error clearing completed items from list ${listId} in integration ${integrationId}:`, err);
      throw err;
    }
  };

  // Sync all shopping lists from integrations
  const syncShoppingLists = async () => {
    syncing.value = true;
    error.value = null;
    
    try {
      await getShoppingLists();
      lastSyncTime.value = new Date();
    } catch (err) {
      error.value = "Failed to sync shopping lists";
      consola.error("Error syncing shopping lists:", err);
      throw err; // Re-throw the error so the caller can handle it
    } finally {
      syncing.value = false;
    }
  };

  // Start automatic sync every 15 minutes
  const startAutoSync = () => {
    // Clear any existing timer
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

  // Stop automatic sync
  const stopAutoSync = () => {
    if (autoSyncTimer.value) {
      clearInterval(autoSyncTimer.value);
      autoSyncTimer.value = null;
      consola.info('Auto-sync stopped for shopping lists');
    }
  };

  // Initialize on composable creation
  onMounted(async () => {
    // Wait for integrations to be loaded before fetching shopping lists
    if (integrationsLoading.value) {
      // Wait for loading to complete
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
      initialFetchError.value = error;
      consola.error('Initial fetch failed:', error);
    }
    // Start auto-sync after initial fetch
    startAutoSync();
  });

  // Clean up timer when composable is destroyed
  onUnmounted(() => {
    stopAutoSync();
  });

  return {
    // Data
    shoppingLists: readonly(shoppingLists),
    shoppingIntegrations: readonly(shoppingIntegrations),
    shoppingServices: readonly(shoppingServices),
    
    // Loading states
    loading: readonly(loading),
    syncing: readonly(syncing),
    integrationsLoading: readonly(integrationsLoading),
    
    // Auto-sync state
    lastSyncTime: readonly(lastSyncTime),
    
    // Errors
    error: readonly(error),
    integrationsError: readonly(integrationsError),
    initialFetchError: readonly(initialFetchError),
    
    // Methods
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
