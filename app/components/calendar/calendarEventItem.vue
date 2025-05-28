<script setup lang="ts">
import { format } from "date-fns";
import { getEventColorClasses } from "~/utils/calendarUtils";

const props = defineProps<{
  event: {
    id: string;
    title: string;
    start: string | Date;
    end: string | Date;
    allDay?: boolean;
    location?: string;
    description?: string;
    color?: string;
  };
  className?: string;
  onClick?: (e: MouseEvent) => void;
  onMouseDown?: (e: MouseEvent) => void;
  onTouchStart?: (e: TouchEvent) => void;
}>();

const emit = defineEmits<{
  (e: "click", event: MouseEvent): void;
  (e: "mousedown", event: MouseEvent): void;
  (e: "touchstart", event: TouchEvent): void;
}>();

const displayStart = computed(() => new Date(props.event.start));
const displayEnd = computed(() => new Date(props.event.end));

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
    :class="[getEventColorClasses(event.color), className]"
    :data-past-event="isPast(new Date(event.end)) || undefined"
    @click="handleClick"
    @mousedown="handleMouseDown"
    @touchstart="handleTouchStart"
  >
    <div class="text-sm font-medium">
      {{ event.title }}
    </div>
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
  </button>
</template>
