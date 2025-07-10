<script setup lang="ts">
import type { Priority, TodoList, TodoColumn } from "~/types/database";
import { consola } from "consola";

import TodoItemDialog from "~/components/todos/todoItemDialog.vue";
import TodoColumnDialog from "~/components/todos/todoColumnDialog.vue";
import GlobalList from "~/components/global/globalList.vue";

const { todos, loading: todosLoading, error: todosError, fetchTodos, createTodo, updateTodo, toggleTodo, deleteTodo, reorderTodo, clearCompleted } = useTodos();
const { todoColumns, loading: columnsLoading, fetchTodoColumns, createTodoColumn, updateTodoColumn, deleteTodoColumn, reorderTodoColumns } = useTodoColumns();

// Create mutable copy of todoColumns
const mutableTodoColumns = computed(() => todoColumns.value.map(col => ({
  ...col,
  user: col.user === null
    ? undefined
    : {
        id: col.user.id,
        name: col.user.name,
        avatar: col.user.avatar
      }
})));

// Modal state
const todoItemDialog = ref(false);
const todoColumnDialog = ref(false);
const editingTodo = ref<any>(null);
const editingColumn = ref<any>(null);

// Map todoColumns and todos to List/ListItem structure for GlobalList
const todoLists = computed<TodoList[]>(() => {
  return todoColumns.value.map((column) => ({
    id: column.id,
    name: column.name,
    order: column.order,
    createdAt: new Date(column.createdAt),
    updatedAt: new Date(column.updatedAt),
    isDefault: column.isDefault,
    items: todos.value
      .filter((todo) => todo.todoColumnId === column.id)
      .map((todo) => ({
        id: todo.id,
        name: todo.title,
        checked: todo.completed,
        order: todo.order,
        notes: todo.description,
        shoppingListId: todo.todoColumnId || "",
        priority: todo.priority,
        dueDate: todo.dueDate,
      })),
    _count: column._count ? { items: column._count.todos } : undefined,
  }));
});

function getPriorityColor(priority: Priority) {
  switch (priority) {
    case "LOW": return "text-green-600 bg-green-50 dark:bg-green-950";
    case "MEDIUM": return "text-yellow-600 bg-yellow-50 dark:bg-yellow-950";
    case "HIGH": return "text-orange-600 bg-orange-50 dark:bg-orange-950";
    case "URGENT": return "text-red-600 bg-red-50 dark:bg-red-950";
    default: return "text-gray-600 bg-gray-50 dark:bg-gray-950";
  }
}

function openCreateTodo(todoColumnId?: string) {
  editingTodo.value = { todoColumnId: todoColumnId || null };
  todoItemDialog.value = true;
}

function openEditTodo(todo: any) {
  editingTodo.value = {
    id: todo.id,
    title: todo.name,
    description: todo.notes,
    priority: todo.priority,
    dueDate: todo.dueDate,
    todoColumnId: todo.shoppingListId,
    completed: todo.checked,
    order: todo.order
  };
  todoItemDialog.value = true;
}

async function handleTodoSave(todoData: any) {
  try {
    if (editingTodo.value?.id) {
      // Update existing todo
      await updateTodo(editingTodo.value.id, {
        ...todoData,
        id: editingTodo.value.id
      });
    }
    else {
      // Create new todo
      await createTodo(todoData);
    }
    todoItemDialog.value = false;
    editingTodo.value = null;
  }
  catch (error) {
    consola.error("Failed to save todo:", error);
  }
}

async function handleTodoDelete(todoId: string) {
  try {
    await deleteTodo(todoId);
    todoItemDialog.value = false;
    editingTodo.value = null;
  }
  catch (error) {
    consola.error("Failed to delete todo:", error);
  }
}

async function handleColumnSave(columnData: { name: string }) {
  try {
    if (editingColumn.value?.id) {
      await updateTodoColumn(editingColumn.value.id, columnData);
    }
    else {
      await createTodoColumn(columnData);
    }
    todoColumnDialog.value = false;
    editingColumn.value = null;
  }
  catch (error) {
    consola.error("Failed to save column:", error);
  }
}

function openEditColumn(column: any) {
  editingColumn.value = { ...column };
  todoColumnDialog.value = true;
}

async function handleColumnDelete() {
  if (!editingColumn.value?.id)
    return;
  
  try {
    await deleteTodoColumn(editingColumn.value.id);
    todoColumnDialog.value = false;
    editingColumn.value = null;
  }
  catch (error) {
    consola.error("Failed to delete column:", error);
  }
}

async function handleToggleTodo(todoId: string, completed: boolean) {
  try {
    await toggleTodo(todoId, completed);
  }
  catch (error) {
    consola.error("Failed to toggle todo:", error);
  }
}

const reorderingTodos = ref(new Set<string>());
const reorderingColumns = ref(new Set<string>());

async function handleReorderColumn(columnIndex: number, direction: "left" | "right") {
  const column = todoColumns.value[columnIndex];
  if (!column)
    return;

  // Prevent multiple simultaneous reorders of the same column
  if (reorderingColumns.value.has(column.id))
    return;

  const targetIndex = direction === "left" ? columnIndex - 1 : columnIndex + 1;

  // Check bounds
  if (targetIndex < 0 || targetIndex >= todoColumns.value.length)
    return;

  reorderingColumns.value.add(column.id);

  try {
    await reorderTodoColumns(columnIndex, targetIndex);
  }
  catch (error) {
    consola.error("Failed to reorder column:", error);
    alert("Failed to reorder column. Please try again.");
  }
  finally {
    reorderingColumns.value.delete(column.id);
  }
}

async function handleReorderTodo(todoId: string, direction: "up" | "down", todoColumnId: string | null) {
  // Prevent multiple simultaneous reorders of the same todo
  if (reorderingTodos.value.has(todoId))
    return;

  reorderingTodos.value.add(todoId);

  try {
    await reorderTodo(todoId, direction, todoColumnId);
  }
  catch (error) {
    consola.error("Failed to reorder todo:", error);
    alert("Failed to reorder todo. Please try again.");
  }
  finally {
    reorderingTodos.value.delete(todoId);
  }
}

async function handleClearCompleted(columnId: string) {
  try {
    await clearCompleted(columnId);
  }
  catch (error) {
    consola.error("Failed to clear completed todos:", error);
  }
}

// Load data on mount
onMounted(async () => {
  await fetchTodoColumns();
  await fetchTodos();
});
</script>

<template>
  <div class="flex h-[calc(100vh-2rem)] w-full flex-col rounded-lg">
    <!-- Header -->
    <div class="py-5 sm:px-4 sticky top-0 z-40 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
      <GlobalDateHeader />
    </div>

    <!-- Todos Content -->
    <div class="flex flex-1 flex-col min-h-0 p-4">
      <GlobalList
        :lists="todoLists"
        :loading="columnsLoading || todosLoading"
        empty-state-icon="i-lucide-list-todo"
        empty-state-title="No todo lists found"
        empty-state-description="Create your first todo column to get started"
        show-reorder
        :show-edit="(column: TodoList) => !column.isDefault"
        show-add
        show-completed
        show-progress
        @create="todoColumnDialog = true; editingColumn = { name: '' }"
        @edit="openEditColumn($event)"
        @addItem="openCreateTodo($event)"
        @editItem="openEditTodo($event)"
        @toggleItem="handleToggleTodo"
        @reorderItem="(itemId, direction) => { const item = (todos as any[]).find((t: any) => t.id === itemId); handleReorderTodo(itemId, direction, item ? item.todoColumnId : null); }"
        @reorderList="(listId, direction) => handleReorderColumn(todoLists.findIndex(l => l.id === listId), direction === 'up' ? 'left' : 'right')"
        @clearCompleted="handleClearCompleted"
      />
    </div>

    <!-- Floating Action Button -->
    <UButton
      class="fixed bottom-8 right-8 rounded-full shadow-lg z-50 p-4"
      color="primary"
      size="xl"
      icon="i-lucide-plus"
      aria-label="Add Item"
      @click="todoColumnDialog = true; editingColumn = { name: '' }"
    />

    <!-- Todo Item Dialog -->
    <TodoItemDialog
      :is-open="todoItemDialog"
      :todo-columns="mutableTodoColumns"
      :todo="editingTodo"
      @close="todoItemDialog = false; editingTodo = null"
      @save="handleTodoSave"
      @delete="handleTodoDelete"
    />

    <!-- Todo Column Dialog -->
    <TodoColumnDialog
      :is-open="todoColumnDialog"
      :column="editingColumn"
      @close="todoColumnDialog = false; editingColumn = null"
      @save="handleColumnSave"
      @delete="handleColumnDelete"
    />
  </div>
</template>
