<script setup lang="ts">
const props = defineProps<{
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: "danger" | "warning" | "info";
}>();

const emit = defineEmits<{
  (e: "close"): void;
  (e: "confirm"): void;
}>();

type ButtonColor = "primary" | "secondary" | "success" | "info" | "warning" | "error" | "neutral";

const variantColors: Record<"danger" | "warning" | "info", { button: ButtonColor; icon: string }> = {
  danger: {
    button: "error",
    icon: "i-lucide-alert-triangle",
  },
  warning: {
    button: "warning",
    icon: "i-lucide-alert-circle",
  },
  info: {
    button: "primary",
    icon: "i-lucide-info",
  },
};

const colors = variantColors[props.variant || "danger"];
</script>

<template>
  <div
    v-if="isOpen"
    class="fixed inset-0 z-[100] flex items-center justify-center bg-black/50"
    @click="emit('close')"
  >
    <div
      class="w-[425px] max-h-[90vh] overflow-y-auto bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 shadow-lg"
      @click.stop
    >
      <div class="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
        <div class="flex items-center gap-3">
          <UIcon
            :name="colors.icon"
            class="h-5 w-5"
            :class="{
              'text-red-500': variant === 'danger',
              'text-yellow-500': variant === 'warning',
              'text-blue-500': variant === 'info',
            }"
          />
          <h3 class="text-base font-semibold leading-6">
            {{ title }}
          </h3>
        </div>
        <UButton
          color="neutral"
          variant="ghost"
          icon="i-lucide-x"
          class="-my-1"
          @click="emit('close')"
        />
      </div>

      <div class="p-4">
        <p class="text-sm text-gray-600 dark:text-gray-400">
          {{ message }}
        </p>
      </div>

      <div class="flex justify-end gap-2 p-4 border-t border-gray-200 dark:border-gray-700">
        <UButton
          color="neutral"
          variant="ghost"
          @click="emit('close')"
        >
          {{ cancelText || 'Cancel' }}
        </UButton>
        <UButton
          :color="colors.button"
          @click="emit('confirm')"
        >
          {{ confirmText || 'Confirm' }}
        </UButton>
      </div>
    </div>
  </div>
</template>
