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
  <div class="drawer lg:drawer-open">
    <input
      id="my-drawer-2"
      type="checkbox"
      class="drawer-toggle"
    >
    <div class="drawer-content flex flex-col items-center justify-center">
      <NuxtPage />
      <label for="my-drawer-2" class="btn btn-primary drawer-button lg:hidden">
        Open drawer
      </label>
    </div>
    <div class="drawer-side">
      <label
        for="my-drawer-2"
        aria-label="close sidebar"
        class="drawer-overlay"
      />
      <div class="menu menu-xl bg-base-200 justify-evenly min-h-full">
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
    </div>
  </div>
</template>
