<script setup lang="ts">
import type { DateValue } from "@internationalized/date";

import { CalendarDate, DateFormatter, getLocalTimeZone, parseDate } from "@internationalized/date";
import { format, isBefore } from "date-fns";

import type { CalendarEvent } from "~/types/calendar";

import { useCalendar } from "~/composables/useCalendar";
import { useStableDate } from "~/composables/useStableDate";
import { useUsers } from "~/composables/useUsers";

const props = defineProps<{
  event: CalendarEvent | null;
  isOpen: boolean;
  integrationCapabilities?: string[];
  integrationServiceName?: string;
}>();

const emit = defineEmits<{
  (e: "close"): void;
  (e: "save", event: CalendarEvent): void;
  (e: "delete", eventId: string): void;
}>();

const { users, fetchUsers } = useUsers();

// Use global stable date
const { getStableDate, parseStableDate } = useStableDate();

// Use calendar timestamp handling functions
const { getEventStartTimeForInput, getEventEndTimeForInput, getEventEndDateForInput, convertLocalToUTC } = useCalendar();

const StartHour = 0;
const EndHour = 23;
const DefaultStartHour = 9;
const DefaultEndHour = 10;

const title = ref("");
const description = ref("");
const startDate = ref<DateValue>(new CalendarDate(2022, 2, 6));
const endDate = ref<DateValue>(new CalendarDate(2022, 2, 6));
const startTime = ref(`${DefaultStartHour}:00`);
const endTime = ref(`${DefaultEndHour}:00`);
const allDay = ref(false);
const location = ref("");
const selectedUsers = ref<string[]>([]);
const error = ref<string | null>(null);

const timeOptions = computed(() => {
  const options = [];
  for (let hour = StartHour; hour <= EndHour; hour++) {
    for (let minute = 0; minute < 60; minute += 5) {
      const formattedHour = hour.toString().padStart(2, "0");
      const formattedMinute = minute.toString().padStart(2, "0");
      const value = `${formattedHour}:${formattedMinute}`;
      // Use a fixed date for time formatting to avoid hydration mismatches
      const date = new Date(2000, 0, 1, hour, minute);
      const label = format(date, "h:mm a");
      options.push({ value, label });
    }
  }
  return options;
});

const canEdit = computed(() => {
  if (!props.integrationCapabilities)
    return true;
  return props.integrationCapabilities.includes("edit_events");
});

const canDelete = computed(() => {
  if (!props.integrationCapabilities)
    return true;
  return props.integrationCapabilities.includes("delete_events");
});

const canAdd = computed(() => {
  if (!props.integrationCapabilities)
    return true;
  return props.integrationCapabilities.includes("add_events");
});

const isReadOnly = computed(() => {
  return Boolean(props.event && !canEdit.value);
});

watch(() => props.isOpen, async (isOpen) => {
  if (isOpen) {
    await fetchUsers();
  }
});

watch(() => props.event, (newEvent) => {
  if (newEvent) {
    title.value = newEvent.title || "";
    description.value = newEvent.description || "";
    // Use stable date parsing to avoid hydration mismatches
    const start = newEvent.start instanceof Date ? newEvent.start : parseStableDate(newEvent.start);
    startDate.value = parseDate(start.toISOString().split("T")[0]!);
    endDate.value = parseDate(getEventEndDateForInput(newEvent));
    startTime.value = getEventStartTimeForInput(newEvent);
    endTime.value = getEventEndTimeForInput(newEvent);
    allDay.value = newEvent.allDay || false;
    location.value = newEvent.location || "";
    selectedUsers.value = newEvent.users?.map(user => user.id) || [];
    error.value = null;
  }
  else {
    resetForm();
  }
}, { immediate: true });

function resetForm() {
  title.value = "";
  description.value = "";
  // Use a stable date reference to avoid hydration mismatches
  startDate.value = parseDate(getStableDate().toISOString().split("T")[0]!);
  endDate.value = parseDate(getStableDate().toISOString().split("T")[0]!);
  startTime.value = `${DefaultStartHour}:00`;
  endTime.value = `${DefaultEndHour}:00`;
  allDay.value = false;
  location.value = "";
  selectedUsers.value = [];
  error.value = null;
}

function handleSave() {
  if (!canAdd.value && !props.event) {
    error.value = "This integration does not support creating new events";
    return;
  }

  if (!canEdit.value && props.event) {
    error.value = "This integration does not support editing events";
    return;
  }

  if (!startDate.value || !endDate.value) {
    error.value = "Invalid date selection";
    return;
  }

  let start: Date;
  let end: Date;

  if (allDay.value) {
    // All-day events: use UTC day boundaries
    start = startDate.value.toDate("UTC");
    end = endDate.value.toDate("UTC");

    // Set UTC day boundaries for all-day events
    start.setUTCHours(0, 0, 0, 0);
    end.setUTCHours(23, 59, 59, 999);
  }
  else {
    // Timed events: create local datetime and convert to UTC
    const startLocal = startDate.value.toDate(getLocalTimeZone());
    const endLocal = endDate.value.toDate(getLocalTimeZone());

    // Validate time ranges
    const [startHours = 0] = startTime.value.split(":").map(Number);
    const [endHours = 0] = endTime.value.split(":").map(Number);

    if (
      startHours < StartHour
      || startHours > EndHour
      || endHours < StartHour
      || endHours > EndHour
    ) {
      error.value = `Selected time must be between ${StartHour}:00 and ${EndHour}:00`;
      return;
    }

    // Set the time on the local dates
    const [startHoursFull = 0, startMinutes = 0] = startTime.value.split(":").map(Number);
    const [endHoursFull = 0, endMinutes = 0] = endTime.value.split(":").map(Number);

    startLocal.setHours(startHoursFull, startMinutes, 0, 0);
    endLocal.setHours(endHoursFull, endMinutes, 0, 0);

    // Convert local time to UTC while preserving the intended local time
    start = convertLocalToUTC(startLocal);
    end = convertLocalToUTC(endLocal);
  }

  if (isBefore(end, start)) {
    error.value = "End date cannot be before start date";
    return;
  }

  const eventTitle = title.value.trim() ? title.value : "(no title)";

  const selectedUserObjects = users.value
    .filter(user => selectedUsers.value.includes(user.id))
    .map(user => ({
      id: user.id,
      name: user.name,
      avatar: user.avatar,
      color: user.color,
    }));

  emit("save", {
    id: props.event?.id || "",
    title: eventTitle,
    description: description.value,
    start,
    end,
    allDay: allDay.value,
    location: location.value,
    color: props.event?.color || "sky",
    users: selectedUserObjects,
  });
}

function handleDelete() {
  if (!canDelete.value) {
    error.value = "This integration does not support deleting events";
    return;
  }

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
        <div v-if="isReadOnly" class="bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 rounded-md px-3 py-2 text-sm">
          This event cannot be edited. {{ integrationServiceName || 'This integration' }} does not support editing events.
        </div>
        <div class="space-y-2">
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-200">Title</label>
          <UInput
            v-model="title"
            placeholder="Event title"
            class="w-full"
            :ui="{ base: 'w-full' }"
            :disabled="isReadOnly"
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
            :disabled="isReadOnly"
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
                :disabled="isReadOnly"
              >
                <NuxtTime
                  v-if="startDate"
                  :datetime="startDate.toDate(getLocalTimeZone())"
                  year="numeric"
                  month="short"
                  day="numeric"
                />
                <span v-else>Select a date</span>
              </UButton>
              <template #content>
                <UCalendar
                  :model-value="startDate as DateValue"
                  class="p-2"
                  :disabled="isReadOnly"
                  @update:model-value="(value) => { if (value) startDate = value as DateValue }"
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
              :disabled="isReadOnly"
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
                :disabled="isReadOnly"
              >
                <NuxtTime
                  v-if="endDate"
                  :datetime="endDate.toDate(getLocalTimeZone())"
                  year="numeric"
                  month="short"
                  day="numeric"
                />
                <span v-else>Select a date</span>
              </UButton>
              <template #content>
                <UCalendar
                  :model-value="endDate as DateValue"
                  class="p-2"
                  :disabled="isReadOnly"
                  @update:model-value="(value) => { if (value) endDate = value as DateValue }"
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
              :disabled="isReadOnly"
            />
          </div>
        </div>
        <div class="flex items-center gap-2">
          <UCheckbox
            v-model="allDay"
            label="All day"
            :disabled="isReadOnly"
          />
        </div>
        <div class="space-y-2">
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-200">Location</label>
          <UInput
            v-model="location"
            placeholder="Event location"
            class="w-full"
            :ui="{ base: 'w-full' }"
            :disabled="isReadOnly"
          />
        </div>
        <div class="space-y-2">
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-200">Users</label>
          <div class="space-y-2">
            <div class="text-sm text-gray-600 dark:text-gray-400 mb-2">
              {{ event?.id ? 'Edit users for this event:' : 'Select users for this event:' }}
            </div>
            <div class="flex flex-wrap gap-2">
              <UButton
                v-for="user in users"
                :key="user.id"
                variant="ghost"
                size="sm"
                class="p-1"
                :class="selectedUsers.includes(user.id) ? 'ring-2 ring-primary-500' : ''"
                :disabled="isReadOnly"
                @click="selectedUsers.includes(user.id) ? selectedUsers = selectedUsers.filter(id => id !== user.id) : selectedUsers.push(user.id)"
              >
                <UAvatar
                  :src="user.avatar || undefined"
                  :alt="user.name"
                  size="xl"
                />
              </UButton>
            </div>
            <div v-if="!users.length" class="text-sm text-gray-500 dark:text-gray-400">
              No users found! Please add some users in the <NuxtLink to="/settings" class="text-primary">
                settings
              </NuxtLink> page.
            </div>
          </div>
        </div>
      </div>
      <div class="flex justify-between p-4 border-t border-gray-200 dark:border-gray-700">
        <UButton
          v-if="event?.id && canDelete"
          color="error"
          variant="ghost"
          icon="i-lucide-trash"
          @click="handleDelete"
        >
          Delete
        </UButton>
        <div class="flex gap-2" :class="{ 'ml-auto': !event?.id || !canDelete }">
          <UButton
            color="neutral"
            variant="ghost"
            @click="emit('close')"
          >
            Cancel
          </UButton>
          <UButton
            v-if="!isReadOnly"
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
