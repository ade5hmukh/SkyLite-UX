<script setup lang="ts">
import { format } from "date-fns";

const title = ref("");
const subtitle = ref("");

// Use onMounted to ensure client-side only rendering for time display
onMounted(() => {
  const updateTime = () => {
    const now = new Date();
    title.value = format(now, "h:mm a");
    subtitle.value = format(now, "EEEE, MMMM d, yyyy");
  };

  // Update immediately
  updateTime();

  // Update every minute
  const interval = setInterval(updateTime, 60000);

  // Cleanup on unmount
  onUnmounted(() => {
    clearInterval(interval);
  });
});
</script>

<template>
  <div class="flex flex-col gap-1.5">
    <h1 class="font-semibold text-xl text-gray-900 dark:text-white">
      {{ title || "Loading..." }}
    </h1>
    <p class="text-sm text-gray-600 dark:text-gray-400">
      {{ subtitle || "Loading..." }}
    </p>
  </div>
</template>
