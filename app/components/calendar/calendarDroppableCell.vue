<script setup lang="ts">
import draggable from "vuedraggable";

import type { CalendarEvent } from "~/utils/calendarTypes";

const props = defineProps<{
  id: string;
  date: Date;
  time: number;
}>();

const emit = defineEmits<{
  (e: "drop", event: CalendarEvent): void;
  (e: "click"): void;
}>();

function onAdd(event: any) {
  const draggedEvent = event.item.__draggable_component__?.props?.event as CalendarEvent;
  if (!draggedEvent)
    return;

  const newEvent = { ...draggedEvent };

  // Update the event's start and end times based on the drop location
  const newStart = new Date(props.date);
  const hours = Math.floor(props.time);
  const minutes = Math.round((props.time % 1) * 60);
  newStart.setHours(hours, minutes, 0, 0);

  const duration = new Date(draggedEvent.end).getTime() - new Date(draggedEvent.start).getTime();
  const newEnd = new Date(newStart.getTime() + duration);

  newEvent.start = newStart;
  newEvent.end = newEnd;

  // Ensure we have a unique ID for the new event
  if (!newEvent.id) {
    newEvent.id = `event-${Date.now()}`;
  }

  // Emit the updated event
  emit("drop", newEvent);
  
  // Remove the dragged element from the DOM
  if (event.item && event.item.parentNode) {
    event.item.parentNode.removeChild(event.item);
  }
}
</script>

<template>
  <draggable
    :model-value="[]"
    :group="{ name: 'events', pull: false, put: true }"
    item-key="id"
    class="absolute h-[calc(var(--day-cells-height)/4)] w-full"
    @add="onAdd"
    @click="$emit('click')"
  >
    <template #item>
      <slot />
    </template>
  </draggable>
</template>
