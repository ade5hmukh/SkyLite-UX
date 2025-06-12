<script setup lang="ts">
import type { List, ListItem } from "../../types/list";

const props = defineProps<{
  lists: readonly List[];
  loading?: boolean;
  emptyStateIcon?: string;
  emptyStateTitle?: string;
  emptyStateDescription?: string;
  showProgress?: boolean;
  showQuantity?: boolean;
  showNotes?: boolean;
  showReorder?: boolean;
  showEdit?: boolean;
  showAdd?: boolean;
  showCompleted?: boolean;
}>();

const _emit = defineEmits<{
  (e: "create"): void;
  (e: "edit", list: List): void;
  (e: "addItem", listId: string): void;
  (e: "editItem", item: ListItem): void;
  (e: "toggleItem", itemId: string, checked: boolean): void;
  (e: "reorderItem", itemId: string, direction: "up" | "down"): void;
  (e: "reorderList", listId: string, direction: "up" | "down"): void;
  (e: "clearCompleted", listId: string): void;
}>();

// Computed property to ensure proper reactivity for sorted lists
const sortedLists = computed(() => {
  return [...props.lists]
    .sort((a, b) => (a.order || 0) - (b.order || 0))
    .map(list => ({
      ...list,
      sortedItems: list.items ? [...list.items].sort((a, b) => (a.order || 0) - (b.order || 0)) : [],
      completedItems: list.items ? list.items.filter((item: ListItem) => item.checked) : [],
      activeItems: list.items ? list.items.filter((item: ListItem) => !item.checked) : [],
    }));
});

function getProgressPercentage(list: List) {
  if (!list.items || list.items.length === 0)
    return 0;
  const checkedItems = list.items.filter((item: ListItem) => item.checked).length;
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
</script>

<template>
  <div class="flex h-[calc(100vh-2rem)] w-full flex-col rounded-lg">
    <!-- Lists Content -->
    <div class="flex-1 overflow-hidden">
      <div class="flex-1 overflow-y-auto p-4">
        <div v-if="loading" class="flex items-center justify-center h-full">
          <div class="text-center">
            <UIcon name="i-lucide-loader-2" class="h-8 w-8 animate-spin text-primary-500" />
            <p class="mt-2 text-sm text-gray-500 dark:text-gray-400">
              Loading lists...
            </p>
          </div>
        </div>
        <div v-else-if="lists.length === 0" class="flex items-center justify-center h-full">
          <div class="text-center">
            <UIcon :name="emptyStateIcon || 'i-lucide-list'" class="h-8 w-8 text-gray-400" />
            <p class="mt-2 text-sm text-gray-500 dark:text-gray-400">
              {{ emptyStateTitle || 'No lists found' }}
            </p>
            <p v-if="emptyStateDescription" class="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {{ emptyStateDescription }}
            </p>
            <UButton
              class="mt-4"
              color="primary"
              @click="_emit('create')"
            >
              Create List
            </UButton>
          </div>
        </div>
        <div v-else class="h-full">
          <div class="h-full overflow-x-auto pb-4">
            <div class="flex gap-6 min-w-max h-full">
              <div
                v-for="(list, listIndex) in sortedLists"
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
                    </div>
                    <div class="flex gap-1">
                      <!-- Column reorder buttons -->
                      <div v-if="showReorder" class="flex flex-col gap-1 items-center justify-center" style="height: 64px;">
                        <template v-if="listIndex > 0 && listIndex < sortedLists.length - 1">
                          <UButton
                            icon="i-lucide-chevron-left"
                            size="xs"
                            variant="ghost"
                            color="neutral"
                            @click="_emit('reorderList', list.id, 'up')"
                          />
                          <UButton
                            icon="i-lucide-chevron-right"
                            size="xs"
                            variant="ghost"
                            color="neutral"
                            @click="_emit('reorderList', list.id, 'down')"
                          />
                        </template>
                        <template v-else-if="listIndex > 0">
                          <div style="height: 16px;"></div>
                          <UButton
                            icon="i-lucide-chevron-left"
                            size="xs"
                            variant="ghost"
                            color="neutral"
                            @click="_emit('reorderList', list.id, 'up')"
                          />
                          <div style="height: 16px;"></div>
                        </template>
                        <template v-else-if="listIndex < sortedLists.length - 1">
                          <div style="height: 16px;"></div>
                          <UButton
                            icon="i-lucide-chevron-right"
                            size="xs"
                            variant="ghost"
                            color="neutral"
                            @click="_emit('reorderList', list.id, 'down')"
                          />
                          <div style="height: 16px;"></div>
                        </template>
                      </div>
                      <UButton
                        v-if="showEdit"
                        icon="i-lucide-pencil"
                        size="xs"
                        variant="ghost"
                        color="neutral"
                        :title="`Edit ${list.name}`"
                        @click="_emit('edit', list)"
                      />
                    </div>
                  </div>

                  <!-- Progress Section -->
                  <div v-if="showProgress && list.items && list.items.length > 0" class="space-y-2">
                    <div class="flex justify-between text-sm">
                      <span class="text-gray-600 dark:text-gray-400">
                        {{ list.items.filter((item: ListItem) => item.checked).length }} of {{ list.items.length }} items
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
                  <div v-else-if="!list.items || list.items.length === 0" class="text-sm text-gray-500 dark:text-gray-400 py-2">
                    No items yet
                  </div>
                </div>

                <!-- Items List -->
                <div class="flex-1 p-4 overflow-y-auto">
                  <!-- Add Item Button -->
                  <div v-if="showAdd" class="flex justify-center mb-4">
                    <UButton
                      size="sm"
                      variant="outline"
                      color="neutral"
                      class="w-full"
                      @click="_emit('addItem', list.id)"
                    >
                      <UIcon name="i-lucide-plus" class="h-4 w-4 mr-1" />
                      Add Item
                    </UButton>
                  </div>

                  <div v-if="!list.items || list.items.length === 0" class="flex flex-col items-center justify-center py-12 text-gray-500 dark:text-gray-400">
                    <UIcon name="i-lucide-list" class="h-12 w-12 mb-3 opacity-30" />
                    <p class="text-sm font-medium mb-1">
                      No items yet
                    </p>
                    <p class="text-xs mb-4">
                      Add your first item to get started
                    </p>
                  </div>
                  <div v-else class="space-y-4">
                    <!-- Active Items -->
                    <div v-if="list.activeItems.length > 0" class="space-y-2">
                      <GlobalListItem
                        v-for="(item, index) in list.activeItems"
                        :key="item.id"
                        :item="item"
                        :index="index"
                        :total-items="list.activeItems.length"
                        :show-quantity="showQuantity"
                        :show-notes="showNotes"
                        :show-reorder="showReorder"
                        :show-edit="showEdit"
                        @edit="_emit('editItem', $event)"
                        @toggle="(payload) => _emit('toggleItem', payload.itemId, payload.checked)"
                        @reorder="(payload) => _emit('reorderItem', payload.itemId, payload.direction)"
                      />
                    </div>

                    <!-- Completed Items -->
                    <div v-if="showCompleted && list.completedItems.length > 0" class="space-y-2">
                      <div class="flex items-center justify-between px-1">
                        <h3 class="text-sm font-medium text-gray-500 dark:text-gray-400">
                          Completed ({{ list.completedItems.length }})
                        </h3>
                        <UButton
                          v-if="list.completedItems.length > 0"
                          size="xs"
                          variant="ghost"
                          color="neutral"
                          @click="_emit('clearCompleted', list.id)"
                        >
                          Clear
                        </UButton>
                      </div>
                      <GlobalListItem
                        v-for="(item, index) in list.completedItems"
                        :key="item.id"
                        :item="item"
                        :index="index"
                        :total-items="list.completedItems.length"
                        :show-quantity="showQuantity"
                        :show-notes="showNotes"
                        :show-reorder="showReorder"
                        :show-edit="showEdit"
                        @edit="_emit('editItem', $event)"
                        @toggle="(payload) => _emit('toggleItem', payload.itemId, payload.checked)"
                        @reorder="(payload) => _emit('reorderItem', payload.itemId, payload.direction)"
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
</template>
