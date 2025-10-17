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
const todoColumnIds = ref<string[]>([]); // Changed to array for multi-selection
const todoPoints = ref<number>(0);
const todoRecurring = ref<boolean>(false);
const todoRecurringPattern = ref<"DAILY" | "WEEKLY" | "MONTHLY">("DAILY");
const todoRecurringDaysOfWeek = ref<number[]>([]);
const todoRecurringDayOfMonth = ref<number>(1);
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

// Computed property for user column options
const columnOptions = computed(() => {
  return props.todoColumns.map(col => ({
    label: col.name,
    value: col.id,
  }));
});

watch(() => [props.isOpen, props.todo], ([isOpen, todo]) => {
  if (isOpen) {
    // Store the column ID(s) before resetting
    const columnIdToPreserve = todo && typeof todo === "object" && "todoColumnId" in todo 
      ? todo.todoColumnId 
      : undefined;
    
    resetForm();
    
    // Restore column ID after reset (convert single ID to array for backward compatibility)
    if (columnIdToPreserve && columnIdToPreserve !== "") {
      todoColumnIds.value = [columnIdToPreserve];
    }
    
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
      // Load points and chore data
      if ("points" in todo) {
        todoPoints.value = (todo as any).points || 0;
      }
      if ("recurring" in todo) {
        todoRecurring.value = (todo as any).recurring || false;
        todoRecurringPattern.value = (todo as any).recurringPattern || "DAILY";
        todoRecurringDaysOfWeek.value = (todo as any).recurringDaysOfWeek || [];
        todoRecurringDayOfMonth.value = (todo as any).recurringDayOfMonth || 1;
      }
      // Check if editing a chore
      if ("isChore" in todo && (todo as any).isChore) {
        mode.value = 'chore';
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
  todoColumnIds.value = []; // Reset to empty array
  todoPoints.value = 0;
  todoRecurring.value = false;
  todoRecurringPattern.value = "DAILY";
  todoRecurringDaysOfWeek.value = [];
  todoRecurringDayOfMonth.value = 1;
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

  if (todoColumnIds.value.length === 0 && props.todoColumns.length > 0) {
    todoError.value = "Please select at least one user";
    return;
  }

  if (mode.value === 'chore' && !selectedChore.value && !props.todo?.id) {
    todoError.value = "Please select a chore template";
    return;
  }

  // When editing an existing todo, only use the first selected column
  // When creating a new todo, create one for each selected column
  const columnsToProcess = props.todo?.id 
    ? [todoColumnIds.value[0]] 
    : todoColumnIds.value;

  // Create todo data for each selected column
  for (const columnId of columnsToProcess) {
    const todoData: TodoListItem & { 
      isChore?: boolean; 
      choreType?: string; 
      choreIcon?: string; 
      points?: number; 
      recurring?: boolean;
      recurringPattern?: "DAILY" | "WEEKLY" | "MONTHLY";
      recurringDaysOfWeek?: number[];
      recurringDayOfMonth?: number;
    } = {
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
      todoColumnId: columnId || (props.todoColumns.length > 0 ? props.todoColumns[0]?.id ?? undefined : undefined),
      checked: props.todo?.checked || false,
      order: props.todo?.order || 0,
      isChore: mode.value === 'chore',
      choreType: mode.value === 'chore' && selectedChore.value ? selectedChore.value.id : null,
      choreIcon: mode.value === 'chore' && selectedChore.value ? selectedChore.value.icon : null,
      points: todoPoints.value,
      recurring: todoRecurring.value,
      recurringPattern: todoRecurring.value ? todoRecurringPattern.value : undefined,
      recurringDaysOfWeek: todoRecurring.value && todoRecurringPattern.value === "WEEKLY" ? todoRecurringDaysOfWeek.value : undefined,
      recurringDayOfMonth: todoRecurring.value && todoRecurringPattern.value === "MONTHLY" ? todoRecurringDayOfMonth.value : undefined,
    };

    emit("save", todoData);
  }
  
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
              <label class="block text-sm font-medium text-highlighted flex items-center gap-1">
                Assign to
                <span class="text-xs text-muted font-normal">(select one or more users)</span>
              </label>
              
              <!-- Debug info (remove after testing) -->
              <div v-if="false" class="text-xs text-gray-500 mb-2">
                Columns: {{ todoColumns.length }} | Options: {{ columnOptions.length }} | Selected: {{ todoColumnIds.length }}
              </div>
              
              <!-- Checkbox-based multi-select -->
              <div class="border border-default rounded-lg p-3 space-y-2 bg-default">
                <label v-for="column in todoColumns" :key="column.id" class="flex items-center gap-2 cursor-pointer hover:bg-muted px-2 py-1.5 rounded">
                  <input
                    v-model="todoColumnIds"
                    type="checkbox"
                    :value="column.id"
                    class="w-4 h-4 text-primary rounded focus:ring-primary"
                  >
                  <span class="text-sm text-highlighted">{{ column.name }}</span>
                  <span v-if="column.user?.avatar" class="ml-auto">
                    <img :src="column.user.avatar" :alt="column.name" class="w-5 h-5 rounded-full">
                  </span>
                </label>
                <div v-if="todoColumns.length === 0" class="text-sm text-muted text-center py-2">
                  No users available
                </div>
              </div>
              
              <p v-if="!props.todo?.id && todoColumnIds.length > 1" class="text-xs text-muted">
                💡 A separate task will be created for each of the {{ todoColumnIds.length }} selected users
              </p>
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
                <span class="text-xs text-muted">(optional)</span>
              </label>
              <UInput
                v-model.number="todoPoints"
                type="number"
                min="0"
                step="1"
                placeholder="Enter points (0 for no celebration)"
                class="w-full"
                :ui="{ base: 'w-full' }"
              />
              <p class="text-xs text-muted">
                Tasks with points > 0 trigger celebration animation when completed! 🎉
              </p>
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

          <div class="space-y-3">
            <label class="flex items-center gap-2 cursor-pointer">
              <input
                v-model="todoRecurring"
                type="checkbox"
                class="w-4 h-4 text-primary rounded focus:ring-primary"
              >
              <span class="text-sm font-medium text-highlighted flex items-center gap-1.5">
                <UIcon name="i-lucide-repeat" class="h-4 w-4" />
                Recurring Task
              </span>
            </label>

            <div v-if="todoRecurring" class="ml-6 space-y-3 p-3 bg-muted rounded-lg">
              <div>
                <label class="block text-xs font-medium text-highlighted mb-1">Pattern</label>
                <select
                  v-model="todoRecurringPattern"
                  class="w-full px-3 py-1.5 text-sm bg-default border border-default rounded-lg focus:ring-2 focus:ring-primary"
                >
                  <option value="DAILY">Daily</option>
                  <option value="WEEKLY">Weekly</option>
                  <option value="MONTHLY">Monthly</option>
                </select>
              </div>

              <div v-if="todoRecurringPattern === 'WEEKLY'" class="space-y-2">
                <label class="block text-xs font-medium text-highlighted">Days of Week</label>
                <div class="flex flex-wrap gap-2">
                  <label v-for="(day, index) in ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']" :key="index" class="flex items-center gap-1">
                    <input
                      v-model="todoRecurringDaysOfWeek"
                      type="checkbox"
                      :value="index"
                      class="w-4 h-4 text-primary rounded"
                    >
                    <span class="text-xs">{{ day }}</span>
                  </label>
                </div>
              </div>

              <div v-if="todoRecurringPattern === 'MONTHLY'" class="space-y-2">
                <label class="block text-xs font-medium text-highlighted">Day of Month</label>
                <input
                  v-model.number="todoRecurringDayOfMonth"
                  type="number"
                  min="1"
                  max="31"
                  class="w-24 px-3 py-1.5 text-sm bg-default border border-default rounded-lg focus:ring-2 focus:ring-primary"
                >
              </div>

              <p class="text-xs text-muted">
                This item will reset at midnight based on the pattern above
              </p>
            </div>
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
