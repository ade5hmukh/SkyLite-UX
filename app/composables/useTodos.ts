import { consola } from "consola";

import type { CreateTodoInput, TodoWithUser, UpdateTodoInput } from "~/types/database";

// Extended type to include order property for todos
type TodoWithOrder = TodoWithUser & { order: number };

export function useTodos() {
  const loading = ref(false);
  const error = ref<string | null>(null);

  // Get todos from Nuxt cache
  const { data: todos } = useNuxtData<TodoWithOrder[]>("todos");

  // Computed property to handle undefined case
  const currentTodos = computed(() => todos.value || []);

  const fetchTodos = async (todoColumnId?: string) => {
    loading.value = true;
    error.value = null;
    try {
      await refreshNuxtData("todos");
      consola.info("Todos refreshed successfully");
      return currentTodos.value;
    }
    catch (err) {
      error.value = "Failed to fetch todos";
      consola.error("Error fetching todos:", err);
      throw err;
    }
    finally {
      loading.value = false;
    }
  };

  const createTodo = async (todoData: CreateTodoInput) => {
    try {
      const newTodo = await $fetch<TodoWithOrder>("/api/todos", {
        method: "POST",
        body: todoData,
      });

      // Refresh cache to get updated data
      await refreshNuxtData("todos");

      return newTodo;
    }
    catch (err) {
      error.value = "Failed to create todo";
      consola.error("Error creating todo:", err);
      throw err;
    }
  };

  const updateTodo = async (id: string, updates: UpdateTodoInput) => {
    try {
      const updatedTodo = await $fetch<TodoWithOrder>(`/api/todos/${id}`, {
        method: "PUT",
        body: updates,
      });

      // Refresh cache to get updated data
      await refreshNuxtData("todos");

      return updatedTodo;
    }
    catch (err) {
      error.value = "Failed to update todo";
      consola.error("Error updating todo:", err);
      throw err;
    }
  };

  const toggleTodo = async (id: string, completed: boolean) => {
    return updateTodo(id, { completed });
  };

  const deleteTodo = async (id: string) => {
    try {
      const response = await fetch(`/api/todos/${id}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        throw new Error("Failed to delete todo");
      }

      // Refresh cache to get updated data
      await refreshNuxtData("todos");
    }
    catch (err) {
      error.value = "Failed to delete todo";
      consola.error("Error deleting todo:", err);
      throw err;
    }
  };

  const reorderTodo = async (todoId: string, direction: "up" | "down", todoColumnId: string | null) => {
    try {
      // Find the todo
      const currentTodo = currentTodos.value.find(t => t.id === todoId);
      if (!currentTodo)
        return;

      // Get all todos for the same column and completion state
      const sameSectionTodos = currentTodos.value
        .filter(t =>
          t.todoColumnId === todoColumnId
          && t.completed === currentTodo.completed,
        )
        .sort((a, b) => (a.order || 0) - (b.order || 0));

      const currentIndex = sameSectionTodos.findIndex(t => t.id === todoId);
      if (currentIndex === -1)
        return;

      let targetIndex;
      if (direction === "up" && currentIndex > 0) {
        targetIndex = currentIndex - 1;
      }
      else if (direction === "down" && currentIndex < sameSectionTodos.length - 1) {
        targetIndex = currentIndex + 1;
      }
      else {
        return; // No change needed
      }

      const targetTodo = sameSectionTodos[targetIndex];
      if (!targetTodo)
        return;

      // Make API call
      await $fetch("/api/todos/reorder", {
        method: "POST",
        body: { todoId, direction, todoColumnId },
      });

      // Refresh cache to get updated data
      await refreshNuxtData("todos");
    }
    catch (err) {
      error.value = "Failed to reorder todo";
      consola.error("Error reordering todo:", err);
      throw err;
    }
  };

  const clearCompleted = async (columnId: string) => {
    try {
      // Find all completed todos for this column
      const completedTodos = currentTodos.value.filter(t => t.todoColumnId === columnId && t.completed);

      if (completedTodos.length === 0)
        return;

      // Delete all completed todos
      await $fetch(`/api/todo-columns/${columnId}/todos/clear-completed`, {
        method: "POST",
        body: { action: "delete" },
      });

      // Refresh cache to get updated data
      await refreshNuxtData("todos");
    }
    catch (err) {
      error.value = "Failed to clear completed todos";
      consola.error("Error clearing completed todos:", err);
      throw err;
    }
  };

  return {
    todos: readonly(currentTodos),
    loading: readonly(loading),
    error: readonly(error),
    fetchTodos,
    createTodo,
    updateTodo,
    toggleTodo,
    deleteTodo,
    reorderTodo,
    clearCompleted,
  };
}
