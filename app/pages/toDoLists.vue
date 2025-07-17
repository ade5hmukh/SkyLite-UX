<script setup lang="ts">
import { consola } from "consola";

import type { BaseListItem, TodoList, TodoListItem } from "~/types/database";

import GlobalList from "~/components/global/globalList.vue";
import TodoColumnDialog from "~/components/todos/todoColumnDialog.vue";
import TodoItemDialog from "~/components/todos/todoItemDialog.vue";

const { todos, loading: todosLoading, fetchTodos, createTodo, updateTodo, toggleTodo, deleteTodo, reorderTodo, clearCompleted } = useTodos();
const { todoColumns, loading: columnsLoading, fetchTodoColumns, createTodoColumn, updateTodoColumn, deleteTodoColumn, reorderTodoColumns } = useTodoColumns();

const mutableTodoColumns = computed(() => todoColumns.value.map(col => ({
  ...col,
  user: col.user === null
    ? undefined
    : {
        id: col.user.id,
        name: col.user.name,
        avatar: col.user.avatar,
      },
})));

const todoItemDialog = ref(false);
const todoColumnDialog = ref(false);
const editingTodo = ref<TodoListItem | null>(null);
const editingColumn = ref<TodoList | null>(null);

const editingTodoTyped = computed<TodoListItem | undefined>(() =>
  editingTodo.value as TodoListItem | undefined,
);

const todoLists = computed<TodoList[]>(() => {
  return todoColumns.value.map(column => ({
    id: column.id,
    name: column.name,
    order: column.order,
    createdAt: new Date(column.createdAt),
    updatedAt: new Date(column.updatedAt),
    isDefault: column.isDefault,
    items: todos.value
      .filter(todo => todo.todoColumnId === column.id)
      .sort((a, b) => (a.order || 0) - (b.order || 0))
      .map(todo => ({
        id: todo.id,
        name: todo.title,
        checked: todo.completed,
        order: todo.order,
        notes: todo.description,
        shoppingListId: todo.todoColumnId || "",
        priority: todo.priority,
        dueDate: todo.dueDate,
        description: todo.description ?? "",
        todoColumnId: todo.todoColumnId || "",
      })),
    _count: column._count ? { items: column._count.todos } : undefined,
  }));
});

function openCreateTodo(todoColumnId?: string) {
  editingTodo.value = { todoColumnId: todoColumnId ?? "" } as TodoListItem;
  todoItemDialog.value = true;
}

function openEditTodo(item: BaseListItem) {
  const todo = todos.value.find(t => t.id === item.id);
  if (!todo)
    return;

  editingTodo.value = {
    id: todo.id,
    name: todo.title,
    description: todo.description ?? "",
    priority: todo.priority,
    dueDate: todo.dueDate ?? new Date(),
    todoColumnId: todo.todoColumnId ?? "",
    checked: todo.completed,
    order: todo.order,
    shoppingListId: todo.todoColumnId || "",
    notes: todo.description,
  };
  todoItemDialog.value = true;
}

async function handleTodoSave(todoData: TodoListItem) {
  try {
    if (editingTodo.value?.id) {
      await updateTodo(editingTodo.value.id, {
        title: todoData.name,
        description: todoData.description,
        completed: todoData.checked,
        priority: todoData.priority,
        dueDate: todoData.dueDate,
        todoColumnId: todoData.todoColumnId,
        order: todoData.order,
      });
    }
    else {
      const createData = {
        title: todoData.name,
        description: todoData.description,
        priority: todoData.priority,
        dueDate: todoData.dueDate,
        todoColumnId: todoData.todoColumnId || null,
        completed: todoData.checked,
        order: todoData.order,
      };
      consola.log("Creating todo with data:", createData);
      await createTodo(createData);
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

function openEditColumn(column: TodoList) {
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

  if (reorderingColumns.value.has(column.id))
    return;

  const targetIndex = direction === "left" ? columnIndex - 1 : columnIndex + 1;

  if (targetIndex < 0 || targetIndex >= todoColumns.value.length)
    return;

  reorderingColumns.value.add(column.id);

  try {
    await reorderTodoColumns(columnIndex, targetIndex);
  }
  catch (error) {
    consola.error("Failed to reorder column:", error);
    useAlertToast().showError("Failed to reorder column. Please try again.");
  }
  finally {
    reorderingColumns.value.delete(column.id);
  }
}

async function handleReorderTodo(itemId: string, direction: "up" | "down") {
  if (reorderingTodos.value.has(itemId))
    return;
  reorderingTodos.value.add(itemId);

  try {
    const item = todos.value.find(t => t.id === itemId);
    if (!item)
      throw new Error("Todo not found");
    await reorderTodo(itemId, direction, item.todoColumnId ?? null);
  }
  catch (error) {
    consola.error("Failed to reorder todo:", error);
    useAlertToast().showError("Failed to reorder todo. Please try again.");
  }
  finally {
    reorderingTodos.value.delete(itemId);
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

onMounted(async () => {
  await fetchTodoColumns();
  await fetchTodos();
});
</script>

<template>
  <div class="flex h-[calc(100vh-2rem)] w-full flex-col rounded-lg">
    <div class="py-5 sm:px-4 sticky top-0 z-40 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
      <GlobalDateHeader />
    </div>

    <div class="flex flex-1 flex-col min-h-0 p-4">
      <GlobalList
        :lists="todoLists"
        :loading="columnsLoading || todosLoading"
        empty-state-icon="i-lucide-list-todo"
        empty-state-title="No todo lists found"
        empty-state-description="Create your first todo column to get started"
        show-reorder
        :show-edit="(list) => 'isDefault' in list ? !list.isDefault : true"
        show-add
        show-edit-item
        show-completed
        show-progress
        @create="todoColumnDialog = true; editingColumn = null"
        @edit="openEditColumn($event as TodoList)"
        @add-item="openCreateTodo($event)"
        @edit-item="openEditTodo($event)"
        @toggle-item="handleToggleTodo"
        @reorder-item="handleReorderTodo"
        @reorder-list="(listId, direction) => handleReorderColumn(todoLists.findIndex(l => l.id === listId), direction === 'up' ? 'left' : 'right')"
        @clear-completed="handleClearCompleted"
      />
    </div>

    <UButton
      class="fixed bottom-8 right-8 rounded-full shadow-lg z-50 p-4"
      color="primary"
      size="xl"
      icon="i-lucide-plus"
      aria-label="Add Item"
      @click="todoColumnDialog = true; editingColumn = null"
    />

    <TodoItemDialog
      :is-open="todoItemDialog"
      :todo-columns="mutableTodoColumns"
      :todo="editingTodoTyped"
      @close="todoItemDialog = false; editingTodo = null"
      @save="handleTodoSave"
      @delete="handleTodoDelete"
    />

    <TodoColumnDialog
      :is-open="todoColumnDialog"
      :column="editingColumn ?? undefined"
      @close="todoColumnDialog = false; editingColumn = null"
      @save="handleColumnSave"
      @delete="handleColumnDelete"
    />
  </div>
</template>
