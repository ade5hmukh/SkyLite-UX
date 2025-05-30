<script setup lang="ts">
import type { DateValue } from "@internationalized/date";

import { CalendarDate, DateFormatter, getLocalTimeZone, parseDate } from "@internationalized/date";
import { format, isBefore } from "date-fns";

import type { CalendarEvent } from "~/utils/calendarTypes";
import { getEventColorClasses } from "~/utils/calendarUtils";

type EventColor = "sky" | "violet" | "rose" | "emerald" | "orange";

const props = defineProps<{
  event: CalendarEvent | null;
  isOpen: boolean;
  position?: { top: number; left: number };
}>();

const emit = defineEmits<{
  (e: "close"): void;
  (e: "save", event: CalendarEvent): void;
  (e: "delete", eventId: string): void;
}>();

// Constants
const StartHour = 0;
const EndHour = 23;
const DefaultStartHour = 9;
const DefaultEndHour = 10;
const df = new DateFormatter("en-US", {
  dateStyle: "medium",
});

// Form state
const title = ref("");
const description = ref("");
const startDate = ref<DateValue>(new CalendarDate(2022, 2, 6));
const endDate = ref<DateValue>(new CalendarDate(2022, 2, 6));
const startTime = ref(`${DefaultStartHour}:00`);
const endTime = ref(`${DefaultEndHour}:00`);
const allDay = ref(false);
const location = ref("");
const color = ref<EventColor>("sky");
const error = ref<string | null>(null);

// Color options
const colorOptions = [
  { value: "sky", label: "Blue" },
  { value: "violet", label: "Violet" },
  { value: "rose", label: "Rose" },
  { value: "emerald", label: "Emerald" },
  { value: "orange", label: "Orange" },
];

// Time options
const timeOptions = computed(() => {
  const options = [];
  for (let hour = StartHour; hour <= EndHour; hour++) {
    for (let minute = 0; minute < 60; minute += 15) {
      const formattedHour = hour.toString().padStart(2, "0");
      const formattedMinute = minute.toString().padStart(2, "0");
      const value = `${formattedHour}:${formattedMinute}`;
      const date = new Date(2000, 0, 1, hour, minute);
      const label = format(date, "h:mm a");
      options.push({ value, label });
    }
  }
  return options;
});

// Watch for event changes
watch(() => props.event, (newEvent) => {
  if (newEvent) {
    title.value = newEvent.title || "";
    description.value = newEvent.description || "";
    const start = new Date(newEvent.start);
    const end = new Date(newEvent.end);
    startDate.value = parseDate(start.toISOString().split("T")[0]!);
    endDate.value = parseDate(end.toISOString().split("T")[0]!);
    startTime.value = formatTimeForInput(start);
    endTime.value = formatTimeForInput(end);
    allDay.value = newEvent.allDay || false;
    location.value = newEvent.location || "";
    color.value = (newEvent.color as EventColor) || "blue";
    error.value = null;
  }
  else {
    resetForm();
  }
}, { immediate: true });

function resetForm() {
  title.value = "";
  description.value = "";
  const now = new Date();
  startDate.value = parseDate(now.toISOString().split("T")[0]!);
  endDate.value = parseDate(now.toISOString().split("T")[0]!);
  startTime.value = `${DefaultStartHour}:00`;
  endTime.value = `${DefaultEndHour}:00`;
  allDay.value = false;
  location.value = "";
  color.value = "blue";
  error.value = null;
}

function formatTimeForInput(date: Date) {
  const hours = date.getHours().toString().padStart(2, "0");
  const minutes = Math.floor(date.getMinutes() / 15) * 15;
  return `${hours}:${minutes.toString().padStart(2, "0")}`;
}

function handleSave() {
  if (!startDate.value || !endDate.value) {
    error.value = "Invalid date selection";
    return;
  }

  const start = startDate.value.toDate(getLocalTimeZone());
  const end = endDate.value.toDate(getLocalTimeZone());

  if (!allDay.value) {
    const [startHours = 0, startMinutes = 0] = startTime.value.split(":").map(Number);
    const [endHours = 0, endMinutes = 0] = endTime.value.split(":").map(Number);

    if (
      startHours < StartHour
      || startHours > EndHour
      || endHours < StartHour
      || endHours > EndHour
    ) {
      error.value = `Selected time must be between ${StartHour}:00 and ${EndHour}:00`;
      return;
    }

    start.setHours(startHours, startMinutes, 0);
    end.setHours(endHours, endMinutes, 0);
  }
  else {
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);
  }

  if (isBefore(end, start)) {
    error.value = "End date cannot be before start date";
    return;
  }

  const eventTitle = title.value.trim() ? title.value : "(no title)";

  emit("save", {
    id: props.event?.id || "",
    title: eventTitle,
    description: description.value,
    start: new Date(start),
    end: new Date(end),
    allDay: allDay.value,
    location: location.value,
    color: color.value,
  });
}

function handleDelete() {
  if (props.event?.id) {
    emit("delete", props.event.id);
  }
}
</script>

<template>
  <div
    v-if="isOpen"
    class="fixed inset-0 z-[100] flex items-center justify-center bg-black/50"
    @click="emit('close')"
  >
    <div
      class="w-[425px] max-h-[90vh] overflow-y-auto bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 shadow-lg"
      @click.stop
    >
      <div class="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
        <h3 class="text-base font-semibold leading-6">
          {{ event?.id ? 'Edit Event' : 'Create Event' }}
        </h3>
        <UButton
          color="neutral"
          variant="ghost"
          icon="i-lucide-x"
          class="-my-1"
          @click="emit('close')"
        />
      </div>

      <div class="p-4 space-y-6">
        <div v-if="error" class="bg-red-50 dark:bg-red-950 text-red-600 dark:text-red-400 rounded-md px-3 py-2 text-sm">
          {{ error }}
        </div>

        <div class="space-y-2">
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-200">Title</label>
          <UInput
            v-model="title"
            placeholder="Event title"
            class="w-full"
            :ui="{ base: 'w-full' }"
          />
        </div>

        <div class="space-y-2">
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-200">Description</label>
          <UTextarea
            v-model="description"
            placeholder="Event description"
            :rows="3"
            class="w-full"
            :ui="{ base: 'w-full' }"
          />
        </div>

        <div class="flex gap-4">
          <div class="w-1/2 space-y-2">
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-200">Start Date</label>
            <UPopover>
              <UButton
                color="neutral"
                variant="subtle"
                icon="i-lucide-calendar"
                class="w-full justify-between"
              >
                {{ startDate ? df.format(startDate.toDate(getLocalTimeZone())) : 'Select a date' }}
              </UButton>

              <template #content>
                <UCalendar
                  v-model="startDate as any"
                  class="p-2"
                />
              </template>
            </UPopover>
          </div>

          <div v-if="!allDay" class="w-1/2 space-y-2">
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-200">Start Time</label>
            <USelect
              v-model="startTime"
              :items="timeOptions"
              option-attribute="label"
              value-attribute="value"
              class="w-full"
              :ui="{ base: 'w-full' }"
            />
          </div>
        </div>

        <div class="flex gap-4">
          <div class="w-1/2 space-y-2">
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-200">End Date</label>
            <UPopover>
              <UButton
                color="neutral"
                variant="subtle"
                icon="i-lucide-calendar"
                class="w-full justify-between"
              >
                {{ endDate ? df.format(endDate.toDate(getLocalTimeZone())) : 'Select a date' }}
              </UButton>

              <template #content>
                <UCalendar
                  v-model="endDate as any"
                  class="p-2"
                />
              </template>
            </UPopover>
          </div>

          <div v-if="!allDay" class="w-1/2 space-y-2">
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-200">End Time</label>
            <USelect
              v-model="endTime"
              :items="timeOptions"
              option-attribute="label"
              value-attribute="value"
              class="w-full"
              :ui="{ base: 'w-full' }"
            />
          </div>
        </div>

        <div class="flex items-center gap-2">
          <UCheckbox
            v-model="allDay"
            label="All day"
          />
        </div>

        <div class="space-y-2">
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-200">Location</label>
          <UInput
            v-model="location"
            placeholder="Event location"
            class="w-full"
            :ui="{ base: 'w-full' }"
          />
        </div>

        <div class="space-y-2">
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-200">Color</label>
          <UButtonGroup orientation="horizontal" class="flex gap-1.5">
            <UButton
              v-for="option in colorOptions"
              :key="option.value"
              variant="ghost"
              class="size-6 p-0 size-6 transition-all duration-200"
              @click="color = option.value as EventColor"
            >
              <div
                class="size-4 rounded-full"
                :class="[
                  getEventColorClasses(option.value),
                  color === option.value ? 'ring-2 ring-gray-200' : '',
                ]"
              />
            </UButton>
          </UButtonGroup>
        </div>
      </div>

      <div class="flex justify-between p-4 border-t border-gray-200 dark:border-gray-700">
        <UButton
          v-if="event?.id"
          color="error"
          variant="ghost"
          icon="i-lucide-trash"
          @click="handleDelete"
        >
          Delete
        </UButton>
        <div class="flex gap-2">
          <UButton
            color="neutral"
            variant="ghost"
            @click="emit('close')"
          >
            Cancel
          </UButton>
          <UButton
            color="primary"
            @click="handleSave"
          >
            Save
          </UButton>
        </div>
      </div>
    </div>
  </div>
</template>
