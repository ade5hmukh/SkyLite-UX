<script setup lang="ts">
import { computed, ref } from "vue";

import RewardUnwrap from "~/components/rewards/rewardUnwrap.vue";
import { BIG_REWARD_CATEGORY } from "~/types/rewards";

definePageMeta({
  layout: "default",
});

// Fetch users for point display
const { data: users, refresh: refreshUsers } = await useFetch("/api/users");
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
  if (!rewards.value)
    return [];
  if (selectedCategory.value === "all")
    return rewards.value;
  return rewards.value.filter(r => r.category === selectedCategory.value);
});

// Computed: current user
const currentUser = computed(() => {
  if (!selectedUserId.value || !users.value)
    return null;
  return users.value.find(u => u.id === selectedUserId.value);
});

// Computed: pending redemptions count
const pendingRedemptionsCount = computed(() => {
  if (!redemptions.value)
    return 0;
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
  { id: BIG_REWARD_CATEGORY, name: "Big Goals", icon: "i-lucide-piggy-bank" },
];

const goalReward = computed(() => {
  const goalId = currentUser.value?.savingGoalId;
  return goalId ? rewards.value?.find(r => r.id === goalId) ?? null : null;
});

const settingGoal = ref(false);
async function toggleGoal(rewardId: string) {
  if (!currentUser.value)
    return;
  settingGoal.value = true;
  try {
    const next = currentUser.value.savingGoalId === rewardId ? null : rewardId;
    await $fetch(`/api/users/${currentUser.value.id}/goal`, { method: "PUT", body: { rewardId: next } });
    await refreshUsers();
  }
  finally {
    settingGoal.value = false;
  }
}

const toast = useToast();
const unwrapping = ref<{ title: string; icon: string | null; name: string } | null>(null);

const tickets = computed(() => redemptions.value?.filter(r => r.status === "PENDING") ?? []);
const fulfillingId = ref<string | null>(null);
async function markTicketDone(redemptionId: string) {
  fulfillingId.value = redemptionId;
  try {
    await $fetch(`/api/rewards/redemptions/${redemptionId}`, { method: "PUT", body: { status: "FULFILLED" } });
    await refreshRedemptions();
  }
  finally {
    fulfillingId.value = null;
  }
}

// Redeem reward
const redeemingRewardId = ref<string | null>(null);
const isRedeeming = computed(() => redeemingRewardId.value !== null);
const redeemError = ref<string | null>(null);

async function redeemReward(rewardId: string) {
  if (!selectedUserId.value)
    return;

  redeemingRewardId.value = rewardId;
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
      $fetch("/api/users").then((data) => {
        users.value = data;
      }),
    ]);

    const reward = rewards.value?.find(r => r.id === rewardId);
    unwrapping.value = { title: reward?.title ?? "your reward", icon: reward?.icon ?? null, name: currentUser.value?.name ?? "" };
  }
  catch (error: any) {
    redeemError.value = error?.data?.message || "Failed to redeem reward";
    toast.add({ title: "Couldn't redeem", description: redeemError.value ?? undefined, color: "error" });
  }
  finally {
    redeemingRewardId.value = null;
  }
}

function spendable(reward: { category: string | null }): number {
  if (!currentUser.value)
    return 0;
  return currentUser.value.points + (reward.category === BIG_REWARD_CATEGORY ? currentUser.value.savedPoints : 0);
}

function canAfford(reward: { pointCost: number; category: string | null }): boolean {
  return spendable(reward) >= reward.pointCost;
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
                <UIcon name="i-lucide-piggy-bank" class="h-3 w-3 text-pink-500 ml-2" />
                <span class="font-bold text-highlighted">{{ currentUser.savedPoints }}</span>
                <span class="text-muted">saved</span>
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
            to="/settings?tab=redemptions"
            class="relative"
          >
            <UButton
              color="primary"
              variant="outline"
              icon="i-lucide-clock"
            >
              Pending
            </UButton>
            <span class="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
              {{ pendingRedemptionsCount }}
            </span>
          </NuxtLink>
        </div>
      </div>

      <div v-if="goalReward && currentUser" class="mb-4 rounded-lg border border-pink-200 bg-pink-50 dark:bg-pink-950/30 px-4 py-3">
        <div class="flex items-center justify-between text-sm mb-2">
          <span class="flex items-center gap-2 font-medium text-highlighted">
            <UIcon :name="goalReward.icon || 'i-lucide-gift'" class="h-4 w-4 text-pink-500" />
            Saving for {{ goalReward.title }}
          </span>
          <span class="font-bold text-highlighted">{{ currentUser.savedPoints }} / {{ goalReward.pointCost }}</span>
        </div>
        <UProgress :model-value="Math.min(100, Math.round((currentUser.savedPoints / goalReward.pointCost) * 100))" color="secondary" />
      </div>
      <div v-if="tickets.length" class="mb-4 space-y-2">
        <div
          v-for="ticket in tickets"
          :key="ticket.id"
          class="flex items-center gap-3 rounded-lg border-2 border-dashed border-purple-300 bg-purple-50 dark:bg-purple-950/30 px-4 py-2"
        >
          <UIcon :name="ticket.reward?.icon || 'i-lucide-ticket'" class="h-5 w-5 text-purple-500" />
          <span class="flex-1 text-sm font-semibold text-highlighted">🎟 {{ ticket.reward?.title }}</span>
          <UButton
            size="xs"
            color="success"
            icon="i-lucide-check"
            :loading="fulfillingId === ticket.id"
            @click="markTicketDone(ticket.id)"
          >
            Done
          </UButton>
        </div>
      </div>
      <p class="text-xs text-muted mb-3">
        Points can be spent for two weekends. Anything left moves into the savings jar on Friday at midnight; jar points buy Big Goals.
      </p>

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
          :class="{ 'opacity-60': !canAfford(reward) }"
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
                :disabled="!canAfford(reward) || isRedeeming || !selectedUserId"
                :color="canAfford(reward) ? 'primary' : 'gray'"
                size="sm"
                :loading="redeemingRewardId === reward.id"
                @click="redeemReward(reward.id)"
              >
                Redeem
              </UButton>
            </div>

            <!-- Not Enough Points Message -->
            <p v-if="!canAfford(reward)" class="text-xs text-red-500 mt-2">
              Need {{ reward.pointCost - spendable(reward) }} more points
            </p>
            <UButton
              v-if="reward.category === BIG_REWARD_CATEGORY && currentUser"
              class="mt-2"
              size="xs"
              :variant="currentUser.savingGoalId === reward.id ? 'solid' : 'outline'"
              color="secondary"
              icon="i-lucide-target"
              :loading="settingGoal"
              @click="toggleGoal(reward.id)"
            >
              {{ currentUser.savingGoalId === reward.id ? "Saving for this" : "Save for this" }}
            </UButton>
          </div>
        </div>
      </div>
    </div>

    <RewardUnwrap
      v-if="unwrapping"
      :title="unwrapping.title"
      :icon="unwrapping.icon"
      :name="unwrapping.name"
      @close="unwrapping = null"
    />
  </div>
</template>
