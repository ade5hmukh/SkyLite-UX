<script setup lang="ts">
import type { CreateShoppingListInput, CreateShoppingListItemInput, ShoppingList, ShoppingListItem, Integration } from "~/types/database";
import { consola } from "consola";
import { useAlertToast } from "~/composables/useAlertToast";
import { integrationRegistry } from "~/types/integrations";
import { getIntegrationFields, getFieldsForItem, type DialogField } from "~/integrations/integrationConfig";

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
  getShoppingLists: fetchNativeLists,
  reorderItem,
  reorderShoppingList,
  deleteCompletedItems,
} = useShoppingLists();

const { 
  shoppingLists: integrationLists,
  shoppingIntegrations,
  loading: integrationLoading,
  addItemToList: addItemToIntegrationList,
  updateShoppingListItem: updateIntegrationItem,
  toggleItem: toggleIntegrationItem,
  clearCompletedItems: clearIntegrationCompletedItems,
  syncShoppingLists,
  initialFetchError,
} = useShoppingIntegrations();

const { fetchIntegrations, getIntegrationsByType } = useIntegrations();

const listDialog = ref(false);
const itemDialog = ref(false);
const selectedListId = ref<string>("");
const editingList = ref<ShoppingList | null>(null);
const editingItem = ref<ShoppingListItem | null>(null);

const { showError, showWarning, showSuccess } = useAlertToast();

const enabledIntegrationsByType = computed(() => {
  return getIntegrationsByType("shopping");
});

type RawIntegrationList = {
  readonly id: string;
  readonly name: string;
  readonly order: number;
  readonly createdAt: Date;
  readonly updatedAt: Date;
  readonly items: readonly RawIntegrationItem[];
  integrationId?: string;
  integrationName?: string;
  integrationIcon?: string | null;
};

function normalizeIntegrationList(list: RawIntegrationList): ShoppingList {
  const integration = (shoppingIntegrations.value as readonly Integration[]).find((i) => i.id === list.integrationId);
  
  // Check if this integration supports clearing completed items
  const hasClearCapability = integration && getIntegrationCapabilities(integration.id).includes('clear_items');
  
  // Filter out completed items if the integration doesn't support clearing them
  const filteredItems = Array.isArray(list.items)
    ? list.items
        .map(normalizeIntegrationItem)
        .filter(item => hasClearCapability || !item.checked)
    : [];
  
  return {
    id: String(list.id),
    name: String(list.name ?? ""),
    order: Number(list.order ?? 0),
    createdAt: list.createdAt ? new Date(list.createdAt) : new Date(),
    updatedAt: list.updatedAt ? new Date(list.updatedAt) : new Date(),
    items: filteredItems,
    source: "integration",
    integrationId: list.integrationId ?? undefined,
    integrationName: integration?.name || list.integrationName || 'Integration',
    integrationIcon: integration ? getIntegrationIconUrl(integration) : list.integrationIcon ?? null,
  };
}

type RawIntegrationItem = {
  id: string;
  name: string;
  checked: boolean;
  order: number;
  notes: string | null;
  quantity: number;
  unit: string | null;
};

function normalizeIntegrationItem(item: RawIntegrationItem): ShoppingListItem {
  return {
    id: String(item.id),
    name: String(item.name ?? ""),
    checked: Boolean(item.checked),
    order: Number(item.order ?? 0),
    notes: item.notes ?? null,
    quantity: Number(item.quantity ?? 1),
    unit: item.unit ?? null,
    label: null,
    food: null,
    integrationData: undefined,
    source: "integration",
    integrationId: undefined,
  };
}

const nativeListsWithSource = computed(() => {
  return nativeShoppingLists.value.map((list) => ({
    ...list,
    source: 'native' as const
  }));
});

const integrationListsWithSource = computed(() => {
  return (integrationLists.value ?? []).map(normalizeIntegrationList) as ShoppingList[];
});

const allShoppingLists = computed(() => {
  return [...nativeListsWithSource.value, ...integrationListsWithSource.value] as ShoppingList[];
});

const isLoading = computed(() => {
  return nativeLoading.value || integrationLoading.value;
});

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
    integrationId: list.integrationId,
    integrationName: list.integrationName,
    integrationIcon: list.integrationIcon
  })) as (ShoppingList & { source?: 'native' | 'integration'; integrationIcon?: string; integrationName?: string; integrationId?: string })[];
});

onMounted(async () => {
  try {
    await fetchIntegrations();
    await fetchNativeLists();
  }
  catch (error) {
    consola.error("Failed to initialize shopping lists:", error);
  }
});

watch(initialFetchError, (error) => {
  if (error) {
    consola.error("Initial integration fetch failed:", error);
    let errorMessage = "There was an error while trying to sync your shopping lists. Please check your connection and try again.";
    
    if (error?.cause && typeof error.cause === 'object' && 'statusMessage' in error.cause) {
      errorMessage = (error.cause as { statusMessage: string }).statusMessage;
    } else if (error?.cause && typeof error.cause === 'object' && 'detail' in error.cause) {
      errorMessage = (error.cause as { detail: string }).detail;
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

function openEditItem(item: ShoppingListItem) {
  const list = findItemList(item.id);
  if (list?.source === 'integration') {
    editingItem.value = { 
      ...item,
      integrationId: list.integrationId,
      source: 'integration'
    };
  } else {
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
      if (editingItem.value.source === 'integration') {
        if (!editingItem.value.integrationId) {
          throw new Error("Integration ID is required for integration items");
        }
        await updateIntegrationItem(editingItem.value.integrationId, editingItem.value.id, itemData);
      } else {
        await updateShoppingListItem(editingItem.value.id, itemData);
      }
    }
    else if (selectedListId.value) {
      const selectedList = allShoppingLists.value.find(list => list.id === selectedListId.value);
      if (!selectedList) {
        throw new Error("Selected list not found");
      }

      if (selectedList.source === 'integration') {
        if (!selectedList.integrationId) {
          throw new Error("Integration ID is required");
        }
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
    const list = findItemList(itemId);
    if (!list) {
      throw new Error("Item not found in any list");
    }

    if (list.source === 'integration') {
      showWarning("Warning", "Deleting items in integrations is not yet supported.");
    } else {
      showWarning("Warning", "Deleting individual items is not yet supported.");
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
      if (!list.integrationId) {
        throw new Error("Integration ID is required");
      }
      await toggleIntegrationItem(list.integrationId, itemId, checked);
    } else {
      await updateShoppingListItem(itemId, { checked });
    }
  }
  catch (error) {
    consola.error("Failed to toggle item:", error);
    showError("Error", "Failed to toggle item. Please try again.");
  }
}

async function handleDeleteList(listId: string) {
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
}

const reorderingItems = ref(new Set<string>());

async function handleReorderItem(itemId: string, direction: "up" | "down") {
  if (reorderingItems.value.has(itemId))
    return;

  reorderingItems.value.add(itemId);

  try {
    const list = findItemList(itemId);
    if (!list) {
      throw new Error("Item not found in any list");
    }

    if (list.source === 'integration') {
      showWarning("Reorder Not Supported", "Reordering items in integration lists is not currently supported.");
    } else {
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
  if (reorderingLists.value.has(listId))
    return;

  reorderingLists.value.add(listId);

  try {
    const list = allShoppingLists.value.find(l => l.id === listId);
    if (!list) {
      throw new Error("List not found");
    }

    if (list.source === 'integration') {
      showWarning("Reorder Not Supported", "Reordering integration lists is not currently supported.");
    } else {
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
      if (!list.integrationId) {
        throw new Error("Integration ID is required");
      }
      await clearIntegrationCompletedItems(list.integrationId, listId);
    } else {
      await deleteCompletedItems(listId);
    }
  }
  catch (error) {
    consola.error("Failed to clear completed items:", error);
    showError("Clear Failed", "Failed to clear completed items. Please try again.");
  }
}

function findItemList(itemId: string) {
  return allShoppingLists.value.find(list => 
    list.items?.some((item: ShoppingListItem) => item.id === itemId)
  );
}

function getIntegrationIconUrl(integration: { icon?: string | null; type: string; service: string }) {
  if (integration.icon) {
    return integration.icon;
  }
  
  const config = integrationRegistry.get(`${integration.type}:${integration.service}`);
  return config?.icon || null;
}

function getIntegrationCapabilities(integrationId: string): string[] {
  const integrations = shoppingIntegrations.value as Integration[];
  const integration = integrations.find((i) => i.id === integrationId);
  if (!integration) return [];
  
  const config = integrationRegistry.get(`${integration.type}:${integration.service}`);
  return config?.capabilities || [];
}

function hasCapability(integrationId: string, capability: string): boolean {
  const capabilities = getIntegrationCapabilities(integrationId);
  return capabilities.includes(capability);
}

function getIntegrationType(): string | undefined {
  if (editingItem.value?.source === 'integration') {
    const integrations: Integration[] = shoppingIntegrations.value as Integration[];
    const integration = integrations.find((i) => i.id === editingItem.value?.integrationId);
    return integration?.service;
  }
  
  if (selectedListId.value) {
    const selectedList = allShoppingLists.value.find(list => list.id === selectedListId.value);
    if (selectedList?.source === 'integration') {
      const integrations: Integration[] = shoppingIntegrations.value as Integration[];
      const integration = integrations.find((i) => i.id === selectedList.integrationId);
      return integration?.service;
    }
  }
  
  return undefined;
}

function getItemIntegrationCapabilities(): string[] | undefined {
  if (editingItem.value?.source === 'integration') {
    if (!editingItem.value.integrationId) {
      return undefined;
    }
    return getIntegrationCapabilities(editingItem.value.integrationId);
  }
  
  if (selectedListId.value) {
    const selectedList = allShoppingLists.value.find(list => list.id === selectedListId.value);
    if (selectedList?.source === 'integration') {
      if (!selectedList.integrationId) {
        return undefined;
      }
      return getIntegrationCapabilities(selectedList.integrationId);
    }
  }
  
  return undefined;
}

function getFilteredFieldsForItem(item: ShoppingListItem, integrationType: string | undefined): DialogField[] {
  const baseFields: DialogField[] = integrationType 
    ? getIntegrationFields(integrationType)
    : [
        {
          key: 'name',
          label: 'Item Name',
          type: 'text' as const,
          placeholder: 'Milk, Bread, Apples, etc.',
          required: true,
          canEdit: true,
        },
        {
          key: 'quantity',
          label: 'Quantity',
          type: 'number' as const,
          min: 0,
          canEdit: true,
        },
        {
          key: 'unit',
          label: 'Unit',
          type: 'text' as const,
          placeholder: 'Can, Box, etc.',
          canEdit: true,
        },
        {
          key: 'notes',
          label: 'Notes',
          type: 'textarea' as const,
          placeholder: 'Additional notes (optional)',
          canEdit: true,
        },
      ];
  
  return getFieldsForItem(item, integrationType, baseFields) as DialogField[];
}

async function handleSyncIntegrationLists() {
  try {
    await syncShoppingLists();
    showSuccess("Sync Complete", "Your shopping lists have been successfully synchronized with all integrations.");
  } catch (error: unknown) {
    consola.error("Failed to sync integration lists:", error);
    
    let errorMessage = "There was an error while trying to sync your shopping lists. Please check your connection and try again.";
    
    if (error && typeof error === 'object' && 'cause' in error && error.cause && typeof error.cause === 'object' && 'statusMessage' in error.cause) {
      errorMessage = (error.cause as { statusMessage: string }).statusMessage;
    } else if (error && typeof error === 'object' && 'cause' in error && error.cause && typeof error.cause === 'object' && 'detail' in error.cause) {
      errorMessage = (error.cause as { detail: string }).detail;
    } else if (error && typeof error === 'object' && 'message' in error && typeof error.message === 'string') {
      errorMessage = error.message;
    }
    
    showError("Sync Failed", errorMessage);
  }
}
</script>

<template>
  <div class="flex h-[calc(100vh-2rem)] w-full flex-col rounded-lg">
    <div class="py-5 sm:px-4 sticky top-0 z-40 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
      <GlobalDateHeader />

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

    <div class="flex-1 overflow-y-auto">
      <GlobalList
        :lists="transformedShoppingLists"
        :loading="isLoading"
        empty-state-icon="i-lucide-shopping-cart"
        empty-state-title="No shopping lists found"
        empty-state-description="Create your first shopping list to get started"
        show-quantity
        :show-notes="true"
        show-reorder
        :show-edit="(list) => {
          const shoppingList = list as ShoppingList;
          return shoppingList.source === 'native';
        }"
        :show-add="(list) => {
          const shoppingList = list as ShoppingList;
          return shoppingList.source === 'native' || (shoppingList.integrationId ? hasCapability(shoppingList.integrationId!, 'add_items') : false);
        }"
        :show-edit-item="(list) => {
          const shoppingList = list as ShoppingList;
          return shoppingList.source === 'native' || (shoppingList.integrationId ? hasCapability(shoppingList.integrationId!, 'edit_items') : false);
        }"
        :show-completed="(list) => {
          const shoppingList = list as ShoppingList;
          return shoppingList.source === 'native' || (shoppingList.integrationId ? hasCapability(shoppingList.integrationId!, 'clear_items') : false);
        }"
        show-integration-icons
        @create="openCreateList"
        @edit="editingList = $event as ShoppingList; listDialog = true"
        @delete="handleDeleteList"
        @add-item="openAddItem"
        @edit-item="(item) => openEditItem(item as ShoppingListItem)"
        @toggle-item="handleToggleItem"
        @reorder-item="handleReorderItem"
        @reorder-list="handleReorderList"
        @clear-completed="handleClearCompleted"
      />
    </div>

    <UButton
      class="fixed bottom-6 right-6 h-12 w-12 rounded-full shadow-lg"
      color="primary"
      @click="openCreateList"
    >
      <UIcon name="i-lucide-plus" class="h-6 w-6" />
    </UButton>

    <ShoppingListDialog
      :is-open="listDialog"
      :list="editingList"
      :integration-capabilities="editingList?.source === 'integration' && editingList.integrationId ? getIntegrationCapabilities(editingList.integrationId) : undefined"
      @close="listDialog = false; editingList = null"
      @save="handleListSave"
      @delete="handleListDelete"
    />

    <ShoppingListItemDialog
      :is-open="itemDialog"
      :item="editingItem"
      :fields="getFilteredFieldsForItem({} as ShoppingListItem, getIntegrationType())"
      :integration-capabilities="getItemIntegrationCapabilities()"
      @close="itemDialog = false; selectedListId = ''; editingItem = null"
      @save="handleItemSave"
      @delete="handleItemDelete"
    />

  </div>
</template>
