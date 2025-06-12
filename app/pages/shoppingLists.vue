<script setup lang="ts">
import type { CreateShoppingListInput, CreateShoppingListItemInput } from "~/types/database";

import GlobalAlert from "~/components/global/globalAlert.vue";
import GlobalConfirm from "~/components/global/globalConfirm.vue";
import GlobalList from "~/components/global/globalList.vue";
import ShoppingListDialog from "~/components/shopping/shoppingListDialog.vue";
import ShoppingListItemDialog from "~/components/shopping/shoppingListItemDialog.vue";

const {
  shoppingLists,
  loading,
  createShoppingList,
  updateShoppingList,
  deleteShoppingList,
  addItemToList,
  updateShoppingListItem,
  fetchShoppingLists,
  reorderItem,
  reorderShoppingList,
  deleteCompletedItems,
} = useShoppingLists();

const { fetchIntegrations, getEnabledIntegrations, getIntegrationsByType } = useIntegrations();

// Modal state
const listDialog = ref(false);
const itemDialog = ref(false);
const confirmDialog = ref(false);
const alertDialog = ref(false);
const alertMessage = ref("");
const alertType = ref<"error" | "warning" | "success" | "info">("error");
const confirmAction = ref<(() => Promise<void>) | null>(null);
const selectedListId = ref<string>("");
const editingList = ref<any>(null);
const editingItem = ref<any>(null);

// Tab state
const activeTab = ref<"native" | string>("native");
const selectedIntegrationId = ref<string | null>(null);

// Check if we have any enabled integrations to show tabs
const hasEnabledIntegrations = computed(() => {
  return getEnabledIntegrations.value.length > 0;
});

// Get enabled integrations by type
const enabledIntegrationsByType = computed(() => {
  return getIntegrationsByType("shopping");
});

// Watch for integration changes
watch([activeTab, selectedIntegrationId], async ([newTab, _newIntegrationId]) => {
  if (newTab === "native") {
    // Clear any integration-specific state
    selectedListId.value = "";
  }
});

// Load shopping lists and integrations on mount
onMounted(async () => {
  try {
    // Fetch integrations first
    await fetchIntegrations();

    // Then fetch shopping lists
    await fetchShoppingLists();
  }
  catch (error) {
    console.error("Failed to initialize shopping lists:", error);
  }
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

function openEditItem(item: any) {
  editingItem.value = { ...item };
  itemDialog.value = true;
}

async function handleListSave(listData: CreateShoppingListInput) {
  try {
    if (editingList.value?.id) {
      await updateShoppingList(editingList.value.id, listData);
    }
    else {
      await createShoppingList(listData);
    }
    listDialog.value = false;
    editingList.value = null;
  }
  catch (error) {
    console.error("Failed to save shopping list:", error);
    showAlert("Failed to save shopping list. Please try again.", "error");
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
    console.error("Failed to delete list:", error);
    showAlert("Failed to delete shopping list. Please try again.", "error");
  }
}

async function handleItemSave(itemData: CreateShoppingListItemInput) {
  try {
    if (editingItem.value?.id) {
      await updateShoppingListItem(editingItem.value.id, itemData);
    }
    else if (selectedListId.value) {
      await addItemToList(selectedListId.value, itemData);
    }
    itemDialog.value = false;
    selectedListId.value = "";
    editingItem.value = null;
  }
  catch (error) {
    console.error("Failed to save item:", error);
  }
}

async function handleToggleItem(itemId: string, checked: boolean) {
  try {
    await updateShoppingListItem(itemId, { checked });
  }
  catch (error) {
    console.error("Failed to toggle item:", error);
  }
}

async function handleDeleteList(listId: string) {
  confirmAction.value = async () => {
    try {
      await deleteShoppingList(listId);
    }
    catch (error) {
      console.error("Failed to delete list:", error);
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

function showAlert(message: string, type: "error" | "warning" | "success" | "info" = "error") {
  alertMessage.value = message;
  alertType.value = type;
  alertDialog.value = true;
}

async function handleReorderItem(itemId: string, direction: "up" | "down") {
  // Prevent multiple simultaneous reorders of the same item
  if (reorderingItems.value.has(itemId))
    return;

  reorderingItems.value.add(itemId);

  try {
    await reorderItem(itemId, direction);
  }
  catch (error) {
    console.error("Failed to reorder item:", error);
    showAlert("Failed to reorder item. Please try again.");
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
    await reorderShoppingList(listId, direction);
  }
  catch (error) {
    console.error("Failed to reorder shopping list:", error);
    showAlert("Failed to reorder shopping list. Please try again.");
  }
  finally {
    reorderingLists.value.delete(listId);
  }
}

async function handleClearCompleted(listId: string) {
  try {
    await deleteCompletedItems(listId);
  }
  catch (error) {
    console.error("Failed to clear completed items:", error);
    showAlert("Failed to clear completed items. Please try again.", "error");
  }
}

function getIntegrationIcon(_service: string) {
  return "i-lucide-plug";
}
</script>

<template>
  <div class="flex h-[calc(100vh-2rem)] w-full flex-col rounded-lg">
    <!-- Header -->
    <div class="py-5 sm:px-4 sticky top-0 z-40 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
      <GlobalDateHeader />

      <!-- Tabs (only show if integrations are enabled) -->
      <div v-if="hasEnabledIntegrations" class="mt-4">
        <div class="border-b border-gray-200 dark:border-gray-700">
          <nav class="-mb-px flex space-x-8">
            <button
              class="whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm"
              :class="[
                activeTab === 'native'
                  ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300',
              ]"
              @click="activeTab = 'native'; selectedIntegrationId = null"
            >
              Native Lists
            </button>
            <template v-for="integration in enabledIntegrationsByType" :key="integration.id">
              <button
                class="whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm flex items-center gap-2"
                :class="[
                  activeTab === integration.service && selectedIntegrationId === integration.id
                    ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300',
                ]"
                @click="activeTab = integration.service; selectedIntegrationId = integration.id"
              >
                <UIcon
                  :name="getIntegrationIcon(integration.service)"
                  class="h-4 w-4"
                />
                {{ integration.name }}
              </button>
            </template>
          </nav>
        </div>
      </div>
    </div>

    <!-- Shopping Lists Content -->
    <div class="flex-1 overflow-hidden">
      <!-- Native Lists -->
      <div v-if="activeTab === 'native'" class="flex-1 overflow-y-auto">
        <GlobalList
          :lists="shoppingLists"
          :loading="loading"
          empty-state-icon="i-lucide-shopping-cart"
          empty-state-title="No shopping lists found"
          empty-state-description="Create your first shopping list to get started"
          show-progress
          show-quantity
          show-notes
          show-reorder
          show-edit
          show-add
          show-completed
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
    </div>

    <!-- Floating Action Button -->
    <UButton
      v-if="activeTab === 'native'"
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

    <GlobalAlert
      :is-open="alertDialog"
      :message="alertMessage"
      :type="alertType"
      @close="alertDialog = false"
    />
  </div>
</template>
