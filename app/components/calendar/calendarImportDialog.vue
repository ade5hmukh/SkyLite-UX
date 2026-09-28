<script setup lang="ts">
import { useEventListener } from "@vueuse/core";
import { consola } from "consola";

import type { CalendarEvent } from "~/types/calendar";

type Suggestion = {
  title: string;
  date: string;
  endDate: string | null;
  startTime: string | null;
  endTime: string | null;
  allDay: boolean;
  location: string | null;
  notes: string | null;
  userIds: string[];
};

type DraftSuggestion = Suggestion & { selected: boolean };

const props = defineProps<{
  isOpen: boolean;
}>();

const emit = defineEmits<{
  (e: "close"): void;
  (e: "add", events: CalendarEvent[]): void;
}>();

const MAX_FILE_BYTES = 12 * 1024 * 1024;

const { users, fetchUsers } = useUsers();
const { pendingConfirm } = useConfirmDialog();

const text = ref("");
const file = ref<File | null>(null);
const fileInput = ref<HTMLInputElement | null>(null);
const loading = ref(false);
const error = ref("");
const suggestions = ref<DraftSuggestion[] | null>(null);

watch(() => props.isOpen, async (open) => {
  if (!open)
    return;
  text.value = "";
  file.value = null;
  error.value = "";
  suggestions.value = null;
  await fetchUsers();
});

const selectedCount = computed(() => suggestions.value?.filter(s => s.selected).length ?? 0);

function onFileChange(e: Event) {
  const picked = (e.target as HTMLInputElement).files?.[0] ?? null;
  error.value = "";
  if (picked && picked.size > MAX_FILE_BYTES) {
    error.value = "That file is too large (12 MB max).";
    file.value = null;
    return;
  }
  file.value = picked;
}

function clearFile() {
  file.value = null;
  if (fileInput.value)
    fileInput.value.value = "";
}

function readAsBase64(picked: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(",")[1] ?? "");
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(picked);
  });
}

async function findEvents() {
  if (!text.value.trim() && !file.value) {
    error.value = "Paste an email or message, or choose a photo, screenshot or PDF.";
    return;
  }
  loading.value = true;
  error.value = "";
  try {
    const body: { text?: string; file?: { mimeType: string; data: string } } = {};
    if (text.value.trim())
      body.text = text.value.trim();
    if (file.value)
      body.file = { mimeType: file.value.type || "application/octet-stream", data: await readAsBase64(file.value) };

    const result = await $fetch<{ events: Suggestion[] }>("/api/ai/suggestEvents", { method: "POST", body });
    suggestions.value = result.events.map(s => ({ ...s, selected: true }));
  }
  catch (err) {
    const message = (err as { data?: { message?: string } }).data?.message;
    error.value = message || "Couldn't read that. Try again.";
    consola.warn("Calendar import: Suggestion request failed");
  }
  finally {
    loading.value = false;
  }
}

function toggleUser(suggestion: DraftSuggestion, userId: string) {
  suggestion.userIds = suggestion.userIds.includes(userId)
    ? suggestion.userIds.filter(id => id !== userId)
    : [...suggestion.userIds, userId];
}

function setAllDay(suggestion: DraftSuggestion, allDay: boolean) {
  suggestion.allDay = allDay;
  if (!allDay && !suggestion.startTime) {
    suggestion.startTime = "09:00";
    suggestion.endTime = "10:00";
  }
}

function addHour(time: string) {
  const [hours, minutes] = time.split(":").map(Number);
  return `${String(Math.min((hours ?? 0) + 1, 23)).padStart(2, "0")}:${String(minutes ?? 0).padStart(2, "0")}`;
}

function toCalendarEvent(suggestion: DraftSuggestion): CalendarEvent {
  const [year, month, day] = suggestion.date.split("-").map(Number) as [number, number, number];
  const eventUsers = users.value
    .filter(user => suggestion.userIds.includes(user.id))
    .map(user => ({ id: user.id, name: user.name, avatar: user.avatar, color: user.color }));
  const description = suggestion.notes ?? undefined;

  if (suggestion.allDay || !suggestion.startTime) {
    const [endYear, endMonth, endDay] = (suggestion.endDate ?? suggestion.date).split("-").map(Number) as [number, number, number];
    return {
      id: "",
      title: suggestion.title,
      description,
      location: suggestion.location ?? undefined,
      allDay: true,
      start: new Date(Date.UTC(year, month - 1, day)),
      end: new Date(Date.UTC(endYear, endMonth - 1, endDay + 1)),
      users: eventUsers,
    };
  }

  const [startHours, startMinutes] = suggestion.startTime.split(":").map(Number) as [number, number];
  const endTime = suggestion.endTime && suggestion.endTime > suggestion.startTime ? suggestion.endTime : addHour(suggestion.startTime);
  const [endHours, endMinutes] = endTime.split(":").map(Number) as [number, number];
  return {
    id: "",
    title: suggestion.title,
    description,
    location: suggestion.location ?? undefined,
    allDay: false,
    start: new Date(year, month - 1, day, startHours, startMinutes),
    end: new Date(year, month - 1, day, endHours, endMinutes),
    users: eventUsers,
  };
}

function addSelected() {
  const chosen = (suggestions.value ?? []).filter(s => s.selected && s.title.trim() && s.date);
  if (!chosen.length)
    return;
  emit("add", chosen.map(toCalendarEvent));
}

useEventListener(window, "keydown", (e: KeyboardEvent) => {
  if (e.key !== "Escape" || !props.isOpen || e.defaultPrevented || pendingConfirm.value || loading.value)
    return;
  if (document.querySelector("[data-dismissable-layer]"))
    return;
  emit("close");
});
</script>

<template>
  <div
    v-if="isOpen"
    class="fixed inset-0 z-[100] flex items-center justify-center bg-black/50"
    @click="!loading && emit('close')"
  >
    <div
      class="w-[640px] max-w-[95vw] max-h-[90vh] overflow-y-auto bg-default rounded-lg border border-default shadow-lg"
      role="dialog"
      aria-modal="true"
      aria-labelledby="import-dialog-title"
      @click.stop
    >
      <div class="flex items-center justify-between p-4 border-b border-default">
        <h2 id="import-dialog-title" class="text-base font-semibold leading-6 flex items-center gap-2">
          <UIcon name="i-lucide-sparkles" class="h-5 w-5 text-primary" />
          Import from email or flyer
        </h2>
        <UButton
          color="neutral"
          variant="ghost"
          icon="i-lucide-x"
          class="-my-1"
          aria-label="Close dialog"
          :disabled="loading"
          @click="emit('close')"
        />
      </div>

      <div class="p-4 space-y-4">
        <div
          v-if="error"
          class="bg-error/10 text-error rounded-md px-3 py-2 text-sm"
          role="alert"
        >
          {{ error }}
        </div>

        <template v-if="suggestions === null">
          <div class="space-y-1">
            <label for="import-text" class="block text-sm font-medium text-highlighted">Paste an email, newsletter or message</label>
            <UTextarea
              id="import-text"
              v-model="text"
              :rows="8"
              placeholder="e.g. the school newsletter, a Google Classroom announcement, or a coach's text"
              class="w-full"
              :disabled="loading"
            />
          </div>

          <div class="space-y-1">
            <p class="text-sm font-medium text-highlighted">
              Or add a photo, screenshot or PDF
            </p>
            <div class="flex items-center gap-2">
              <input
                ref="fileInput"
                type="file"
                accept="image/png,image/jpeg,image/webp,image/heic,image/heif,application/pdf"
                class="text-sm file:mr-3 file:rounded-md file:border-0 file:bg-primary/10 file:px-3 file:py-2 file:text-primary"
                aria-label="Choose a photo, screenshot or PDF"
                :disabled="loading"
                @change="onFileChange"
              >
              <UButton
                v-if="file"
                size="xs"
                variant="ghost"
                color="neutral"
                icon="i-lucide-x"
                aria-label="Remove file"
                @click="clearFile"
              />
            </div>
          </div>

          <p class="text-xs text-muted">
            The text or file is sent to Google Gemini to find dates. Nothing is added until you review it.
          </p>
        </template>

        <template v-else>
          <p v-if="suggestions.length === 0" class="text-sm text-muted">
            No dates found. Try pasting more of the message, or a clearer photo.
          </p>
          <ul
            v-else
            class="space-y-3"
            aria-label="Suggested events"
          >
            <li
              v-for="(suggestion, index) in suggestions"
              :key="index"
              class="rounded-lg border border-default p-3 space-y-2"
              :class="{ 'opacity-50': !suggestion.selected }"
            >
              <div class="flex items-center gap-2">
                <UCheckbox v-model="suggestion.selected" :aria-label="`Include ${suggestion.title}`" />
                <UInput
                  v-model="suggestion.title"
                  class="flex-1"
                  :aria-label="`Title for suggestion ${index + 1}`"
                />
              </div>
              <div class="flex flex-wrap items-center gap-2 pl-7">
                <UInput
                  v-model="suggestion.date"
                  type="date"
                  class="w-40"
                  :aria-label="`Date for ${suggestion.title}`"
                />
                <UCheckbox
                  :model-value="suggestion.allDay"
                  label="All day"
                  @update:model-value="(value) => setAllDay(suggestion, value === true)"
                />
                <template v-if="!suggestion.allDay">
                  <UInput
                    v-model="suggestion.startTime"
                    type="time"
                    class="w-32"
                    :aria-label="`Start time for ${suggestion.title}`"
                  />
                  <span class="text-muted">to</span>
                  <UInput
                    v-model="suggestion.endTime"
                    type="time"
                    class="w-32"
                    :aria-label="`End time for ${suggestion.title}`"
                  />
                </template>
                <span v-else-if="suggestion.endDate && suggestion.endDate !== suggestion.date" class="text-xs text-muted">until {{ suggestion.endDate }}</span>
              </div>
              <div v-if="users.length" class="flex flex-wrap gap-1 pl-7">
                <UButton
                  v-for="user in users"
                  :key="user.id"
                  size="xs"
                  :variant="suggestion.userIds.includes(user.id) ? 'solid' : 'outline'"
                  :color="suggestion.userIds.includes(user.id) ? 'primary' : 'neutral'"
                  :aria-pressed="suggestion.userIds.includes(user.id)"
                  @click="toggleUser(suggestion, user.id)"
                >
                  {{ user.name }}
                </UButton>
              </div>
              <p v-if="suggestion.location || suggestion.notes" class="pl-7 text-xs text-muted">
                <template v-if="suggestion.location">
                  {{ suggestion.location }}<template v-if="suggestion.notes">
                    ·
                  </template>
                </template>{{ suggestion.notes }}
              </p>
            </li>
          </ul>
        </template>
      </div>

      <div class="flex justify-between gap-2 p-4 border-t border-default">
        <UButton
          v-if="suggestions !== null"
          variant="ghost"
          color="neutral"
          icon="i-lucide-arrow-left"
          @click="suggestions = null"
        >
          Back
        </UButton>
        <div class="flex gap-2 ml-auto">
          <UButton
            color="neutral"
            variant="ghost"
            :disabled="loading"
            @click="emit('close')"
          >
            Cancel
          </UButton>
          <UButton
            v-if="suggestions === null"
            color="primary"
            icon="i-lucide-sparkles"
            :loading="loading"
            @click="findEvents"
          >
            {{ loading ? 'Reading…' : 'Find events' }}
          </UButton>
          <UButton
            v-else
            color="primary"
            :disabled="selectedCount === 0"
            @click="addSelected"
          >
            Add {{ selectedCount }} {{ selectedCount === 1 ? 'event' : 'events' }}
          </UButton>
        </div>
      </div>
    </div>
  </div>
</template>
