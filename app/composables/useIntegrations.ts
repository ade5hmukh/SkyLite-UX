import { consola } from "consola";

import type { Integration } from "~/types/database";
import type { IntegrationService } from "~/types/integrations";

import { createIntegrationService } from "~/types/integrations";

export function useIntegrations() {
  const { data: cachedIntegrations } = useNuxtData<Integration[]>("integrations");

  const services = ref<Map<string, IntegrationService>>(new Map());
  const initialized = ref(false);
  const loading = ref(false);
  const error = ref<string | null>(null);

  const integrations = computed(() => {
    return cachedIntegrations.value || [];
  });

  const initializeServices = async () => {
    if (!integrations.value.length || initialized.value)
      return;

    try {
      services.value.clear();
      for (const integration of integrations.value) {
        if (integration.enabled) {
          const service = await createIntegrationService(integration);
          if (service) {
            services.value.set(integration.id, service);
            await service.initialize();
          }
        }
      }
      initialized.value = true;
      consola.info(`Initialized ${services.value.size} integration services`);
    }
    catch (err) {
      consola.error("Error initializing integration services:", err);
    }
  };

  watch(integrations, async (newIntegrations) => {
    if (newIntegrations.length > 0) {
      await initializeServices();
    }
  }, { immediate: true });

  const fetchIntegrations = async () => {
    try {
      await refreshNuxtData("integrations");
      consola.info("Integrations data refreshed successfully");
    }
    catch (err) {
      consola.error("Error refreshing integrations:", err);
    }
  };

  const refreshIntegrations = async () => {
    await fetchIntegrations();
  };

  const createIntegration = async (integration: Omit<Integration, "id">) => {
    try {
      const response = await $fetch<Integration>("/api/integrations", {
        method: "POST",
        body: integration,
      });

      await refreshNuxtData("integrations");

      if (response.enabled) {
        const service = await createIntegrationService(response);
        if (service) {
          services.value.set(response.id, service);
          await service.initialize();
        }
      }

      if (response.enabled) {
        try {
          await $fetch("/api/sync/register", {
            method: "POST",
            body: response,
          });
          consola.info("Integration registered with sync manager:", response.name);
        }
        catch (syncError) {
          consola.warn("Failed to register integration with sync manager:", syncError);
        }
      }

      consola.info("Integration created successfully:", response.name);
      return response;
    }
    catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to create integration";
      consola.error("Error creating integration:", err);
      throw new Error(errorMessage);
    }
  };

  const updateIntegration = async (id: string, updates: Partial<Integration>) => {
    try {
      const response = await $fetch<Integration>(`/api/integrations/${id}`, {
        method: "PUT",
        body: updates,
      });

      await refreshNuxtData("integrations");

      if (response.enabled) {
        const service = await createIntegrationService(response);
        if (service) {
          services.value.set(response.id, service);
          await service.initialize();
        }

        try {
          await $fetch("/api/sync/register", {
            method: "POST",
            body: response,
          });
          consola.info("Integration re-registered with sync manager:", response.name);
        }
        catch (syncError) {
          consola.warn("Failed to re-register integration with sync manager:", syncError);
        }
      }
      else {
        services.value.delete(response.id);
      }

      consola.info("Integration updated successfully:", response.name);
      return response;
    }
    catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to update integration";
      consola.error("Error updating integration:", err);
      throw new Error(errorMessage);
    }
  };

  const deleteIntegration = async (id: string) => {
    try {
      await $fetch(`/api/integrations/${id}`, {
        method: "DELETE",
      });

      services.value.delete(id);

      await refreshNuxtData("integrations");

      consola.info("Integration deleted successfully:", id);
    }
    catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to delete integration";
      consola.error("Error deleting integration:", err);
      throw new Error(errorMessage);
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

    integrations: readonly(integrations),
    loading: readonly(loading),
    error: readonly(error),
    initialized: readonly(initialized),

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
