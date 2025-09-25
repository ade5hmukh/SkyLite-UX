<script setup lang="ts">
import { useStableDate } from "~/composables/useStableDate";

const { getStableDate } = useStableDate();

const now = computed(() => getStableDate());
</script>

<template>
  <div class="flex flex-col gap-1.5">
    <h1 class="font-semibold text-xl text-highlighted">
      <NuxtTime
        :datetime="now"
        hour="numeric"
        minute="2-digit"
        :hour12="true"
      />
    </h1>
    <p class="text-sm text-muted">
      <NuxtTime
        :datetime="now"
        weekday="long"
        month="long"
        day="numeric"
      />
    </p>
  </div>
</template>
