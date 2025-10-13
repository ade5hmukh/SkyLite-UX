<script setup lang="ts">
const props = defineProps<{
  points: number;
  choreName: string;
}>();

const emit = defineEmits<{
  complete: [];
}>();

const isVisible = ref(true);

onMounted(() => {
  // Auto-close after animation
  setTimeout(() => {
    isVisible.value = false;
    emit("complete");
  }, 3000);
});
</script>

<template>
  <Transition
    enter-active-class="transition-all duration-500 ease-out"
    leave-active-class="transition-all duration-300 ease-in"
    enter-from-class="opacity-0 scale-50"
    enter-to-class="opacity-100 scale-100"
    leave-from-class="opacity-100 scale-100"
    leave-to-class="opacity-0 scale-50"
  >
    <div
      v-if="isVisible"
      class="fixed inset-0 z-[9999] flex items-center justify-center pointer-events-none"
    >
      <!-- Confetti-style celebration -->
      <div class="relative">
        <!-- Main celebration card -->
        <div class="bg-gradient-to-br from-yellow-400 via-orange-400 to-pink-500 rounded-3xl shadow-2xl p-12 animate-bounce-once">
          <div class="text-center space-y-4">
            <!-- Star icon with glow -->
            <div class="relative inline-block">
              <div class="absolute inset-0 bg-yellow-300 rounded-full blur-2xl opacity-50 animate-pulse" />
              <UIcon name="i-lucide-star" class="relative h-24 w-24 text-white drop-shadow-lg animate-spin-slow" />
            </div>

            <!-- Great Job text -->
            <h2 class="text-5xl font-black text-white drop-shadow-lg animate-wiggle">
              🎉 Great Job! 🎉
            </h2>

            <!-- Chore completed message -->
            <p class="text-2xl font-bold text-white drop-shadow-md">
              {{ choreName }}
            </p>

            <!-- Points earned -->
            <div class="bg-white/30 backdrop-blur-sm rounded-2xl p-4 inline-block">
              <div class="flex items-center gap-3">
                <UIcon name="i-lucide-trophy" class="h-12 w-12 text-yellow-200" />
                <div class="text-left">
                  <p class="text-sm text-white/80 font-medium">
                    You earned
                  </p>
                  <p class="text-4xl font-black text-white drop-shadow-md">
                    +{{ points }} {{ points === 1 ? 'point' : 'points' }}!
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Floating emojis -->
        <div class="absolute -top-10 -left-10 text-6xl animate-float-1">
          ⭐
        </div>
        <div class="absolute -top-5 -right-10 text-6xl animate-float-2">
          🌟
        </div>
        <div class="absolute -bottom-10 -left-5 text-6xl animate-float-3">
          ✨
        </div>
        <div class="absolute -bottom-5 -right-5 text-6xl animate-float-4">
          💫
        </div>
        <div class="absolute top-5 right-16 text-5xl animate-float-5">
          🎈
        </div>
        <div class="absolute top-5 left-16 text-5xl animate-float-6">
          🎊
        </div>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
@keyframes bounce-once {
  0%, 100% {
    transform: translateY(0) scale(1);
  }
  25% {
    transform: translateY(-30px) scale(1.05);
  }
  50% {
    transform: translateY(-15px) scale(1.02);
  }
  75% {
    transform: translateY(-5px) scale(1.01);
  }
}

@keyframes wiggle {
  0%, 100% {
    transform: rotate(0deg);
  }
  25% {
    transform: rotate(-5deg) scale(1.05);
  }
  75% {
    transform: rotate(5deg) scale(1.05);
  }
}

@keyframes spin-slow {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

@keyframes float-1 {
  0%, 100% {
    transform: translateY(0) translateX(0) rotate(0deg);
    opacity: 0;
  }
  10% {
    opacity: 1;
  }
  50% {
    transform: translateY(-100px) translateX(-20px) rotate(180deg);
    opacity: 1;
  }
  90% {
    opacity: 0;
  }
}

@keyframes float-2 {
  0%, 100% {
    transform: translateY(0) translateX(0) rotate(0deg);
    opacity: 0;
  }
  15% {
    opacity: 1;
  }
  50% {
    transform: translateY(-120px) translateX(30px) rotate(-180deg);
    opacity: 1;
  }
  90% {
    opacity: 0;
  }
}

@keyframes float-3 {
  0%, 100% {
    transform: translateY(0) translateX(0) rotate(0deg);
    opacity: 0;
  }
  20% {
    opacity: 1;
  }
  50% {
    transform: translateY(100px) translateX(-30px) rotate(180deg);
    opacity: 1;
  }
  90% {
    opacity: 0;
  }
}

@keyframes float-4 {
  0%, 100% {
    transform: translateY(0) translateX(0) rotate(0deg);
    opacity: 0;
  }
  25% {
    opacity: 1;
  }
  50% {
    transform: translateY(110px) translateX(20px) rotate(-180deg);
    opacity: 1;
  }
  90% {
    opacity: 0;
  }
}

@keyframes float-5 {
  0%, 100% {
    transform: translateY(0) scale(1);
    opacity: 0;
  }
  20% {
    opacity: 1;
  }
  50% {
    transform: translateY(-80px) scale(1.5);
    opacity: 1;
  }
  90% {
    opacity: 0;
  }
}

@keyframes float-6 {
  0%, 100% {
    transform: translateY(0) scale(1);
    opacity: 0;
  }
  30% {
    opacity: 1;
  }
  50% {
    transform: translateY(-90px) scale(1.3);
    opacity: 1;
  }
  90% {
    opacity: 0;
  }
}

.animate-bounce-once {
  animation: bounce-once 0.8s ease-out;
}

.animate-wiggle {
  animation: wiggle 0.5s ease-in-out 0.3s;
}

.animate-spin-slow {
  animation: spin-slow 2s linear infinite;
}

.animate-float-1 {
  animation: float-1 2.5s ease-out;
}

.animate-float-2 {
  animation: float-2 2.7s ease-out 0.1s;
}

.animate-float-3 {
  animation: float-3 2.6s ease-out 0.2s;
}

.animate-float-4 {
  animation: float-4 2.8s ease-out 0.15s;
}

.animate-float-5 {
  animation: float-5 2.5s ease-out 0.3s;
}

.animate-float-6 {
  animation: float-6 2.6s ease-out 0.25s;
}
</style>


