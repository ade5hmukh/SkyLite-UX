<script setup lang="ts">
import type { DateValue } from "@internationalized/date";

import { CalendarDate, getLocalTimeZone, parseDate } from "@internationalized/date";
import { consola } from "consola";
import { isBefore } from "date-fns";
import ical from "ical.js";

import type { CalendarEvent } from "~/types/calendar";

import { useCalendar } from "~/composables/useCalendar";
import { useUsers } from "~/composables/useUsers";
import { getBrowserTimezone } from "~/types/global";

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

const { getEventStartTimeForInput, getEventEndTimeForInput, getEventEndDateForInput, convertLocalToUTC } = useCalendar();

const StartHour = 0;
const EndHour = 23;
const DefaultStartHour = 9;
const DefaultEndHour = 10;

const title = ref("");
const description = ref("");
const startDate = ref<DateValue>(new CalendarDate(2022, 2, 6));
const endDate = ref<DateValue>(new CalendarDate(2022, 2, 6));

const allDay = ref(false);
const location = ref("");
const selectedUsers = ref<string[]>([]);
const error = ref<string | null>(null);

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

watch(startDate, (newStartDate) => {
  if (newStartDate && endDate.value) {
    const startTime = newStartDate.toDate(getLocalTimeZone());
    const endTime = endDate.value.toDate(getLocalTimeZone());

    if (startTime > endTime) {
      endDate.value = newStartDate;
    }
  }
});

watch(endDate, (newEndDate) => {
  if (newEndDate && startDate.value) {
    const startTime = startDate.value.toDate(getLocalTimeZone());
    const endTime = newEndDate.toDate(getLocalTimeZone());

    if (endTime < startTime) {
      startDate.value = newEndDate;
    }
  }
});

watch(startHour, () => updateEndTime());
watch(startMinute, () => updateEndTime());
watch(startAmPm, () => updateEndTime());

watch(endHour, () => updateStartTime());
watch(endMinute, () => updateStartTime());
watch(endAmPm, () => updateStartTime());

function handleAllDayToggle() {
  if (!allDay.value) {
    const now = new Date();

    const currentMinutes = now.getMinutes();
    const roundedMinutes = Math.round(currentMinutes / 5) * 5;

    let currentHour = now.getHours();
    let adjustedMinutes = roundedMinutes;

    if (adjustedMinutes === 60) {
      adjustedMinutes = 0;
      currentHour += 1;
    }

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

    startHour.value = startHourValue;
    startMinute.value = adjustedMinutes;
    startAmPm.value = startAmPmValue;

    let endHourValue = startHour.value;
    let endMinuteValue = startMinute.value + 30;
    let endAmPmValue = startAmPm.value;

    if (endMinuteValue >= 60) {
      endMinuteValue -= 60;
      endHourValue += 1;
    }

    if (endHourValue > 12) {
      endHourValue -= 12;
      endAmPmValue = endAmPmValue === "AM" ? "PM" : "AM";
    }

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
    const start = newEvent.start instanceof Date ? newEvent.start : new Date(newEvent.start);
    startDate.value = parseDate(start.toISOString().split("T")[0]!);
    endDate.value = parseDate(getEventEndDateForInput(newEvent));
    const startTimeStr = getEventStartTimeForInput(newEvent);
    const endTimeStr = getEventEndTimeForInput(newEvent);

    const startTimeParts = startTimeStr.split(":");
    if (startTimeParts.length >= 2) {
      const startTimeHour = Number.parseInt(startTimeParts[0]!);
      const startHourValue = startTimeHour === 0 ? 12 : startTimeHour > 12 ? startTimeHour - 12 : startTimeHour;
      startHour.value = startHourValue;
      startMinute.value = Number.parseInt(startTimeParts[1]!);
      startAmPm.value = startTimeHour >= 12 ? "PM" : "AM";
    }

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

  const now = new Date();

  const todayString = now.toISOString().split("T")[0];
  if (todayString) {
    const todayDate = parseDate(todayString);
    startDate.value = todayDate;
    endDate.value = todayDate;
  }

  const currentMinutes = now.getMinutes();
  const roundedMinutes = Math.round(currentMinutes / 5) * 5;

  let currentHour = now.getHours();
  let adjustedMinutes = roundedMinutes;

  if (adjustedMinutes === 60) {
    adjustedMinutes = 0;
    currentHour += 1;
  }

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

  startHour.value = startHourValue;
  startMinute.value = adjustedMinutes;
  startAmPm.value = startAmPmValue;

  let endHourValue = startHour.value;
  let endMinuteValue = startMinute.value + 30;
  let endAmPmValue = startAmPm.value;

  if (endMinuteValue >= 60) {
    endMinuteValue -= 60;
    endHourValue += 1;
  }

  if (endHourValue > 12) {
    endHourValue -= 12;
    endAmPmValue = endAmPmValue === "AM" ? "PM" : "AM";
  }

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
    return;

  if (isStartTimeAfterEndTime()) {
    let endHourValue = startHour.value;
    let endMinuteValue = startMinute.value + 30;
    let endAmPmValue = startAmPm.value;

    if (endMinuteValue >= 60) {
      endMinuteValue -= 60;
      endHourValue += 1;
    }

    if (endHourValue > 12) {
      endHourValue -= 12;
      endAmPmValue = endAmPmValue === "AM" ? "PM" : "AM";
    }

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
    return;

  if (isEndTimeBeforeStartTime()) {
    let startHourValue = endHour.value;
    let startMinuteValue = endMinute.value - 30;
    let startAmPmValue = endAmPm.value;

    if (startMinuteValue < 0) {
      startMinuteValue += 60;
      startHourValue -= 1;
    }

    if (startHourValue < 1) {
      startHourValue += 12;
      startAmPmValue = startAmPmValue === "AM" ? "PM" : "AM";
    }

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

  const startMinutes = startTime24 * 60 + startMinute.value;
  const endMinutes = endTime24 * 60 + endMinute.value;

  return startMinutes > endMinutes;
}

function isEndTimeBeforeStartTime(): boolean {
  return isStartTimeAfterEndTime();
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

  try {
    if (allDay.value) {
      const startLocal = startDate.value.toDate(getLocalTimeZone());
      const endLocal = endDate.value.toDate(getLocalTimeZone());

      startLocal.setHours(0, 0, 0, 0);

      if (startDate.value.toDate(getLocalTimeZone()).getTime() === endDate.value.toDate(getLocalTimeZone()).getTime()) {
        endLocal.setDate(endLocal.getDate() + 1);
        endLocal.setHours(0, 0, 0, 0);
      }
      else {
        endLocal.setDate(endLocal.getDate() + 1);
        endLocal.setHours(0, 0, 0, 0);
      }

      const browserTimezone = getBrowserTimezone();
      const timezone = browserTimezone ? ical.TimezoneService.get(browserTimezone) : null;

      if (timezone) {
        const startICal = ical.Time.fromJSDate(startLocal, true);
        const endICal = ical.Time.fromJSDate(endLocal, true);

        const startLocalICal = startICal.convertToZone(timezone);
        const endLocalICal = endICal.convertToZone(timezone);

        const startUTC = startLocalICal.convertToZone(ical.TimezoneService.get("UTC"));
        const endUTC = endLocalICal.convertToZone(ical.TimezoneService.get("UTC"));

        start = startUTC.toJSDate();
        end = endUTC.toJSDate();
      }
      else {
        start = new Date(Date.UTC(startLocal.getFullYear(), startLocal.getMonth(), startLocal.getDate()));
        end = new Date(Date.UTC(endLocal.getFullYear(), endLocal.getMonth(), endLocal.getDate()));
      }
    }
    else {
      const startLocal = startDate.value.toDate(getLocalTimeZone());
      const endLocal = endDate.value.toDate(getLocalTimeZone());

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

      startLocal.setHours(startHours24, startMinute.value, 0, 0);
      endLocal.setHours(endHours24, endMinute.value, 0, 0);

      const browserTimezone = getBrowserTimezone();
      const timezone = browserTimezone ? ical.TimezoneService.get(browserTimezone) : null;

      if (timezone) {
        const startICal = ical.Time.fromJSDate(startLocal, true);
        const endICal = ical.Time.fromJSDate(endLocal, true);

        const startLocalICal = startICal.convertToZone(timezone);
        const endLocalICal = endICal.convertToZone(timezone);

        const startUTC = startLocalICal.convertToZone(ical.TimezoneService.get("UTC"));
        const endUTC = endLocalICal.convertToZone(ical.TimezoneService.get("UTC"));

        start = startUTC.toJSDate();
        end = endUTC.toJSDate();
      }
      else {
        start = convertLocalToUTC(startLocal);
        end = convertLocalToUTC(endLocal);
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

    emit("save", eventData);
  }
  catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    consola.error("Calendar Event Dialog: Error converting dates in handleSave:", errorMessage);
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
          aria-label="Close dialog"
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
