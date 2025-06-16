<script setup lang="ts">
const props = defineProps<{
  isOpen: boolean;
  message: string;
  type?: "error" | "warning" | "success" | "info";
  duration?: number;
}>();

const emit = defineEmits<{
  (e: "close"): void;
}>();

const typeConfig = {
  error: {
    icon: "i-lucide-x-circle",
    color: "red",
    bg: "bg-red-50 dark:bg-red-950",
    text: "text-red-600 dark:text-red-400",
    border: "border-red-200 dark:border-red-800",
  },
  warning: {
    icon: "i-lucide-alert-triangle",
    color: "yellow",
    bg: "bg-yellow-50 dark:bg-yellow-950",
    text: "text-yellow-600 dark:text-yellow-400",
    border: "border-yellow-200 dark:border-yellow-800",
  },
  success: {
    icon: "i-lucide-check-circle",
    color: "green",
    bg: "bg-green-50 dark:bg-green-950",
    text: "text-green-600 dark:text-green-400",
    border: "border-green-200 dark:border-green-800",
  },
  info: {
    icon: "i-lucide-info",
    color: "blue",
    bg: "bg-blue-50 dark:bg-blue-950",
    text: "text-blue-600 dark:text-blue-400",
    border: "border-blue-200 dark:border-blue-800",
  },
};

const config = typeConfig[props.type || "error"];

// Auto-close after duration
watch(() => props.isOpen, (isOpen) => {
  if (isOpen && props.duration !== 0) {
    setTimeout(() => {
      emit("close");
    }, props.duration || 5000);
  }
});
</script>

<template>
  <Transition
    enter-active-class="transform ease-out duration-300 transition"
    enter-from-class="translate-y-2 opacity-0 sm:translate-y-0 sm:translate-x-2"
    enter-to-class="translate-y-0 opacity-100 sm:translate-x-0"
    leave-active-class="transition ease-in duration-100"
    leave-from-class="opacity-100"
    leave-to-class="opacity-0"
  >
    <div
      v-if="isOpen"
      class="fixed bottom-4 right-4 z-[100] flex w-full max-w-sm overflow-hidden rounded-lg shadow-lg"
      :class="[config.bg, config.border]"
    >
      <div class="flex w-full flex-col items-center space-y-4 p-4 sm:flex-row sm:space-y-0">
        <div class="flex items-center gap-3">
          <UIcon
            :name="config.icon"
            class="h-5 w-5"
            :class="config.text"
          />
          <p class="text-sm font-medium" :class="config.text">
            {{ message }}
          </p>
        </div>
        <div class="ml-auto flex items-center">
          <UButton
            color="neutral"
            variant="ghost"
            icon="i-lucide-x"
            class="-my-1"
            @click="emit('close')"
          />
        </div>
      </div>
    </div>
  </Transition>
</template>
