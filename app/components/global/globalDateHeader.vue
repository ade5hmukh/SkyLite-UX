<script setup lang="ts">
import { format } from "date-fns";

const title = computed(() => {
    return format(new Date(), "h:mm a");
});

const subtitle = computed(() => {
    return format(new Date(), "EEEE, MMMM d, yyyy");
});
</script>

<template>
    <div class="flex flex-col gap-1.5">
        <h1 class="font-semibold text-xl text-gray-900 dark:text-white">
            {{ title }}
        </h1>
        <p class="text-sm text-gray-600 dark:text-gray-400">
            {{ subtitle }}
        </p>
    </div>
</template>