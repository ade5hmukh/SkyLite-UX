<script setup lang="ts">
type ListItem = {
  id: string;
  name: string;
  checked?: boolean;
  quantity?: number;
  unit?: string | null;
  notes?: string | null;
  order: number;
  shoppingListId: string;
  [key: string]: any; // Allow for additional properties
};

type ToggleEvent = {
  itemId: string;
  checked: boolean;
};

type ReorderEvent = {
  itemId: string;
  direction: "up" | "down";
};

defineProps<{
  item: ListItem;
  index: number;
  totalItems: number;
  showQuantity?: boolean;
  showNotes?: boolean;
  showReorder?: boolean;
  showEdit?: boolean;
}>();

const emit = defineEmits<{
  (e: "edit", item: ListItem): void;
  (e: "toggle", payload: ToggleEvent): void;
  (e: "reorder", payload: ReorderEvent): void;
}>();
</script>

<template>
  <div
    class="group flex items-start gap-3 p-3 rounded-lg transition-all bg-gray-50 dark:bg-gray-700/40"
    :class="{ 'opacity-60 bg-gray-50 dark:bg-gray-800/50': item.checked }"
  >
    <UCheckbox
      v-if="item.checked !== undefined"
      :model-value="item.checked"
      color="primary"
      size="xl"
      @update:model-value="emit('toggle', { itemId: item.id, checked: Boolean($event) })"
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
          v-if="showQuantity && (item.quantity && item.quantity > 1 || item.unit)"
          class="text-xs text-gray-700 dark:text-gray-300 whitespace-nowrap px-2 py-0.5 bg-neutral-100 dark:bg-neutral-800 rounded-full"
          :class="{ 'line-through': item.checked }"
        >
          {{ item.quantity }}{{ item.unit ? ` ${item.unit}` : '' }}
        </span>
      </div>
      <p
        v-if="showNotes && item.notes"
        class="text-xs text-gray-700 dark:text-gray-300 mt-1 line-clamp-2"
        :class="{ 'line-through': item.checked }"
      >
        {{ item.notes }}
      </p>
    </div>
    <div class="flex gap-1">
      <div v-if="showReorder" class="flex flex-col gap-1">
        <UButton
          v-if="index > 0"
          icon="i-lucide-chevron-up"
          size="xs"
          variant="ghost"
          color="neutral"
          @click="emit('reorder', { itemId: item.id, direction: 'up' })"
        />
        <UButton
          v-if="index < totalItems - 1"
          icon="i-lucide-chevron-down"
          size="xs"
          variant="ghost"
          color="neutral"
          @click="emit('reorder', { itemId: item.id, direction: 'down' })"
        />
      </div>
      <UButton
        v-if="showEdit"
        icon="i-lucide-pencil"
        size="xs"
        variant="ghost"
        color="neutral"
        :title="`Edit ${item.name}`"
        @click="emit('edit', item)"
      />
    </div>
  </div>
</template>
