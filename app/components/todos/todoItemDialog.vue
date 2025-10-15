<script setup lang="ts">
import type { CalendarDate, DateValue } from "@internationalized/date";

import { getLocalTimeZone, parseDate } from "@internationalized/date";

import type { Priority, TodoColumnBasic, TodoListItem } from "~/types/database";
import type { ChoreTemplate } from "~/types/chores";

import { useStableDate } from "~/composables/useStableDate";

const props = defineProps<{
  todo: TodoListItem | null;
  isOpen: boolean;
  todoColumns: TodoColumnBasic[];
}>();

const emit = defineEmits<{
  (e: "close"): void;
  (e: "save", todo: TodoListItem & { isChore?: boolean; choreType?: string; choreIcon?: string; points?: number }): void;
  (e: "delete", todoId: string): void;
}>();

const { parseStableDate } = useStableDate();

// Mode: 'custom' for custom to-do, 'chore' for chore template
const mode = ref<'custom' | 'chore'>('custom');
const selectedChore = ref<ChoreTemplate | null>(null);

// Form fields
const todoTitle = ref("");
const todoDescription = ref("");
const todoPriority = ref<Priority>("MEDIUM");
const todoDueDate = ref<DateValue | null>(null);
const todoColumnId = ref<string | undefined>(undefined);
const todoPoints = ref<number>(0);
const todoError = ref<string | null>(null);

// Chore picker state
const selectedCategory = ref("all");
const { data: choreData } = useFetch("/api/chores/templates");

const templates = computed(() => choreData.value?.templates || []);
const categories = computed(() => choreData.value?.categories || []);

const filteredTemplates = computed(() => {
  if (selectedCategory.value === "all") {
    return templates.value;
  }
  return templates.value.filter((t: ChoreTemplate) => t.category === selectedCategory.value);
});

const priorityOptions = [
  { label: "Low", value: "LOW" },
  { label: "Medium", value: "MEDIUM" },
  { label: "High", value: "HIGH" },
  { label: "Urgent", value: "URGENT" },
];

watch(() => [props.isOpen, props.todo], ([isOpen, todo]) => {
  if (isOpen) {
    resetForm();
    if (todo && typeof todo === "object") {
      if ("name" in todo) {
        todoTitle.value = todo.name || "";
        todoDescription.value = todo.description || "";
        todoPriority.value = todo.priority || "MEDIUM";
        if (todo.dueDate) {
          const date = todo.dueDate instanceof Date ? todo.dueDate : parseStableDate(todo.dueDate);
          todoDueDate.value = parseDate(date.toISOString().split("T")[0]!);
        }
      }
      if ("todoColumnId" in todo) {
        todoColumnId.value = todo.todoColumnId || undefined;
      }
      // Check if editing a chore
      if ("isChore" in todo && todo.isChore) {
        mode.value = 'chore';
        if ("points" in todo) {
          todoPoints.value = (todo as any).points || 0;
        }
      }
    }
  }
}, { immediate: true });

function resetForm() {
  mode.value = 'custom';
  todoTitle.value = "";
  todoDescription.value = "";
  todoPriority.value = "MEDIUM";
  todoDueDate.value = null;
  todoColumnId.value = undefined;
  todoPoints.value = 0;
  todoError.value = null;
  selectedChore.value = null;
}

function handleChoreSelect(chore: ChoreTemplate) {
  selectedChore.value = chore;
  todoTitle.value = chore.title;
  todoDescription.value = chore.description;
  todoPoints.value = chore.points;
}

function handleSave() {
  if (!todoTitle.value.trim()) {
    todoError.value = "Title is required";
    return;
  }

  if (!todoColumnId.value && props.todoColumns.length > 0) {
    todoError.value = "Please select a column";
    return;
  }

  if (mode.value === 'chore' && !selectedChore.value && !props.todo?.id) {
    todoError.value = "Please select a chore template";
    return;
  }

  const todoData: TodoListItem & { isChore?: boolean; choreType?: string; choreIcon?: string; points?: number } = {
    id: props.todo?.id,
    name: todoTitle.value.trim(),
    description: todoDescription.value.trim() || null,
    priority: todoPriority.value,
    dueDate: todoDueDate.value
      ? (() => {
          const date = todoDueDate.value!.toDate(getLocalTimeZone());
          date.setHours(23, 59, 59, 999);
          return date;
        })()
      : null,
    todoColumnId: todoColumnId.value || (props.todoColumns.length > 0 ? props.todoColumns[0]?.id ?? undefined : undefined),
    checked: props.todo?.checked || false,
    order: props.todo?.order || 0,
    isChore: mode.value === 'chore',
    choreType: mode.value === 'chore' && selectedChore.value ? selectedChore.value.id : null,
    choreIcon: mode.value === 'chore' && selectedChore.value ? selectedChore.value.icon : null,
    points: todoPoints.value,
  };

  emit("save", todoData);
  resetForm();
  emit("close");
}

function handleDelete() {
  if (props.todo?.id) {
    emit("delete", props.todo.id);
    emit("close");
  }
}
</script>

<template>
  <div
    v-if="isOpen"
    class="fixed inset-0 z-[100] flex items-center justify-center bg-black/50"
    @click="emit('close')"
  >
    <div
      class="w-[90vw] max-w-4xl max-h-[90vh] overflow-y-auto bg-default rounded-lg border border-default shadow-lg"
      @click.stop
    >
      <div class="flex items-center justify-between p-4 border-b border-default">
        <h3 class="text-base font-semibold leading-6">
          {{ todo?.id ? 'Edit Item' : 'Add Item' }}
        </h3>
        <UButton
          color="neutral"
          variant="ghost"
          icon="i-lucide-x"
          class="-my-1"
          @click="emit('close')"
        />
      </div>

      <!-- Mode selector (only show when creating new item) -->
      <div v-if="!todo?.id" class="p-4 border-b border-default bg-muted/30">
        <div class="flex gap-2">
          <UButton
            :color="mode === 'custom' ? 'primary' : 'neutral'"
            :variant="mode === 'custom' ? 'solid' : 'outline'"
            size="lg"
            class="flex-1"
            @click="mode = 'custom'; selectedChore = null"
          >
            <template #leading>
              <UIcon name="i-lucide-list-todo" class="h-5 w-5" />
            </template>
            Custom To-Do
          </UButton>
          <UButton
            :color="mode === 'chore' ? 'primary' : 'neutral'"
            :variant="mode === 'chore' ? 'solid' : 'outline'"
            size="lg"
            class="flex-1"
            @click="mode = 'chore'"
          >
            <template #leading>
              <UIcon name="i-lucide-sparkles" class="h-5 w-5" />
            </template>
            Chore with Points
          </UButton>
        </div>
      </div>

      <div class="p-4">
        <div v-if="todoError" class="bg-error/10 text-error rounded-md px-3 py-2 text-sm mb-4">
          {{ todoError }}
        </div>

        <!-- Chore Picker (when mode is 'chore') -->
        <div v-if="mode === 'chore' && !todo?.id" class="space-y-4 mb-6">
          <!-- Category filter -->
          <div class="flex gap-2 overflow-x-auto pb-2">
            <UButton
              v-for="category in categories"
              :key="category.id"
              :color="selectedCategory === category.id ? 'primary' : 'neutral'"
              :variant="selectedCategory === category.id ? 'solid' : 'outline'"
              size="sm"
              @click="selectedCategory = category.id"
            >
              <template #leading>
                <UIcon :name="category.icon" class="h-4 w-4" />
              </template>
              {{ category.name }}
            </UButton>
          </div>

          <!-- Chore grid -->
          <div class="max-h-[40vh] overflow-y-auto">
            <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              <button
                v-for="chore in filteredTemplates"
                :key="chore.id"
                :class="[
                  'group relative bg-default hover:bg-muted border rounded-xl p-3 transition-all duration-200 text-left',
                  selectedChore?.id === chore.id 
                    ? 'border-primary ring-2 ring-primary ring-offset-1' 
                    : 'border-default hover:border-primary hover:scale-105'
                ]"
                @click="handleChoreSelect(chore)"
              >
                <!-- Points badge -->
                <div class="absolute top-2 right-2 bg-yellow-500 text-white text-xs font-bold px-2 py-1 rounded-full flex items-center gap-1">
                  <UIcon name="i-lucide-star" class="h-3 w-3" />
                  +{{ chore.points }}
                </div>

                <!-- Icon -->
                <div
                  class="w-12 h-12 mx-auto mb-2 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform"
                  :class="`bg-${chore.color}-100 dark:bg-${chore.color}-900/30`"
                >
                  <UIcon
                    :name="chore.icon"
                    class="h-6 w-6"
                    :class="`text-${chore.color}-600 dark:text-${chore.color}-400`"
                  />
                </div>

                <!-- Title -->
                <h4 class="font-semibold text-xs text-center mb-1 text-highlighted line-clamp-2">
                  {{ chore.title }}
                </h4>

                <!-- Description -->
                <p class="text-xs text-muted text-center line-clamp-2">
                  {{ chore.description }}
                </p>
              </button>
            </div>

            <div v-if="filteredTemplates.length === 0" class="text-center py-8">
              <UIcon name="i-lucide-inbox" class="h-12 w-12 mx-auto text-muted mb-3" />
              <p class="text-muted text-sm">
                No chores found in this category
              </p>
            </div>
          </div>
        </div>

        <!-- Form fields -->
        <div class="space-y-4">
          <div class="space-y-2">
            <label class="block text-sm font-medium text-highlighted">Title</label>
            <UInput
              v-model="todoTitle"
              :placeholder="mode === 'chore' ? 'Select a chore above or enter custom title' : 'To-do title'"
              class="w-full"
              :ui="{ base: 'w-full' }"
              :readonly="mode === 'chore' && !!selectedChore && !todo?.id"
            />
          </div>

          <div class="space-y-2">
            <label class="block text-sm font-medium text-highlighted">Description</label>
            <UTextarea
              v-model="todoDescription"
              placeholder="Description (optional)"
              :rows="3"
              class="w-full"
              :ui="{ base: 'w-full' }"
            />
          </div>

          <div class="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div class="space-y-2">
              <label class="block text-sm font-medium text-highlighted">Column</label>
              <USelect
                v-model="todoColumnId"
                :items="todoColumns"
                option-attribute="name"
                value-attribute="id"
                placeholder="Select column"
                class="w-full"
                :ui="{ base: 'w-full' }"
              />
            </div>

            <div class="space-y-2">
              <label class="block text-sm font-medium text-highlighted">Priority</label>
              <USelect
                v-model="todoPriority"
                :items="priorityOptions"
                option-attribute="label"
                value-attribute="value"
                class="w-full"
                :ui="{ base: 'w-full' }"
              />
            </div>

            <div class="space-y-2">
              <label class="block text-sm font-medium text-highlighted flex items-center gap-1">
                <UIcon name="i-lucide-star" class="h-4 w-4 text-yellow-500" />
                Points
              </label>
              <UInput
                v-model.number="todoPoints"
                type="number"
                min="0"
                :placeholder="mode === 'chore' ? 'Points from chore' : 'Optional points'"
                class="w-full"
                :ui="{ base: 'w-full' }"
                :readonly="mode === 'chore' && !!selectedChore && !todo?.id"
              />
            </div>
          </div>

          <div class="space-y-2">
            <label class="block text-sm font-medium text-highlighted">Due Date</label>
            <UPopover>
              <UButton
                color="neutral"
                variant="subtle"
                icon="i-lucide-calendar"
                class="w-full justify-between"
              >
                <NuxtTime
                  v-if="todoDueDate"
                  :datetime="todoDueDate.toDate(getLocalTimeZone())"
                  year="numeric"
                  month="short"
                  day="numeric"
                />
                <span v-else>No due date</span>
              </UButton>

              <template #content>
                <div class="p-2 space-y-2">
                  <UButton
                    v-if="todoDueDate"
                    color="neutral"
                    variant="ghost"
                    class="w-full justify-start"
                    @click="todoDueDate = null"
                  >
                    <template #leading>
                      <UIcon name="i-lucide-x" />
                    </template>
                    Clear due date
                  </UButton>
                  <UCalendar
                    :model-value="todoDueDate as unknown as DateValue"
                    class="p-2"
                    @update:model-value="todoDueDate = $event as CalendarDate"
                  />
                </div>
              </template>
            </UPopover>
          </div>
        </div>
      </div>

      <div class="flex justify-between p-4 border-t border-default">
        <UButton
          v-if="todo?.id"
          color="error"
          variant="ghost"
          icon="i-lucide-trash"
          @click="handleDelete"
        >
          Delete
        </UButton>
        <div class="flex gap-2" :class="{ 'ml-auto': !todo?.id }">
          <UButton
            color="neutral"
            variant="ghost"
            @click="emit('close')"
          >
            Cancel
          </UButton>
          <UButton
            color="primary"
            @click="handleSave"
          >
            <template v-if="mode === 'chore'" #leading>
              <UIcon name="i-lucide-sparkles" class="h-4 w-4" />
            </template>
            {{ todo?.id ? 'Update' : (mode === 'chore' ? 'Add Chore' : 'Add To-Do') }}
          </UButton>
        </div>
      </div>
    </div>
  </div>
</template>
