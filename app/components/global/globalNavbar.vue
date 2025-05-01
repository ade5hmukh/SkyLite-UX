<script setup lang="ts">
const colorMode = useColorMode();
const isDark = computed({
  get() {
    return colorMode.value === "dark";
  },
  set() {
    colorMode.value = colorMode.value === "dark" ? "light" : "dark";
  },
});
</script>

<template>
  <div class="dock dock-lg">
    <UButton
      to="/calendar"
      color="neutral"
      variant="ghost"
      icon="i-lucide-calendar-days"
      size="xl"
    />
    <UButton
      to="/todolists"
      color="neutral"
      variant="ghost"
      icon="i-lucide-list-todo"
      size="xl"
    />
    <UButton
      to="/shoppinglists"
      color="neutral"
      variant="ghost"
      icon="i-lucide-shopping-cart"
      size="xl"
    />
    <UButton
      to="/mealplanner"
      color="neutral"
      variant="ghost"
      icon="i-lucide-utensils"
      size="xl"
    />
    <UButton
      to="/settings"
      color="neutral"
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
