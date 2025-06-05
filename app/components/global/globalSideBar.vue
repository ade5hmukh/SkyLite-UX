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
function isActivePath(path: string) {
  return route.path === path;
};
</script>

<template>
  <div class="sticky top-0 left-0 h-[calc(100vh-80px)] w-[50px] bg-default flex flex-col items-center justify-evenly py-4 z-100">
    <UButton
      :class="isActivePath('/calendar') ? 'text-primary' : 'text-default'"
      to="/calendar"
      variant="ghost"
      icon="i-lucide-calendar-days"
      size="xl"
    />
    <UButton
      :class="isActivePath('/toDoLists') ? 'text-primary' : 'text-default'"
      to="/toDoLists"
      variant="ghost"
      icon="i-lucide-list-todo"
      size="xl"
    />
    <UButton
      :class="isActivePath('/shoppingLists') ? 'text-primary' : 'text-default'"
      to="/shoppingLists"
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
