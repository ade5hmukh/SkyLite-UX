<script setup lang="ts">
import { ref, computed } from "vue";

definePageMeta({
  layout: "default",
});

// Fetch users with points
const { data: users, refresh: refreshUsers } = await useFetch("/api/users");

// Fetch recent redemptions
const { data: redemptions } = await useFetch("/api/rewards/redemptions", {
  query: { limit: 10 },
});

// Time period selection
const timePeriod = ref<"today" | "week" | "all">("all");

// Sorted users by selected time period
const rankedUsers = computed(() => {
  if (!users.value) return [];
  
  const sorted = [...users.value].sort((a, b) => {
    if (timePeriod.value === "today") {
      return (b.pointsToday || 0) - (a.pointsToday || 0);
    }
    else if (timePeriod.value === "week") {
      return (b.pointsThisWeek || 0) - (a.pointsThisWeek || 0);
    }
    else {
      return (b.points || 0) - (a.points || 0);
    }
  });
  
  return sorted.map((user, index) => ({
    ...user,
    rank: index + 1,
  }));
});

// Get points for current time period
function getPoints(user: any): number {
  if (timePeriod.value === "today") return user.pointsToday || 0;
  if (timePeriod.value === "week") return user.pointsThisWeek || 0;
  return user.points || 0;
}

// Get medal emoji for top 3
function getMedal(rank: number): string {
  if (rank === 1) return "🥇";
  if (rank === 2) return "🥈";
  if (rank === 3) return "🥉";
  return "";
}

// Get rank badge color
function getRankColor(rank: number): string {
  if (rank === 1) return "from-yellow-400 to-yellow-600";
  if (rank === 2) return "from-gray-300 to-gray-500";
  if (rank === 3) return "from-orange-400 to-orange-600";
  return "from-gray-200 to-gray-300";
}

// Total stats
const totalStats = computed(() => {
  if (!users.value) return { total: 0, today: 0, week: 0 };
  
  return {
    total: users.value.reduce((sum, u) => sum + (u.points || 0), 0),
    today: users.value.reduce((sum, u) => sum + (u.pointsToday || 0), 0),
    week: users.value.reduce((sum, u) => sum + (u.pointsThisWeek || 0), 0),
  };
});

// Pending redemptions count
const pendingRedemptionsCount = computed(() => {
  if (!redemptions.value) return 0;
  return redemptions.value.filter(r => r.status === "PENDING").length;
});
</script>

<template>
  <div class="h-full flex flex-col bg-default p-6">
    <!-- Header -->
    <div class="mb-6">
      <div class="flex items-center justify-between mb-4">
        <div>
          <h1 class="text-3xl font-bold text-highlighted flex items-center gap-2">
            <UIcon name="i-lucide-trophy" class="h-8 w-8 text-yellow-500" />
            Leaderboard
          </h1>
          <p class="text-sm text-muted mt-1">
            See who's leading the points race!
          </p>
        </div>
        
        <!-- Time Period Selector -->
        <div class="flex gap-2">
          <UButton
            :color="timePeriod === 'today' ? 'primary' : 'gray'"
            :variant="timePeriod === 'today' ? 'solid' : 'outline'"
            size="sm"
            @click="timePeriod = 'today'"
          >
            Today
          </UButton>
          <UButton
            :color="timePeriod === 'week' ? 'primary' : 'gray'"
            :variant="timePeriod === 'week' ? 'solid' : 'outline'"
            size="sm"
            @click="timePeriod = 'week'"
          >
            This Week
          </UButton>
          <UButton
            :color="timePeriod === 'all' ? 'primary' : 'gray'"
            :variant="timePeriod === 'all' ? 'solid' : 'outline'"
            size="sm"
            @click="timePeriod = 'all'"
          >
            All Time
          </UButton>
        </div>
      </div>

      <!-- Stats Cards -->
      <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div class="bg-gradient-to-br from-blue-500/10 to-blue-600/10 border border-blue-500/20 rounded-lg p-4">
          <div class="flex items-center gap-3">
            <div class="w-12 h-12 rounded-full bg-blue-500/20 flex items-center justify-center">
              <UIcon name="i-lucide-star" class="h-6 w-6 text-blue-500" />
            </div>
            <div>
              <p class="text-xs text-muted">Points Today</p>
              <p class="text-2xl font-bold text-highlighted">{{ totalStats.today }}</p>
            </div>
          </div>
        </div>

        <div class="bg-gradient-to-br from-green-500/10 to-green-600/10 border border-green-500/20 rounded-lg p-4">
          <div class="flex items-center gap-3">
            <div class="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center">
              <UIcon name="i-lucide-trending-up" class="h-6 w-6 text-green-500" />
            </div>
            <div>
              <p class="text-xs text-muted">This Week</p>
              <p class="text-2xl font-bold text-highlighted">{{ totalStats.week }}</p>
            </div>
          </div>
        </div>

        <div class="bg-gradient-to-br from-purple-500/10 to-purple-600/10 border border-purple-500/20 rounded-lg p-4">
          <div class="flex items-center gap-3">
            <div class="w-12 h-12 rounded-full bg-purple-500/20 flex items-center justify-center">
              <UIcon name="i-lucide-sparkles" class="h-6 w-6 text-purple-500" />
            </div>
            <div>
              <p class="text-xs text-muted">Total Points</p>
              <p class="text-2xl font-bold text-highlighted">{{ totalStats.total }}</p>
            </div>
          </div>
        </div>

        <div class="bg-gradient-to-br from-orange-500/10 to-orange-600/10 border border-orange-500/20 rounded-lg p-4">
          <div class="flex items-center gap-3">
            <div class="w-12 h-12 rounded-full bg-orange-500/20 flex items-center justify-center">
              <UIcon name="i-lucide-gift" class="h-6 w-6 text-orange-500" />
            </div>
            <div>
              <p class="text-xs text-muted">Pending Rewards</p>
              <p class="text-2xl font-bold text-highlighted">{{ pendingRedemptionsCount }}</p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Rankings -->
    <div class="flex-1 overflow-y-auto">
      <div class="space-y-3">
        <div
          v-for="user in rankedUsers"
          :key="user.id"
          class="relative overflow-hidden rounded-xl border border-default transition-all hover:shadow-lg"
          :class="{ 'ring-2 ring-primary': user.rank <= 3 }"
        >
          <!-- Gradient Background for top 3 -->
          <div
            v-if="user.rank <= 3"
            class="absolute inset-0 bg-gradient-to-r opacity-10"
            :class="getRankColor(user.rank)"
          />
          
          <div class="relative flex items-center gap-4 p-4">
            <!-- Rank -->
            <div class="flex-shrink-0 w-16 text-center">
              <div v-if="user.rank <= 3" class="text-4xl">
                {{ getMedal(user.rank) }}
              </div>
              <div v-else class="text-2xl font-bold text-muted">
                #{{ user.rank }}
              </div>
            </div>

            <!-- Avatar -->
            <div class="flex-shrink-0">
              <img
                v-if="user.avatar"
                :src="user.avatar"
                :alt="user.name"
                class="w-16 h-16 rounded-full border-4"
                :style="{ borderColor: user.color || '#06b6d4' }"
              >
              <div
                v-else
                class="w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold text-white"
                :style="{ backgroundColor: user.color || '#06b6d4' }"
              >
                {{ user.name.charAt(0).toUpperCase() }}
              </div>
            </div>

            <!-- User Info -->
            <div class="flex-1">
              <h3 class="text-xl font-bold text-highlighted mb-1">
                {{ user.name }}
              </h3>
              <div class="flex items-center gap-4 text-sm text-muted">
                <span class="flex items-center gap-1">
                  <UIcon name="i-lucide-star" class="h-4 w-4 text-yellow-500" />
                  <span class="font-semibold">{{ getPoints(user) }}</span>
                  <span v-if="timePeriod === 'today'">today</span>
                  <span v-else-if="timePeriod === 'week'">this week</span>
                  <span v-else>total</span>
                </span>
                
                <span v-if="timePeriod === 'all'" class="flex items-center gap-1">
                  <UIcon name="i-lucide-calendar-days" class="h-4 w-4" />
                  {{ user.pointsThisWeek || 0 }} this week
                </span>
              </div>
            </div>

            <!-- Points Badge -->
            <div class="flex-shrink-0">
              <div 
                class="px-6 py-3 rounded-full text-center"
                :class="user.rank === 1 ? 'bg-gradient-to-r from-yellow-400 to-yellow-600 text-white' : 
                        user.rank === 2 ? 'bg-gradient-to-r from-gray-300 to-gray-500 text-white dark:from-gray-600 dark:to-gray-700' :
                        user.rank === 3 ? 'bg-gradient-to-r from-orange-400 to-orange-600 text-white' :
                        'bg-muted'"
              >
                <div class="text-sm font-medium opacity-80">Points</div>
                <div class="text-2xl font-bold">{{ getPoints(user) }}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Empty State -->
      <div v-if="rankedUsers.length === 0" class="text-center py-20">
        <UIcon name="i-lucide-users" class="h-20 w-20 text-muted mx-auto mb-4" />
        <p class="text-lg text-muted">
          No users yet. Add some family members to get started!
        </p>
      </div>
    </div>
  </div>
</template>
