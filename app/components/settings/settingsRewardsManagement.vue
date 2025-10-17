<script setup lang="ts">
import { ref, computed } from "vue";
import type { RewardTemplate } from "~/types/rewards";

// Fetch rewards
const { data: rewards, refresh: refreshRewards } = await useFetch("/api/rewards");

// Fetch reward templates
const { data: rewardData } = await useFetch("/api/rewards/templates");
const templates = computed(() => rewardData.value?.templates || []);
const categories = computed(() => rewardData.value?.categories || []);

// Fetch all redemptions
const { data: redemptions, refresh: refreshRedemptions } = await useFetch("/api/rewards/redemptions");

// UI State
const activeTab = ref<"templates" | "active" | "redemptions">("templates");
const selectedCategory = ref("all");
const editingRewardId = ref<string | null>(null);

// Form state for inline editing
const editForm = ref({
  title: "",
  description: "",
  icon: "",
  pointCost: 15,
  category: "",
  color: "",
});

// Filtered templates
const filteredTemplates = computed(() => {
  if (selectedCategory.value === "all") return templates.value;
  return templates.value.filter((t: RewardTemplate) => t.category === selectedCategory.value);
});

// Active rewards
const activeRewards = computed(() => {
  if (!rewards.value) return [];
  return rewards.value.sort((a, b) => a.order - b.order);
});

// Pending redemptions
const pendingRedemptions = computed(() => {
  if (!redemptions.value) return [];
  return redemptions.value.filter(r => r.status === "PENDING");
});

// Start editing a template
function startEditingTemplate(template: RewardTemplate) {
  editingRewardId.value = template.id;
  editForm.value = {
    title: template.title,
    description: template.description,
    icon: template.icon,
    pointCost: template.pointCost,
    category: template.category,
    color: template.color,
  };
}

// Cancel editing
function cancelEditing() {
  editingRewardId.value = null;
}

// Add template to catalog
async function addTemplateToCatalog(template?: RewardTemplate) {
  try {
    const dataToSave = template || editForm.value;
    
    await $fetch("/api/rewards", {
      method: "POST",
      body: {
        title: dataToSave.title,
        description: dataToSave.description,
        icon: dataToSave.icon,
        pointCost: dataToSave.pointCost,
        category: dataToSave.category,
        color: dataToSave.color,
        enabled: true,
      },
    });

    await refreshRewards();
    cancelEditing();
    activeTab.value = "active"; // Switch to active rewards tab
  }
  catch (error) {
    console.error("Failed to add reward:", error);
    alert("Failed to add reward");
  }
}

// Update existing reward
async function updateReward(rewardId: string) {
  try {
    await $fetch(`/api/rewards/${rewardId}`, {
      method: "PUT",
      body: editForm.value,
    });

    await refreshRewards();
    cancelEditing();
  }
  catch (error) {
    console.error("Failed to update reward:", error);
    alert("Failed to update reward");
  }
}

// Delete reward
async function deleteReward(rewardId: string, rewardTitle: string) {
  if (!confirm(`Delete "${rewardTitle}"?`)) return;

  try {
    await $fetch(`/api/rewards/${rewardId}`, {
      method: "DELETE",
    });

    await refreshRewards();
  }
  catch (error) {
    console.error("Failed to delete reward:", error);
    alert("Failed to delete reward");
  }
}

// Start editing existing reward
function startEditingReward(reward: any) {
  editingRewardId.value = reward.id;
  editForm.value = {
    title: reward.title,
    description: reward.description || "",
    icon: reward.icon || "",
    pointCost: reward.pointCost,
    category: reward.category || "",
    color: reward.color || "",
  };
}

async function handleUpdateRedemption(redemptionId: string, status: string) {
  try {
    await $fetch(`/api/rewards/redemptions/${redemptionId}`, {
      method: "PUT",
      body: { status },
    });

    await Promise.all([refreshRedemptions(), refreshRewards()]);
  }
  catch (error) {
    console.error("Failed to update redemption:", error);
    alert("Failed to update redemption");
  }
}
</script>

<template>
  <div class="bg-default rounded-lg shadow-sm border border-default p-6 mb-6">
    <div class="flex items-center justify-between mb-4">
      <h2 class="text-lg font-semibold text-highlighted flex items-center gap-2">
        <UIcon name="i-lucide-gift" class="h-5 w-5 text-primary" />
        Rewards Management
      </h2>
    </div>

    <!-- Tabs -->
    <div class="flex gap-2 mb-4 border-b border-default">
      <button
        :class="['px-4 py-2 font-medium transition-colors', activeTab === 'templates' ? 'text-primary border-b-2 border-primary' : 'text-muted hover:text-highlighted']"
        @click="activeTab = 'templates'"
      >
        Templates ({{ templates.length }})
      </button>
      <button
        :class="['px-4 py-2 font-medium transition-colors', activeTab === 'active' ? 'text-primary border-b-2 border-primary' : 'text-muted hover:text-highlighted']"
        @click="activeTab = 'active'"
      >
        Active Rewards ({{ activeRewards.length }})
      </button>
      <button
        :class="['px-4 py-2 font-medium transition-colors flex items-center gap-2', activeTab === 'redemptions' ? 'text-primary border-b-2 border-primary' : 'text-muted hover:text-highlighted']"
        @click="activeTab = 'redemptions'"
      >
        Redemptions
        <span v-if="pendingRedemptions.length > 0" class="bg-red-500 text-white text-xs rounded-full px-2 py-0.5">
          {{ pendingRedemptions.length }}
        </span>
      </button>
    </div>

    <!-- Templates Tab -->
    <div v-if="activeTab === 'templates'">
      <p class="text-sm text-muted mb-4">
        Click any template to customize and add it to your active rewards catalog.
      </p>

      <!-- Category filter -->
      <div class="flex gap-2 overflow-x-auto pb-2 mb-4">
        <UButton
          v-for="category in categories"
          :key="category.id"
          :color="selectedCategory === category.id ? 'primary' : 'gray'"
          :variant="selectedCategory === category.id ? 'solid' : 'outline'"
          size="sm"
          :icon="category.icon"
          @click="selectedCategory = category.id"
        >
          {{ category.name }}
        </UButton>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div
          v-for="template in filteredTemplates"
          :key="template.id"
          class="border border-default rounded-lg overflow-hidden"
          :class="editingRewardId === template.id ? 'ring-2 ring-primary' : ''"
        >
          <!-- Display mode -->
          <div v-if="editingRewardId !== template.id" class="p-4 hover:bg-muted/20 transition-colors">
            <div class="flex items-start gap-3 mb-3">
              <div class="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10 flex-shrink-0">
                <UIcon :name="template.icon" class="h-5 w-5 text-primary" />
              </div>
              <div class="flex-1 min-w-0">
                <h4 class="font-medium text-highlighted mb-1">{{ template.title }}</h4>
                <p class="text-xs text-muted mb-2">{{ template.description }}</p>
                <div class="flex items-center gap-2">
                  <span class="text-xs font-semibold text-primary">{{ template.pointCost }} points</span>
                  <span class="text-xs text-muted">•</span>
                  <span class="text-xs text-muted">{{ template.category }}</span>
                </div>
              </div>
            </div>
            <div class="flex gap-2">
              <UButton
                color="primary"
                size="sm"
                icon="i-lucide-plus"
                block
                @click="addTemplateToCatalog(template)"
              >
                Add to Catalog
              </UButton>
              <UButton
                color="gray"
                variant="outline"
                size="sm"
                icon="i-lucide-pencil"
                @click="startEditingTemplate(template)"
              />
            </div>
          </div>

          <!-- Edit mode -->
          <div v-else class="p-4 bg-muted/30">
            <div class="space-y-3">
              <input
                v-model="editForm.title"
                type="text"
                placeholder="Title"
                class="w-full px-3 py-2 text-sm border border-default rounded-lg bg-default text-highlighted"
              >
              <input
                v-model="editForm.description"
                type="text"
                placeholder="Description"
                class="w-full px-3 py-2 text-sm border border-default rounded-lg bg-default text-highlighted"
              >
              <div class="grid grid-cols-2 gap-2">
                <input
                  v-model.number="editForm.pointCost"
                  type="number"
                  placeholder="Points"
                  class="w-full px-3 py-2 text-sm border border-default rounded-lg bg-default text-highlighted"
                >
                <input
                  v-model="editForm.category"
                  type="text"
                  placeholder="Category"
                  class="w-full px-3 py-2 text-sm border border-default rounded-lg bg-default text-highlighted"
                >
              </div>
              <div class="flex gap-2">
                <UButton
                  color="primary"
                  size="sm"
                  icon="i-lucide-check"
                  @click="addTemplateToCatalog()"
                >
                  Add
                </UButton>
                <UButton
                  color="gray"
                  variant="outline"
                  size="sm"
                  @click="cancelEditing"
                >
                  Cancel
                </UButton>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Active Rewards Tab -->
    <div v-if="activeTab === 'active'">
      <div v-if="activeRewards.length === 0" class="text-center py-10">
        <UIcon name="i-lucide-package-open" class="h-12 w-12 text-muted mx-auto mb-2" />
        <p class="text-sm text-muted mb-2">
          No active rewards yet.
        </p>
        <UButton
          color="primary"
          size="sm"
          @click="activeTab = 'templates'"
        >
          Browse Templates
        </UButton>
      </div>

      <div v-else class="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div
          v-for="reward in activeRewards"
          :key="reward.id"
          class="border border-default rounded-lg overflow-hidden"
          :class="editingRewardId === reward.id ? 'ring-2 ring-primary' : ''"
        >
          <!-- Display mode -->
          <div v-if="editingRewardId !== reward.id" class="p-4 hover:bg-muted/20 transition-colors">
            <div class="flex items-start gap-3 mb-3">
              <div class="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10 flex-shrink-0">
                <UIcon :name="reward.icon || 'i-lucide-gift'" class="h-5 w-5 text-primary" />
              </div>
              <div class="flex-1 min-w-0">
                <h4 class="font-medium text-highlighted mb-1">{{ reward.title }}</h4>
                <p class="text-xs text-muted mb-2">{{ reward.description }}</p>
                <div class="flex items-center gap-2">
                  <span class="text-xs font-semibold text-primary">{{ reward.pointCost }} points</span>
                  <span class="text-xs text-muted">•</span>
                  <span class="text-xs text-muted">{{ reward.category }}</span>
                </div>
              </div>
            </div>
            <div class="flex gap-2">
              <UButton
                color="gray"
                variant="outline"
                size="sm"
                icon="i-lucide-pencil"
                @click="startEditingReward(reward)"
              >
                Edit
              </UButton>
              <UButton
                color="red"
                variant="ghost"
                size="sm"
                icon="i-lucide-trash"
                @click="deleteReward(reward.id, reward.title)"
              >
                Delete
              </UButton>
            </div>
          </div>

          <!-- Edit mode -->
          <div v-else class="p-4 bg-muted/30">
            <div class="space-y-3">
              <input
                v-model="editForm.title"
                type="text"
                placeholder="Title"
                class="w-full px-3 py-2 text-sm border border-default rounded-lg bg-default text-highlighted"
              >
              <input
                v-model="editForm.description"
                type="text"
                placeholder="Description"
                class="w-full px-3 py-2 text-sm border border-default rounded-lg bg-default text-highlighted"
              >
              <div class="grid grid-cols-2 gap-2">
                <input
                  v-model.number="editForm.pointCost"
                  type="number"
                  placeholder="Points"
                  class="w-full px-3 py-2 text-sm border border-default rounded-lg bg-default text-highlighted"
                >
                <input
                  v-model="editForm.category"
                  type="text"
                  placeholder="Category"
                  class="w-full px-3 py-2 text-sm border border-default rounded-lg bg-default text-highlighted"
                >
              </div>
              <div class="flex gap-2">
                <UButton
                  color="primary"
                  size="sm"
                  icon="i-lucide-check"
                  @click="updateReward(reward.id)"
                >
                  Save
                </UButton>
                <UButton
                  color="gray"
                  variant="outline"
                  size="sm"
                  @click="cancelEditing"
                >
                  Cancel
                </UButton>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Redemptions Tab -->
    <div v-if="activeTab === 'redemptions'">
      <div v-if="!redemptions || redemptions.length === 0" class="text-center py-10">
        <UIcon name="i-lucide-inbox" class="h-12 w-12 text-muted mx-auto mb-2" />
        <p class="text-sm text-muted">
          No redemptions yet.
        </p>
      </div>

      <div v-else class="space-y-2">
        <div
          v-for="redemption in redemptions"
          :key="redemption.id"
          class="flex items-center gap-4 p-4 rounded-lg border border-default"
          :class="{ 'bg-yellow-50 dark:bg-yellow-900/10': redemption.status === 'PENDING' }"
        >
          <img
            v-if="redemption.user.avatar"
            :src="redemption.user.avatar"
            :alt="redemption.user.name"
            class="w-10 h-10 rounded-full"
          >
          <div class="flex-1">
            <div class="flex items-center gap-2 mb-1">
              <span class="font-medium text-highlighted">{{ redemption.user.name }}</span>
              <span class="text-sm text-muted">redeemed</span>
              <span class="font-medium text-primary">{{ redemption.reward.title }}</span>
            </div>
            <div class="flex items-center gap-3 text-xs text-muted">
              <span class="flex items-center gap-1">
                <UIcon name="i-lucide-star" class="h-3 w-3 text-yellow-500" />
                {{ redemption.pointsSpent }} points
              </span>
              <span class="flex items-center gap-1">
                <UIcon name="i-lucide-clock" class="h-3 w-3" />
                {{ new Date(redemption.redeemedAt).toLocaleDateString() }}
              </span>
            </div>
          </div>
          <div class="flex items-center gap-2">
            <span
              :class="[
                'px-2 py-1 text-xs font-medium rounded-full',
                redemption.status === 'PENDING' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' :
                redemption.status === 'FULFILLED' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400'
              ]"
            >
              {{ redemption.status }}
            </span>
            <UButton
              v-if="redemption.status === 'PENDING'"
              color="green"
              size="sm"
              icon="i-lucide-check"
              @click="handleUpdateRedemption(redemption.id, 'FULFILLED')"
            >
              Fulfill
            </UButton>
            <UButton
              v-if="redemption.status === 'PENDING'"
              color="red"
              variant="ghost"
              size="sm"
              icon="i-lucide-x"
              @click="handleUpdateRedemption(redemption.id, 'CANCELLED')"
            />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

