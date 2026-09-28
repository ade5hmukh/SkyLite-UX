<script setup lang="ts">
const { pendingConfirm, settle } = useConfirmDialog();
</script>

<template>
  <div
    v-if="pendingConfirm"
    class="fixed inset-0 z-[300] flex items-center justify-center bg-black/50"
    role="alertdialog"
    aria-modal="true"
    @click="settle(false)"
  >
    <div
      class="w-[380px] max-w-[90vw] bg-default rounded-lg border border-default shadow-lg"
      @click.stop
    >
      <div class="p-4 border-b border-default">
        <h3 class="text-base font-semibold leading-6">
          {{ pendingConfirm.title }}
        </h3>
      </div>
      <p v-if="pendingConfirm.message" class="p-4 text-sm text-muted">
        {{ pendingConfirm.message }}
      </p>
      <div class="flex justify-end gap-2 p-4">
        <UButton
          color="neutral"
          variant="ghost"
          @click="settle(false)"
        >
          Cancel
        </UButton>
        <UButton
          color="error"
          @click="settle(true)"
        >
          {{ pendingConfirm.confirmLabel || 'Delete' }}
        </UButton>
      </div>
    </div>
  </div>
</template>
