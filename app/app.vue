<script setup lang="ts">
const dock = false;
const { isLoading, loadingMessage, setLoading } = useGlobalLoading();

setLoading(true);

onNuxtReady(() => {
  setLoading(false);
});
</script>

<template>
  <UApp>
    <GlobalAppLoading :is-loading="isLoading" :loading-message="loadingMessage" />

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

<style>
/* Hide scrollbars globally */
* {
  scrollbar-width: none;
  -ms-overflow-style: none;
}

*::-webkit-scrollbar {
  display: none;
}
</style>
