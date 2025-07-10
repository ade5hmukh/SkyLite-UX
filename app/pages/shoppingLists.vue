<script setup lang="ts">
import type { CreateShoppingListInput, CreateShoppingListItemInput } from "~/types/database";
import { consola } from "consola";
import { useToast } from "~/composables/useToast";
import { integrationRegistry } from "~/types/integrations";

import GlobalConfirm from "~/components/global/globalConfirm.vue";
import GlobalList from "~/components/global/globalList.vue";
import ShoppingListDialog from "~/components/shopping/shoppingListDialog.vue";
import ShoppingListItemDialog from "~/components/shopping/shoppingListItemDialog.vue";

const {
  shoppingLists: nativeShoppingLists,
  loading: nativeLoading,
  createShoppingList,
  updateShoppingList,
  deleteShoppingList,
  addItemToList,
  updateShoppingListItem,
  deleteShoppingListItem,
  fetchShoppingLists: fetchNativeLists,
  reorderItem,
  reorderShoppingList,
  deleteCompletedItems,
} = useShoppingLists();

const { 
  shoppingLists: integrationLists,
  shoppingIntegrations,
  loading: integrationLoading,
  fetchShoppingLists: fetchIntegrationLists,
  addItemToList: addItemToIntegrationList,
  updateShoppingListItem: updateIntegrationItem,
  toggleItem: toggleIntegrationItem,
  clearCompletedItems: clearIntegrationCompletedItems,
  syncShoppingLists,
  initialFetchError,
} = useShoppingIntegrations();

const { fetchIntegrations, getEnabledIntegrations, getIntegrationsByType } = useIntegrations();

// Modal state
const listDialog = ref(false);
const itemDialog = ref(false);
const confirmDialog = ref(false);
const confirmAction = ref<(() => Promise<void>) | null>(null);
const selectedListId = ref<string>("");
const editingList = ref<any>(null);
const editingItem = ref<any>(null);

// Global toast
const { showError, showWarning, showSuccess } = useToast();

// Get enabled integrations by type
const enabledIntegrationsByType = computed(() => {
  return getIntegrationsByType("shopping");
});

// Combine native and integration lists
const allShoppingLists = computed(() => {
  const nativeLists = nativeShoppingLists.value || [];
  const integrationListsData = integrationLists.value || [];
  
  // Add a source indicator to integration lists
  const integrationListsWithSource = integrationListsData.map((list: any) => {
    const integration = shoppingIntegrations.value.find((i: any) => i.id === list.integrationId);
    return {
      ...list,
      source: 'integration',
      integrationId: list.integrationId, // Ensure integrationId is preserved
      integrationName: integration?.name || 'Integration',
      integrationIcon: integration ? getIntegrationIconUrl(integration) : null
    };
  });
  
  // Add source indicator to native lists
  const nativeListsWithSource = nativeLists.map((list: any) => ({
    ...list,
    source: 'native'
  }));
  
  return [...nativeListsWithSource, ...integrationListsWithSource];
});

// Combined loading state
const isLoading = computed(() => {
  return nativeLoading.value || integrationLoading.value;
});

// Transform shopping lists to match the expected ShoppingList type
const transformedShoppingLists = computed(() => {
  return allShoppingLists.value.map(list => ({
    id: list.id,
    name: list.name,
    order: list.order || 0,
    createdAt: new Date(list.createdAt),
    updatedAt: new Date(list.updatedAt),
    items: list.items,
    _count: list._count,
    source: list.source,
    integrationName: list.integrationName,
    integrationIcon: list.integrationIcon
  })) as any; // Type assertion to bypass strict typing
});



// Load shopping lists and integrations on mount
onMounted(async () => {
  try {
    // Fetch integrations first
    await fetchIntegrations();

    // Then fetch native lists (integration lists are handled by useShoppingIntegrations)
    await fetchNativeLists();
  }
  catch (error) {
    consola.error("Failed to initialize shopping lists:", error);
  }
});

// Watch for initial fetch errors and display them to the user
watch(initialFetchError, (error) => {
  if (error) {
    consola.error("Initial integration fetch failed:", error);
    
    // Extract detailed error message for user display
    let errorMessage = "There was an error while trying to sync your shopping lists. Please check your connection and try again.";
    
    if (error?.cause?.statusMessage) {
      errorMessage = error.cause.statusMessage;
    } else if (error?.cause?.detail) {
      errorMessage = error.cause.detail;
    } else if (error?.message) {
      errorMessage = error.message;
    }
    
    showError("Integration Error", errorMessage);
  }
}, { immediate: true });

function openCreateList() {
  editingList.value = null;
  listDialog.value = true;
}

function openAddItem(listId: string) {
  selectedListId.value = listId;
  editingItem.value = null;
  itemDialog.value = true;
}

function openEditItem(item: any) {
  // Find which list this item belongs to to preserve integration metadata
  const list = findItemList(item.id);
  if (list?.source === 'integration') {
    // For integration items, add integration metadata
    editingItem.value = { 
      ...item,
      integrationId: list.integrationId,
      source: 'integration'
    };
  } else {
    // For native items, use the existing dialog
    editingItem.value = { ...item };
  }
  itemDialog.value = true;
}

async function handleListSave(listData: CreateShoppingListInput) {
  try {
    if (editingList.value?.source === "native" || !editingList.value?.source) {
      if (editingList.value?.id) {
        await updateShoppingList(editingList.value.id, listData);
      }
      else {
        await createShoppingList(listData);
      }
    } else {
      // Handle integration list creation/update
      // For now, we'll show an alert that this isn't supported yet
      showWarning("Warning", "Creating/editing lists in integrations is not yet supported.");
    }
    listDialog.value = false;
    editingList.value = null;
  }
  catch (error) {
    consola.error("Failed to save shopping list:", error);
    showError("Error", "Failed to save shopping list. Please try again.");
  }
}

async function handleListDelete() {
  if (!editingList.value?.id)
    return;

  try {
    await deleteShoppingList(editingList.value.id);
    listDialog.value = false;
    editingList.value = null;
  }
  catch (error) {
    consola.error("Failed to delete list:", error);
    showError("Delete Failed", "Failed to delete shopping list. Please try again.");
  }
}

async function handleItemSave(itemData: CreateShoppingListItemInput) {
  try {
    if (editingItem.value?.id) {
      // Editing existing item - use preserved integration metadata
      if (editingItem.value.source === 'integration') {
        await updateIntegrationItem(editingItem.value.integrationId, editingItem.value.id, itemData);
      } else {
        await updateShoppingListItem(editingItem.value.id, itemData);
      }
    }
    else if (selectedListId.value) {
      // Adding new item - find the selected list
      const selectedList = allShoppingLists.value.find(list => list.id === selectedListId.value);
      if (!selectedList) {
        throw new Error("Selected list not found");
      }

      if (selectedList.source === 'integration') {
        await addItemToIntegrationList(selectedList.integrationId, selectedListId.value, itemData);
      } else {
        await addItemToList(selectedListId.value, itemData);
      }
    }
    itemDialog.value = false;
    selectedListId.value = "";
    editingItem.value = null;
  }
  catch (error) {
    consola.error("Failed to save item:", error);
    showError("Error", "Failed to save item. Please try again.");
  }
}

async function handleItemDelete(itemId: string) {
  try {
    if (editingList.value?.source === "native" || !editingList.value?.source) {
      await deleteShoppingListItem(itemId);
    } else {
      // Handle integration item deletion
      const currentList = allShoppingLists.value.find(list => 
        list.items?.some((item: any) => item.id === itemId)
      );
      if (currentList?.integrationId) {
        // Note: deleteShoppingListItem is not yet implemented in useShoppingIntegrations
        showWarning("Warning", "Deleting items in integrations is not yet supported.");
      }
    }
    itemDialog.value = false;
    editingItem.value = null;
  }
  catch (error) {
    consola.error("Failed to delete item:", error);
    showError("Error", "Failed to delete item. Please try again.");
  }
}

async function handleToggleItem(itemId: string, checked: boolean) {
  try {
    const list = findItemList(itemId);
    if (!list) {
      throw new Error("Item not found in any list");
    }

    if (list.source === 'integration') {
      // Use integration composable for integration items
      await toggleIntegrationItem(list.integrationId, itemId, checked);
    } else {
      // Use native composable for native items
      await updateShoppingListItem(itemId, { checked });
    }
  }
  catch (error) {
    consola.error("Failed to toggle item:", error);
    showError("Error", "Failed to toggle item. Please try again.");
  }
}

async function handleDeleteList(listId: string) {
  confirmAction.value = async () => {
    try {
      if (editingList.value?.source === "native" || !editingList.value?.source) {
        await deleteShoppingList(listId);
      } else {
        showWarning("Warning", "Deleting lists in integrations is not yet supported.");
      }
    }
    catch (error) {
      consola.error("Failed to delete list:", error);
      showError("Error", "Failed to delete list. Please try again.");
    }
  };
  confirmDialog.value = true;
}

async function handleConfirm() {
  if (confirmAction.value) {
    await confirmAction.value();
    confirmAction.value = null;
    confirmDialog.value = false;
  }
}

const reorderingItems = ref(new Set<string>());

async function handleReorderItem(itemId: string, direction: "up" | "down") {
  // Prevent multiple simultaneous reorders of the same item
  if (reorderingItems.value.has(itemId))
    return;

  reorderingItems.value.add(itemId);

  try {
    const list = findItemList(itemId);
    if (!list) {
      throw new Error("Item not found in any list");
    }

    if (list.source === 'integration') {
      // Integration items don't support reordering yet
      showWarning("Reorder Not Supported", "Reordering items in integration lists is not currently supported.");
    } else {
      // Use native composable for native items
      await reorderItem(itemId, direction);
    }
  }
  catch (error) {
    consola.error("Failed to reorder item:", error);
    showError("Reorder Failed", "Failed to reorder item. Please try again.");
  }
  finally {
    reorderingItems.value.delete(itemId);
  }
}

const reorderingLists = ref(new Set<string>());

async function handleReorderList(listId: string, direction: "up" | "down") {
  // Prevent multiple simultaneous reorders of the same list
  if (reorderingLists.value.has(listId))
    return;

  reorderingLists.value.add(listId);

  try {
    const list = allShoppingLists.value.find(l => l.id === listId);
    if (!list) {
      throw new Error("List not found");
    }

    if (list.source === 'integration') {
      // Integration lists don't support reordering yet
      showWarning("Reorder Not Supported", "Reordering integration lists is not currently supported.");
    } else {
      // Use native composable for native lists
      await reorderShoppingList(listId, direction);
    }
  }
  catch (error) {
    consola.error("Failed to reorder shopping list:", error);
    showError("Reorder Failed", "Failed to reorder shopping list. Please try again.");
  }
  finally {
    reorderingLists.value.delete(listId);
  }
}

async function handleClearCompleted(listId: string) {
  try {
    const list = allShoppingLists.value.find(l => l.id === listId);
    if (!list) {
      throw new Error("List not found");
    }

    if (list.source === 'integration') {
      // Use integration composable for integration lists
      await clearIntegrationCompletedItems(list.integrationId, listId);
    } else {
      // Use native composable for native lists
      await deleteCompletedItems(listId);
    }
  }
  catch (error) {
    consola.error("Failed to clear completed items:", error);
    showError("Clear Failed", "Failed to clear completed items. Please try again.");
  }
}

// Helper function to find which list an item belongs to
function findItemList(itemId: string) {
  return allShoppingLists.value.find(list => 
    list.items?.some((item: any) => item.id === itemId)
  );
}

// Function to get integration icon from registry or fallback
function getIntegrationIconUrl(integration: any) {
  if (integration.icon) {
    return integration.icon;
  }
  
  const config = integrationRegistry.get(`${integration.type}:${integration.service}`);
  return config?.icon || null;
}

// Sync integration lists
async function handleSyncIntegrationLists() {
  try {
    await syncShoppingLists();
    showSuccess("Sync Complete", "Your shopping lists have been successfully synchronized with all integrations.");
  } catch (error: any) {
    consola.error("Failed to sync integration lists:", error);
    
    // Extract detailed error message for user display
    let errorMessage = "There was an error while trying to sync your shopping lists. Please check your connection and try again.";
    
    if (error?.cause?.statusMessage) {
      errorMessage = error.cause.statusMessage;
    } else if (error?.cause?.detail) {
      errorMessage = error.cause.detail;
    } else if (error?.message) {
      errorMessage = error.message;
    }
    
    showError("Sync Failed", errorMessage);
  }
}
</script>

<template>
  <div class="flex h-[calc(100vh-2rem)] w-full flex-col rounded-lg">
    <!-- Header -->
    <div class="py-5 sm:px-4 sticky top-0 z-40 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
      <GlobalDateHeader />

      <!-- Sync Button (only show if integrations are enabled) -->
      <div v-if="enabledIntegrationsByType.length > 0" class="mt-4 flex justify-end">
        <UButton
          color="primary"
          variant="outline"
          size="sm"
          :loading="integrationLoading"
          @click="handleSyncIntegrationLists"
        >
          <UIcon name="i-lucide-refresh-cw" class="h-4 w-4 mr-1" />
          Sync Integrations
        </UButton>
      </div>
    </div>

    <!-- Shopping Lists Content -->
    <div class="flex-1 overflow-y-auto">
      <GlobalList
        :lists="transformedShoppingLists"
        :loading="isLoading"
        empty-state-icon="i-lucide-shopping-cart"
        empty-state-title="No shopping lists found"
        empty-state-description="Create your first shopping list to get started"
        show-quantity
        show-notes
        show-reorder
        :show-edit="(list) => (list as any).source === 'native'"
        show-add
        show-completed
        show-integration-icons
        @create="openCreateList"
        @edit="editingList = $event; listDialog = true"
        @delete="handleDeleteList"
        @add-item="openAddItem"
        @edit-item="openEditItem"
        @toggle-item="handleToggleItem"
        @reorder-item="handleReorderItem"
        @reorder-list="handleReorderList"
        @clear-completed="handleClearCompleted"
      />
    </div>

    <!-- Floating Action Button -->
    <UButton
      class="fixed bottom-6 right-6 h-12 w-12 rounded-full shadow-lg"
      color="primary"
      @click="openCreateList"
    >
      <UIcon name="i-lucide-plus" class="h-6 w-6" />
    </UButton>

    <!-- Dialogs -->
    <ShoppingListDialog
      :is-open="listDialog"
      :list="editingList"
      @close="listDialog = false; editingList = null"
      @save="handleListSave"
      @delete="handleListDelete"
    />

    <ShoppingListItemDialog
      :is-open="itemDialog"
      :item="editingItem"
      @close="itemDialog = false; selectedListId = ''; editingItem = null"
      @save="handleItemSave"
      @delete="handleItemDelete"
    />

    <GlobalConfirm
      :is-open="confirmDialog"
      title="Delete Shopping List"
      message="Are you sure you want to delete this shopping list? This action cannot be undone."
      confirm-text="Delete"
      variant="danger"
      @close="confirmDialog = false; confirmAction = null"
      @confirm="handleConfirm"
    />


  </div>
</template>
