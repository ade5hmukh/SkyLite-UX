<script setup lang="ts">
import type { User } from "~/types/database";

// Fetch all users with points
const { data: users } = useFetch<User[]>("/api/users"); // No await - prevents module initialization errors

const sortedUsers = computed(() => {
  if (!users.value) return [];
  
  // Sort by pointsToday descending
  return [...users.value]
    .sort((a, b) => (b.pointsToday || 0) - (a.pointsToday || 0));
});

const totalPointsToday = computed(() => 
  users.value?.reduce((sum, user) => sum + (user.pointsToday || 0), 0) || 0
);

const totalPointsThisWeek = computed(() => 
  users.value?.reduce((sum, user) => sum + (user.pointsThisWeek || 0), 0) || 0
);
</script>

<template>
  <div class="bg-default border border-default rounded-lg p-4 space-y-4">
    <div class="flex items-center justify-between">
      <h3 class="text-lg font-semibold text-highlighted flex items-center gap-2">
        <UIcon name="i-lucide-trophy" class="h-5 w-5 text-yellow-500" />
        Points Leaderboard
      </h3>
      <div class="flex gap-2 text-xs">
        <div class="flex items-center gap-1 px-2 py-1 bg-yellow-500/10 rounded-md">
          <UIcon name="i-lucide-calendar-days" class="h-3 w-3 text-yellow-600 dark:text-yellow-400" />
          <span class="font-medium text-muted">Today:</span>
          <span class="font-bold text-highlighted">{{ totalPointsToday }}</span>
        </div>
        <div class="flex items-center gap-1 px-2 py-1 bg-blue-500/10 rounded-md">
          <UIcon name="i-lucide-calendar-range" class="h-3 w-3 text-blue-600 dark:text-blue-400" />
          <span class="font-medium text-muted">Week:</span>
          <span class="font-bold text-highlighted">{{ totalPointsThisWeek }}</span>
        </div>
      </div>
    </div>

    <div class="space-y-2">
      <div
        v-for="(user, index) in sortedUsers.slice(0, 5)"
        :key="user.id"
        class="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/30 transition-colors"
      >
        <div class="flex items-center gap-2 flex-1 min-w-0">
          <span class="text-sm font-bold text-muted w-4">{{ index + 1 }}</span>
          <img
            v-if="user.avatar"
            :src="user.avatar"
            :alt="user.name"
            class="w-8 h-8 rounded-full object-cover"
          >
          <div
            v-else
            class="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm"
            :style="{ backgroundColor: user.color || '#6366f1' }"
          >
            {{ user.name.charAt(0).toUpperCase() }}
          </div>
          <span class="text-sm font-medium text-highlighted truncate">{{ user.name }}</span>
        </div>

        <div class="flex items-center gap-3 text-xs">
          <div class="flex items-center gap-1 px-2 py-1 bg-yellow-500/20 text-yellow-600 dark:text-yellow-400 rounded-full font-bold">
            <UIcon name="i-lucide-star" class="h-3 w-3" />
            <span>{{ user.pointsToday }}</span>
            <span class="opacity-70">today</span>
          </div>
          <div class="flex items-center gap-1 px-2 py-1 bg-blue-500/20 text-blue-600 dark:text-blue-400 rounded-full font-bold">
            <UIcon name="i-lucide-trending-up" class="h-3 w-3" />
            <span>{{ user.pointsThisWeek }}</span>
            <span class="opacity-70">week</span>
          </div>
          <div class="flex items-center gap-1 px-2 py-1 bg-gray-500/20 text-gray-600 dark:text-gray-400 rounded-full font-bold">
            <UIcon name="i-lucide-trophy" class="h-3 w-3" />
            <span>{{ user.points }}</span>
            <span class="opacity-70">total</span>
          </div>
        </div>
      </div>

      <div v-if="sortedUsers.length === 0" class="text-center py-4 text-sm text-muted">
        No points earned yet. Start completing chores to earn points!
      </div>
    </div>
  </div>
</template>

