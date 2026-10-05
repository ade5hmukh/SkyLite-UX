<script setup lang="ts">
import { format } from "date-fns";

import type { DailyReportEntry, DailyReportItem, DailyReportsResponse } from "~/types/dailyReport";

const props = defineProps<{
  day: Date;
  compact?: boolean;
}>();

const { data } = useNuxtData<DailyReportsResponse>("daily-reports");

const reports = computed(() => {
  const dayKey = format(props.day, "yyyy-MM-dd");
  return (data.value?.reports ?? []).filter(report => report.day === dayKey);
});

function total(report: DailyReportEntry) {
  return report.completed.length + report.incomplete.length;
}

function chipColor(report: DailyReportEntry) {
  return report.incomplete.length === 0 ? "success" : "neutral";
}

function itemIcon(item: DailyReportItem) {
  if (item.kind === "routine")
    return "i-lucide-list-checks";
  return item.kind === "chore" ? "i-lucide-sparkles" : "i-lucide-square-check";
}
</script>

<template>
  <div v-if="reports.length" class="flex flex-wrap items-center gap-1 min-w-0">
    <UPopover v-for="report in reports" :key="report.userId">
      <UButton
        size="xs"
        variant="soft"
        :color="chipColor(report)"
        class="rounded-full px-2 py-0.5 gap-1"
        :aria-label="`${report.userName}: ${report.completed.length} of ${total(report)} done`"
        @click.stop
      >
        <span
          class="h-2 w-2 shrink-0 rounded-full"
          :style="{ backgroundColor: report.userColor || 'var(--ui-primary)' }"
        />
        <span v-if="!compact" class="truncate max-w-16">{{ report.userName }}</span>
        <span class="tabular-nums">{{ report.completed.length }}/{{ total(report) }}</span>
      </UButton>

      <template #content>
        <div class="w-72 max-h-96 overflow-y-auto p-3 space-y-3 text-sm">
          <div class="flex items-center justify-between gap-2">
            <div class="font-semibold text-highlighted">
              {{ report.userName }} · {{ format(day, "EEE, MMM d") }}
            </div>
            <UBadge
              v-if="report.pointsEarned"
              size="sm"
              variant="subtle"
              color="warning"
            >
              +{{ report.pointsEarned }} pts
            </UBadge>
          </div>
          <p v-if="report.live" class="text-xs text-muted">
            So far today. Saved at midnight.
          </p>

          <div>
            <div class="text-xs font-medium uppercase text-success mb-1">
              Done ({{ report.completed.length }})
            </div>
            <ul class="space-y-1">
              <li
                v-for="(item, index) in report.completed"
                :key="`done-${index}`"
                class="flex items-center gap-2"
              >
                <UIcon name="i-lucide-circle-check" class="h-4 w-4 shrink-0 text-success" />
                <span class="flex-1 truncate">{{ item.title }}</span>
                <UIcon :name="itemIcon(item)" class="h-3.5 w-3.5 shrink-0 text-muted" />
                <span v-if="item.points" class="text-xs text-muted tabular-nums">+{{ item.points }}</span>
              </li>
              <li v-if="!report.completed.length" class="text-muted">
                Nothing finished
              </li>
            </ul>
          </div>

          <div>
            <div class="text-xs font-medium uppercase text-error mb-1">
              Not done ({{ report.incomplete.length }})
            </div>
            <ul class="space-y-1">
              <li
                v-for="(item, index) in report.incomplete"
                :key="`open-${index}`"
                class="flex items-center gap-2"
              >
                <UIcon name="i-lucide-circle" class="h-4 w-4 shrink-0 text-muted" />
                <span class="flex-1 truncate">{{ item.title }}</span>
                <span v-if="item.detail" class="text-xs text-muted">{{ item.detail }}</span>
                <UIcon :name="itemIcon(item)" class="h-3.5 w-3.5 shrink-0 text-muted" />
              </li>
              <li v-if="!report.incomplete.length" class="text-muted">
                Everything done
              </li>
            </ul>
          </div>

          <p v-if="report.estimated" class="text-xs text-muted border-t border-default pt-2">
            Rebuilt from the activity log. "Not done" lists repeating chores only and may miss one-off to-dos.
          </p>
        </div>
      </template>
    </UPopover>
  </div>
</template>
