<script setup lang="ts">
defineProps<{
  isLoading: boolean;
  loadingMessage: string;
}>();
</script>

<template>
  <Transition name="fade">
    <div v-if="isLoading" class="appLoadingOverlay">
      <div class="loadingContent">
        <div class="loadingLogo">
          <UIcon name="i-lucide-loader-2" class="animate-spin h-16 w-16 text-primary" />
        </div>
        <div class="loadingTitle">
          SkyLite UX
        </div>
        <p class="loadingText">
          {{ loadingMessage }}
        </p>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.appLoadingOverlay {
  position: fixed;
  inset: 0;
  background: white;
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
}

.dark .appLoadingOverlay {
  background: #111827;
}

.loadingContent {
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
}

.loadingLogo {
  display: flex;
  align-items: center;
  justify-content: center;
}

.loadingTitle {
  font-size: 2rem;
  font-weight: 700;
  color: #06b6d4;
  margin: 0;
}

.dark .loadingTitle {
  color: #22d3ee;
}

.loadingText {
  font-size: 1.125rem;
  color: #6b7280;
  margin: 0;
}

.dark .loadingText {
  color: #9ca3af;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
