<script setup lang="ts">
import { format } from "date-fns";

import type { CalendarEvent } from "~/types/calendar";

import { useCalendar } from "~/composables/useCalendar";

const props = defineProps<{
  event: CalendarEvent;
  className?: string;
  onClick?: (e: MouseEvent) => void;
  onMouseDown?: (e: MouseEvent) => void;
  onTouchStart?: (e: TouchEvent) => void;
  view: string;
  isFirstDay?: boolean;
  isLastDay?: boolean;
  currentDay?: Date;
}>();

const emit = defineEmits<{
  (e: "click", event: MouseEvent): void;
  (e: "mousedown", event: MouseEvent): void;
  (e: "touchstart", event: TouchEvent): void;
}>();

const displayStart = computed(() => new Date(props.event.start));
const displayEnd = computed(() => new Date(props.event.end));

const { getEventColorClasses } = useCalendar();

const eventColorClasses = computed(() => {
  if (props.view === "week") {
    return getEventColorClasses(props.event.color);
  }

  if (props.currentDay && (props.isFirstDay !== undefined || props.isLastDay !== undefined)) {
    return getEventColorClasses(props.event.color, {
      event: props.event,
      currentDay: props.currentDay,
      isFirstDay: props.isFirstDay,
      isLastDay: props.isLastDay,
    });
  }

  return getEventColorClasses(props.event.color);
});

const eventUsers = computed(() => props.event.users || []);

function isPast(date: Date) {
  return date < new Date();
}

function formatTimeWithOptionalMinutes(date: Date) {
  return format(date, "h:mm a");
}

function handleClick(e: MouseEvent) {
  emit("click", e);
  props.onClick?.(e);
}

function handleMouseDown(e: MouseEvent) {
  emit("mousedown", e);
  props.onMouseDown?.(e);
}

function handleTouchStart(e: TouchEvent) {
  emit("touchstart", e);
  props.onTouchStart?.(e);
}
</script>

<template>
  <button
    class="focus-visible:border-ring focus-visible:ring-ring/50 flex w-full flex-col gap-1 rounded p-2 text-left transition outline-none focus-visible:ring-[3px] data-past-event:line-through data-past-event:opacity-90"
    :class="typeof eventColorClasses === 'string' ? eventColorClasses : className"
    v-bind="typeof eventColorClasses === 'object' && eventColorClasses !== null ? eventColorClasses : undefined"
    :data-past-event="isPast(new Date(event.end)) || undefined"
    @click="handleClick"
    @mousedown="handleMouseDown"
    @touchstart="handleTouchStart"
  >
    <!-- Month View -->
    <template v-if="view === 'month'">
      <div class="flex items-center justify-between">
        <span class="truncate flex-1" :class="{ invisible: !isFirstDay }">
          {{ isFirstDay ? event.title : '&#8203;' }}
        </span>
      </div>
    </template>

    <!-- Week View -->
    <template v-else-if="view === 'week'">
      <div class="font-medium text-sm truncate">
        {{ event.title }}
      </div>

      <div class="flex items-center justify-between gap-2 mt-1 min-h-[1.25rem]">
        <div class="text-xs opacity-70">
          <template v-if="event.allDay">
            All day
          </template>
          <template v-else>
            {{ formatTimeWithOptionalMinutes(displayStart) }} - {{ formatTimeWithOptionalMinutes(displayEnd) }}
          </template>
        </div>
        <div class="flex-shrink-0 h-5 flex items-center">
          <UAvatarGroup
            v-if="eventUsers.length > 0"
            size="xs"
            :max="4"
            :ui="{
              base: 'relative rounded-full ring-0 border-0 shadow-none outline-none first:me-0',
            }"
          >
            <UAvatar
              v-for="user in eventUsers"
              :key="user.id"
              :src="user.avatar || undefined"
              :alt="user.name"
              :ui="{
                root: 'relative rounded-full ring-0 border-0 shadow-none outline-none',
                image: 'rounded-full object-cover ring-0 border-0 shadow-none',
                fallback: 'rounded-full ring-0 border-0 shadow-none',
              }"
            />
          </UAvatarGroup>
        </div>
      </div>
    </template>

    <!-- Day View -->
    <template v-else-if="view === 'day'">
      <div class="text-sm font-medium">
        {{ event.title }}
      </div>
      <div class="flex items-end justify-between mt-1">
        <div class="flex-1">
          <div class="text-xs opacity-70">
            <template v-if="event.allDay">
              <span>All day</span>
            </template>
            <template v-else>
              <span class="uppercase">
                {{ formatTimeWithOptionalMinutes(displayStart) }} - {{ formatTimeWithOptionalMinutes(displayEnd) }}
              </span>
            </template>
            <template v-if="event.location">
              <span class="px-1 opacity-35"> · </span>
              <span>{{ event.location }}</span>
            </template>
          </div>
          <div v-if="event.description" class="my-1 text-xs opacity-90">
            {{ event.description }}
          </div>
        </div>
        <UAvatarGroup
          v-if="eventUsers.length > 0"
          size="xs"
          :max="6"
          class="ml-3"
          :ui="{
            base: 'relative rounded-full ring-0 border-0 shadow-none outline-none first:me-0',
          }"
        >
          <UAvatar
            v-for="user in eventUsers"
            :key="user.id"
            :src="user.avatar || undefined"
            :alt="user.name"
            :ui="{
              root: 'relative rounded-full ring-0 border-0 shadow-none outline-none',
              image: 'rounded-full object-cover ring-0 border-0 shadow-none',
              fallback: 'rounded-full ring-0 border-0 shadow-none',
            }"
          />
        </UAvatarGroup>
      </div>
    </template>

    <!-- Agenda View -->
    <template v-else>
      <div class="text-sm font-medium">
        {{ event.title }}
      </div>
      <div class="flex items-end justify-between mt-1">
        <div class="flex-1">
          <div class="text-xs opacity-70">
            <template v-if="event.allDay">
              <span>All day</span>
            </template>
            <template v-else>
              <span class="uppercase">
                {{ formatTimeWithOptionalMinutes(displayStart) }} - {{ formatTimeWithOptionalMinutes(displayEnd) }}
              </span>
            </template>
            <template v-if="event.location">
              <span class="px-1 opacity-35"> · </span>
              <span>{{ event.location }}</span>
            </template>
          </div>
          <div v-if="event.description" class="my-1 text-xs opacity-90">
            {{ event.description }}
          </div>
        </div>
        <UAvatarGroup
          v-if="eventUsers.length > 0"
          size="md"
          :max="8"
          class="ml-3"
          :ui="{
            base: 'relative rounded-full ring-0 border-0 shadow-none outline-none first:me-0',
          }"
        >
          <UAvatar
            v-for="user in eventUsers"
            :key="user.id"
            :src="user.avatar || undefined"
            :alt="user.name"
            :ui="{
              root: 'relative rounded-full ring-0 border-0 shadow-none outline-none',
              image: 'rounded-full object-cover ring-0 border-0 shadow-none',
              fallback: 'rounded-full ring-0 border-0 shadow-none',
            }"
          />
        </UAvatarGroup>
      </div>
    </template>
  </button>
</template>
