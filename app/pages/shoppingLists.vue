<script setup lang="ts">
import type { JsonObject } from "type-fest";

import { consola } from "consola";

import type { CreateShoppingListInput, CreateShoppingListItemInput, Integration, RawIntegrationItem, RawIntegrationList, ShoppingList, ShoppingListItem } from "~/types/database";
import type { DialogField, ShoppingListWithIntegration } from "~/types/ui";

import GlobalList from "~/components/global/globalList.vue";
import ShoppingListDialog from "~/components/shopping/shoppingListDialog.vue";
import ShoppingListItemDialog from "~/components/shopping/shoppingListItemDialog.vue";
import { useAlertToast } from "~/composables/useAlertToast";
import { useStableDate } from "~/composables/useStableDate";
import { getFieldsForItem, getIntegrationFields } from "~/integrations/integrationConfig";
import { integrationRegistry } from "~/types/integrations";

const { parseStableDate, getStableDate } = useStableDate();

function getDateWithFallback(dateString: string | Date | null): Date {
  if (!dateString)
    return getStableDate();
  return dateString instanceof Date ? dateString : parseStableDate(dateString);
}

const {
  shoppingLists: nativeShoppingLists,
  loading: nativeLoading,
  createShoppingList,
  updateShoppingList,
  deleteShoppingList,
  addItemToList,
  updateShoppingListItem,
  reorderItem,
  reorderShoppingList,
  deleteCompletedItems,
} = useShoppingLists();

const {
  shoppingLists: integrationLists,
  shoppingIntegrations,
  loading: integrationLoading,
  addItemToList: _addItemToIntegrationList,
  updateShoppingListItem: _updateIntegrationItem,
  toggleItem: _toggleIntegrationItem,
  clearCompletedItems: clearIntegrationCompletedItems,
} = useShoppingIntegrations();

const listDialog = ref(false);
const itemDialog = ref(false);
const selectedListId = ref<string>("");
const editingList = ref<ShoppingList | null>(null);
const editingItem = ref<ShoppingListItem | null>(null);

const { showError, showWarning } = useAlertToast();

function normalizeIntegrationList(list: RawIntegrationList): ShoppingList {
  const integration = (shoppingIntegrations.value as readonly Integration[]).find(i => i.id === list.integrationId);

  const hasClearCapability = integration && getIntegrationCapabilities(integration.id).includes("clear_items");

  const filteredItems = Array.isArray(list.items)
    ? list.items
        .map(normalizeIntegrationItem)
        .filter(item => hasClearCapability || !item.checked)
    : [];

  return {
    id: String(list.id),
    name: String(list.name ?? ""),
    order: Number(list.order ?? 0),
    createdAt: getDateWithFallback(list.createdAt),
    updatedAt: getDateWithFallback(list.updatedAt),
    items: filteredItems,
    source: "integration",
    integrationId: list.integrationId ?? undefined,
    integrationName: integration?.name || list.integrationName || "Integration",
    integrationIcon: integration ? getIntegrationIconUrl(integration) : list.integrationIcon ?? null,
  };
}

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
    food: item.food ?? null,
    integrationData: item.integrationData as JsonObject | undefined,
    source: "integration",
    integrationId: undefined,
  };
}

const nativeListsWithSource = computed(() => {
  return nativeShoppingLists.value.map(list => ({
    ...list,
    source: "native" as const,
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
    createdAt: parseStableDate(list.createdAt),
    updatedAt: parseStableDate(list.updatedAt),
    items: list.items,
    _count: list._count,
    source: list.source || "native",
    integrationId: list.integrationId,
    integrationName: list.integrationName,
    integrationIcon: list.integrationIcon,
  })) as ShoppingListWithIntegration[];
});

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
  if (list?.source === "integration") {
    editingItem.value = {
      ...item,
      integrationId: list.integrationId,
      source: "integration",
    };
  }
  else {
    editingItem.value = { ...item };
  }
  itemDialog.value = true;
}

async function handleListSave(listData: CreateShoppingListInput) {
  try {
    if (editingList.value?.id) {
      const { data: cachedLists } = useNuxtData("native-shopping-lists");
      const previousLists = cachedLists.value ? [...cachedLists.value] : [];

      if (cachedLists.value && Array.isArray(cachedLists.value)) {
        const listIndex = cachedLists.value.findIndex((l: ShoppingList) => l.id === editingList.value!.id);
        if (listIndex !== -1) {
          cachedLists.value[listIndex] = { ...cachedLists.value[listIndex], ...listData };
        }
      }

      try {
        await updateShoppingList(editingList.value.id, listData);
        consola.debug("Shopping List: Shopping list updated successfully");
      }
      catch (error) {
        if (cachedLists.value && previousLists.length > 0) {
          cachedLists.value.splice(0, cachedLists.value.length, ...previousLists);
        }
        throw error;
      }
    }
    else {
      const { data: cachedLists } = useNuxtData("native-shopping-lists");
      const previousLists = cachedLists.value ? [...cachedLists.value] : [];
      const newList = {
        id: `temp-${Date.now()}`,
        ...listData,
        createdAt: new Date(),
        updatedAt: new Date(),
        order: (cachedLists.value?.length || 0) + 1,
        items: [],
        _count: { items: 0 },
      };

      if (cachedLists.value && Array.isArray(cachedLists.value)) {
        cachedLists.value.push(newList);
      }

      try {
        const createdList = await createShoppingList(listData);
        consola.debug("Shopping List: Shopping list created successfully");

        if (cachedLists.value && Array.isArray(cachedLists.value)) {
          const tempIndex = cachedLists.value.findIndex((l: ShoppingList) => l.id === newList.id);
          if (tempIndex !== -1) {
            cachedLists.value[tempIndex] = createdList;
          }
        }
      }
      catch (error) {
        if (cachedLists.value && previousLists.length > 0) {
          cachedLists.value.splice(0, cachedLists.value.length, ...previousLists);
        }
        throw error;
      }
    }

    listDialog.value = false;
    editingList.value = null;
  }
  catch (error) {
    consola.error("Shopping List: Failed to save shopping list:", error);
    showError("Failed to Save", "Failed to save shopping list. Please try again.");
  }
}

async function handleListDelete() {
  if (!editingList.value?.id)
    return;

  try {
    const { data: cachedLists } = useNuxtData("native-shopping-lists");
    const previousLists = cachedLists.value ? [...cachedLists.value] : [];

    if (cachedLists.value && Array.isArray(cachedLists.value)) {
      cachedLists.value.splice(0, cachedLists.value.length, ...cachedLists.value.filter((l: ShoppingList) => l.id !== editingList.value!.id));
    }

    try {
      await deleteShoppingList(editingList.value.id);
      consola.debug("Shopping List: Shopping list deleted successfully");
      listDialog.value = false;
      editingList.value = null;
    }
    catch (error) {
      if (cachedLists.value && previousLists.length > 0) {
        cachedLists.value.splice(0, cachedLists.value.length, ...previousLists);
      }
      throw error;
    }
  }
  catch (error) {
    consola.error("Shopping List: Failed to delete shopping list:", error);
    showError("Failed to Delete", "Failed to delete shopping list. Please try again.");
  }
}

async function handleItemSave(itemData: CreateShoppingListItemInput) {
  try {
    if (editingItem.value?.id) {
      const { data: cachedLists } = useNuxtData("native-shopping-lists");
      const previousLists = cachedLists.value ? [...cachedLists.value] : [];

      if (cachedLists.value && Array.isArray(cachedLists.value)) {
        const listIndex = cachedLists.value.findIndex((l: ShoppingList) => l.id === selectedListId.value);
        if (listIndex !== -1) {
          const list = cachedLists.value[listIndex];
          const itemIndex = list.items?.findIndex((i: ShoppingListItem) => i.id === editingItem.value!.id);
          if (itemIndex !== -1 && list.items) {
            list.items[itemIndex] = { ...list.items[itemIndex], ...itemData };
          }
        }
      }

      try {
        await updateShoppingListItem(editingItem.value.id, itemData);
        consola.debug("Shopping List: Shopping list item updated successfully");
      }
      catch (error) {
        if (cachedLists.value && previousLists.length > 0) {
          cachedLists.value.splice(0, cachedLists.value.length, ...previousLists);
        }
        throw error;
      }
    }
    else {
      const { data: cachedLists } = useNuxtData("native-shopping-lists");
      const previousLists = cachedLists.value ? [...cachedLists.value] : [];
      const newItem = {
        id: `temp-${Date.now()}`,
        ...itemData,
        checked: false,
        order: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      if (cachedLists.value && Array.isArray(cachedLists.value)) {
        const listIndex = cachedLists.value.findIndex((l: ShoppingList) => l.id === selectedListId.value);
        if (listIndex !== -1) {
          const list = cachedLists.value[listIndex];
          if (!list.items)
            list.items = [];
          list.items.push(newItem);
          if (list._count)
            list._count.items = (list._count.items || 0) + 1;
        }
      }

      try {
        const createdItem = await addItemToList(selectedListId.value, itemData);
        consola.debug("Shopping List: Shopping list item created successfully");

        if (cachedLists.value && Array.isArray(cachedLists.value)) {
          const listIndex = cachedLists.value.findIndex((l: ShoppingList) => l.id === selectedListId.value);
          if (listIndex !== -1) {
            const list = cachedLists.value[listIndex];
            const tempIndex = list.items?.findIndex((i: ShoppingListItem) => i.id === newItem.id);
            if (tempIndex !== -1 && list.items) {
              list.items[tempIndex] = createdItem;
            }
          }
        }
      }
      catch (error) {
        if (cachedLists.value && previousLists.length > 0) {
          cachedLists.value.splice(0, cachedLists.value.length, ...previousLists);
        }
        throw error;
      }
    }

    itemDialog.value = false;
    editingItem.value = null;
  }
  catch (error) {
    consola.error("Shopping List: Failed to save shopping list item:", error);
    showError("Failed to Save", "Failed to save item. Please try again.");
  }
}

async function handleItemDelete(itemId: string) {
  try {
    const list = findItemList(itemId);
    if (!list) {
      throw new Error("Item not found in any list");
    }

    if (list.source === "integration") {
      showWarning("Warning", "Deleting items in integrations is not yet supported.");
    }
    else {
      showWarning("Warning", "Deleting individual items is not yet supported.");
    }
    itemDialog.value = false;
    editingItem.value = null;
  }
  catch (error) {
    consola.error("Shopping List: Failed to delete item:", error);
    showError("Error", "Failed to delete item. Please try again.");
  }
}

async function handleToggleItem(itemId: string, checked: boolean) {
  try {
    const { data: cachedLists } = useNuxtData("native-shopping-lists");
    const previousLists = cachedLists.value ? [...cachedLists.value] : [];

    if (cachedLists.value && Array.isArray(cachedLists.value)) {
      for (const list of cachedLists.value) {
        const item = list.items?.find((i: ShoppingListItem) => i.id === itemId);
        if (item) {
          item.checked = checked;
          break;
        }
      }
    }

    try {
      await updateShoppingListItem(itemId, { checked });
      consola.debug("Shopping List: Item toggled successfully");
    }
    catch (error) {
      if (cachedLists.value && previousLists.length > 0) {
        cachedLists.value.splice(0, cachedLists.value.length, ...previousLists);
      }
      throw error;
    }
  }
  catch (error) {
    consola.error("Shopping List: Failed to toggle item:", error);
    showError("Failed to Toggle", "Failed to toggle item. Please try again.");
  }
}

async function handleDeleteList(listId: string) {
  try {
    if (editingList.value?.source === "native" || !editingList.value?.source) {
      const { data: cachedLists } = useNuxtData("native-shopping-lists");
      const previousLists = cachedLists.value ? [...cachedLists.value] : [];

      if (cachedLists.value && Array.isArray(cachedLists.value)) {
        const listIndex = cachedLists.value.findIndex((l: ShoppingList) => l.id === listId);
        if (listIndex !== -1) {
          cachedLists.value.splice(listIndex, 1);
        }
      }

      try {
        await deleteShoppingList(listId);
        consola.debug("Shopping List: Shopping list deleted successfully");
      }
      catch (error) {
        if (cachedLists.value && previousLists.length > 0) {
          cachedLists.value.splice(0, cachedLists.value.length, ...previousLists);
        }
        throw error;
      }
    }
    else {
      showWarning("Warning", "Deleting lists in integrations is not yet supported.");
    }
  }
  catch (error) {
    consola.error("Shopping List: Failed to delete list:", error);
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

    if (list.source === "integration") {
      showWarning("Reorder Not Supported", "Reordering items in integration lists is not currently supported.");
    }
    else {
      const { data: cachedLists } = useNuxtData("native-shopping-lists");
      const previousLists = cachedLists.value ? [...cachedLists.value] : [];

      if (cachedLists.value && Array.isArray(cachedLists.value)) {
        const listIndex = cachedLists.value.findIndex((l: ShoppingList) => l.id === list.id);
        if (listIndex !== -1) {
          const list = cachedLists.value[listIndex];
          const items = list.items || [];
          const itemIndex = items.findIndex((i: ShoppingListItem) => i.id === itemId);

          if (itemIndex !== -1) {
            const newItems = [...items];
            if (direction === "up" && itemIndex > 0) {
              [newItems[itemIndex], newItems[itemIndex - 1]] = [newItems[itemIndex - 1], newItems[itemIndex]];
            }
            else if (direction === "down" && itemIndex < newItems.length - 1) {
              [newItems[itemIndex], newItems[itemIndex + 1]] = [newItems[itemIndex + 1], newItems[itemIndex]];
            }
            list.items = newItems;
          }
        }
      }

      try {
        await reorderItem(itemId, direction);
        consola.debug("Shopping List: Item reordered successfully");
      }
      catch (error) {
        if (cachedLists.value && previousLists.length > 0) {
          cachedLists.value.splice(0, cachedLists.value.length, ...previousLists);
        }
        throw error;
      }
    }
  }
  catch (error) {
    consola.error("Shopping List: Failed to reorder item:", error);
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

    if (list.source === "integration") {
      showWarning("Reorder Not Supported", "Reordering integration lists is not currently supported.");
    }
    else {
      const { data: cachedLists } = useNuxtData("native-shopping-lists");
      const previousLists = cachedLists.value ? [...cachedLists.value] : [];

      if (cachedLists.value && Array.isArray(cachedLists.value)) {
        const lists = [...cachedLists.value].sort((a, b) => (a.order || 0) - (b.order || 0));
        const listIndex = lists.findIndex((l: ShoppingList) => l.id === listId);

        if (listIndex !== -1) {
          if (direction === "up" && listIndex > 0) {
            [lists[listIndex], lists[listIndex - 1]] = [lists[listIndex - 1], lists[listIndex]];
            lists[listIndex].order = listIndex;
            lists[listIndex - 1].order = listIndex - 1;
          }
          else if (direction === "down" && listIndex < lists.length - 1) {
            [lists[listIndex], lists[listIndex + 1]] = [lists[listIndex + 1], lists[listIndex]];
            lists[listIndex].order = listIndex;
            lists[listIndex + 1].order = listIndex + 1;
          }

          cachedLists.value.splice(0, cachedLists.value.length, ...lists);
        }
      }

      try {
        await reorderShoppingList(listId, direction);
        consola.debug("Shopping List: List reordered successfully");
      }
      catch (error) {
        if (cachedLists.value && previousLists.length > 0) {
          cachedLists.value.splice(0, cachedLists.value.length, ...previousLists);
        }
        throw error;
      }
    }
  }
  catch (error) {
    consola.error("Shopping List: Failed to reorder shopping list:", error);
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

    if (list.source === "integration") {
      if (!list.integrationId) {
        throw new Error("Integration ID is required");
      }

      const { data: cachedLists } = useNuxtData("native-shopping-lists");
      const previousLists = cachedLists.value ? [...cachedLists.value] : [];

      if (cachedLists.value && Array.isArray(cachedLists.value)) {
        const listIndex = cachedLists.value.findIndex((l: ShoppingList) => l.id === listId);
        if (listIndex !== -1) {
          const cachedList = cachedLists.value[listIndex];
          if (cachedList.items) {
            const completedItems = cachedList.items.filter((item: ShoppingListItem) => item.checked);
            cachedList.items = cachedList.items.filter((item: ShoppingListItem) => !item.checked);
            if (cachedList._count) {
              cachedList._count.items = Math.max(0, (cachedList._count.items || 0) - completedItems.length);
            }
          }
        }
      }

      try {
        await clearIntegrationCompletedItems(list.integrationId, listId);
        consola.debug("Shopping List: Completed items cleared successfully");
      }
      catch (error) {
        if (cachedLists.value && previousLists.length > 0) {
          cachedLists.value.splice(0, cachedLists.value.length, ...previousLists);
        }
        throw error;
      }
    }
    else {
      const { data: cachedLists } = useNuxtData("native-shopping-lists");
      const previousLists = cachedLists.value ? [...cachedLists.value] : [];

      if (cachedLists.value && Array.isArray(cachedLists.value)) {
        const listIndex = cachedLists.value.findIndex((l: ShoppingList) => l.id === listId);
        if (listIndex !== -1) {
          const cachedList = cachedLists.value[listIndex];
          if (cachedList.items) {
            const completedItems = cachedList.items.filter((item: ShoppingListItem) => item.checked);
            cachedList.items = cachedList.items.filter((item: ShoppingListItem) => !item.checked);
            if (cachedList._count) {
              cachedList._count.items = Math.max(0, (cachedList._count.items || 0) - completedItems.length);
            }
          }
        }
      }

      try {
        await deleteCompletedItems(listId);
        consola.debug("Shopping List: Completed items cleared successfully");
      }
      catch (error) {
        if (cachedLists.value && previousLists.length > 0) {
          cachedLists.value.splice(0, cachedLists.value.length, ...previousLists);
        }
        throw error;
      }
    }
  }
  catch (error) {
    consola.error("Shopping List: Failed to clear completed items:", error);
    showError("Clear Failed", "Failed to clear completed items. Please try again.");
  }
}

function findItemList(itemId: string) {
  return allShoppingLists.value.find(list =>
    list.items?.some((item: ShoppingListItem) => item.id === itemId),
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
  const integration = integrations.find(i => i.id === integrationId);
  if (!integration)
    return [];

  const config = integrationRegistry.get(`${integration.type}:${integration.service}`);
  return config?.capabilities || [];
}

function hasCapability(integrationId: string, capability: string): boolean {
  const capabilities = getIntegrationCapabilities(integrationId);
  return capabilities.includes(capability);
}

function getIntegrationType(): string | undefined {
  if (editingItem.value?.source === "integration") {
    const integrations: Integration[] = shoppingIntegrations.value as Integration[];
    const integration = integrations.find(i => i.id === editingItem.value?.integrationId);
    return integration?.service;
  }

  if (selectedListId.value) {
    const selectedList = allShoppingLists.value.find(list => list.id === selectedListId.value);
    if (selectedList?.source === "integration") {
      const integrations: Integration[] = shoppingIntegrations.value as Integration[];
      const integration = integrations.find(i => i.id === selectedList.integrationId);
      return integration?.service;
    }
  }

  return undefined;
}

function getItemIntegrationCapabilities(): string[] | undefined {
  if (editingItem.value?.source === "integration") {
    if (!editingItem.value.integrationId) {
      return undefined;
    }
    return getIntegrationCapabilities(editingItem.value.integrationId);
  }

  if (selectedListId.value) {
    const selectedList = allShoppingLists.value.find(list => list.id === selectedListId.value);
    if (selectedList?.source === "integration") {
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
          key: "name",
          label: "Item Name",
          type: "text" as const,
          placeholder: "Milk, Bread, Apples, etc.",
          required: true,
          canEdit: true,
        },
        {
          key: "quantity",
          label: "Quantity",
          type: "number" as const,
          min: 0,
          canEdit: true,
        },
        {
          key: "unit",
          label: "Unit",
          type: "text" as const,
          placeholder: "Can, Box, etc.",
          canEdit: true,
        },
        {
          key: "notes",
          label: "Notes",
          type: "textarea" as const,
          placeholder: "Additional notes (optional)",
          canEdit: true,
        },
      ];

  return getFieldsForItem(item, integrationType, baseFields) as DialogField[];
}
</script>

<template>
  <div class="flex h-[calc(100vh-2rem)] w-full flex-col rounded-lg">
    <div class="py-5 sm:px-4 sticky top-0 z-40 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
      <GlobalDateHeader />
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
          const shoppingList = list as ShoppingListWithIntegration;
          return shoppingList.source === 'native';
        }"
        :show-add="(list) => {
          const shoppingList = list as ShoppingListWithIntegration;
          return shoppingList.source === 'native' || (shoppingList.integrationId ? hasCapability(shoppingList.integrationId!, 'add_items') : false);
        }"
        :show-edit-item="(list) => {
          const shoppingList = list as ShoppingListWithIntegration;
          return shoppingList.source === 'native' || (shoppingList.integrationId ? hasCapability(shoppingList.integrationId!, 'edit_items') : false);
        }"
        :show-completed="(list) => {
          const shoppingList = list as ShoppingListWithIntegration;
          return shoppingList.source === 'native' || (shoppingList.integrationId ? hasCapability(shoppingList.integrationId!, 'clear_items') : false);
        }"
        show-integration-icons
        @create="openCreateList"
        @edit="editingList = $event as ShoppingListWithIntegration; listDialog = true"
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
      aria-label="Create new shopping list"
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
      :fields="getFilteredFieldsForItem(editingItem ?? { integrationData: {} } as ShoppingListItem, getIntegrationType())"
      :integration-capabilities="getItemIntegrationCapabilities()"
      @close="itemDialog = false; selectedListId = ''; editingItem = null"
      @save="handleItemSave"
      @delete="handleItemDelete"
    />
  </div>
</template>
