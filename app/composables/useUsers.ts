import type { CreateUserInput, User } from "~/types/database";
import { consola } from "consola";

// Extended type to include todoOrder property for users
type UserWithOrder = User & { todoOrder: number };

export function useUsers() {
  const users = ref<UserWithOrder[]>([]);
  const currentUser = ref<User | null>(null);
  const loading = ref(false);
  const error = ref<string | null>(null);

  // Server-side data fetching
  const { data: serverUsers } = useNuxtData<UserWithOrder[]>('users');

  const fetchUsers = async () => {
    loading.value = true;
    error.value = null;
    try {
      const data = await $fetch<UserWithOrder[]>("/api/users");
      users.value = data || [];
      return users.value;
    }
    catch (err) {
      error.value = "Failed to fetch users";
      consola.error("Error fetching users:", err);
      return [];
    }
    finally {
      loading.value = false;
    }
  };

  // Watch for server data changes
  watch(serverUsers, (newUsers) => {
    if (newUsers) {
      users.value = newUsers;
    }
  });

  const createUser = async (userData: CreateUserInput) => {
    try {
      const newUser = await $fetch<UserWithOrder>("/api/users", {
        method: "POST",
        body: userData,
      });
      await fetchUsers(); // Refresh data after creation
      return newUser;
    }
    catch (err) {
      error.value = "Failed to create user";
      consola.error("Error creating user:", err);
      throw err;
    }
  };

  const selectUser = (user: User) => {
    currentUser.value = user;
    // Store in localStorage for persistence
    if (import.meta.client) {
      localStorage.setItem("currentUser", JSON.stringify(user));
    }
  };

  const loadCurrentUser = () => {
    if (import.meta.client) {
      const stored = localStorage.getItem("currentUser");
      if (stored) {
        currentUser.value = JSON.parse(stored);
      }
    }
  };

  const clearCurrentUser = () => {
    currentUser.value = null;
    if (import.meta.client) {
      localStorage.removeItem("currentUser");
    }
  };

  const deleteUser = async (userId: string) => {
    try {
      await $fetch(`/api/users/${userId}`, {
        method: "DELETE" as const,
      });

      // Clear current user if it was the deleted user
      if (currentUser.value?.id === userId) {
        clearCurrentUser();
      }

      await fetchUsers(); // Refresh data after deletion
      return true;
    }
    catch (err) {
      error.value = "Failed to delete user";
      consola.error("Error deleting user:", err);
      throw err;
    }
  };

  const reorderUser = async (userId: string, direction: "up" | "down") => {
    // Store original state for potential rollback
    const originalUsers = [...users.value];

    try {
      const sortedUsers = [...users.value].sort((a, b) => (a.todoOrder || 0) - (b.todoOrder || 0));
      const currentIndex = sortedUsers.findIndex(user => user.id === userId);

      if (currentIndex === -1)
        return;

      let targetIndex;
      if (direction === "up" && currentIndex > 0) {
        targetIndex = currentIndex - 1;
      }
      else if (direction === "down" && currentIndex < sortedUsers.length - 1) {
        targetIndex = currentIndex + 1;
      }
      else {
        return; // No change needed
      }

      // Get the users to swap
      const currentUser = sortedUsers[currentIndex];
      const targetUser = sortedUsers[targetIndex];

      if (!currentUser || !targetUser)
        return;

      // Optimistically update the todoOrder values
      const currentOrder = currentUser.todoOrder || 0;
      const targetOrder = targetUser.todoOrder || 0;

      // Update the users
      users.value = users.value.map((user) => {
        if (user.id === currentUser.id) {
          return { ...user, todoOrder: targetOrder };
        }
        if (user.id === targetUser.id) {
          return { ...user, todoOrder: currentOrder };
        }
        return user;
      });

      // Make API call with the new order
      const newOrder = users.value
        .sort((a, b) => (a.todoOrder || 0) - (b.todoOrder || 0))
        .map(user => user.id);

      await $fetch("/api/users/reorder", {
        method: "POST",
        body: { userIds: newOrder },
      });

      await fetchUsers(); // Refresh data after reordering
    }
    catch (err) {
      // Revert on error
      users.value = originalUsers;
      error.value = "Failed to reorder user";
      consola.error("Error reordering user:", err);
      throw err;
    }
  };

  return {
    users: readonly(users),
    currentUser: readonly(currentUser),
    loading: readonly(loading),
    error: readonly(error),
    fetchUsers,
    createUser,
    deleteUser,
    selectUser,
    loadCurrentUser,
    clearCurrentUser,
    reorderUser,
  };
}
