<script setup lang="ts">
import type { CreateUserInput, User } from "~/types/database";

const props = defineProps<{
  user: User | null;
  isOpen: boolean;
}>();

const emit = defineEmits<{
  (e: "close"): void;
  (e: "save", user: CreateUserInput): void;
  (e: "delete", userId: string): void;
}>();

// Form state
const name = ref("");
const email = ref("");
const error = ref<string | null>(null);

// Watch for user changes
watch(() => props.user, (newUser) => {
  if (newUser) {
    name.value = newUser.name || "";
    email.value = newUser.email || "";
    error.value = null;
  }
  else {
    resetForm();
  }
}, { immediate: true });

function resetForm() {
  name.value = "";
  email.value = "";
  error.value = null;
}

function handleSave() {
  if (!name.value.trim()) {
    error.value = "Name is required";
    return;
  }

  emit("save", {
    name: name.value.trim(),
    email: email.value?.trim() || "",
    avatar: null,
    todoOrder: 0,
  });
}

function handleDelete() {
  if (props.user?.id) {
    emit("delete", props.user.id);
  }
}
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
        <h3 class="text-base font-semibold leading-6">
          {{ user?.id ? 'Edit User' : 'Create User' }}
        </h3>
        <UButton
          color="neutral"
          variant="ghost"
          icon="i-lucide-x"
          class="-my-1"
          @click="emit('close')"
        />
      </div>

      <div class="p-4 space-y-6">
        <div v-if="error" class="bg-red-50 dark:bg-red-950 text-red-600 dark:text-red-400 rounded-md px-3 py-2 text-sm">
          {{ error }}
        </div>

        <div class="space-y-2">
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-200">Name *</label>
          <UInput
            v-model="name"
            placeholder="Enter user name"
            class="w-full"
            :ui="{ base: 'w-full' }"
          />
        </div>

        <div class="space-y-2">
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-200">Email (optional)</label>
          <UInput
            v-model="email"
            placeholder="Enter email address"
            type="email"
            class="w-full"
            :ui="{ base: 'w-full' }"
          />
        </div>
      </div>

      <div class="flex justify-between p-4 border-t border-gray-200 dark:border-gray-700">
        <UButton
          v-if="user?.id"
          color="error"
          variant="ghost"
          icon="i-lucide-trash"
          @click="handleDelete"
        >
          Delete
        </UButton>
        <div class="flex gap-2">
          <UButton
            color="neutral"
            variant="ghost"
            @click="emit('close')"
          >
            Cancel
          </UButton>
          <UButton
            color="primary"
            :disabled="!name.trim()"
            @click="handleSave"
          >
            Save
          </UButton>
        </div>
      </div>
    </div>
  </div>
</template> 