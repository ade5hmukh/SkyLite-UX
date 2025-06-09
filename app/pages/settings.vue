<script setup lang="ts">
import type { CreateIntegrationInput, CreateUserInput, User, Integration } from "~/types/database";
import SettingsUserDialog from "~/components/settings/settingsUserDialog.vue";
import SettingsIntegrationDialog from "~/components/settings/settingsIntegrationDialog.vue";

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

// Initialize color mode from system preference if not set
onMounted(() => {
  if (!colorMode.value) {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    colorMode.preference = prefersDark ? 'dark' : 'light';
  }
});

// Form state
const showNewUserForm = ref(false);
const selectedUser = ref<User | null>(null);
const isUserDialogOpen = ref(false);
const newUser = reactive<CreateUserInput>({
  name: "",
  email: "",
  avatar: null,
  todoOrder: 0,
});

// Integration state
const selectedIntegration = ref<Integration | null>(null);
const isIntegrationDialogOpen = ref(false);

// Integration form state
const showNewIntegrationForm = ref(false);
const newIntegration = reactive<CreateIntegrationInput>({
  name: "",
  type: "calendar",
  service: "",
  apiKey: "",
  baseUrl: "",
  enabled: true,
  settings: {},
});

const integrationTypes = [
  {
    label: "Calendar",
    value: "calendar",
    services: [
      { label: "Google Calendar", value: "google" },
      { label: "Outlook", value: "outlook" },
    ],
  },
  {
    label: "Todo",
    value: "todo",
    services: [
      { label: "Todoist", value: "todoist" },
      { label: "Microsoft To Do", value: "mstodo" },
    ],
  },
  {
    label: "Shopping List",
    value: "shopping",
    services: [
      { label: "Tandoor", value: "tandoor" },
      { label: "Mealie", value: "mealie" },
    ],
  },
  {
    label: "Meal Planner",
    value: "meal",
    services: [
      { label: "Tandoor", value: "tandoor" },
      { label: "Mealie", value: "mealie" },
    ],
  },
];

// Add active tab state
const activeIntegrationTab = ref("calendar");

// Add computed property to filter integrations by type
const filteredIntegrations = computed(() => {
  return integrations.value.filter(integration => integration.type === activeIntegrationTab.value);
});

// Add computed property to get available services for current type
const availableServices = computed(() => {
  const type = integrationTypes.find(t => t.value === activeIntegrationTab.value);
  return type ? type.services : [];
});

// Watch for tab changes to update the form
watch(activeIntegrationTab, (newType) => {
  if (showNewIntegrationForm.value) {
    newIntegration.type = newType;
    const type = integrationTypes.find(t => t.value === newType);
    if (type && type.services.length > 0) {
      newIntegration.service = type.services[0]?.value || "";
    }
  }
});

function handleUserSave(userData: CreateUserInput) {
  if (selectedUser.value?.id) {
    // TODO: Implement user update
    console.log("Update user:", userData);
  } else {
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

function handleIntegrationSave(integrationData: CreateIntegrationInput) {
  if (selectedIntegration.value?.id) {
    updateIntegration(selectedIntegration.value.id, {
      ...integrationData,
      createdAt: selectedIntegration.value.createdAt,
      updatedAt: new Date(),
    });
  } else {
    createIntegration({
      ...integrationData,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }
  isIntegrationDialogOpen.value = false;
  selectedIntegration.value = null;
}

function handleIntegrationDelete(integrationId: string) {
  deleteIntegration(integrationId);
  isIntegrationDialogOpen.value = false;
  selectedIntegration.value = null;
}

function openIntegrationDialog(integration: Integration | null = null) {
  selectedIntegration.value = integration;
  isIntegrationDialogOpen.value = true;
}

async function handleToggleIntegration(integrationId: string, enabled: boolean) {
  try {
    await updateIntegration(integrationId, { enabled });
  }
  catch (error) {
    console.error("Failed to toggle integration:", error);
  }
}

// Load users and integrations on mount
onMounted(async () => {
  await Promise.all([
    fetchUsers(),
    fetchIntegrations(),
  ]);
});

// Add this function before the return statement in the script setup
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
</script>

<template>
  <div>
    <div class="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      <div class="max-w-4xl mx-auto">

        <!-- User Management -->
        <div class="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-6">
          <div class="flex items-center justify-between mb-6">
            <div>
              <h2 class="text-lg font-semibold text-gray-900 dark:text-white">
                User Management
              </h2>
            </div>
            <UButton
              icon="i-lucide-user-plus"
              @click="openUserDialog()"
            >
              Add User
            </UButton>
          </div>

          <!-- Users List -->
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
            <UIcon name="i-lucide-users" class="h-16 w-16 mx-auto text-gray-400 mb-4" />
            <p class="text-gray-500 dark:text-gray-400 text-lg">
              No users found
            </p>
            <p class="text-gray-400 dark:text-gray-500 mb-6">
              Create your first user to get started
            </p>
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

        <!-- Integrations -->
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

          <!-- Integration Type Tabs -->
          <div class="border-b border-gray-200 dark:border-gray-700 mb-6">
            <nav class="-mb-px flex space-x-8">
              <button
                v-for="type in integrationTypes"
                :key="type.value"
                class="whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm"
                :class="[
                  activeIntegrationTab === type.value
                    ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300',
                ]"
                @click="activeIntegrationTab = type.value"
              >
                {{ type.label }}
              </button>
            </nav>
          </div>

          <!-- Integrations List -->
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
                  No {{ integrationTypes.find(t => t.value === activeIntegrationTab)?.label }} integrations configured
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
                    : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800'
                ]"
              >
                <div class="flex items-center gap-3">
                  <div 
                    class="w-10 h-10 rounded-full flex items-center justify-center text-white"
                    :class="[
                      integration.enabled
                        ? 'bg-gradient-to-br from-blue-500 to-green-600'
                        : 'bg-gradient-to-br from-gray-400 to-gray-600'
                    ]"
                  >
                    <UIcon
                      :name="getIntegrationIcon(integration.service)"
                      class="h-5 w-5"
                    />
                  </div>
                  <div class="flex-1 min-w-0">
                    <p class="font-medium text-gray-900 dark:text-white">
                      {{ integration.name }}
                    </p>
                    <p class="text-sm text-gray-500 dark:text-gray-400 capitalize">
                      {{ integrationTypes.find(t => t.value === integration.type)?.services.find(s => s.value === integration.service)?.label }}
                    </p>
                    <p class="text-xs text-gray-400 dark:text-gray-500 truncate">
                      {{ integration.baseUrl }}
                    </p>
                  </div>
                </div>
                <div class="flex items-center gap-2">
                  <USwitch
                    v-model="integration.enabled"
                    @update:model-value="handleToggleIntegration(integration.id, $event)"
                    color="primary"
                    unchecked-icon="i-lucide-x"
                    checked-icon="i-lucide-check"
                    size="xl"
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

        <!-- App Settings -->
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

    <!-- User Dialog -->
    <SettingsUserDialog
      :user="selectedUser"
      :is-open="isUserDialogOpen"
      @close="isUserDialogOpen = false"
      @save="handleUserSave"
      @delete="handleUserDelete"
    />

    <!-- Integration Dialog -->
    <SettingsIntegrationDialog
      :integration="selectedIntegration"
      :is-open="isIntegrationDialogOpen"
      :integration-types="integrationTypes"
      :active-type="activeIntegrationTab"
      @close="isIntegrationDialogOpen = false"
      @save="handleIntegrationSave"
      @delete="handleIntegrationDelete"
    />
  </div>
</template>
