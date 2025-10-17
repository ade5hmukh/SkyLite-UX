<script setup lang="ts">
import { ref, watch } from "vue";

const props = defineProps<{
  isOpen: boolean;
}>();

const emit = defineEmits<{
  (e: "close"): void;
  (e: "verified"): void;
}>();

const pin = ref("");
const error = ref("");

const numpadButtons = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0"];

watch(() => props.isOpen, (isOpen) => {
  if (isOpen) {
    pin.value = "";
    error.value = "";
  }
});

function addDigit(digit: string) {
  if (pin.value.length < 4) {
    pin.value += digit;
    if (pin.value.length === 4) {
      verifyPin();
    }
  }
}

function backspace() {
  pin.value = pin.value.slice(0, -1);
  error.value = "";
}

function verifyPin() {
  const { verifyPin: verify, activateAdminMode } = useAdminMode();
  
  if (verify(pin.value)) {
    activateAdminMode();
    emit("verified");
    emit("close");
  }
  else {
    error.value = "Incorrect PIN";
    pin.value = "";
  }
}
</script>

<template>
  <div
    v-if="isOpen"
    class="fixed inset-0 z-[200] flex items-center justify-center bg-black/50"
    @click="emit('close')"
  >
    <div
      class="w-[90vw] max-w-md bg-default rounded-lg border border-default shadow-lg p-6"
      @click.stop
    >
      <div class="flex items-center justify-between mb-6">
        <h3 class="text-lg font-semibold text-highlighted">
          Enter Parental PIN
        </h3>
        <UButton
          color="neutral"
          variant="ghost"
          icon="i-lucide-x"
          @click="emit('close')"
        />
      </div>

      <!-- PIN Display -->
      <div class="flex justify-center gap-3 mb-6">
        <div
          v-for="i in 4"
          :key="i"
          class="w-12 h-12 rounded-lg border-2 border-default flex items-center justify-center text-2xl font-bold"
          :class="pin.length >= i ? 'bg-primary border-primary text-white' : 'bg-muted'"
        >
          {{ pin.length >= i ? '●' : '' }}
        </div>
      </div>

      <!-- Error Message -->
      <div v-if="error" class="text-center text-error text-sm mb-4">
        {{ error }}
      </div>

      <!-- Numpad -->
      <div class="grid grid-cols-3 gap-3 mb-4">
        <button
          v-for="digit in numpadButtons"
          :key="digit"
          class="h-14 rounded-lg bg-muted hover:bg-muted/80 text-xl font-semibold text-highlighted transition-colors"
          @click="addDigit(digit)"
        >
          {{ digit }}
        </button>
      </div>

      <!-- Backspace Button -->
      <button
        class="w-full h-12 rounded-lg bg-muted hover:bg-muted/80 flex items-center justify-center gap-2 text-highlighted transition-colors"
        @click="backspace"
      >
        <UIcon name="i-lucide-delete" class="h-5 w-5" />
        Clear
      </button>
    </div>
  </div>
</template>

