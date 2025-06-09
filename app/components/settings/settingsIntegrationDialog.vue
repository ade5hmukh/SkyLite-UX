<script setup lang="ts">
import type { CreateIntegrationInput, Integration } from "~/types/database";

const props = defineProps<{
  integration: Integration | null;
  isOpen: boolean;
  integrationTypes: Array<{
    label: string;
    value: string;
    services: Array<{
      label: string;
      value: string;
    }>;
  }>;
  activeType: string;
}>();

const emit = defineEmits<{
  (e: "close"): void;
  (e: "save", integration: CreateIntegrationInput): void;
  (e: "delete", integrationId: string): void;
}>();

// Form state
const name = ref("");
const type = ref<string>(props.activeType);
const service = ref("");
const apiKey = ref("");
const baseUrl = ref("");
const enabled = ref(true);
const error = ref<string | null>(null);

// Computed property to get available services for current type
const availableServices = computed(() => {
  const typeConfig = props.integrationTypes.find(t => t.value === type.value);
  return typeConfig ? typeConfig.services : [];
});

// Watch for integration changes
watch(() => props.integration, (newIntegration) => {
  if (newIntegration) {
    name.value = newIntegration.name || "";
    type.value = newIntegration.type || props.activeType;
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

// Watch for type changes
watch(type, (newType) => {
  const typeConfig = props.integrationTypes.find(t => t.value === newType);
  if (typeConfig && typeConfig.services.length > 0) {
    service.value = typeConfig.services[0]?.value || "";
  }
});

function resetForm() {
  name.value = "";
  type.value = props.activeType;
  service.value = availableServices.value[0]?.value || "";
  apiKey.value = "";
  baseUrl.value = "";
  enabled.value = true;
  error.value = null;
}

function handleSave() {
  if (!name.value.trim() || !type.value || !service.value || !apiKey.value?.trim() || !baseUrl.value?.trim()) {
    error.value = "All fields are required";
    return;
  }

  emit("save", {
    name: name.value.trim(),
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

        <div class="space-y-2">
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-200">Integration Type *</label>
          <USelect
            v-model="type"
            :items="integrationTypes"
            value-attribute="value"
            option-attribute="label"
            class="w-full"
            :ui="{ base: 'w-full' }"
          />
        </div>

        <div class="space-y-2">
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-200">Integration Name *</label>
          <UInput
            v-model="name"
            placeholder="e.g., My Calendar Integration"
            class="w-full"
            :ui="{ base: 'w-full' }"
          />
        </div>

        <div class="space-y-2">
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-200">Service *</label>
          <USelect
            v-model="service"
            :items="availableServices"
            value-attribute="value"
            option-attribute="label"
            class="w-full"
            :ui="{ base: 'w-full' }"
          />
        </div>

        <div class="space-y-2">
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-200">API Key *</label>
          <UInput
            v-model="apiKey"
            placeholder="Enter API key"
            type="password"
            class="w-full"
            :ui="{ base: 'w-full' }"
          />
        </div>

        <div class="space-y-2">
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-200">Base URL *</label>
          <UInput
            v-model="baseUrl"
            placeholder="https://your-integration-instance.com"
            class="w-full"
            :ui="{ base: 'w-full' }"
          />
        </div>

        <div class="flex items-center gap-2">
          <UCheckbox
            v-model="enabled"
            label="Enable integration"
          />
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
        <div class="flex gap-2">
          <UButton
            color="neutral"
            variant="ghost"
            @click="emit('close')"
          >
            Cancel
          </UButton>
          <UButton
            color="primary"
            :disabled="!name.trim() || !type || !service || !apiKey?.trim() || !baseUrl?.trim()"
            @click="handleSave"
          >
            Save
          </UButton>
        </div>
      </div>
    </div>
  </div>
</template>