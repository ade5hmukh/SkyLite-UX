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
          <img
            src="/skylite.svg"
            alt="SkyLite Logo"
            class="skyliteLogo animate-pulse"
          >
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

.skyliteLogo {
  width: 16rem;
  height: 16rem;
  filter: drop-shadow(0 4px 6px rgba(0, 0, 0, 0.1));
}

.dark .skyliteLogo {
  filter: drop-shadow(0 4px 6px rgba(0, 0, 0, 0.3));
}

.loadingText {
  font-size: 1.125rem;
  color: #6b7280;
  margin: -4rem 0 0 -2rem;
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

/* Custom pulse animation for the logo */
@keyframes logoPulse {
  0%,
  100% {
    transform: scale(1);
    opacity: 1;
  }
  50% {
    transform: scale(1.05);
    opacity: 0.8;
  }
}

.animate-pulse {
  animation: logoPulse 2s ease-in-out infinite;
}
</style>
