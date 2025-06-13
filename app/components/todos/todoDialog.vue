<script setup lang="ts">
import type { CreateTodoInput, Priority, UpdateTodoInput, TodoColumnBasic } from "~/types/database";

const props = defineProps<{
  todo: any | null;
  isOpen: boolean;
  todoColumns: TodoColumnBasic[];
}>();

const emit = defineEmits<{
  (e: "close"): void;
  (e: "save", todo: CreateTodoInput | (UpdateTodoInput & { id: string })): void;
  (e: "delete", todoId: string): void;
}>();

// Form state
const title = ref("");
const description = ref("");
const priority = ref<Priority>("MEDIUM");
const dueDate = ref<string>("");
const todoColumnId = ref<string | undefined>(undefined);
const error = ref<string | null>(null);

const priorityOptions = [
  { label: "Low", value: "LOW" },
  { label: "Medium", value: "MEDIUM" },
  { label: "High", value: "HIGH" },
  { label: "Urgent", value: "URGENT" },
];

// Watch for todo changes
watch(() => props.todo, (newTodo) => {
  if (newTodo) {
    title.value = newTodo.title || "";
    description.value = newTodo.description || "";
    priority.value = newTodo.priority || "MEDIUM";
    dueDate.value = newTodo.dueDate ? new Date(newTodo.dueDate).toISOString().slice(0, 16) : "";
    todoColumnId.value = newTodo.todoColumnId || undefined;
    error.value = null;
  }
  else {
    resetForm();
  }
}, { immediate: true });

function resetForm() {
  title.value = "";
  description.value = "";
  priority.value = "MEDIUM";
  dueDate.value = "";
  todoColumnId.value = undefined;
  error.value = null;
}

function handleSave() {
  if (!title.value.trim()) {
    error.value = "Title is required";
    return;
  }

  const todoData: CreateTodoInput = {
    title: title.value,
    description: description.value,
    priority: priority.value,
    dueDate: dueDate.value ? new Date(dueDate.value) : null,
    todoColumnId: todoColumnId.value || null,
    completed: false,
    order: 0,
  };

  if (props.todo?.id) {
    emit("save", { ...todoData, id: props.todo.id });
  }
  else {
    emit("save", todoData);
  }
}

function handleDelete() {
  if (props.todo?.id) {
    emit("delete", props.todo.id);
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
      class="w-[425px] max-h-[90vh] overflow-y-auto bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 shadow-lg"
      @click.stop
    >
      <div class="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
        <h3 class="text-base font-semibold leading-6">
          {{ todo?.id ? 'Edit Todo' : 'Create Todo' }}
        </h3>
        <UButton
          color="neutral"
          variant="ghost"
          icon="i-lucide-x"
          class="-my-1"
          @click="emit('close')"
        />
      </div>

      <div class="p-4 space-y-6">
        <div v-if="error" class="bg-red-50 dark:bg-red-950 text-red-600 dark:text-red-400 rounded-md px-3 py-2 text-sm">
          {{ error }}
        </div>

        <div class="space-y-2">
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-200">Title</label>
          <UInput
            v-model="title"
            placeholder="Todo title"
            class="w-full"
            :ui="{ base: 'w-full' }"
          />
        </div>

        <div class="space-y-2">
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-200">Description</label>
          <UTextarea
            v-model="description"
            placeholder="Todo description (optional)"
            :rows="3"
            class="w-full"
            :ui="{ base: 'w-full' }"
          />
        </div>

        <div class="flex gap-4">
          <div class="w-1/2 space-y-2">
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-200">Priority</label>
            <USelect
              v-model="priority"
              :items="priorityOptions"
              option-attribute="label"
              value-attribute="value"
              class="w-full"
              :ui="{ base: 'w-full' }"
            />
          </div>

          <div class="w-1/2 space-y-2">
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-200">Due Date</label>
            <UInput
              v-model="dueDate"
              type="datetime-local"
              class="w-full"
              :ui="{ base: 'w-full' }"
            />
          </div>
        </div>

        <div class="space-y-2">
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-200">Column</label>
          <USelect
            v-model="todoColumnId"
            :items="todoColumns.map(column => ({
              label: column.name,
              value: column.id,
            }))"
            option-attribute="label"
            value-attribute="value"
            class="w-full"
            :ui="{ base: 'w-full' }"
          />
        </div>
      </div>

      <div class="flex justify-between p-4 border-t border-gray-200 dark:border-gray-700">
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
            {{ todo?.id ? 'Update' : 'Create' }}
          </UButton>
        </div>
      </div>
    </div>
  </div>
</template>
