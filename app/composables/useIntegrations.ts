import { computed, ref } from "vue";

import type { Integration } from "~/types/database";

export function useIntegrations() {
  const integrations = ref<Integration[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);
  const initialized = ref(false);

  // Server-side data fetching
  const { data: serverIntegrations } = useNuxtData<Integration[]>("integrations");

  const fetchIntegrations = async () => {
    if (loading.value)
      return; // Prevent multiple simultaneous fetches

    loading.value = true;
    error.value = null;
    try {
      const response = await fetch("/api/integrations");
      if (!response.ok) {
        throw new Error("Failed to fetch integrations");
      }
      const data = await response.json();
      integrations.value = data;
      initialized.value = true;
    }
    catch (err) {
      error.value = "Failed to fetch integrations";
      console.error("Error fetching integrations:", err);
    }
    finally {
      loading.value = false;
    }
  };

  // Watch for server data changes
  watch(serverIntegrations, (newIntegrations) => {
    if (newIntegrations) {
      integrations.value = newIntegrations;
      initialized.value = true;
    }
  });

  const createIntegration = async (integration: Omit<Integration, "id">) => {
    loading.value = true;
    error.value = null;
    try {
      const response = await fetch("/api/integrations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(integration),
      });
      if (!response.ok) {
        throw new Error("Failed to create integration");
      }
      const newIntegration = await response.json();
      await fetchIntegrations(); // Refresh data after creation
      return newIntegration;
    }
    catch (err) {
      error.value = "Failed to create integration";
      console.error("Error creating integration:", err);
      throw err;
    }
    finally {
      loading.value = false;
    }
  };

  const updateIntegration = async (id: string, updates: Partial<Integration>) => {
    loading.value = true;
    error.value = null;
    try {
      const response = await fetch(`/api/integrations/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updates),
      });
      if (!response.ok) {
        throw new Error("Failed to update integration");
      }
      const updatedIntegration = await response.json();
      await fetchIntegrations(); // Refresh data after update
      return updatedIntegration;
    }
    catch (err) {
      error.value = "Failed to update integration";
      console.error("Error updating integration:", err);
      throw err;
    }
    finally {
      loading.value = false;
    }
  };

  const deleteIntegration = async (id: string) => {
    loading.value = true;
    error.value = null;
    try {
      const response = await fetch(`/api/integrations/${id}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        throw new Error("Failed to delete integration");
      }
      await fetchIntegrations(); // Refresh data after deletion
    }
    catch (err) {
      error.value = "Failed to delete integration";
      console.error("Error deleting integration:", err);
      throw err;
    }
    finally {
      loading.value = false;
    }
  };

  const getEnabledIntegrations = computed(() => {
    if (!initialized.value)
      return [];
    return integrations.value.filter((integration: Integration) => integration.enabled);
  });

  const getIntegrationsByType = (type: string) => {
    if (!initialized.value)
      return [];
    return integrations.value.filter((integration: Integration) => integration.type === type && integration.enabled);
  };

  const getIntegrationByType = (type: string) => {
    if (!initialized.value)
      return undefined;
    return integrations.value.find((integration: Integration) => integration.type === type && integration.enabled);
  };

  return {
    integrations,
    loading,
    error,
    initialized,
    fetchIntegrations,
    createIntegration,
    updateIntegration,
    deleteIntegration,
    getEnabledIntegrations,
    getIntegrationByType,
    getIntegrationsByType,
  };
}
