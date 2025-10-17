<script setup lang="ts">
import { format } from "date-fns";
import { toZonedTime } from "date-fns-tz";

const { fetchActivityLogs } = useActivityLog();

const loading = ref(false);
const logs = ref<any[]>([]);
const total = ref(0);
const currentPage = ref(1);
const pageSize = 20;

// Filters
const filterLevel = ref<string>("all");
const filterServiceName = ref<string>("all");
const filterUserId = ref<string | null>(null);

// Available filter options
const levelOptions = [
  { label: "All Levels", value: "all" },
  { label: "Info", value: "INFO" },
  { label: "Warning", value: "WARNING" },
  { label: "Error", value: "ERROR" },
];

const serviceOptions = [
  { label: "All Services", value: "all" },
  { label: "To-Do List", value: "todolist" },
  { label: "Chore", value: "chore" },
  { label: "Points", value: "points" },
  { label: "Calendar", value: "calendar" },
  { label: "User", value: "user" },
  { label: "Integration", value: "integration" },
];

// Fetch logs
async function loadLogs() {
  loading.value = true;
  try {
    const response = await fetchActivityLogs({
      limit: pageSize,
      offset: (currentPage.value - 1) * pageSize,
      level: filterLevel.value !== "all" ? filterLevel.value : undefined,
      serviceName: filterServiceName.value !== "all" ? filterServiceName.value : undefined,
      userId: filterUserId.value || undefined,
    });
    
    logs.value = response.logs;
    total.value = response.total;
  }
  catch (error) {
    console.error("Failed to load activity logs:", error);
  }
  finally {
    loading.value = false;
  }
}

// Format timestamp to Pacific timezone
function formatTimestamp(timestamp: string) {
  const date = new Date(timestamp);
  const pacificDate = toZonedTime(date, "America/Los_Angeles");
  return format(pacificDate, "yyyy-MM-dd HH:mm:ss zzz");
}

// Get level color
function getLevelColor(level: string) {
  switch (level) {
    case "INFO":
      return "text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/30";
    case "WARNING":
      return "text-yellow-600 dark:text-yellow-400 bg-yellow-100 dark:bg-yellow-900/30";
    case "ERROR":
      return "text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/30";
    default:
      return "text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-900/30";
  }
}

// Get service icon
function getServiceIcon(serviceName: string) {
  switch (serviceName) {
    case "todolist":
      return "i-lucide-list-todo";
    case "chore":
      return "i-lucide-broom";
    case "points":
      return "i-lucide-star";
    case "calendar":
      return "i-lucide-calendar-days";
    case "user":
      return "i-lucide-user";
    case "integration":
      return "i-lucide-plug";
    default:
      return "i-lucide-activity";
  }
}

// Watch for filter changes
watch([filterLevel, filterServiceName, filterUserId], () => {
  currentPage.value = 1;
  loadLogs();
});

// Load logs on mount
onMounted(() => {
  loadLogs();
});

// Pagination
const totalPages = computed(() => Math.ceil(total.value / pageSize));

function nextPage() {
  if (currentPage.value < totalPages.value) {
    currentPage.value++;
    loadLogs();
  }
}

function prevPage() {
  if (currentPage.value > 1) {
    currentPage.value--;
    loadLogs();
  }
}
</script>

<template>
  <div class="bg-default rounded-lg shadow-sm border border-default p-6">
    <div class="flex items-center justify-between mb-6">
      <div>
        <h2 class="text-lg font-semibold text-highlighted">
          Activity Log
        </h2>
        <p class="text-sm text-muted">
          Structured logging of all user activities and system events
        </p>
      </div>
      <UButton
        icon="i-lucide-refresh-cw"
        variant="outline"
        size="sm"
        @click="loadLogs"
      >
        Refresh
      </UButton>
    </div>

    <!-- Filters -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
      <div>
        <label class="block text-sm font-medium text-default mb-2">Filter by Level</label>
        <USelect
          v-model="filterLevel"
          :items="levelOptions"
          option-attribute="label"
          value-attribute="value"
          placeholder="Select level"
          class="w-full"
        />
      </div>
      <div>
        <label class="block text-sm font-medium text-default mb-2">Filter by Service</label>
        <USelect
          v-model="filterServiceName"
          :items="serviceOptions"
          option-attribute="label"
          value-attribute="value"
          placeholder="Select service"
          class="w-full"
        />
      </div>
    </div>

    <!-- Loading state -->
    <div v-if="loading" class="text-center py-8">
      <UIcon name="i-lucide-loader-2" class="animate-spin h-8 w-8 mx-auto" />
      <p class="text-default mt-2">
        Loading activity logs...
      </p>
    </div>

    <!-- Empty state -->
    <div v-else-if="logs.length === 0" class="text-center py-8">
      <div class="flex items-center justify-center gap-2 text-default">
        <UIcon name="i-lucide-file-text" class="h-10 w-10" />
        <div class="text-center">
          <p class="text-lg">
            No activity logs found
          </p>
          <p class="text-dimmed">
            Activity logs will appear here as users interact with the app
          </p>
        </div>
      </div>
    </div>

    <!-- Activity logs table -->
    <div v-else class="space-y-2">
      <div
        v-for="log in logs"
        :key="log.id"
        class="p-4 rounded-lg border border-default bg-muted/30 hover:bg-muted/50 transition-colors"
      >
        <div class="flex items-start gap-3">
          <!-- Service Icon -->
          <div class="mt-1">
            <div class="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
              <UIcon :name="getServiceIcon(log.serviceName)" class="h-4 w-4 text-primary" />
            </div>
          </div>

          <!-- Log content -->
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2 mb-1">
              <!-- Level badge -->
              <span
                class="px-2 py-0.5 rounded text-xs font-semibold"
                :class="getLevelColor(log.level)"
              >
                {{ log.level }}
              </span>

              <!-- Service name -->
              <span class="text-xs font-mono text-muted uppercase">
                {{ log.serviceName }}
              </span>

              <!-- Timestamp -->
              <span class="text-xs text-dimmed ml-auto">
                {{ formatTimestamp(log.timestamp) }}
              </span>
            </div>

            <!-- Message -->
            <p class="text-sm text-highlighted font-medium mb-1">
              {{ log.message }}
            </p>

            <!-- User info -->
            <div v-if="log.user || log.username" class="flex items-center gap-2 text-xs text-muted">
              <UIcon name="i-lucide-user" class="h-3 w-3" />
              <span v-if="log.user">{{ log.user.name }}</span>
              <span v-else>{{ log.username }}</span>
            </div>

            <!-- Entity info (if available) -->
            <div v-if="log.entityName" class="text-xs text-dimmed mt-1">
              <span class="font-mono">{{ log.entityType }}</span>:
              <span>{{ log.entityName }}</span>
            </div>

            <!-- Metadata (expandable) -->
            <details v-if="log.metadata" class="mt-2">
              <summary class="text-xs text-primary cursor-pointer hover:underline">
                View metadata
              </summary>
              <pre class="mt-2 p-2 bg-default rounded text-xs overflow-x-auto">{{ JSON.stringify(log.metadata, null, 2) }}</pre>
            </details>
          </div>
        </div>
      </div>
    </div>

    <!-- Pagination -->
    <div v-if="logs.length > 0" class="flex items-center justify-between mt-6 pt-4 border-t border-default">
      <p class="text-sm text-muted">
        Showing {{ (currentPage - 1) * pageSize + 1 }} - {{ Math.min(currentPage * pageSize, total) }} of {{ total }} logs
      </p>
      <div class="flex items-center gap-2">
        <UButton
          variant="outline"
          size="sm"
          icon="i-lucide-chevron-left"
          :disabled="currentPage === 1"
          @click="prevPage"
        >
          Previous
        </UButton>
        <span class="text-sm text-muted">
          Page {{ currentPage }} of {{ totalPages }}
        </span>
        <UButton
          variant="outline"
          size="sm"
          icon="i-lucide-chevron-right"
          :disabled="currentPage >= totalPages"
          @click="nextPage"
        >
          Next
        </UButton>
      </div>
    </div>
  </div>
</template>



