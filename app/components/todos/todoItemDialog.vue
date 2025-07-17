<script setup lang="ts">
import type { Priority, TodoColumnBasic, TodoListItem } from "~/types/database";
import type { DateValue } from "@internationalized/date";
import { CalendarDate, DateFormatter, getLocalTimeZone, parseDate } from "@internationalized/date";

const props = defineProps<{
  isOpen: boolean;
  todoColumns: TodoColumnBasic[];
  todo?: TodoListItem;
}>();

const emit = defineEmits<{
  (e: "close"): void;
  (e: "save", todo: TodoListItem): void;
  (e: "delete", todoId: string): void;
}>();

const todoTitle = ref("");
const todoDescription = ref("");
const todoPriority = ref<Priority>("MEDIUM");
const todoDueDate = ref<DateValue | null>(null);
const todoColumnId = ref<string | undefined>(undefined);
const todoError = ref<string | null>(null);

const df = new DateFormatter("en-US", {
  dateStyle: "medium",
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
          const date = new Date(todo.dueDate);
          todoDueDate.value = parseDate(date.toISOString().split("T")[0]!);
        }
      }
      if ("todoColumnId" in todo) {
        todoColumnId.value = todo.todoColumnId || undefined;
      }
    }
  }
}, { immediate: true });

function resetForm() {
  todoTitle.value = "";
  todoDescription.value = "";
  todoPriority.value = "MEDIUM";
  todoDueDate.value = null;
  todoColumnId.value = undefined;
  todoError.value = null;
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

  const todoData = {
    id: props.todo?.id,
    name: todoTitle.value.trim(),
    description: todoDescription.value.trim() || null,
    priority: todoPriority.value,
    dueDate: todoDueDate.value ? (() => {
      const date = todoDueDate.value!.toDate(getLocalTimeZone());
      date.setHours(23, 59, 59, 999);
      return date;
    })() : null,
    todoColumnId: todoColumnId.value || (props.todoColumns.length > 0 ? props.todoColumns[0]?.id ?? undefined : undefined),
    checked: props.todo?.checked || false,
    order: props.todo?.order || 0
  };

  emit("save", todoData as unknown as TodoListItem);
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
      class="w-[425px] max-h-[90vh] overflow-y-auto bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 shadow-lg"
      @click.stop
    >
      <div class="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
        <h3 class="text-base font-semibold leading-6">
          {{ todo?.id ? 'Edit Todo' : 'Add Todo' }}
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
        <div v-if="todoError" class="bg-red-50 dark:bg-red-950 text-red-600 dark:text-red-400 rounded-md px-3 py-2 text-sm">
          {{ todoError }}
        </div>

        <div class="space-y-2">
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-200">Title</label>
          <UInput
            v-model="todoTitle"
            placeholder="Todo title"
            class="w-full"
            :ui="{ base: 'w-full' }"
          />
        </div>

        <div class="space-y-2">
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-200">Description</label>
          <UTextarea
            v-model="todoDescription"
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
              v-model="todoPriority"
              :items="priorityOptions"
              option-attribute="label"
              value-attribute="value"
              class="w-full"
              :ui="{ base: 'w-full' }"
            />
          </div>

          <div class="w-1/2 space-y-2">
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-200">Due Date</label>
            <UPopover>
              <UButton
                color="neutral"
                variant="subtle"
                icon="i-lucide-calendar"
                class="w-full justify-between"
              >
                {{ todoDueDate ? df.format(todoDueDate.toDate(getLocalTimeZone())) : 'No due date' }}
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
                    @update:model-value="todoDueDate = $event as CalendarDate"
                    class="p-2"
                  />
                </div>
              </template>
            </UPopover>
          </div>
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
            {{ todo?.id ? 'Update Todo' : 'Add Todo' }}
          </UButton>
        </div>
      </div>
    </div>
  </div>
</template>
