<script setup lang="ts">
import type { CreateIntegrationInput, Integration } from "~/types/database";
import { integrationRegistry } from "~/types/integrations";
import { createIntegrationService } from "~/types/integrations";

const props = defineProps<{
  integration: Integration | null;
  isOpen: boolean;
  activeType: string;
}>();

const emit = defineEmits<{
  (e: "close"): void;
  (e: "save", integration: CreateIntegrationInput): void;
  (e: "delete", integrationId: string): void;
}>();

// Form state
const name = ref("");
const type = ref<string>("");
const service = ref("");
const apiKey = ref("");
const baseUrl = ref("");
const enabled = ref(true);
const error = ref<string | null>(null);
const isTesting = ref(false);

// Get the current integration config
const currentIntegrationConfig = computed(() => {
  if (!type.value || !service.value) return null;
  return integrationRegistry.get(`${type.value}:${service.value}`);
});

// Load available types immediately when dialog opens
const availableTypes = computed(() => {
  const types = new Set<string>();
  integrationRegistry.forEach((config) => {
    types.add(config.type);
  });
  
  return Array.from(types).map(type => ({
    label: type.charAt(0).toUpperCase() + type.slice(1),
    value: type
  }));
});

// Load services based on selected type
const availableServices = computed(() => {
  if (!type.value) return [];
  
  const services = new Set<string>();
  integrationRegistry.forEach((config) => {
    if (config.type === type.value) {
      services.add(config.service);
    }
  });
  
  return Array.from(services).map(service => ({
    label: service.charAt(0).toUpperCase() + service.slice(1),
    value: service
  }));
});

// Watch for dialog open state
watch(() => props.isOpen, (isOpen) => {
  if (isOpen) {
    // Set initial type if available
    if (availableTypes.value.length > 0) {
      type.value = availableTypes.value[0].value;
    }
  }
});

// Watch for type changes
watch(type, (newType) => {
  // Reset service when type changes
  service.value = "";
  
  // Set first available service for the new type
  if (availableServices.value.length > 0) {
    service.value = availableServices.value[0].value;
  }
}, { immediate: true });

// Watch for integration changes
watch(() => props.integration, (newIntegration) => {
  if (newIntegration) {
    name.value = newIntegration.name || "";
    type.value = newIntegration.type || "";
    service.value = newIntegration.service || "";
    apiKey.value = newIntegration.apiKey || "";
    baseUrl.value = newIntegration.baseUrl || "";
    enabled.value = newIntegration.enabled;
    error.value = null;
  }
  else {
    resetForm();
  }
}, { immediate: true });

function resetForm() {
  name.value = "";
  type.value = availableTypes.value.length > 0 ? availableTypes.value[0].value : "";
  service.value = "";
  apiKey.value = "";
  baseUrl.value = "";
  enabled.value = true;
  error.value = null;
}

async function testConnection() {
  if (!apiKey.value?.trim() || !baseUrl.value?.trim()) {
    error.value = "API Key and Base URL are required to test connection";
    return;
  }

  isTesting.value = true;
  error.value = null;

  try {
    const tempIntegration: Integration = {
      id: "temp",
      name: name.value || `${service.value.charAt(0).toUpperCase() + service.value.slice(1)}`,
      type: type.value,
      service: service.value,
      apiKey: apiKey.value,
      baseUrl: baseUrl.value,
      enabled: true,
      settings: {},
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const integrationService = createIntegrationService(tempIntegration);
    if (!integrationService) {
      throw new Error("No integration service found for this type");
    }

    const isValid = await integrationService.testConnection?.();
    if (!isValid) {
      throw new Error("Connection test failed");
    }

    error.value = null;
  } catch (err) {
    error.value = err instanceof Error ? err.message : "Connection test failed";
  } finally {
    isTesting.value = false;
  }
}

function handleSave() {
  if (!type.value || !service.value) {
    error.value = "Integration type and service are required";
    return;
  }

  const config = currentIntegrationConfig.value;
  if (!config) {
    error.value = "Invalid integration type or service";
    return;
  }

  // Validate required fields
  const missingFields = config.requiredFields.filter(field => {
    switch (field) {
      case "apiKey":
        return !apiKey.value?.trim();
      case "baseUrl":
        return !baseUrl.value?.trim();
      default:
        return false;
    }
  });

  if (missingFields.length > 0) {
    error.value = `Missing required fields: ${missingFields.join(", ")}`;
    return;
  }

  emit("save", {
    name: name.value.trim() || `${type.value.charAt(0).toUpperCase() + type.value.slice(1)} ${service.value.charAt(0).toUpperCase() + service.value.slice(1)}`,
    type: type.value,
    service: service.value,
    apiKey: apiKey.value.trim(),
    baseUrl: baseUrl.value.trim(),
    enabled: enabled.value,
    settings: {},
  });
}

function handleDelete() {
  if (props.integration?.id) {
    emit("delete", props.integration.id);
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
          {{ integration?.id ? 'Edit Integration' : 'Add Integration' }}
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
        <div v-if="error" class="bg-red-50 dark:bg-red-950 text-red-600 dark:text-red-400 rounded-md px-3 py-2 text-sm">
          {{ error }}
        </div>

        <template v-if="!integration?.id">
          <div class="space-y-2">
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-200">Integration Type *</label>
            <USelect
              v-model="type"
              :items="availableTypes"
              class="w-full"
            />
          </div>

          <div class="space-y-2">
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-200">Service *</label>
            <USelect
              v-model="service"
              :items="availableServices"
              class="w-full"
            />
          </div>
        </template>

        <div class="space-y-2">
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-200">Integration Name</label>
          <UInput
            v-model="name"
            placeholder="Jane's Calendar"
            class="w-full"
            :ui="{ base: 'w-full' }"
          />
          <p class="text-sm text-gray-500 dark:text-gray-400">
            Optional. If not provided, a name will be generated.
          </p>
        </div>

        <template v-if="currentIntegrationConfig">
          <div v-if="currentIntegrationConfig.requiredFields.includes('apiKey')" class="space-y-2">
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-200">API Key *</label>
            <UInput
              v-model="apiKey"
              placeholder="Enter API key"
              class="w-full"
              :ui="{ base: 'w-full' }"
            />
          </div>

          <div v-if="currentIntegrationConfig.requiredFields.includes('baseUrl')" class="space-y-2">
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-200">Base URL *</label>
            <UInput
              v-model="baseUrl"
              placeholder="https://your-integration-instance.com"
              class="w-full"
              :ui="{ base: 'w-full' }"
            />
          </div>
        </template>

        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <UCheckbox
              v-model="enabled"
              label="Enable integration"
            />
          </div>
          <UButton
            v-if="currentIntegrationConfig?.requiredFields.includes('apiKey') && currentIntegrationConfig?.requiredFields.includes('baseUrl')"
            color="primary"
            variant="ghost"
            :loading="isTesting"
            :disabled="!apiKey?.trim() || !baseUrl?.trim()"
            @click="testConnection"
          >
            Test Connection
          </UButton>
        </div>
      </div>

      <div class="flex justify-between p-4 border-t border-gray-200 dark:border-gray-700">
        <UButton
          v-if="integration?.id"
          color="error"
          variant="ghost"
          icon="i-lucide-trash"
          @click="handleDelete"
        >
          Delete
        </UButton>
        <div class="flex gap-2" :class="{ 'ml-auto': !integration?.id }">
          <UButton
            color="neutral"
            variant="ghost"
            @click="emit('close')"
          >
            Cancel
          </UButton>
          <UButton
            color="primary"
            :disabled="!type || !service || (currentIntegrationConfig?.requiredFields.includes('apiKey') && !apiKey?.trim()) || (currentIntegrationConfig?.requiredFields.includes('baseUrl') && !baseUrl?.trim())"
            @click="handleSave"
          >
            Save
          </UButton>
        </div>
      </div>
    </div>
  </div>
</template>