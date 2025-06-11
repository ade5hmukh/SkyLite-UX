<script setup lang="ts">
import type { CreateShoppingListInput, CreateShoppingListItemInput } from "~/types/database";

import ShoppingListDialog from "~/components/shopping/ShoppingListDialog.vue";
import ShoppingListItemDialog from "~/components/shopping/ShoppingListItemDialog.vue";

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
} = useShoppingLists();

const { fetchIntegrations, getEnabledIntegrations, getIntegrationsByType } = useIntegrations();

// Modal state
const listDialog = ref(false);
const itemDialog = ref(false);
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

// Add type for list items
type ShoppingListItem = {
  readonly id: string;
  readonly name: string;
  readonly checked: boolean;
  readonly quantity: number;
  readonly unit: string | null;
  readonly notes: string | null;
  readonly order: number;
  readonly shoppingListId: string;
};

// Add type for shopping list
type ShoppingList = {
  readonly id: string;
  readonly name: string;
  readonly items: readonly ShoppingListItem[];
  readonly order: number;
  readonly createdAt: Date;
  readonly updatedAt: Date;
  sortedItems: readonly ShoppingListItem[];
};

function getProgressPercentage(list: ShoppingList) {
  if (!list.items || list.items.length === 0)
    return 0;
  const checkedItems = list.items.filter(item => item.checked).length;
  return Math.round((checkedItems / list.items.length) * 100);
}

function getProgressColor(percentage: number) {
  if (percentage === 100)
    return "bg-green-500";
  if (percentage >= 75)
    return "bg-blue-500";
  if (percentage >= 50)
    return "bg-yellow-500";
  if (percentage >= 25)
    return "bg-orange-500";
  return "bg-red-500";
}

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
  if (confirm("Are you sure you want to delete this shopping list?")) {
    try {
      await deleteShoppingList(listId);
    }
    catch (error) {
      console.error("Failed to delete list:", error);
    }
  }
}

const reorderingItems = ref(new Set<string>());

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
    // Show error to user
    alert("Failed to reorder item. Please try again.");
  }
  finally {
    reorderingItems.value.delete(itemId);
  }
}

// Computed property to ensure proper reactivity for sorted shopping lists
const sortedShoppingLists = computed(() => {
  return [...shoppingLists.value]
    .sort((a, b) => ((a as any).order || 0) - ((b as any).order || 0))
    .map(list => ({
      ...list,
      sortedItems: list.items ? [...list.items].sort((a, b) => ((a as any).order || 0) - ((b as any).order || 0)) : [],
    }));
});

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
    // Show error to user
    alert("Failed to reorder shopping list. Please try again.");
  }
  finally {
    reorderingLists.value.delete(listId);
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
      <div class="flex flex-col gap-1.5">
        <h1 class="font-semibold text-xl text-gray-900 dark:text-white">
          Shopping Lists
        </h1>
        <p class="text-sm text-gray-600 dark:text-gray-400">
          Organize your shopping and never forget an item
        </p>
      </div>

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
      <div v-if="activeTab === 'native'" class="flex-1 overflow-y-auto p-4">
        <div v-if="loading" class="flex items-center justify-center h-full">
          <div class="text-center">
            <UIcon name="i-lucide-loader-2" class="h-8 w-8 animate-spin text-primary-500" />
            <p class="mt-2 text-sm text-gray-500 dark:text-gray-400">
              Loading shopping lists...
            </p>
          </div>
        </div>
        <div v-else-if="shoppingLists.length === 0" class="flex items-center justify-center h-full">
          <div class="text-center">
            <UIcon name="i-lucide-shopping-cart" class="h-8 w-8 text-gray-400" />
            <p class="mt-2 text-sm text-gray-500 dark:text-gray-400">
              No shopping lists found
            </p>
            <UButton
              class="mt-4"
              color="primary"
              @click="openCreateList"
            >
              Create List
            </UButton>
          </div>
        </div>
        <div v-else class="h-full">
          <div class="h-full overflow-x-auto pb-4">
            <div class="flex gap-6 min-w-max h-full">
              <div
                v-for="(list, listIndex) in sortedShoppingLists"
                :key="list.id"
                class="flex-shrink-0 w-80 h-full flex flex-col bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm"
              >
                <!-- List Header -->
                <div class="p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 rounded-t-lg">
                  <div class="flex items-center justify-between mb-3">
                    <div class="flex items-center gap-2 flex-1 min-w-0">
                      <h2 class="text-lg font-semibold text-gray-900 dark:text-white truncate">
                        {{ list.name }}
                      </h2>
                      <UButton
                        icon="i-lucide-pencil"
                        size="xs"
                        variant="ghost"
                        color="neutral"
                        :title="`Edit ${list.name}`"
                        @click="editingList = list; listDialog = true"
                      />
                    </div>
                    <div class="flex gap-1">
                      <!-- Column reorder buttons -->
                      <div class="flex flex-col gap-1">
                        <UButton
                          icon="i-lucide-chevron-left"
                          size="xs"
                          variant="ghost"
                          color="neutral"
                          :disabled="listIndex === 0 || reorderingLists.has(list.id)"
                          :loading="reorderingLists.has(list.id)"
                          @click="handleReorderList(list.id, 'up')"
                        />
                        <UButton
                          icon="i-lucide-chevron-right"
                          size="xs"
                          variant="ghost"
                          color="neutral"
                          :disabled="listIndex === sortedShoppingLists.length - 1 || reorderingLists.has(list.id)"
                          :loading="reorderingLists.has(list.id)"
                          @click="handleReorderList(list.id, 'down')"
                        />
                      </div>
                      <UButton
                        icon="i-lucide-plus"
                        size="sm"
                        color="neutral"
                        variant="ghost"
                        @click="openAddItem(list.id)"
                      />
                      <UButton
                        icon="i-lucide-trash"
                        size="sm"
                        color="neutral"
                        variant="ghost"
                        @click="handleDeleteList(list.id)"
                      />
                    </div>
                  </div>

                  <!-- Progress Section -->
                  <div v-if="list.items && list.items.length > 0" class="space-y-2">
                    <div class="flex justify-between text-sm">
                      <span class="text-gray-600 dark:text-gray-400">
                        {{ list.items.filter(item => item.checked).length }} of {{ list.items.length }} items
                      </span>
                      <span class="text-gray-600 dark:text-gray-400 font-medium">
                        {{ getProgressPercentage(list) }}%
                      </span>
                    </div>
                    <div class="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                      <div
                        class="h-2 rounded-full transition-all duration-300"
                        :class="getProgressColor(getProgressPercentage(list))"
                        :style="{ width: `${getProgressPercentage(list)}%` }"
                      />
                    </div>
                  </div>
                  <div v-else class="text-sm text-gray-500 dark:text-gray-400">
                    No items yet
                  </div>
                </div>

                <!-- Items List -->
                <div class="flex-1 p-4 overflow-y-auto">
                  <div v-if="!list.items || list.items.length === 0" class="flex flex-col items-center justify-center py-12 text-gray-500 dark:text-gray-400">
                    <UIcon name="i-lucide-shopping-bag" class="h-12 w-12 mb-3 opacity-30" />
                    <p class="text-sm font-medium mb-1">
                      No items yet
                    </p>
                    <p class="text-xs mb-4">
                      Add your first item to get started
                    </p>
                    <UButton
                      size="sm"
                      variant="outline"
                      @click="openAddItem(list.id)"
                    >
                      Add Item
                    </UButton>
                  </div>
                  <div v-else class="space-y-2">
                    <div
                      v-for="(item, index) in list.sortedItems"
                      :key="item.id"
                      class="group flex items-start gap-3 p-3 rounded-lg transition-all hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer"
                      :class="{ 'opacity-60 bg-gray-50 dark:bg-gray-800/50': item.checked }"
                      @click="openEditItem(item)"
                    >
                      <UCheckbox
                        :model-value="item.checked"
                        class="mt-0.5"
                        @update:model-value="handleToggleItem(item.id, Boolean($event))"
                        @click.stop
                      />
                      <div class="flex-1 min-w-0">
                        <div class="flex items-center gap-2">
                          <span
                            class="text-sm font-medium text-gray-900 dark:text-white truncate"
                            :class="{ 'line-through': item.checked }"
                          >
                            {{ item.name }}
                          </span>
                          <span
                            v-if="item.quantity > 1 || item.unit"
                            class="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap px-2 py-0.5 bg-gray-100 dark:bg-gray-700 rounded-full"
                            :class="{ 'line-through': item.checked }"
                          >
                            {{ item.quantity }}{{ item.unit ? ` ${item.unit}` : '' }}
                          </span>
                        </div>
                        <p
                          v-if="item.notes"
                          class="text-xs text-gray-600 dark:text-gray-400 mt-1 line-clamp-2"
                          :class="{ 'line-through': item.checked }"
                        >
                          {{ item.notes }}
                        </p>
                      </div>
                      <div class="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity" @click.stop>
                        <div class="flex flex-col gap-1">
                          <UButton
                            icon="i-lucide-chevron-up"
                            size="xs"
                            variant="ghost"
                            color="neutral"
                            :disabled="index === 0 || reorderingItems.has(item.id)"
                            :loading="reorderingItems.has(item.id)"
                            @click="handleReorderItem(item.id, 'up')"
                          />
                          <UButton
                            icon="i-lucide-chevron-down"
                            size="xs"
                            variant="ghost"
                            color="neutral"
                            :disabled="index === list.sortedItems.length - 1 || reorderingItems.has(item.id)"
                            :loading="reorderingItems.has(item.id)"
                            @click="handleReorderItem(item.id, 'down')"
                          />
                        </div>
                        <UButton
                          icon="i-lucide-pencil"
                          size="xs"
                          variant="ghost"
                          color="neutral"
                          :title="`Edit ${item.name}`"
                          @click="openEditItem(item)"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
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
    />

    <ShoppingListItemDialog
      :is-open="itemDialog"
      :item="editingItem"
      @close="itemDialog = false; selectedListId = ''; editingItem = null"
      @save="handleItemSave"
    />
  </div>
</template>
