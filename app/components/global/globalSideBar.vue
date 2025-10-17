<script setup lang="ts">
import { ref } from "vue";
import AdminPinModal from "~/components/admin/adminPinModal.vue";

const route = useRoute();
const { isActive: isAdminMode, deactivateAdminMode } = useAdminMode();
const showPinModal = ref(false);

function isActivePath(path: string) {
  return route.path === path;
}

// Triple-tap detection
let tapCount = 0;
let tapTimer: NodeJS.Timeout | null = null;

function handleLogoClick() {
  tapCount++;
  
  if (tapCount === 1) {
    tapTimer = setTimeout(() => {
      tapCount = 0;
    }, 500);
  }
  else if (tapCount === 3) {
    if (tapTimer) {
      clearTimeout(tapTimer);
    }
    tapCount = 0;
    
    if (isAdminMode.value) {
      deactivateAdminMode();
    }
    else {
      showPinModal.value = true;
    }
  }
}
</script>

<template>
  <div class="sticky top-0 left-0 h-[calc(100vh-80px)] w-[50px] bg-default flex flex-col items-center py-4 z-100">
    <!-- Logo with triple-tap -->
    <button
      class="mb-4 p-2 rounded-lg hover:bg-muted transition-colors relative"
      @click="handleLogoClick"
      aria-label="App Logo"
    >
      <UIcon name="i-lucide-sun" class="h-6 w-6 text-primary" />
      <!-- Admin Mode Indicator -->
      <div v-if="isAdminMode" class="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-default" />
    </button>

    <!-- Navigation buttons -->
    <div class="flex flex-col items-center justify-evenly flex-1">
    <UButton
      :class="isActivePath('/calendar') ? 'text-primary' : 'text-default'"
      to="/calendar"
      variant="ghost"
      icon="i-lucide-calendar-days"
      size="xl"
      aria-label="Calendar"
    />
    <UButton
      :class="isActivePath('/toDoLists') ? 'text-primary' : 'text-default'"
      to="/toDoLists"
      variant="ghost"
      icon="i-lucide-list-todo"
      size="xl"
      aria-label="Todo Lists"
    />
    <UButton
      :class="isActivePath('/rewards') ? 'text-primary' : 'text-default'"
      to="/rewards"
      variant="ghost"
      icon="i-lucide-gift"
      size="xl"
      aria-label="Rewards"
    />
    <UButton
      :class="isActivePath('/leaderboard') ? 'text-primary' : 'text-default'"
      to="/leaderboard"
      variant="ghost"
      icon="i-lucide-trophy"
      size="xl"
      aria-label="Leaderboard"
    />
    <UButton
      :class="isActivePath('/mealplanner') ? 'text-primary' : 'text-default'"
      to="/mealplanner"
      variant="ghost"
      icon="i-lucide-utensils"
      size="xl"
      aria-label="Meal Planner"
    />
    <div class="relative">
      <UButton
        :class="isActivePath('/settings') ? 'text-primary' : 'text-default'"
        to="/settings"
        variant="ghost"
        icon="i-lucide-settings"
        size="xl"
        aria-label="Settings"
      />
      <!-- Lock indicator when admin mode is off -->
      <div v-if="!isAdminMode" class="absolute -bottom-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-default flex items-center justify-center">
        <UIcon name="i-lucide-lock" class="h-2 w-2 text-white" />
      </div>
    </div>
    </div>

    <!-- PIN Modal -->
    <AdminPinModal
      :is-open="showPinModal"
      @close="showPinModal = false"
      @verified="showPinModal = false"
    />
  </div>
</template>
