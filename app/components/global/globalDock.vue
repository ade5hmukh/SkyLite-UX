<script setup lang="ts">
const route = useRoute();
const colorMode = useColorMode();
const isDark = computed({
  get() {
    return colorMode.value === "dark";
  },
  set() {
    colorMode.value = colorMode.value === "dark" ? "light" : "dark";
  },
});
function isActivePath(path) {
  return route.path === path;
};
</script>

<template>
  <NuxtPage />
  <div class="dock dock-xl bg-base-200">
    <UButton
      :class="isActivePath('/calendar') ? 'text-primary' : 'text-default'"
      to="/calendar"
      variant="ghost"
      icon="i-lucide-calendar-days"
      size="xl"
    />
    <UButton
      :class="isActivePath('/todolists') ? 'text-primary' : 'text-default'"
      to="/todolists"
      variant="ghost"
      icon="i-lucide-list-todo"
      size="xl"
    />
    <UButton
      :class="isActivePath('/shoppinglists') ? 'text-primary' : 'text-default'"
      to="/shoppinglists"
      variant="ghost"
      icon="i-lucide-shopping-cart"
      size="xl"
    />
    <UButton
      :class="isActivePath('/mealplanner') ? 'text-primary' : 'text-default'"
      to="/mealplanner"
      variant="ghost"
      icon="i-lucide-utensils"
      size="xl"
    />
    <UButton
      :class="isActivePath('/settings') ? 'text-primary' : 'text-default'"
      to="/settings"
      variant="ghost"
      icon="i-lucide-settings"
      size="xl"
    />
    <div class="flex items-center justify-center gap-2">
      <USwitch
        v-model="isDark"
        color="primary"
        checked-icon="i-lucide-moon"
        unchecked-icon="i-lucide-sun"
        size="xl"
      />
    </div>
  </div>
</template>
