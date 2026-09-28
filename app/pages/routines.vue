<script setup lang="ts">
import { useIntervalFn } from "@vueuse/core";
import { consola } from "consola";

import type { Routine, RoutineDraft, RoutinesResponse, RoutineStep } from "~/types/routines";

import AdminPinModal from "~/components/admin/adminPinModal.vue";
import ChoreCelebration from "~/components/chores/choreCelebration.vue";
import RoutineDialog from "~/components/routines/routineDialog.vue";
import { WEEKDAY_LABELS } from "~/types/routines";

const { data, refresh } = await useFetch<RoutinesResponse>("/api/routines", { key: "routines" });
const { users } = useUsers();
const { isActive: isAdminMode } = useAdminMode();
const { confirmAction } = useConfirmDialog();
const toast = useAlertToast();

const showAll = ref(false);
const pendingSteps = ref(new Set<string>());
const celebration = ref<{ name: string; points: number } | null>(null);

const routines = computed(() => (data.value?.routines ?? [])
  .filter(routine => routine.enabled && (showAll.value || routine.scheduledToday)));
const hiddenCount = computed(() => (data.value?.routines ?? [])
  .filter(routine => routine.enabled && !routine.scheduledToday)
  .length);
const todayLabel = computed(() => (data.value ? WEEKDAY_LABELS[data.value.weekday] : ""));

function isDone(routine: Routine, step: RoutineStep) {
  return routine.progress.completedStepIds.includes(step.id);
}

function doneCount(routine: Routine) {
  return routine.steps.filter(step => isDone(routine, step)).length;
}

function scheduleLabel(routine: Routine) {
  if (routine.daysOfWeek.length === 0)
    return "Every day";
  if (routine.daysOfWeek.join() === "1,2,3,4,5")
    return "Weekdays";
  return routine.daysOfWeek.map(day => WEEKDAY_LABELS[day]).join(", ");
}

async function setStep(routine: Routine, step: RoutineStep, done: boolean) {
  const key = `${routine.id}:${step.id}`;
  if (pendingSteps.value.has(key))
    return;
  pendingSteps.value.add(key);
  const wasComplete = !!routine.progress.completedAt;
  try {
    const result = await $fetch<{ completedStepIds: string[]; completedAt: string | null; pointsAwarded: number }>(
      `/api/routines/${routine.id}/progress`,
      { method: "POST", body: { stepId: step.id, done } },
    );
    if (data.value) {
      data.value = {
        ...data.value,
        routines: data.value.routines.map(r => r.id === routine.id
          ? { ...r, progress: { completedStepIds: result.completedStepIds, completedAt: result.completedAt } }
          : r),
      };
    }
    if (!wasComplete && result.completedAt) {
      celebration.value = { name: routine.name, points: result.pointsAwarded };
      if (result.pointsAwarded > 0) {
        await refreshNuxtData("users");
      }
    }
  }
  catch (error) {
    consola.error("Routines: Failed to update step:", error);
    toast.showError("Couldn't save that step", "Check the connection and try again.");
  }
  finally {
    pendingSteps.value.delete(key);
  }
}

// Step timers, keyed by routineId:stepId.
type StepTimer = { endsAt: number | null; remainingMs: number };
const timers = ref<Record<string, StepTimer>>({});
const now = ref(Date.now());

function timerKey(routine: Routine, step: RoutineStep) {
  return `${routine.id}:${step.id}`;
}

function timerRemainingMs(routine: Routine, step: RoutineStep) {
  const timer = timers.value[timerKey(routine, step)];
  if (!timer)
    return (step.durationMinutes ?? 0) * 60_000;
  return timer.endsAt ? Math.max(0, timer.endsAt - now.value) : timer.remainingMs;
}

function isTimerRunning(routine: Routine, step: RoutineStep) {
  return !!timers.value[timerKey(routine, step)]?.endsAt;
}

function formatRemaining(ms: number) {
  const totalSeconds = Math.ceil(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

function startTimer(routine: Routine, step: RoutineStep) {
  const remaining = timerRemainingMs(routine, step) || (step.durationMinutes ?? 0) * 60_000;
  timers.value[timerKey(routine, step)] = { endsAt: Date.now() + remaining, remainingMs: remaining };
}

function pauseTimer(routine: Routine, step: RoutineStep) {
  const key = timerKey(routine, step);
  timers.value[key] = { endsAt: null, remainingMs: timerRemainingMs(routine, step) };
}

function resetTimer(routine: Routine, step: RoutineStep) {
  const { [timerKey(routine, step)]: _removed, ...rest } = timers.value;
  timers.value = rest;
}

function playChime() {
  try {
    const audio = new AudioContext();
    [0, 0.35, 0.7].forEach((offset) => {
      const oscillator = audio.createOscillator();
      const gain = audio.createGain();
      oscillator.frequency.value = 880;
      gain.gain.setValueAtTime(0.2, audio.currentTime + offset);
      gain.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + offset + 0.3);
      oscillator.connect(gain).connect(audio.destination);
      oscillator.start(audio.currentTime + offset);
      oscillator.stop(audio.currentTime + offset + 0.3);
    });
  }
  catch {
    // Audio can be blocked until the page has been tapped; the toast still shows.
  }
}

useIntervalFn(() => {
  now.value = Date.now();
  for (const routine of data.value?.routines ?? []) {
    for (const step of routine.steps) {
      const timer = timers.value[timerKey(routine, step)];
      if (timer?.endsAt && timer.endsAt <= now.value) {
        resetTimer(routine, step);
        playChime();
        toast.showSuccess(`Time's up: ${step.title}`, "Great practice!");
        if (!isDone(routine, step))
          setStep(routine, step, true);
      }
    }
  }
}, 500);

// Other tablets tick steps too; there's no live push for routines, so poll.
useIntervalFn(() => {
  if (pendingSteps.value.size === 0)
    refresh();
}, 60_000);

// Editing is parent-only.
const dialogOpen = ref(false);
const editingRoutine = ref<Routine | null>(null);
const saving = ref(false);
const showPinModal = ref(false);
let afterPin: (() => void) | null = null;

function requireParent(action: () => void) {
  if (isAdminMode.value) {
    action();
    return;
  }
  afterPin = action;
  showPinModal.value = true;
}

function handlePinVerified() {
  showPinModal.value = false;
  afterPin?.();
  afterPin = null;
}

function openCreate() {
  requireParent(() => {
    editingRoutine.value = null;
    dialogOpen.value = true;
  });
}

function openEdit(routine: Routine) {
  requireParent(() => {
    editingRoutine.value = routine;
    dialogOpen.value = true;
  });
}

async function handleSave(draft: RoutineDraft) {
  saving.value = true;
  try {
    if (editingRoutine.value) {
      await $fetch(`/api/routines/${editingRoutine.value.id}`, { method: "PUT", body: draft });
    }
    else {
      await $fetch("/api/routines", { method: "POST", body: draft });
    }
    dialogOpen.value = false;
    await refresh();
  }
  catch (error) {
    consola.error("Routines: Failed to save routine:", error);
    toast.showError("Couldn't save the routine", "Please try again.");
  }
  finally {
    saving.value = false;
  }
}

async function handleDelete(routine: Routine) {
  const confirmed = await confirmAction({ title: `Delete "${routine.name}"?`, message: "Its steps and progress will be removed." });
  if (!confirmed)
    return;
  try {
    await $fetch(`/api/routines/${routine.id}`, { method: "DELETE" });
    dialogOpen.value = false;
    await refresh();
  }
  catch (error) {
    consola.error("Routines: Failed to delete routine:", error);
    toast.showError("Couldn't delete the routine", "Please try again.");
  }
}
</script>

<template>
  <div class="flex h-[calc(100vh-2rem)] w-full flex-col">
    <div class="py-5 px-4 sticky top-0 z-40 bg-default border-b border-default flex flex-wrap items-center justify-between gap-3">
      <div>
        <h1 class="text-2xl font-bold text-highlighted flex items-center gap-2">
          <UIcon name="i-lucide-list-checks" class="h-6 w-6 text-primary" />
          Routines
        </h1>
        <p class="text-sm text-muted">
          {{ todayLabel ? `Today is ${todayLabel}. ` : '' }}Tap each step when it's done.
        </p>
      </div>
      <div class="flex items-center gap-2">
        <UButton
          v-if="hiddenCount > 0 || showAll"
          variant="ghost"
          color="neutral"
          :icon="showAll ? 'i-lucide-eye-off' : 'i-lucide-eye'"
          @click="showAll = !showAll"
        >
          {{ showAll ? 'Only today' : `Show all (${hiddenCount} more)` }}
        </UButton>
        <UButton
          icon="i-lucide-plus"
          color="primary"
          @click="openCreate"
        >
          New routine
        </UButton>
      </div>
    </div>

    <div class="flex-1 overflow-y-auto p-4">
      <div v-if="routines.length === 0" class="text-center py-20">
        <UIcon name="i-lucide-list-checks" class="h-16 w-16 text-muted mx-auto mb-4" />
        <p class="text-lg text-highlighted">
          {{ data?.routines.length ? 'No routines today' : 'No routines yet' }}
        </p>
        <p class="text-sm text-muted mt-1">
          Routines are step-by-step checklists, like "After school" or "Bedtime".
        </p>
      </div>

      <div v-else class="grid grid-cols-1 lg:grid-cols-2 2xl:grid-cols-3 gap-4">
        <section
          v-for="routine in routines"
          :key="routine.id"
          class="rounded-xl border border-default bg-default shadow-sm overflow-hidden"
          :class="{ 'opacity-60': !routine.scheduledToday }"
          :aria-label="`Routine: ${routine.name}`"
        >
          <header
            class="p-4 flex items-center gap-3 border-b border-default"
            :style="routine.user?.color ? { backgroundColor: `${routine.user.color}20` } : undefined"
          >
            <div class="h-11 w-11 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <UIcon :name="routine.icon || 'i-lucide-list-checks'" class="h-6 w-6 text-primary" />
            </div>
            <div class="flex-1 min-w-0">
              <h2 class="font-semibold text-highlighted truncate">
                {{ routine.name }}
              </h2>
              <p class="text-xs text-muted">
                {{ routine.user?.name || 'Everyone' }} · {{ scheduleLabel(routine) }}
                <template v-if="routine.points > 0 && routine.user">
                  · <UIcon name="i-lucide-star" class="h-3 w-3 text-yellow-500 align-[-2px]" /> {{ routine.points }}
                </template>
              </p>
            </div>
            <span class="text-sm font-medium text-muted">{{ doneCount(routine) }}/{{ routine.steps.length }}</span>
            <UButton
              icon="i-lucide-pencil"
              variant="ghost"
              color="neutral"
              size="sm"
              :aria-label="`Edit ${routine.name}`"
              @click="openEdit(routine)"
            />
          </header>

          <div class="h-1.5 bg-muted">
            <div
              class="h-full bg-primary transition-all"
              :style="{ width: `${Math.round(doneCount(routine) / routine.steps.length * 100)}%` }"
            />
          </div>

          <div v-if="routine.progress.completedAt" class="px-4 py-2 bg-success/10 text-success text-sm font-medium flex items-center gap-2">
            <UIcon name="i-lucide-party-popper" class="h-4 w-4" />
            All done for today!
          </div>

          <ul class="p-2">
            <li v-for="step in routine.steps" :key="step.id">
              <div
                class="flex items-center gap-3 rounded-lg px-3 py-3 hover:bg-muted/60"
                :class="{ 'opacity-70': isDone(routine, step) }"
              >
                <button
                  type="button"
                  class="flex flex-1 min-w-0 items-center gap-3 text-left"
                  role="checkbox"
                  :aria-checked="isDone(routine, step)"
                  :aria-label="step.title"
                  :disabled="pendingSteps.has(`${routine.id}:${step.id}`)"
                  @click="setStep(routine, step, !isDone(routine, step))"
                >
                  <span
                    class="h-10 w-10 rounded-full flex items-center justify-center shrink-0 border-2"
                    :class="isDone(routine, step) ? 'bg-success border-success text-white' : 'border-default text-primary'"
                  >
                    <UIcon :name="isDone(routine, step) ? 'i-lucide-check' : (step.icon || 'i-lucide-circle')" class="h-5 w-5" />
                  </span>
                  <span class="text-base text-highlighted" :class="{ 'line-through': isDone(routine, step) }">
                    {{ step.title }}
                  </span>
                </button>

                <div v-if="step.durationMinutes && !isDone(routine, step)" class="flex items-center gap-1 shrink-0">
                  <span class="font-mono text-sm tabular-nums w-12 text-right" :class="isTimerRunning(routine, step) ? 'text-primary font-semibold' : 'text-muted'">
                    {{ formatRemaining(timerRemainingMs(routine, step)) }}
                  </span>
                  <UButton
                    v-if="!isTimerRunning(routine, step)"
                    icon="i-lucide-play"
                    size="sm"
                    color="primary"
                    variant="soft"
                    :aria-label="`Start ${step.durationMinutes} minute timer for ${step.title}`"
                    @click="startTimer(routine, step)"
                  />
                  <UButton
                    v-else
                    icon="i-lucide-pause"
                    size="sm"
                    color="primary"
                    variant="soft"
                    :aria-label="`Pause timer for ${step.title}`"
                    @click="pauseTimer(routine, step)"
                  />
                  <UButton
                    v-if="timers[`${routine.id}:${step.id}`]"
                    icon="i-lucide-rotate-ccw"
                    size="sm"
                    color="neutral"
                    variant="ghost"
                    :aria-label="`Reset timer for ${step.title}`"
                    @click="resetTimer(routine, step)"
                  />
                </div>
              </div>
            </li>
          </ul>
        </section>
      </div>
    </div>

    <RoutineDialog
      :is-open="dialogOpen"
      :routine="editingRoutine"
      :users="users.map(u => ({ id: u.id, name: u.name }))"
      :saving="saving"
      @close="dialogOpen = false"
      @save="handleSave"
      @delete="handleDelete"
    />

    <AdminPinModal
      :is-open="showPinModal"
      @close="showPinModal = false"
      @verified="handlePinVerified"
    />

    <ChoreCelebration
      v-if="celebration"
      :points="celebration.points"
      :chore-name="celebration.name"
      @complete="celebration = null"
    />
  </div>
</template>
