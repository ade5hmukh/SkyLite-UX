<script setup lang="ts">
const dock = false;
</script>

<template>
  <UApp>
    <div v-if="!dock" class="flex min-h-screen">
      <GlobalSideBar />
      <div class="flex flex-col flex-1">
        <div class="flex-1">
          <NuxtPage />
        </div>
      </div>
    </div>
    <div v-else class="flex min-h-screen">
      <div class="flex flex-col flex-1">
        <div class="flex-1">
          <NuxtPage />
        </div>
        <GlobalDock />
      </div>
    </div>
  </UApp>
</template>
