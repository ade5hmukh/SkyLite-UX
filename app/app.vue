<script setup lang="ts">
const dock = false;
</script>

<template>
  <UApp>
    <div class="flex min-h-screen" v-if="!dock">
      <GlobalSideBar/>
      <div class="flex flex-col flex-1">
        <div class="flex-1">
          <NuxtPage />
        </div>
      </div>
    </div>
    <div class="flex min-h-screen" v-else>
      <div class="flex flex-col flex-1">
        <div class="flex-1">
          <NuxtPage />
        </div>
        <GlobalDock/>
      </div>
    </div>
  </UApp>
</template>
