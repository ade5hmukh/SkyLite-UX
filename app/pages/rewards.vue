<script setup lang="ts">
import { ref, computed } from "vue";

definePageMeta({
  layout: "default",
});

// Fetch users for point display
const { data: users } = await useFetch("/api/users");
const selectedUserId = ref<string | null>(users.value && users.value.length > 0 ? users.value[0]!.id : null);

// Fetch rewards
const { data: rewards, refresh: refreshRewards } = await useFetch("/api/rewards");

// Fetch user's redemptions
const { data: redemptions, refresh: refreshRedemptions } = await useFetch("/api/rewards/redemptions", {
  query: computed(() => ({
    userId: selectedUserId.value,
  })),
});

// Category filter
const selectedCategory = ref("all");

// Computed: filtered rewards
const filteredRewards = computed(() => {
  if (!rewards.value) return [];
  if (selectedCategory.value === "all") return rewards.value;
  return rewards.value.filter(r => r.category === selectedCategory.value);
});

// Computed: current user
const currentUser = computed(() => {
  if (!selectedUserId.value || !users.value) return null;
  return users.value.find(u => u.id === selectedUserId.value);
});

// Computed: pending redemptions count
const pendingRedemptionsCount = computed(() => {
  if (!redemptions.value) return 0;
  return redemptions.value.filter(r => r.status === "PENDING").length;
});

// Categories
const categories = [
  { id: "all", name: "All Rewards", icon: "i-lucide-gift" },
  { id: "screen-time", name: "Screen Time", icon: "i-lucide-tablet" },
  { id: "treats", name: "Treats", icon: "i-lucide-candy" },
  { id: "activities", name: "Activities", icon: "i-lucide-palette" },
  { id: "privileges", name: "Privileges", icon: "i-lucide-star" },
  { id: "toys", name: "Toys", icon: "i-lucide-toy-brick" },
  { id: "special", name: "Special", icon: "i-lucide-sparkles" },
];

// Redeem reward
const isRedeeming = ref(false);
const redeemError = ref<string | null>(null);

async function redeemReward(rewardId: string) {
  if (!selectedUserId.value) return;

  isRedeeming.value = true;
  redeemError.value = null;

  try {
    await $fetch(`/api/rewards/${rewardId}/redeem`, {
      method: "POST",
      body: {
        userId: selectedUserId.value,
      },
    });

    // Refresh data
    await Promise.all([
      refreshRewards(),
      refreshRedemptions(),
      // Refresh users to update points
      $fetch("/api/users").then(data => {
        users.value = data;
      }),
    ]);

    // Show success (you could add a toast notification here)
    alert("Reward redeemed successfully! 🎉");
  }
  catch (error: any) {
    redeemError.value = error?.data?.message || "Failed to redeem reward";
    alert(redeemError.value);
  }
  finally {
    isRedeeming.value = false;
  }
}

function canAfford(pointCost: number): boolean {
  return currentUser.value ? currentUser.value.points >= pointCost : false;
}
</script>

<template>
  <div class="h-full flex flex-col bg-default">
    <!-- Header -->
    <div class="p-6 border-b border-default bg-muted">
      <div class="flex items-center justify-between mb-4">
        <div>
          <h1 class="text-2xl font-bold text-highlighted flex items-center gap-2">
            <UIcon name="i-lucide-gift" class="h-6 w-6 text-primary" />
            Rewards Catalog
          </h1>
          <p class="text-sm text-muted mt-1">
            Spend your points on awesome rewards!
          </p>
        </div>

        <!-- User Selector & Points -->
        <div class="flex items-center gap-4">
          <div v-if="currentUser" class="flex items-center gap-3 bg-default px-4 py-2 rounded-lg border border-default">
            <img
              v-if="currentUser.avatar"
              :src="currentUser.avatar"
              :alt="currentUser.name"
              class="w-10 h-10 rounded-full"
            >
            <div>
              <div class="text-sm font-medium text-highlighted">
                {{ currentUser.name }}
              </div>
              <div class="flex items-center gap-1 text-xs">
                <UIcon name="i-lucide-star" class="h-3 w-3 text-yellow-500" />
                <span class="font-bold text-highlighted">{{ currentUser.points }}</span>
                <span class="text-muted">points</span>
              </div>
            </div>
          </div>

          <!-- User Switcher -->
          <USelect
            v-if="users && users.length > 1"
            v-model="selectedUserId"
            :items="users.map(u => ({ label: u.name, value: u.id }))"
            option-attribute="label"
            value-attribute="value"
            class="w-40"
          />

          <!-- Pending Redemptions Badge -->
          <NuxtLink
            v-if="pendingRedemptionsCount > 0"
            to="/rewards/history"
            class="relative"
          >
            <UButton color="primary" variant="outline" icon="i-lucide-clock">
              Pending
            </UButton>
            <span class="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
              {{ pendingRedemptionsCount }}
            </span>
          </NuxtLink>
        </div>
      </div>

      <!-- Category Filter -->
      <div class="flex gap-2 overflow-x-auto pb-2">
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
    </div>

    <!-- Rewards Grid -->
    <div class="flex-1 overflow-y-auto p-6">
      <div v-if="filteredRewards.length === 0" class="text-center py-20">
        <UIcon name="i-lucide-package-open" class="h-20 w-20 text-muted mx-auto mb-4" />
        <p class="text-lg text-muted">
          No rewards available in this category yet.
        </p>
      </div>

      <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        <div
          v-for="reward in filteredRewards"
          :key="reward.id"
          class="bg-default border border-default rounded-xl overflow-hidden hover:shadow-lg transition-all"
          :class="{ 'opacity-60': !canAfford(reward.pointCost) }"
        >
          <!-- Reward Image/Icon -->
          <div class="h-32 flex items-center justify-center bg-gradient-to-br from-primary/10 to-primary/5">
            <UIcon
              :name="reward.icon || 'i-lucide-gift'"
              class="h-16 w-16 text-primary"
            />
          </div>

          <!-- Reward Info -->
          <div class="p-4">
            <h3 class="font-semibold text-highlighted mb-1">
              {{ reward.title }}
            </h3>
            <p class="text-sm text-muted mb-3 line-clamp-2">
              {{ reward.description }}
            </p>

            <!-- Points Cost -->
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-1.5">
                <UIcon name="i-lucide-star" class="h-4 w-4 text-yellow-500" />
                <span class="font-bold text-lg text-highlighted">{{ reward.pointCost }}</span>
                <span class="text-sm text-muted">points</span>
              </div>

              <!-- Redeem Button -->
              <UButton
                :disabled="!canAfford(reward.pointCost) || isRedeeming || !selectedUserId"
                :color="canAfford(reward.pointCost) ? 'primary' : 'gray'"
                size="sm"
                :loading="isRedeeming"
                @click="redeemReward(reward.id)"
              >
                Redeem
              </UButton>
            </div>

            <!-- Not Enough Points Message -->
            <p v-if="!canAfford(reward.pointCost)" class="text-xs text-red-500 mt-2">
              Need {{ reward.pointCost - (currentUser?.points || 0) }} more points
            </p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

