<script setup lang="ts">
import { useIntervalFn } from "@vueuse/core";
import { format, parseISO } from "date-fns";

import type { SchoolMenu, SchoolMenuDay, SchoolMenusResponse } from "~/types/schoolMenu";

import { getMealIcon, getMealParts } from "~/types/schoolMenu";

const { data, status, refresh } = await useFetch<SchoolMenusResponse>("/api/schoolMenu", { key: "school-menu" });

useIntervalFn(() => refresh(), 30 * 60 * 1000);

const menus = computed(() => data.value?.menus ?? []);
const today = computed(() => data.value?.today ?? "");
const tomorrow = computed(() => data.value?.tomorrow ?? "");

function featuredDay(menu: SchoolMenu): SchoolMenuDay | null {
  return menu.days[0] ?? null;
}

function upcomingDays(menu: SchoolMenu) {
  return menu.days.slice(1);
}

function featuredLabel(day: SchoolMenuDay) {
  if (day.date === today.value)
    return "Today";
  if (day.date === tomorrow.value)
    return "Tomorrow";
  return `Next school day · ${format(parseISO(day.date), "EEEE, MMM d")}`;
}

function dayLabel(day: SchoolMenuDay) {
  return format(parseISO(day.date), "EEE, MMM d");
}
</script>

<template>
  <div class="flex h-[calc(100vh-2rem)] w-full flex-col">
    <div class="py-5 px-4 sticky top-0 z-40 bg-default border-b border-default flex flex-wrap items-center justify-between gap-3">
      <div>
        <h1 class="text-2xl font-bold text-highlighted flex items-center gap-2">
          <UIcon name="i-lucide-utensils" class="h-6 w-6 text-primary" />
          School Menu
        </h1>
        <p class="text-sm text-muted">
          Meals at school and daycare for the next two weeks.
        </p>
      </div>
      <UButton
        icon="i-lucide-refresh-cw"
        variant="ghost"
        color="neutral"
        :loading="status === 'pending'"
        aria-label="Refresh menu"
        @click="refresh()"
      />
    </div>

    <div class="flex-1 overflow-y-auto p-4 space-y-8">
      <div v-if="menus.length === 0 && status !== 'pending'" class="text-center py-20">
        <UIcon name="i-lucide-school" class="h-16 w-16 text-muted mx-auto mb-4" />
        <p class="text-lg text-highlighted">
          No school menu yet
        </p>
        <p class="text-sm text-muted mt-1">
          In Settings, add a Meal integration: paste your school's menu link, or pick KinderCare.
        </p>
        <UButton
          class="mt-4"
          icon="i-lucide-settings"
          to="/settings"
        >
          Open Settings
        </UButton>
      </div>

      <section
        v-for="menu in menus"
        :key="menu.id"
        class="space-y-4"
        :aria-label="`School menu: ${menu.title}`"
      >
        <header class="flex flex-wrap items-center gap-2">
          <h2 class="text-lg font-semibold text-highlighted">
            {{ menu.title }}
          </h2>
          <span v-if="menu.schools.length" class="text-sm text-muted">{{ menu.schools.join(", ") }}</span>
          <span
            v-for="person in menu.people"
            :key="person.id"
            class="text-xs font-medium px-2 py-0.5 rounded-full"
            :style="{ backgroundColor: `${person.color || '#06b6d4'}30` }"
          >{{ person.name }}</span>
        </header>

        <p v-if="menu.error" class="text-sm text-error">
          {{ menu.error }}
        </p>
        <p v-else-if="menu.days.length === 0" class="text-sm text-muted flex items-center gap-2">
          <UIcon name="i-lucide-calendar-off" class="h-4 w-4" />
          No school meals in the next two weeks.
        </p>

        <template v-else>
          <div
            v-if="featuredDay(menu)"
            class="rounded-xl border border-default bg-default shadow-sm p-5"
          >
            <p class="text-sm font-medium text-primary mb-3">
              {{ featuredLabel(featuredDay(menu)!) }}
            </p>
            <div
              class="grid grid-cols-1 gap-5"
              :class="featuredDay(menu)!.meals.length >= 3 ? 'md:grid-cols-3' : 'md:grid-cols-2'"
            >
              <div v-for="meal in featuredDay(menu)!.meals" :key="meal.name">
                <p class="text-xs uppercase tracking-wide text-muted flex items-center gap-1.5 mb-2">
                  <UIcon :name="getMealIcon(meal.name)" class="h-4 w-4" />
                  {{ meal.name }}
                </p>
                <ul class="space-y-1">
                  <li
                    v-for="(item, index) in meal.items"
                    :key="index"
                    class="text-xl font-semibold text-highlighted"
                  >
                    <span v-if="item.alternative" class="block text-sm font-normal italic text-muted">or</span>
                    {{ item.name }}
                  </li>
                </ul>
                <p v-if="meal.details?.length" class="text-sm text-muted mt-1.5">
                  {{ meal.details.join(" · ") }}
                </p>
              </div>
            </div>
          </div>

          <div v-if="upcomingDays(menu).length" class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5 gap-3">
            <div
              v-for="day in upcomingDays(menu)"
              :key="day.date"
              class="rounded-lg border border-default bg-default p-3"
            >
              <p class="text-sm font-semibold text-highlighted mb-2">
                {{ dayLabel(day) }}
              </p>
              <div
                v-for="meal in day.meals"
                :key="meal.name"
                class="flex gap-2 text-sm mb-1.5 last:mb-0"
              >
                <UIcon
                  :name="getMealIcon(meal.name)"
                  class="h-4 w-4 mt-0.5 shrink-0 text-muted"
                  :aria-label="meal.name"
                />
                <div>
                  <p class="text-default">
                    <span v-for="(part, index) in getMealParts(meal)" :key="index"><span class="text-muted">{{ part.separator }}</span>{{ part.name }}</span>
                  </p>
                  <p v-if="meal.details?.length" class="text-xs text-muted">
                    {{ meal.details.join(" · ") }}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </template>
      </section>
    </div>
  </div>
</template>
