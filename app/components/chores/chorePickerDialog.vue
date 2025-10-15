<script setup lang="ts">
import type { ChoreTemplate } from "~/types/chores";

const props = defineProps<{
  isOpen: boolean;
  userId?: string;
}>();

const emit = defineEmits<{
  close: [];
  selectChore: [chore: ChoreTemplate];
}>();

const selectedCategory = ref("all");

const { data: choreData } = useFetch("/api/chores/templates"); // FIXED: Removed await

const templates = computed(() => choreData.value?.templates || []);
const categories = computed(() => choreData.value?.categories || []);

const filteredTemplates = computed(() => {
  if (selectedCategory.value === "all") {
    return templates.value;
  }
  return templates.value.filter((t: ChoreTemplate) => t.category === selectedCategory.value);
});

function handleChoreClick(chore: ChoreTemplate) {
  emit("selectChore", chore);
  emit("close");
}
</script>

<template>
  <div
    v-if="isOpen"
    class="fixed inset-0 z-[100] flex items-center justify-center bg-black/50"
    @click="emit('close')"
  >
    <div
      class="w-[90vw] max-w-4xl max-h-[85vh] overflow-hidden bg-default rounded-lg border border-default shadow-lg flex flex-col"
      @click.stop
    >
      <!-- Header -->
      <div class="flex items-center justify-between p-4 border-b border-default bg-gradient-to-r from-blue-500 to-purple-500">
        <div>
          <h3 class="text-xl font-bold text-white flex items-center gap-2">
            <UIcon name="i-lucide-sparkles" class="h-6 w-6" />
            Pick a Chore!
          </h3>
          <p class="text-sm text-white/80 mt-1">
            Choose a chore to add to your list
          </p>
        </div>
        <UButton
          color="white"
          variant="ghost"
          icon="i-lucide-x"
          class="-my-1"
          aria-label="Close dialog"
          @click="emit('close')"
        />
      </div>

      <!-- Category filter -->
      <div class="p-4 border-b border-default bg-muted/30">
        <div class="flex gap-2 overflow-x-auto pb-2">
          <UButton
            v-for="category in categories"
            :key="category.id"
            :color="selectedCategory === category.id ? 'primary' : 'neutral'"
            :variant="selectedCategory === category.id ? 'solid' : 'outline'"
            size="sm"
            @click="selectedCategory = category.id"
          >
            <template #leading>
              <UIcon :name="category.icon" class="h-4 w-4" />
            </template>
            {{ category.name }}
          </UButton>
        </div>
      </div>

      <!-- Chore grid -->
      <div class="flex-1 overflow-y-auto p-4">
        <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          <button
            v-for="chore in filteredTemplates"
            :key="chore.id"
            class="group relative bg-default hover:bg-muted border border-default hover:border-primary rounded-xl p-4 transition-all duration-200 hover:scale-105 hover:shadow-lg text-left"
            @click="handleChoreClick(chore)"
          >
            <!-- Points badge -->
            <div class="absolute top-2 right-2 bg-yellow-500 text-white text-xs font-bold px-2 py-1 rounded-full flex items-center gap-1">
              <UIcon name="i-lucide-star" class="h-3 w-3" />
              +{{ chore.points }}
            </div>

            <!-- Icon -->
            <div
              class="w-16 h-16 mx-auto mb-3 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform"
              :class="`bg-${chore.color}-100 dark:bg-${chore.color}-900/30`"
            >
              <UIcon
                :name="chore.icon"
                class="h-8 w-8"
                :class="`text-${chore.color}-600 dark:text-${chore.color}-400`"
              />
            </div>

            <!-- Title -->
            <h4 class="font-semibold text-sm text-center mb-1 text-highlighted line-clamp-2">
              {{ chore.title }}
            </h4>

            <!-- Description -->
            <p class="text-xs text-muted text-center line-clamp-2">
              {{ chore.description }}
            </p>
          </button>
        </div>

        <div v-if="filteredTemplates.length === 0" class="text-center py-12">
          <UIcon name="i-lucide-inbox" class="h-16 w-16 mx-auto text-muted mb-4" />
          <p class="text-muted">
            No chores found in this category
          </p>
        </div>
      </div>
    </div>
  </div>
</template>


