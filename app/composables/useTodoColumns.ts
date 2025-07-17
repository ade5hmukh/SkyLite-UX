import type { TodoColumn } from "~/types/database";
import { consola } from "consola";

export function useTodoColumns() {
  const todoColumns = ref<TodoColumn[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);

  // Server-side data fetching
  const { data: serverTodoColumns } = useNuxtData<TodoColumn[]>("todo-columns");

  // Fetch all todo columns
  const fetchTodoColumns = async () => {
    loading.value = true;
    try {
      const data = await $fetch<TodoColumn[]>("/api/todo-columns");
      todoColumns.value = data.map(item => ({
        ...item,
        createdAt: new Date(item.createdAt).toISOString(),
        updatedAt: new Date(item.updatedAt).toISOString(),
      }));
      error.value = null;
    }
    catch (err) {
      error.value = err instanceof Error ? err.message : "Failed to fetch todo columns";
      consola.error("Failed to fetch todo columns:", err);
    }
    finally {
      loading.value = false;
    }
  };

  // Watch for server data changes
  watch(serverTodoColumns, (newColumns) => {
    if (newColumns) {
      todoColumns.value = newColumns;
    }
  });

  // Create a new todo column
  const createTodoColumn = async (columnData: {
    name: string;
    userId?: string;
    isDefault?: boolean;
  }) => {
    loading.value = true;
    try {
      const newColumn = await $fetch("/api/todo-columns", {
        method: "POST",
        body: columnData,
      });

      todoColumns.value.push(newColumn);
      error.value = null;
      return newColumn;
    }
    catch (err) {
      error.value = err instanceof Error ? err.message : "Failed to create todo column";
      consola.error("Failed to create todo column:", err);
      throw err;
    }
    finally {
      loading.value = false;
    }
  };

  // Update a todo column
  const updateTodoColumn = async (columnId: string, updates: { name?: string }) => {
    try {
      const updatedColumn = await $fetch<TodoColumn>(`/api/todo-columns/${columnId}`, {
        method: "PUT",
        body: updates,
      });

      // Update the column in the local state
      const columnIndex = todoColumns.value.findIndex(column => column.id === columnId);
      if (columnIndex !== -1) {
        todoColumns.value[columnIndex] = updatedColumn;
      }

      error.value = null;
      return updatedColumn;
    }
    catch (err) {
      error.value = err instanceof Error ? err.message : "Failed to update todo column";
      consola.error("Failed to update todo column:", err);
      throw err;
    }
  };

  // Delete a todo column
  const deleteTodoColumn = async (columnId: string) => {
    try {
      const response = await fetch(`/api/todo-columns/${columnId}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        throw new Error("Failed to delete todo column");
      }

      // Remove the column from the local state
      todoColumns.value = todoColumns.value.filter(column => column.id !== columnId);

      error.value = null;
      return true;
    }
    catch (err) {
      error.value = err instanceof Error ? err.message : "Failed to delete todo column";
      consola.error("Failed to delete todo column:", err);
      throw err;
    }
  };

  // Reorder todo columns
  const reorderTodoColumns = async (fromIndex: number, toIndex: number) => {
    if (fromIndex === toIndex)
      return;

    // Optimistic update
    const columns = [...todoColumns.value];
    const movedColumn = columns.splice(fromIndex, 1)[0];
    if (movedColumn) {
      columns.splice(toIndex, 0, movedColumn);
    }

    // Update order values
    const reorders = columns.map((column, index) => ({
      id: column.id,
      order: index,
    }));

    // Apply optimistic update
    todoColumns.value = columns.map((column, index) => ({
      ...column,
      order: index,
    }));

    try {
      const updatedColumns = await $fetch("/api/todo-columns/reorder", {
        method: "PUT",
        body: { reorders },
      });

      todoColumns.value = updatedColumns;
      error.value = null;
    }
    catch (err) {
      // Rollback on error
      await fetchTodoColumns();
      error.value = err instanceof Error ? err.message : "Failed to reorder todo columns";
      consola.error("Failed to reorder todo columns:", err);
      throw err;
    }
  };

  return {
    todoColumns: readonly(todoColumns),
    loading: readonly(loading),
    error: readonly(error),
    fetchTodoColumns,
    createTodoColumn,
    updateTodoColumn,
    deleteTodoColumn,
    reorderTodoColumns,
  };
}
