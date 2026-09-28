<script setup lang="ts">
import { useEventListener } from "@vueuse/core";

import type { Routine, RoutineDraft } from "~/types/routines";

import { ROUTINE_ICONS, ROUTINE_TEMPLATES, WEEKDAY_LABELS } from "~/types/routines";

const props = defineProps<{
  isOpen: boolean;
  routine: Routine | null;
  users: { id: string; name: string }[];
  saving?: boolean;
}>();

const emit = defineEmits<{
  (e: "close"): void;
  (e: "save", draft: RoutineDraft): void;
  (e: "delete", routine: Routine): void;
}>();

const { pendingConfirm } = useConfirmDialog();

const EVERYONE = "__everyone__";

function emptyDraft(): RoutineDraft {
  return { name: "", icon: "i-lucide-list-checks", daysOfWeek: [], points: 5, userId: null, enabled: true, steps: [{ title: "", icon: null, durationMinutes: null }] };
}

const draft = ref<RoutineDraft>(emptyDraft());
const error = ref("");

watch(() => props.isOpen, (open) => {
  if (!open)
    return;
  error.value = "";
  draft.value = props.routine
    ? {
        name: props.routine.name,
        icon: props.routine.icon,
        daysOfWeek: [...props.routine.daysOfWeek],
        points: props.routine.points,
        userId: props.routine.userId,
        enabled: props.routine.enabled,
        steps: props.routine.steps.map(step => ({ id: step.id, title: step.title, icon: step.icon, durationMinutes: step.durationMinutes })),
      }
    : emptyDraft();
});

const assignee = computed({
  get: () => draft.value.userId ?? EVERYONE,
  set: (value: string) => {
    draft.value.userId = value === EVERYONE ? null : value;
  },
});

const assigneeOptions = computed(() => [
  { label: "Everyone", value: EVERYONE },
  ...props.users.map(user => ({ label: user.name, value: user.id })),
]);

const iconOptions = ROUTINE_ICONS.map(icon => ({ label: icon.label, value: icon.value, icon: icon.value }));

function applyTemplate(index: number) {
  const template = ROUTINE_TEMPLATES[index];
  if (!template)
    return;
  draft.value = {
    ...template.draft,
    daysOfWeek: [...template.draft.daysOfWeek],
    steps: template.draft.steps.map(step => ({ ...step })),
    userId: draft.value.userId,
    enabled: true,
  };
}

function toggleDay(day: number) {
  const days = new Set(draft.value.daysOfWeek);
  if (days.has(day))
    days.delete(day);
  else
    days.add(day);
  draft.value.daysOfWeek = [...days].sort();
}

function addStep() {
  draft.value.steps.push({ title: "", icon: null, durationMinutes: null });
}

function removeStep(index: number) {
  draft.value.steps.splice(index, 1);
}

function moveStep(index: number, offset: number) {
  const target = index + offset;
  const steps = draft.value.steps;
  if (target < 0 || target >= steps.length)
    return;
  [steps[index], steps[target]] = [steps[target]!, steps[index]!];
}

function setStepMinutes(index: number, value: string | number) {
  const minutes = Number(value);
  draft.value.steps[index]!.durationMinutes = Number.isFinite(minutes) && minutes > 0 ? Math.round(minutes) : null;
}

function handleSave() {
  const steps = draft.value.steps.filter(step => step.title.trim());
  if (!draft.value.name.trim()) {
    error.value = "Give the routine a name.";
    return;
  }
  if (steps.length === 0) {
    error.value = "Add at least one step.";
    return;
  }
  emit("save", { ...draft.value, name: draft.value.name.trim(), steps });
}

useEventListener(window, "keydown", (e: KeyboardEvent) => {
  if (e.key !== "Escape" || !props.isOpen || e.defaultPrevented || pendingConfirm.value)
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
    @click="emit('close')"
  >
    <div
      class="w-[560px] max-w-[95vw] max-h-[90vh] overflow-y-auto bg-default rounded-lg border border-default shadow-lg"
      role="dialog"
      aria-modal="true"
      @click.stop
    >
      <div class="flex items-center justify-between p-4 border-b border-default">
        <h2 class="text-base font-semibold leading-6">
          {{ routine ? 'Edit Routine' : 'New Routine' }}
        </h2>
        <UButton
          color="neutral"
          variant="ghost"
          icon="i-lucide-x"
          class="-my-1"
          aria-label="Close dialog"
          @click="emit('close')"
        />
      </div>

      <div class="p-4 space-y-5">
        <div v-if="error" class="bg-error/10 text-error rounded-md px-3 py-2 text-sm">
          {{ error }}
        </div>

        <div v-if="!routine" class="space-y-2">
          <p class="text-sm font-medium text-highlighted">
            Start from a template
          </p>
          <div class="flex flex-wrap gap-2">
            <UButton
              v-for="(template, index) in ROUTINE_TEMPLATES"
              :key="template.label"
              size="sm"
              variant="outline"
              color="neutral"
              @click="applyTemplate(index)"
            >
              {{ template.label }}
            </UButton>
          </div>
        </div>

        <div class="grid grid-cols-[1fr_auto] gap-3">
          <div class="space-y-1">
            <label class="block text-sm font-medium text-highlighted" for="routine-name">Name</label>
            <UInput
              id="routine-name"
              v-model="draft.name"
              placeholder="After school"
              class="w-full"
            />
          </div>
          <div class="space-y-1">
            <label class="block text-sm font-medium text-highlighted">Icon</label>
            <USelect
              :model-value="draft.icon ?? undefined"
              :items="iconOptions"
              value-key="value"
              :icon="draft.icon || undefined"
              class="w-40"
              aria-label="Routine icon"
              @update:model-value="(value) => draft.icon = value ?? null"
            />
          </div>
        </div>

        <div class="grid grid-cols-2 gap-3">
          <div class="space-y-1">
            <label class="block text-sm font-medium text-highlighted">For</label>
            <USelect
              v-model="assignee"
              :items="assigneeOptions"
              value-key="value"
              class="w-full"
              aria-label="Who this routine is for"
            />
          </div>
          <div class="space-y-1">
            <label class="block text-sm font-medium text-highlighted" for="routine-points">Points when finished</label>
            <UInput
              id="routine-points"
              v-model.number="draft.points"
              type="number"
              min="0"
              max="1000"
              class="w-full"
            />
          </div>
        </div>
        <p v-if="!draft.userId && draft.points > 0" class="text-xs text-muted -mt-3">
          Points are only awarded when the routine is for one person.
        </p>

        <div class="space-y-1">
          <label class="block text-sm font-medium text-highlighted">Days</label>
          <div class="flex flex-wrap gap-1">
            <UButton
              v-for="(label, day) in WEEKDAY_LABELS"
              :key="label"
              size="sm"
              :variant="draft.daysOfWeek.includes(day) ? 'solid' : 'outline'"
              :color="draft.daysOfWeek.includes(day) ? 'primary' : 'neutral'"
              :aria-pressed="draft.daysOfWeek.includes(day)"
              @click="toggleDay(day)"
            >
              {{ label }}
            </UButton>
          </div>
          <p class="text-xs text-muted">
            {{ draft.daysOfWeek.length === 0 ? 'No days picked: shows every day.' : 'Shows only on the picked days.' }}
          </p>
        </div>

        <div class="space-y-2">
          <label class="block text-sm font-medium text-highlighted">Steps</label>
          <div
            v-for="(step, index) in draft.steps"
            :key="index"
            class="flex items-center gap-2"
          >
            <USelect
              :model-value="step.icon ?? undefined"
              :items="iconOptions"
              value-key="value"
              :icon="step.icon || 'i-lucide-circle'"
              placeholder="Icon"
              class="w-32 shrink-0"
              :aria-label="`Step ${index + 1} icon`"
              @update:model-value="(value) => step.icon = value ?? null"
            />
            <UInput
              v-model="step.title"
              :placeholder="`Step ${index + 1}`"
              class="flex-1 min-w-0"
              :aria-label="`Step ${index + 1} title`"
            />
            <UInput
              :model-value="step.durationMinutes ?? ''"
              type="number"
              min="0"
              placeholder="min"
              class="w-20 shrink-0"
              :aria-label="`Step ${index + 1} timer minutes`"
              @update:model-value="(value) => setStepMinutes(index, value)"
            />
            <div class="flex shrink-0">
              <UButton
                icon="i-lucide-chevron-up"
                size="xs"
                variant="ghost"
                color="neutral"
                :disabled="index === 0"
                :aria-label="`Move step ${index + 1} up`"
                @click="moveStep(index, -1)"
              />
              <UButton
                icon="i-lucide-chevron-down"
                size="xs"
                variant="ghost"
                color="neutral"
                :disabled="index === draft.steps.length - 1"
                :aria-label="`Move step ${index + 1} down`"
                @click="moveStep(index, 1)"
              />
              <UButton
                icon="i-lucide-trash-2"
                size="xs"
                variant="ghost"
                color="error"
                :disabled="draft.steps.length === 1"
                :aria-label="`Remove step ${index + 1}`"
                @click="removeStep(index)"
              />
            </div>
          </div>
          <p class="text-xs text-muted">
            Add minutes to a step to show a timer, e.g. 20 for piano practice.
          </p>
          <UButton
            size="sm"
            variant="outline"
            icon="i-lucide-plus"
            @click="addStep"
          >
            Add step
          </UButton>
        </div>
      </div>

      <div class="flex justify-between gap-2 p-4 border-t border-default">
        <UButton
          v-if="routine"
          color="error"
          variant="ghost"
          icon="i-lucide-trash-2"
          @click="emit('delete', routine)"
        >
          Delete
        </UButton>
        <div class="flex gap-2 ml-auto">
          <UButton
            color="neutral"
            variant="ghost"
            @click="emit('close')"
          >
            Cancel
          </UButton>
          <UButton
            color="primary"
            :loading="saving"
            @click="handleSave"
          >
            Save
          </UButton>
        </div>
      </div>
    </div>
  </div>
</template>
