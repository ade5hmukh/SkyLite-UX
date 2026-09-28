<script setup lang="ts">
import { MAIN_VIEW_OPTIONS } from "~/types/ui";

// TODO: Authenticate user or route to login page
const { preferences } = useClientPreferences();

onMounted(() => {
  const saved = preferences.value.defaultView;
  const target = MAIN_VIEW_OPTIONS.some(option => option.path === saved) ? saved! : "/calendar";
  navigateTo(target, { replace: true });
});
</script>

<template>
  <div>
    <p>Loading...</p>
  </div>
</template>
