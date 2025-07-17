<script setup lang="ts">
import type { CreateIntegrationInput, CreateUserInput, Integration, User } from "~/types/database";
import { integrationRegistry } from "~/types/integrations";

import SettingsIntegrationDialog from "~/components/settings/settingsIntegrationDialog.vue";
import SettingsUserDialog from "~/components/settings/settingsUserDialog.vue";
import { consola } from "consola";

const { users, loading, error, fetchUsers, createUser, deleteUser } = useUsers();
const { integrations, loading: integrationsLoading, fetchIntegrations, createIntegration, updateIntegration, deleteIntegration } = useIntegrations();

const colorMode = useColorMode();
const isDark = computed({
  get() {
    return colorMode.value === "dark";
  },
  set() {
    colorMode.value = colorMode.value === "dark" ? "light" : "dark";
  },
});

onMounted(() => {
  if (!colorMode.value) {
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    colorMode.preference = prefersDark ? "dark" : "light";
  }
});

const selectedUser = ref<User | null>(null);
const isUserDialogOpen = ref(false);
const selectedIntegration = ref<Integration | null>(null);
const isIntegrationDialogOpen = ref(false);
const connectionTestResult = ref<any>(null);

const activeIntegrationTab = ref<string>("");

const availableIntegrationTypes = computed(() => {
  const types = new Set<string>();
  integrationRegistry.forEach((config) => types.add(config.type));
  return Array.from(types);
});

onMounted(() => {
  if (availableIntegrationTypes.value.length > 0) {
    activeIntegrationTab.value = availableIntegrationTypes.value[0] || "";
  }
});

const filteredIntegrations = computed(() => {
  return integrations.value.filter(integration => integration.type === activeIntegrationTab.value);
});

function handleUserSave(userData: CreateUserInput) {
  if (selectedUser.value?.id) {
    consola.warn("Update user:", userData);
  }
  else {
    createUser(userData);
  }
  isUserDialogOpen.value = false;
  selectedUser.value = null;
}

function handleUserDelete(userId: string) {
  deleteUser(userId);
  isUserDialogOpen.value = false;
  selectedUser.value = null;
}

function openUserDialog(user: User | null = null) {
  selectedUser.value = user;
  isUserDialogOpen.value = true;
}

async function handleIntegrationSave(integrationData: CreateIntegrationInput) {
  try {
    connectionTestResult.value = null;
    
    if (selectedIntegration.value?.id) {
      const updatedIntegration = await updateIntegration(selectedIntegration.value.id, {
        ...integrationData,
        createdAt: selectedIntegration.value.createdAt,
        updatedAt: new Date(),
      });
      
      const index = integrations.value.findIndex(i => i.id === selectedIntegration.value?.id);
      if (index !== -1) {
        integrations.value[index] = updatedIntegration;
      }
      
      connectionTestResult.value = {
        success: true,
        message: "Integration updated successfully!"
      };
    }
    else {
      const newIntegration = await createIntegration({
        ...integrationData,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      
      integrations.value.push(newIntegration);
      
      connectionTestResult.value = {
        success: true,
        message: "Integration created successfully!"
      };
    }
    
    setTimeout(() => {
      isIntegrationDialogOpen.value = false;
      selectedIntegration.value = null;
      connectionTestResult.value = null;
    }, 1500);
  } catch (error) {
    consola.error('Failed to save integration:', error);
    connectionTestResult.value = {
      success: false,
      error: error instanceof Error ? error.message : "Failed to save integration"
    };
  }
}

async function handleIntegrationDelete(integrationId: string) {
  try {
    await deleteIntegration(integrationId);
    await fetchIntegrations();
    isIntegrationDialogOpen.value = false;
    selectedIntegration.value = null;
  } catch (error) {
    consola.error('Failed to delete integration:', error);
  }
}

function openIntegrationDialog(integration: Integration | null = null) {
  if (!activeIntegrationTab.value && availableIntegrationTypes.value.length > 0) {
    activeIntegrationTab.value = availableIntegrationTypes.value[0] || "";
  }
  
  selectedIntegration.value = integration;
  isIntegrationDialogOpen.value = true;
}

async function handleToggleIntegration(integrationId: string, enabled: boolean) {
  try {
    await updateIntegration(integrationId, { enabled });
  }
  catch (error) {
    consola.error("Failed to toggle integration:", error);
  }
}

onMounted(async () => {
  await Promise.all([
    fetchUsers(),
    fetchIntegrations(),
  ]);
});

function getIntegrationIcon(type: string) {
  switch (type) {
    case "calendar":
      return "i-lucide-calendar-days";
    case "todo":
      return "i-lucide-list-todo";
    case "shopping":
      return "i-lucide-shopping-cart";
    case "meal":
      return "i-lucide-utensils";
    default:
      return "i-lucide-plug";
  }
}

function getIntegrationTypeLabel(type: string) {
  return type.charAt(0).toUpperCase() + type.slice(1);
}

function getIntegrationIconUrl(integration: Integration) {
  if (integration.icon) {
    return integration.icon;
  }
  
  const config = integrationRegistry.get(`${integration.type}:${integration.service}`);
  return config?.icon || null;
}
</script>

<template>
  <div class="flex w-full flex-col rounded-lg">
    <div class="py-5 sm:px-4 sticky top-0 z-40 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
      <GlobalDateHeader />
    </div>

    <div class="flex-1 bg-gray-50 dark:bg-gray-900 p-6">
      <div class="max-w-4xl mx-auto">
        <div class="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-6">
          <div class="flex items-center justify-between mb-6">
            <div>
              <h2 class="text-lg font-semibold text-gray-900 dark:text-white">
                Users
              </h2>
            </div>
            <UButton
              icon="i-lucide-user-plus"
              @click="openUserDialog()"
            >
              Add User
            </UButton>
          </div>

          <div v-if="loading" class="text-center py-8">
            <UIcon name="i-lucide-loader-2" class="animate-spin h-8 w-8 mx-auto" />
            <p class="text-gray-500 dark:text-gray-400 mt-2">
              Loading users...
            </p>
          </div>

          <div v-else-if="error" class="text-center py-8 text-red-600 dark:text-red-400">
            {{ error }}
          </div>

          <div v-else-if="users.length === 0" class="text-center py-8">
            <div class="flex items-center justify-center gap-2 text-gray-500 dark:text-gray-400">
              <UIcon name="i-lucide-frown" class="h-10 w-10" />
              <div class="text-center">
                <p class="text-lg">
                  No users found
                </p>
                <p class="text-gray-400 dark:text-gray-500">
                  Create your first user to get started
                </p>
              </div>
            </div>
          </div>

          <div v-else>
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div
                v-for="user in users"
                :key="user.id"
                class="flex items-center gap-3 p-4 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700"
              >
                <div class="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-sm font-medium">
                  {{ user.name.charAt(0).toUpperCase() }}
                </div>
                <div class="flex-1 min-w-0">
                  <p class="font-medium text-gray-900 dark:text-white truncate">
                    {{ user.name }}
                  </p>
                  <p v-if="user.email" class="text-sm text-gray-500 dark:text-gray-400 truncate">
                    {{ user.email }}
                  </p>
                  <p v-else class="text-sm text-gray-500 dark:text-gray-400">
                    No email
                  </p>
                </div>
                <div class="flex items-center gap-2">
                  <UButton
                    variant="ghost"
                    size="sm"
                    icon="i-lucide-edit"
                    :title="`Edit ${user.name}`"
                    @click="openUserDialog(user)"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-6">
          <div class="flex items-center justify-between mb-6">
            <div>
              <h2 class="text-lg font-semibold text-gray-900 dark:text-white">
                Integrations
              </h2>
            </div>
            <UButton
              icon="i-lucide-plug"
              @click="openIntegrationDialog()"
            >
              Add Integration
            </UButton>
          </div>

          <div class="border-b border-gray-200 dark:border-gray-700 mb-6">
            <nav class="-mb-px flex space-x-8">
              <button
                v-for="type in availableIntegrationTypes"
                :key="type"
                class="whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm"
                :class="[
                  activeIntegrationTab === type
                    ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300',
                ]"
                @click="activeIntegrationTab = type"
              >
                {{ getIntegrationTypeLabel(type) }}
              </button>
            </nav>
          </div>

          <div v-if="integrationsLoading" class="text-center py-8">
            <UIcon name="i-lucide-loader-2" class="animate-spin h-8 w-8 mx-auto" />
            <p class="text-gray-500 dark:text-gray-400 mt-2">
              Loading integrations...
            </p>
          </div>

          <div v-else-if="filteredIntegrations.length === 0" class="text-center py-8">
            <div class="flex items-center justify-center gap-2 text-gray-500 dark:text-gray-400">
              <UIcon name="i-lucide-frown" class="h-10 w-10" />
              <div class="text-center">
                <p class="text-lg">
                  No {{ getIntegrationTypeLabel(activeIntegrationTab) }} integrations configured
                </p>
                <p class="text-gray-400 dark:text-gray-500">
                  Connect external services to enhance your experience
                </p>
              </div>
            </div>
          </div>

          <div v-else>
            <div class="space-y-4">
              <div
                v-for="integration in filteredIntegrations"
                :key="integration.id"
                class="flex items-center justify-between p-4 rounded-lg border"
                :class="[
                  integration.enabled
                    ? 'border-primary-200 dark:border-primary-800 bg-primary-50/50 dark:bg-primary-900/20'
                    : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800',
                ]"
              >
                <div class="flex items-center gap-3">
                  <div
                    class="w-10 h-10 rounded-full flex items-center justify-center text-white"
                    :class="[
                      integration.enabled
                        ? 'bg-gray-700'
                        : 'bg-gray-400',
                    ]"
                  >
                    <img
                      v-if="getIntegrationIconUrl(integration)"
                      :src="getIntegrationIconUrl(integration) || undefined"
                      :alt="integration.service + ' icon'"
                      class="h-5 w-5"
                      style="object-fit: contain"
                    />
                    <UIcon
                      v-else
                      :name="getIntegrationIcon(integration.type)"
                      class="h-5 w-5"
                    />
                  </div>
                  <div class="flex-1 min-w-0">
                    <p class="font-medium text-gray-900 dark:text-white">
                      {{ integration.name }}
                    </p>
                    <p class="text-sm text-gray-500 dark:text-gray-400 capitalize">
                      {{ integration.service }}
                    </p>
                    <p class="text-xs text-gray-400 dark:text-gray-500 truncate">
                      {{ integration.baseUrl }}
                    </p>
                  </div>
                </div>
                <div class="flex items-center gap-2">
                  <USwitch
                    v-model="integration.enabled"
                    color="primary"
                    unchecked-icon="i-lucide-x"
                    checked-icon="i-lucide-check"
                    size="xl"
                    @update:model-value="handleToggleIntegration(integration.id, $event)"
                  />
                  <UButton
                    variant="ghost"
                    size="sm"
                    icon="i-lucide-edit"
                    :title="`Edit ${integration.name}`"
                    @click="openIntegrationDialog(integration)"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h2 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Application Settings
          </h2>
          <div class="space-y-4">
            <div class="flex items-center justify-between">
              <div>
                <p class="font-medium text-gray-900 dark:text-white">
                  Dark Mode
                </p>
                <p class="text-sm text-gray-600 dark:text-gray-400">
                  Toggle between light and dark themes
                </p>
              </div>
              <USwitch
                v-model="isDark"
                color="primary"
                checked-icon="i-lucide-moon"
                unchecked-icon="i-lucide-sun"
                size="xl"
              />
            </div>
            <div class="flex items-center justify-between">
              <div>
                <p class="font-medium text-gray-900 dark:text-white">
                  Notifications
                </p>
                <p class="text-sm text-gray-600 dark:text-gray-400">
                  Enable push notifications (Coming Soon™)
                </p>
              </div>
              <USwitch
                color="primary"
                checked-icon="i-lucide-alarm-clock-check"
                unchecked-icon="i-lucide-alarm-clock-off"
                size="xl"
              />
            </div>
          </div>
        </div>
      </div>
    </div>

    <SettingsUserDialog
      :user="selectedUser"
      :is-open="isUserDialogOpen"
      @close="isUserDialogOpen = false"
      @save="handleUserSave"
      @delete="handleUserDelete"
    />

    <SettingsIntegrationDialog
      :integration="selectedIntegration"
      :is-open="isIntegrationDialogOpen"
      :active-type="activeIntegrationTab"
      :existing-integrations="integrations"
      :connection-test-result="connectionTestResult"
      @close="isIntegrationDialogOpen = false"
      @save="handleIntegrationSave"
      @delete="handleIntegrationDelete"
    />
  </div>
</template>
