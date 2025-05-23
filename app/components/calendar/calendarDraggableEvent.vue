<script setup lang="ts">
import { differenceInDays } from "date-fns";
import draggable from "vuedraggable";

import { useDraggableEvents } from "~/composables/useDraggableEvents";

type Props = {
  event: CalendarEvent;
  view: "month" | "week" | "day";
  showTime?: boolean;
  onClick?: (e: MouseEvent) => void;
  height?: number;
  isMultiDay?: boolean;
  multiDayWidth?: number;
  isFirstDay?: boolean;
  isLastDay?: boolean;
  ariaHidden?: boolean | "true" | "false";
};

const props = withDefaults(defineProps<Props>(), {
  isFirstDay: true,
  isLastDay: true,
});

const emit = defineEmits<{
  (e: "dragstart", event: CalendarEvent): void;
  (e: "dragend"): void;
  (e: "click", event: MouseEvent): void;
}>();

const { handleDragStart, handleDragEnd } = useDraggableEvents();

// Check if this is a multi-day event
const eventStart = new Date(props.event.start);
const eventEnd = new Date(props.event.end);
const isMultiDayEvent = computed(() =>
  props.isMultiDay || props.event.allDay || differenceInDays(eventEnd, eventStart) >= 1,
);

const style = computed(() => ({
  height: props.height || "auto",
  width: isMultiDayEvent.value && props.multiDayWidth ? `${props.multiDayWidth}%` : undefined,
}));

function onDragStart(_event: any) {
  handleDragStart(props.event);
  emit("dragstart", props.event);
}

function onDragEnd(_event: any) {
  handleDragEnd();
  emit("dragend");
}
</script>

<template>
  <draggable
    :model-value="[event]"
    :clone="(event: CalendarEvent) => ({ ...event })"
    :group="{ name: 'events', pull: 'clone', put: false }"
    item-key="id"
    :style="style"
    class="select-none cursor-move"
    @start="onDragStart"
    @end="onDragEnd"
  >
    <template #item="{ element }">
      <CalendarEventItem
        :event="element"
        :view="view"
        :show-time="showTime"
        :is-first-day="isFirstDay"
        :is-last-day="isLastDay"
        :aria-hidden="ariaHidden"
        class="card bg-base-100 shadow-sm hover:shadow-md transition-shadow duration-200"
        @click="$emit('click', $event)"
      />
    </template>
  </draggable>
</template>
