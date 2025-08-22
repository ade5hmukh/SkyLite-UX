<script setup lang="ts">
import type { DateValue } from "@internationalized/date";

import { CalendarDate, getLocalTimeZone, parseDate } from "@internationalized/date";
import { consola } from "consola";
import { isBefore } from "date-fns";
import ical from "ical.js";

import type { CalendarEvent } from "~/types/calendar";

import { useCalendar } from "~/composables/useCalendar";
// Removed: useStableDate is no longer needed
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
// Removed: getStableDate and parseStableDate are no longer needed

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

// Removed: startTime and endTime are now replaced with separate components
const allDay = ref(false);
const location = ref("");
const selectedUsers = ref<string[]>([]);
const error = ref<string | null>(null);

// Time picker options
const hourOptions = computed(() => {
  const options = [];
  for (let hour = 1; hour <= 12; hour++) {
    options.push({ value: hour, label: hour.toString() });
  }
  return options;
});

const minuteOptions = computed(() => {
  const options = [];
  for (let minute = 0; minute < 60; minute += 5) {
    const formattedMinute = minute.toString().padStart(2, "0");
    options.push({ value: minute, label: formattedMinute });
  }
  return options;
});

const amPmOptions = [
  { value: "AM", label: "AM" },
  { value: "PM", label: "PM" },
];

// Separate time components
const startHour = ref(DefaultStartHour);
const startMinute = ref(0);
const startAmPm = ref("AM");
const endHour = ref(DefaultEndHour);
const endMinute = ref(0);
const endAmPm = ref("AM");

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

// Auto-update end date/time when start date/time changes
watch(startDate, (newStartDate) => {
  if (newStartDate && endDate.value) {
    const startTime = newStartDate.toDate(getLocalTimeZone());
    const endTime = endDate.value.toDate(getLocalTimeZone());

    // If start date is after end date, update end date to match start date
    if (startTime > endTime) {
      endDate.value = newStartDate;
    }
  }
});

// Auto-update start date when end date changes
watch(endDate, (newEndDate) => {
  if (newEndDate && startDate.value) {
    const startTime = startDate.value.toDate(getLocalTimeZone());
    const endTime = newEndDate.toDate(getLocalTimeZone());

    // If end date is before start date, update start date to match end date
    if (endTime < startTime) {
      startDate.value = newEndDate;
    }
  }
});

watch(startHour, () => updateEndTime());
watch(startMinute, () => updateEndTime());
watch(startAmPm, () => updateEndTime());

// Auto-update start time when end time changes
watch(endHour, () => updateStartTime());
watch(endMinute, () => updateStartTime());
watch(endAmPm, () => updateStartTime());

// Note: allDay watcher removed to prevent interference with event loading
// All-day toggle logic is now handled directly in the UI component

// Handle all-day toggle when user changes the checkbox
function handleAllDayToggle() {
  // Check the current value of allDay ref
  if (!allDay.value) {
    // When switching from all-day to timed, set smart time defaults like resetForm()
    const now = new Date();

    // Round current time to nearest 5 minutes
    const currentMinutes = now.getMinutes();
    const roundedMinutes = Math.round(currentMinutes / 5) * 5;

    // Handle minute overflow (e.g., 58 minutes rounds to 60, which becomes next hour)
    let currentHour = now.getHours();
    let adjustedMinutes = roundedMinutes;

    if (adjustedMinutes === 60) {
      adjustedMinutes = 0;
      currentHour += 1;
    }

    // Convert to 12-hour format
    let startHourValue = currentHour;
    let startAmPmValue = "AM";

    if (startHourValue === 0) {
      startHourValue = 12;
    }
    else if (startHourValue > 12) {
      startHourValue -= 12;
      startAmPmValue = "PM";
    }
    else if (startHourValue === 12) {
      startAmPmValue = "PM";
    }

    // Set start time
    startHour.value = startHourValue;
    startMinute.value = adjustedMinutes;
    startAmPm.value = startAmPmValue;

    // Set end time to 30 minutes after start time
    let endHourValue = startHour.value;
    let endMinuteValue = startMinute.value + 30;
    let endAmPmValue = startAmPm.value;

    // Handle minute overflow (e.g., 1:45 + 30 = 2:15)
    if (endMinuteValue >= 60) {
      endMinuteValue -= 60;
      endHourValue += 1;
    }

    // Handle hour overflow (e.g., 11:45 + 30 = 12:15)
    if (endHourValue > 12) {
      endHourValue -= 12;
      endAmPmValue = endAmPmValue === "AM" ? "PM" : "AM";
    }

    // Handle 12-hour format edge cases
    if (endHourValue === 0) {
      endHourValue = 12;
    }

    endHour.value = endHourValue;
    endMinute.value = endMinuteValue;
    endAmPm.value = endAmPmValue;
  }
}

watch(() => props.event, (newEvent) => {
  if (newEvent && newEvent.id) {
    title.value = newEvent.title || "";
    description.value = newEvent.description || "";
    // Parse the event start date
    const start = newEvent.start instanceof Date ? newEvent.start : new Date(newEvent.start);
    startDate.value = parseDate(start.toISOString().split("T")[0]!);
    endDate.value = parseDate(getEventEndDateForInput(newEvent));
    // Parse time into separate components
    const startTimeStr = getEventStartTimeForInput(newEvent);
    const endTimeStr = getEventEndTimeForInput(newEvent);

    // Parse start time
    const startTimeParts = startTimeStr.split(":");
    if (startTimeParts.length >= 2) {
      const startTimeHour = Number.parseInt(startTimeParts[0]!);
      const startHourValue = startTimeHour === 0 ? 12 : startTimeHour > 12 ? startTimeHour - 12 : startTimeHour;
      startHour.value = startHourValue;
      startMinute.value = Number.parseInt(startTimeParts[1]!);
      startAmPm.value = startTimeHour >= 12 ? "PM" : "AM";
    }

    // Parse end time
    const endTimeParts = endTimeStr.split(":");
    if (endTimeParts.length >= 2) {
      const endTimeHour = Number.parseInt(endTimeParts[0]!);
      endHour.value = endTimeHour === 0 ? 12 : endTimeHour > 12 ? endTimeHour - 12 : endTimeHour;
      endMinute.value = Number.parseInt(endTimeParts[1]!);
      endAmPm.value = endTimeHour >= 12 ? "PM" : "AM";
    }
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

  // Set smart defaults for dates and times
  const now = new Date();

  // Set start and end date to today
  const todayString = now.toISOString().split("T")[0];
  if (todayString) {
    const todayDate = parseDate(todayString);
    startDate.value = todayDate;
    endDate.value = todayDate;
  }

  // Round current time to nearest 5 minutes
  const currentMinutes = now.getMinutes();
  const roundedMinutes = Math.round(currentMinutes / 5) * 5;

  // Handle minute overflow (e.g., 58 minutes rounds to 60, which becomes next hour)
  let currentHour = now.getHours();
  let adjustedMinutes = roundedMinutes;

  if (adjustedMinutes === 60) {
    adjustedMinutes = 0;
    currentHour += 1;
  }

  // Convert to 12-hour format
  let startHourValue = currentHour;
  let startAmPmValue = "AM";

  if (startHourValue === 0) {
    startHourValue = 12;
  }
  else if (startHourValue > 12) {
    startHourValue -= 12;
    startAmPmValue = "PM";
  }
  else if (startHourValue === 12) {
    startAmPmValue = "PM";
  }

  // Set start time
  startHour.value = startHourValue;
  startMinute.value = adjustedMinutes;
  startAmPm.value = startAmPmValue;

  // Set end time to 30 minutes after start time
  let endHourValue = startHour.value;
  let endMinuteValue = startMinute.value + 30;
  let endAmPmValue = startAmPm.value;

  // Handle minute overflow (e.g., 1:45 + 30 = 2:15)
  if (endMinuteValue >= 60) {
    endMinuteValue -= 60;
    endHourValue += 1;
  }

  // Handle hour overflow (e.g., 11:45 + 30 = 12:15)
  if (endHourValue > 12) {
    endHourValue -= 12;
    endAmPmValue = endAmPmValue === "AM" ? "PM" : "AM";
  }

  // Handle 12-hour format edge cases
  if (endHourValue === 0) {
    endHourValue = 12;
  }

  endHour.value = endHourValue;
  endMinute.value = endMinuteValue;
  endAmPm.value = endAmPmValue;

  allDay.value = false;
  location.value = "";
  selectedUsers.value = [];
  error.value = null;
}

function updateEndTime() {
  if (allDay.value)
    return; // Don't update time for all-day events

  // Only update if start time would be after end time
  if (isStartTimeAfterEndTime()) {
    // Set end time to be 30 minutes after start time
    let endHourValue = startHour.value;
    let endMinuteValue = startMinute.value + 30;
    let endAmPmValue = startAmPm.value;

    // Handle minute overflow (e.g., 1:45 + 30 = 2:15)
    if (endMinuteValue >= 60) {
      endMinuteValue -= 60;
      endHourValue += 1;
    }

    // Handle hour overflow (e.g., 11:45 + 30 = 12:15)
    if (endHourValue > 12) {
      endHourValue -= 12;
      endAmPmValue = endAmPmValue === "AM" ? "PM" : "AM";
    }

    // Handle 12-hour format edge cases
    if (endHourValue === 0) {
      endHourValue = 12;
    }

    endHour.value = endHourValue;
    endMinute.value = endMinuteValue;
    endAmPm.value = endAmPmValue;
  }
}

function updateStartTime() {
  if (allDay.value)
    return; // Don't update time for all-day events

  // Only update if end time would be before start time
  if (isEndTimeBeforeStartTime()) {
    // Set start time to be 30 minutes before end time
    let startHourValue = endHour.value;
    let startMinuteValue = endMinute.value - 30;
    let startAmPmValue = endAmPm.value;

    // Handle minute underflow (e.g., 2:15 - 30 = 1:45)
    if (startMinuteValue < 0) {
      startMinuteValue += 60;
      startHourValue -= 1;
    }

    // Handle hour underflow (e.g., 12:15 - 30 = 11:45)
    if (startHourValue < 1) {
      startHourValue += 12;
      startAmPmValue = startAmPmValue === "AM" ? "PM" : "AM";
    }

    // Handle 12-hour format edge cases
    if (startHourValue === 0) {
      startHourValue = 12;
    }

    startHour.value = startHourValue;
    startMinute.value = startMinuteValue;
    startAmPm.value = startAmPmValue;
  }
}

function isStartTimeAfterEndTime(): boolean {
  const startTime24 = startAmPm.value === "PM" && startHour.value !== 12 ? startHour.value + 12 : startHour.value === 12 && startAmPm.value === "AM" ? 0 : startHour.value;
  const endTime24 = endAmPm.value === "PM" && endHour.value !== 12 ? endHour.value + 12 : endHour.value === 12 && endAmPm.value === "AM" ? 0 : endHour.value;

  // Convert to minutes for easy comparison
  const startMinutes = startTime24 * 60 + startMinute.value;
  const endMinutes = endTime24 * 60 + endMinute.value;

  return startMinutes > endMinutes;
}

function isEndTimeBeforeStartTime(): boolean {
  return isStartTimeAfterEndTime();
}

// Removed: setSmartDefaults function is no longer needed

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

  try {
    if (allDay.value) {
      // All-day events: create in local timezone, then convert to UTC using ical.js
      const startLocal = startDate.value.toDate(getLocalTimeZone());
      const endLocal = endDate.value.toDate(getLocalTimeZone());

      // Set to midnight in local timezone (preserving user's intended day)
      // iCal standard: start is inclusive, end is exclusive
      startLocal.setHours(0, 0, 0, 0);

      // For all all-day events, end should be the day after the last day at midnight
      // This follows the iCal standard: start is inclusive, end is exclusive
      if (startDate.value.toDate(getLocalTimeZone()).getTime() === endDate.value.toDate(getLocalTimeZone()).getTime()) {
        // Single day event: end is next day at midnight
        endLocal.setDate(endLocal.getDate() + 1);
        endLocal.setHours(0, 0, 0, 0);
      }
      else {
        // Multi-day event: end is the day after the last day at midnight
        endLocal.setDate(endLocal.getDate() + 1);
        endLocal.setHours(0, 0, 0, 0);
      }

      // Use ical.js to convert local midnight to UTC properly
      const browserTimezone = (globalThis as any).__BROWSER_TIMEZONE__;
      const timezone = ical.TimezoneService.get(browserTimezone);

      // Logging removed for cleaner output

      if (timezone) {
        // Convert local midnight to UTC using ical.js
        // Use the same approach as timed events for consistency
        const startICal = ical.Time.fromJSDate(startLocal, true); // true = UTC time
        const endICal = ical.Time.fromJSDate(endLocal, true); // true = UTC time

        // Convert from UTC to local timezone, then back to UTC
        const startLocalICal = startICal.convertToZone(timezone);
        const endLocalICal = endICal.convertToZone(timezone);

        // Now convert the local timezone times back to UTC
        const startUTC = startLocalICal.convertToZone(ical.TimezoneService.get("UTC"));
        const endUTC = endLocalICal.convertToZone(ical.TimezoneService.get("UTC"));

        start = startUTC.toJSDate();
        end = endUTC.toJSDate();

        // Logging removed for cleaner output
      }
      else {
        // Fallback to manual UTC conversion if timezone not available
        // iCal standard: start is inclusive, end is exclusive
        start = new Date(Date.UTC(startLocal.getFullYear(), startLocal.getMonth(), startLocal.getDate()));
        end = new Date(Date.UTC(endLocal.getFullYear(), endLocal.getMonth(), endLocal.getDate()));

        // Logging removed for cleaner output
      }
    }
    else {
      // Timed events: create local datetime and convert to UTC using ical.js
      const startLocal = startDate.value.toDate(getLocalTimeZone());
      const endLocal = endDate.value.toDate(getLocalTimeZone());

      // Validate time ranges
      const startHours24 = startAmPm.value === "PM" && startHour.value !== 12 ? startHour.value + 12 : startHour.value === 12 && startAmPm.value === "AM" ? 0 : startHour.value;
      const endHours24 = endAmPm.value === "PM" && endHour.value !== 12 ? endHour.value + 12 : endHour.value === 12 && endAmPm.value === "AM" ? 0 : endHour.value;

      if (
        startHours24 < StartHour
        || startHours24 > EndHour
        || endHours24 < StartHour
        || endHours24 > EndHour
      ) {
        error.value = `Selected time must be between ${StartHour}:00 and ${EndHour}:00`;
        return;
      }

      // Set the time on the local dates
      startLocal.setHours(startHours24, startMinute.value, 0, 0);
      endLocal.setHours(endHours24, endMinute.value, 0, 0);

      // Use ical.js to convert local time to UTC properly
      const browserTimezone = (globalThis as any).__BROWSER_TIMEZONE__;
      const timezone = ical.TimezoneService.get(browserTimezone);

      // Logging removed for cleaner output

      if (timezone) {
        // Convert local time to UTC using ical.js
        // First create a time object in UTC, then convert it to the local timezone
        // This ensures proper timezone conversion
        const startICal = ical.Time.fromJSDate(startLocal, true); // true = UTC time
        const endICal = ical.Time.fromJSDate(endLocal, true); // true = UTC time

        // Convert from UTC to local timezone, then back to UTC
        // This simulates what happens when a user selects local time
        const startLocalICal = startICal.convertToZone(timezone);
        const endLocalICal = endICal.convertToZone(timezone);

        // Now convert the local timezone times back to UTC
        const startUTC = startLocalICal.convertToZone(ical.TimezoneService.get("UTC"));
        const endUTC = endLocalICal.convertToZone(ical.TimezoneService.get("UTC"));

        start = startUTC.toJSDate();
        end = endUTC.toJSDate();

        // Logging removed for cleaner output
      }
      else {
        // Fallback to manual UTC conversion if timezone not available
        start = convertLocalToUTC(startLocal);
        end = convertLocalToUTC(endLocal);

        // Logging removed for cleaner output
      }
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

    const eventData = {
      id: props.event?.id || "",
      title: eventTitle,
      description: description.value,
      start,
      end,
      allDay: allDay.value,
      location: location.value,
      color: props.event?.color || "sky",
      users: selectedUserObjects,
    };

    // Logging removed for cleaner output

    emit("save", eventData);
  }
  catch (error: any) {
    consola.error("Error converting dates in handleSave:", error);
    error.value = "Failed to process event dates. Please try again.";
  }
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
            <div class="flex gap-2">
              <USelect
                v-model="startHour"
                :items="hourOptions"
                option-attribute="label"
                value-attribute="value"
                class="flex-1"
                :ui="{ base: 'flex-1' }"
                :disabled="isReadOnly"
              />
              <USelect
                v-model="startMinute"
                :items="minuteOptions"
                option-attribute="label"
                value-attribute="value"
                class="flex-1"
                :ui="{ base: 'flex-1' }"
                :disabled="isReadOnly"
              />
              <USelect
                v-model="startAmPm"
                :items="amPmOptions"
                option-attribute="label"
                value-attribute="value"
                class="flex-1"
                :ui="{ base: 'flex-1' }"
                :disabled="isReadOnly"
              />
            </div>
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
            <div class="flex gap-2">
              <USelect
                v-model="endHour"
                :items="hourOptions"
                option-attribute="label"
                value-attribute="value"
                class="flex-1"
                :ui="{ base: 'flex-1' }"
                :disabled="isReadOnly"
              />
              <USelect
                v-model="endMinute"
                :items="minuteOptions"
                option-attribute="label"
                value-attribute="value"
                class="flex-1"
                :ui="{ base: 'flex-1' }"
                :disabled="isReadOnly"
              />
              <USelect
                v-model="endAmPm"
                :items="amPmOptions"
                option-attribute="label"
                value-attribute="value"
                class="flex-1"
                :ui="{ base: 'flex-1' }"
                :disabled="isReadOnly"
              />
            </div>
          </div>
        </div>
        <div class="flex items-center gap-2">
          <UCheckbox
            v-model="allDay"
            label="All day"
            :disabled="isReadOnly"
            @change="handleAllDayToggle"
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
