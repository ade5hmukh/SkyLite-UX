<script setup lang="ts">
import type { IntegrationSettingsField } from "~/integrations/integrationConfig";
import type { CreateIntegrationInput, Integration } from "~/types/database";

import { integrationRegistry } from "~/types/integrations";

// Type for connection test result
type ConnectionTestResult = {
  success: boolean;
  message?: string;
  error?: string;
} | null;

const props = defineProps<{
  integration: Integration | null;
  isOpen: boolean;
  activeType: string;
  existingIntegrations: Integration[];
  connectionTestResult: ConnectionTestResult;
}>();

const emit = defineEmits<{
  (e: "close"): void;
  (e: "save", integration: CreateIntegrationInput): void;
  (e: "delete", integrationId: string): void;
  (e: "test-connection", integration: CreateIntegrationInput): void;
}>();

const show = ref(false);

const name = ref("");
const type = ref<string>("");
const service = ref("");
const enabled = ref(true);
const error = ref<string | null>(null);
const isSaving = ref(false);

const settingsData = ref<Record<string, string>>({});

const isTestingConnection = computed(() => {
  return isSaving.value && !props.connectionTestResult;
});

const currentIntegrationConfig = computed(() => {
  if (!type.value || !service.value)
    return null;
  return integrationRegistry.get(`${type.value}:${service.value}`);
});

const settingsFields = computed((): IntegrationSettingsField[] => {
  return currentIntegrationConfig.value?.settingsFields || [];
});

const availableTypes = computed(() => {
  const types = new Set<string>();
  integrationRegistry.forEach((config) => {
    types.add(config.type);
  });

  return Array.from(types).map(type => ({
    label: type.charAt(0).toUpperCase() + type.slice(1),
    value: type,
  }));
});

const availableServices = computed(() => {
  if (!type.value)
    return [];

  const services = new Set<string>();
  integrationRegistry.forEach((config) => {
    if (config.type === type.value) {
      services.add(config.service);
    }
  });

  return Array.from(services).map(service => ({
    label: service.charAt(0).toUpperCase() + service.slice(1),
    value: service,
  }));
});

function initializeSettingsData() {
  const initialData: Record<string, string> = {};
  settingsFields.value.forEach((field: IntegrationSettingsField) => {
    switch (field.type) {
      case "text":
      case "password":
      case "url":
      default:
        initialData[field.key] = "";
        break;
    }
  });
  settingsData.value = initialData;
}

watch(() => props.isOpen, (isOpen) => {
  if (isOpen) {
    if (availableTypes.value.length > 0) {
      const firstType = availableTypes.value[0];
      if (firstType) {
        type.value = firstType.value;
      }
    }
  }
});

watch(type, (_newType) => {
  service.value = "";

  if (availableServices.value.length > 0) {
    const firstService = availableServices.value[0];
    if (firstService) {
      service.value = firstService.value;
    }
  }
}, { immediate: true });

watch(service, () => {
  if (!props.integration?.id || Object.keys(settingsData.value).length === 0) {
    initializeSettingsData();
  }
});

watch(() => props.integration, (newIntegration) => {
  if (newIntegration) {
    name.value = newIntegration.name || "";
    type.value = newIntegration.type || "";
    service.value = newIntegration.service || "";
    enabled.value = newIntegration.enabled;
    error.value = null;

    initializeSettingsData();
    if (newIntegration.apiKey) {
      settingsData.value.apiKey = newIntegration.apiKey;
    }
    if (newIntegration.baseUrl) {
      settingsData.value.baseUrl = newIntegration.baseUrl;
    }
  }
  else {
    resetForm();
  }
}, { immediate: true });

function resetForm() {
  name.value = "";
  const firstType = availableTypes.value[0];
  type.value = firstType ? firstType.value : "";
  service.value = "";
  enabled.value = true;
  error.value = null;
  initializeSettingsData();
}

function generateUniqueName(serviceName: string, existingIntegrations: Integration[]): string {
  const baseName = serviceName.charAt(0).toUpperCase() + serviceName.slice(1);

  const existingNames = existingIntegrations.map(integration => integration.name);
  if (!existingNames.includes(baseName)) {
    return baseName;
  }

  let counter = 2;
  while (existingNames.includes(`${baseName}${counter}`)) {
    counter++;
  }

  return `${baseName}${counter}`;
}

async function handleSave() {
  if (!type.value || !service.value) {
    error.value = "Integration type and service are required";
    return;
  }

  const config = currentIntegrationConfig.value;
  if (!config) {
    error.value = "Invalid integration type or service";
    return;
  }

  const missingFields = settingsFields.value
    .filter(field => field.required && !settingsData.value[field.key]?.toString().trim())
    .map(field => field.label);

  if (missingFields.length > 0) {
    error.value = `Missing required fields: ${missingFields.join(", ")}`;
    return;
  }

  isSaving.value = true;
  error.value = null;

  try {
    const integrationName = name.value.trim() || generateUniqueName(service.value, props.existingIntegrations);

    const integrationData = {
      name: integrationName,
      type: type.value,
      service: service.value,
      apiKey: settingsData.value.apiKey?.trim() || "",
      baseUrl: settingsData.value.baseUrl?.trim() || "",
      icon: null,
      enabled: enabled.value,
      settings: {},
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    emit("save", integrationData);
  }
  catch (err) {
    error.value = err instanceof Error ? err.message : "Failed to save integration";
  }
  finally {
    isSaving.value = false;
  }
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

        <div v-if="isTestingConnection" class="bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 rounded-md px-3 py-2 text-sm flex items-center gap-2">
          <UIcon name="i-lucide-loader-2" class="animate-spin h-4 w-4" />
          Testing connection...
        </div>

        <div v-if="props.connectionTestResult">
          <div v-if="props.connectionTestResult.success" class="bg-green-50 dark:bg-green-950 text-green-600 dark:text-green-400 rounded-md px-3 py-2 text-sm flex items-center gap-2">
            <UIcon name="i-lucide-check-circle" class="h-4 w-4" />
            Connection test successful! Integration saved.
          </div>
          <div v-else class="bg-red-50 dark:bg-red-950 text-red-600 dark:text-red-400 rounded-md px-3 py-2 text-sm flex items-center gap-2">
            <UIcon name="i-lucide-x-circle" class="h-4 w-4" />
            Connection test failed. Check your API key and base URL.
          </div>
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
          <div
            v-for="field in settingsFields"
            :key="field.key"
            class="space-y-2"
          >
            <label :for="field.key" class="block text-sm font-medium text-gray-700 dark:text-gray-200">
              {{ field.label }}{{ field.required ? ' *' : '' }}
            </label>
            <UInput
              :id="field.key"
              v-model="settingsData[field.key]"
              :type="field.type === 'password' ? (show ? 'text' : 'password') : field.type"
              :placeholder="field.placeholder"
              class="w-full"
              :ui="{ base: 'w-full' }"
            >
              <template v-if="field.type === 'password'" #trailing>
                <UButton
                  color="neutral"
                  variant="ghost"
                  :icon="show ? 'i-lucide-eye-off' : 'i-lucide-eye'"
                  @click="show = !show"
                />
              </template>
            </UInput>
            <p v-if="field.description" class="text-sm text-gray-500 dark:text-gray-400">
              {{ field.description }}
            </p>
          </div>
        </template>

        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <UCheckbox
              v-model="enabled"
              label="Enable integration"
            />
          </div>
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
            :loading="isSaving"
            :disabled="isSaving"
            @click="handleSave"
          >
            {{ isSaving ? 'Saving...' : 'Save' }}
          </UButton>
        </div>
      </div>
    </div>
  </div>
</template>
