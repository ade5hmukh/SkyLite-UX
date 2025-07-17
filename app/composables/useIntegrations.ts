import { consola } from "consola";

import type { Integration } from "~/types/database";
import type { IntegrationService } from "~/types/integrations";

import { createIntegrationService } from "~/types/integrations";

export function useIntegrations() {
  const integrations = ref<Integration[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);
  const initialized = ref(false);
  const services = ref<Map<string, IntegrationService>>(new Map());

  const fetchIntegrations = async () => {
    if (loading.value)
      return;

    loading.value = true;
    error.value = null;
    try {
      const response = await fetch("/api/integrations");
      if (!response.ok) {
        throw new Error("Failed to fetch integrations");
      }
      const data = await response.json();

      integrations.value.splice(0, integrations.value.length, ...data);

      services.value.clear();
      for (const integration of data) {
        if (integration.enabled) {
          const service = await createIntegrationService(integration);
          if (service) {
            services.value.set(integration.id, service);
            await service.initialize();
          }
        }
      }

      initialized.value = true;
    }
    catch (err) {
      error.value = "Failed to fetch integrations";
      consola.error("Error fetching integrations:", err);
    }
    finally {
      loading.value = false;
    }
  };

  const refreshIntegrations = async () => {
    await fetchIntegrations();
  };

  onMounted(() => {
    fetchIntegrations();
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
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || "Failed to create integration");
      }

      const newIntegration = await response.json();
      await fetchIntegrations();
      return newIntegration;
    }
    catch (err) {
      error.value = err instanceof Error ? err.message : "Failed to create integration";
      consola.error("Error creating integration:", err);
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
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || "Failed to update integration");
      }

      const updatedIntegration = await response.json();
      await fetchIntegrations();
      return updatedIntegration;
    }
    catch (err) {
      error.value = err instanceof Error ? err.message : "Failed to update integration";
      consola.error("Error updating integration:", err);
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
      services.value.delete(id);
      await fetchIntegrations();
    }
    catch (err) {
      error.value = "Failed to delete integration";
      consola.error("Error deleting integration:", err);
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

  const getService = (integrationId: string) => {
    return services.value.get(integrationId);
  };

  return {
    integrations,
    loading,
    error,
    initialized,
    fetchIntegrations,
    refreshIntegrations,
    createIntegration,
    updateIntegration,
    deleteIntegration,
    getEnabledIntegrations,
    getIntegrationByType,
    getIntegrationsByType,
    getService,
  };
}
