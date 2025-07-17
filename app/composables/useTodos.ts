import type { CreateTodoInput, TodoWithUser, UpdateTodoInput } from "~/types/database";
import { consola } from "consola";

// Extended type to include order property for todos
type TodoWithOrder = TodoWithUser & { order: number };

export function useTodos() {
  const todos = ref<TodoWithOrder[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);

  // Server-side data fetching
  const { data: serverTodos } = useNuxtData<TodoWithOrder[]>("todos");

  const fetchTodos = async (todoColumnId?: string) => {
    loading.value = true;
    error.value = null;
    try {
      const query = todoColumnId ? `?todoColumnId=${todoColumnId}` : "";
      const data = await $fetch<TodoWithOrder[]>(`/api/todos${query}`);
      todos.value = data || [];
      return todos.value;
    }
    catch (err) {
      error.value = "Failed to fetch todos";
      consola.error("Error fetching todos:", err);
      return [];
    }
    finally {
      loading.value = false;
    }
  };

  // Watch for server data changes
  watch(serverTodos, (newTodos) => {
    if (newTodos) {
      todos.value = newTodos;
    }
  });

  const createTodo = async (todoData: CreateTodoInput) => {
    try {
      const newTodo = await $fetch<TodoWithOrder>("/api/todos", {
        method: "POST",
        body: todoData,
      });
      todos.value.unshift(newTodo);
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
      const index = todos.value.findIndex(t => t.id === id);
      if (index !== -1) {
        todos.value[index] = updatedTodo;
      }
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
      todos.value = todos.value.filter(t => t.id !== id);
    }
    catch (err) {
      error.value = "Failed to delete todo";
      consola.error("Error deleting todo:", err);
      throw err;
    }
  };

  const reorderTodo = async (todoId: string, direction: "up" | "down", todoColumnId: string | null) => {
    // Store original state for potential rollback
    const originalTodos = [...todos.value];

    try {
      // Find the todo
      const currentTodo = todos.value.find(t => t.id === todoId);
      if (!currentTodo)
        return;

      // Get all todos for the same column and completion state
      const sameSectionTodos = todos.value
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

      // Optimistically update the order values
      const currentOrder = currentTodo.order;
      const targetOrder = targetTodo.order;

      // Find and update the todos in the main array
      todos.value = todos.value.map((todo) => {
        if (todo.id === currentTodo.id) {
          return { ...todo, order: targetOrder };
        }
        if (todo.id === targetTodo.id) {
          return { ...todo, order: currentOrder };
        }
        return todo;
      });

      // Make API call
      await $fetch("/api/todos/reorder", {
        method: "POST",
        body: { todoId, direction, todoColumnId },
      });
    }
    catch (err) {
      // Revert on error
      todos.value = originalTodos;
      error.value = "Failed to reorder todo";
      consola.error("Error reordering todo:", err);
      throw err;
    }
  };

  const clearCompleted = async (columnId: string) => {
    try {
      // Find all completed todos for this column
      const completedTodos = todos.value.filter(t => t.todoColumnId === columnId && t.completed);
      
      if (completedTodos.length === 0)
        return;

      // Delete all completed todos
      await $fetch(`/api/todo-columns/${columnId}/todos/clear-completed`, {
        method: "POST",
        body: { action: "delete" },
      });

      // Update local state by removing completed todos
      todos.value = todos.value.filter(t => !(t.todoColumnId === columnId && t.completed));
    }
    catch (err) {
      error.value = "Failed to clear completed todos";
      consola.error("Error clearing completed todos:", err);
      throw err;
    }
  };

  return {
    todos: readonly(todos),
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
