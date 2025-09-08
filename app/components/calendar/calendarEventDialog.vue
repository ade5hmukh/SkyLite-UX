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

const { getEventStartTimeForInput, getEventEndTimeForInput, convertLocalToUTC, getLocalTimeFromUTC } = useCalendar();

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

const isRecurring = ref(false);
const recurrenceType = ref<"daily" | "weekly" | "monthly" | "yearly">("weekly");
const recurrenceInterval = ref(1);
const recurrenceEndType = ref<"never" | "count" | "until">("never");
const recurrenceCount = ref(10);
const recurrenceUntil = ref<DateValue>(new CalendarDate(2025, 12, 31));
const recurrenceDays = ref<number[]>([]);
const recurrenceMonthlyType = ref<"day" | "weekday">("day");
const recurrenceMonthlyWeekday = ref<{ week: number; day: number }>({ week: 1, day: 1 });
const recurrenceYearlyType = ref<"day" | "weekday">("day");
const recurrenceYearlyWeekday = ref<{ week: number; day: number; month: number }>({ week: 1, day: 1, month: 0 });

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

const recurrenceTypeOptions = [
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
  { value: "yearly", label: "Yearly" },
];

const recurrenceEndTypeOptions = [
  { value: "never", label: "Never" },
  { value: "count", label: "After" },
  { value: "until", label: "Until" },
];

const dayOptions = [
  { value: 0, label: "Sun" },
  { value: 1, label: "Mon" },
  { value: 2, label: "Tue" },
  { value: 3, label: "Wed" },
  { value: 4, label: "Thu" },
  { value: 5, label: "Fri" },
  { value: 6, label: "Sat" },
];

const monthlyTypeOptions = [
  { value: "day", label: "On day" },
  { value: "weekday", label: "On weekday" },
];

const yearlyTypeOptions = [
  { value: "day", label: "On day" },
  { value: "weekday", label: "On weekday" },
];

const weekOptions = [
  { value: 1, label: "First" },
  { value: 2, label: "Second" },
  { value: 3, label: "Third" },
  { value: 4, label: "Fourth" },
  { value: -1, label: "Last" },
];

const monthOptions = [
  { value: 0, label: "January" },
  { value: 1, label: "February" },
  { value: 2, label: "March" },
  { value: 3, label: "April" },
  { value: 4, label: "May" },
  { value: 5, label: "June" },
  { value: 6, label: "July" },
  { value: 7, label: "August" },
  { value: 8, label: "September" },
  { value: 9, label: "October" },
  { value: 10, label: "November" },
  { value: 11, label: "December" },
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

    let startLocal, endLocal;

    if (newEvent.allDay) {
      startLocal = new Date(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate());
      const endDate = newEvent.end instanceof Date ? newEvent.end : new Date(newEvent.end);
      endLocal = new Date(endDate.getUTCFullYear(), endDate.getUTCMonth(), endDate.getUTCDate() - 1);
    }
    else {
      startLocal = getLocalTimeFromUTC(start);
      endLocal = getLocalTimeFromUTC(newEvent.end instanceof Date ? newEvent.end : new Date(newEvent.end));
    }

    const startDateStr = startLocal.toLocaleDateString("en-CA");
    const endDateStr = endLocal.toLocaleDateString("en-CA");

    startDate.value = parseDate(startDateStr);
    endDate.value = parseDate(endDateStr);

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

    if ("rrule" in newEvent && (newEvent as any).rrule) {
      parseRRULEObject((newEvent as any).rrule);
    }
    else {
      isRecurring.value = false;
      recurrenceType.value = "weekly";
      recurrenceInterval.value = 1;
      recurrenceEndType.value = "never";
      recurrenceCount.value = 10;
      recurrenceUntil.value = new CalendarDate(2025, 12, 31);
      recurrenceDays.value = [];
      recurrenceMonthlyType.value = "day";
      recurrenceMonthlyWeekday.value = { week: 1, day: 1 };
      recurrenceYearlyType.value = "day";
      recurrenceYearlyWeekday.value = { week: 1, day: 1, month: 0 };
    }
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

  isRecurring.value = false;
  recurrenceType.value = "weekly";
  recurrenceInterval.value = 1;
  recurrenceEndType.value = "never";
  recurrenceCount.value = 10;
  recurrenceUntil.value = new CalendarDate(2025, 12, 31);
  recurrenceDays.value = [];
  recurrenceMonthlyType.value = "day";
  recurrenceMonthlyWeekday.value = { week: 1, day: 1 };
  recurrenceYearlyType.value = "day";
  recurrenceYearlyWeekday.value = { week: 1, day: 1, month: 0 };
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

function toggleRecurrenceDay(day: number) {
  if (isReadOnly.value)
    return;

  const index = recurrenceDays.value.indexOf(day);
  if (index > -1) {
    recurrenceDays.value.splice(index, 1);
  }
  else {
    recurrenceDays.value.push(day);
  }
}

function parseRRULEObject(rruleObj: any): void {
  if (!rruleObj) {
    isRecurring.value = false;
    return;
  }

  isRecurring.value = true;

  if (rruleObj.freq) {
    const freq = rruleObj.freq.toLowerCase();
    if (["daily", "weekly", "monthly", "yearly"].includes(freq)) {
      recurrenceType.value = freq as "daily" | "weekly" | "monthly" | "yearly";
    }
  }

  if (rruleObj.interval) {
    recurrenceInterval.value = Number.parseInt(rruleObj.interval, 10);
  }
  else {
    recurrenceInterval.value = 1;
  }

  if (rruleObj.byday && recurrenceType.value === "weekly") {
    const dayNames = ["SU", "MO", "TU", "WE", "TH", "FR", "SA"];
    const days = Array.isArray(rruleObj.byday) ? rruleObj.byday : [rruleObj.byday];
    recurrenceDays.value = days.map((day: string) => dayNames.indexOf(day)).filter((day: number) => day !== -1);
  }
  else {
    recurrenceDays.value = [];
  }

  if (rruleObj.byday && recurrenceType.value === "monthly") {
    const bydayStr = Array.isArray(rruleObj.byday) ? rruleObj.byday[0] : rruleObj.byday;
    if (bydayStr && bydayStr.length > 2) {
      const weekMatch = bydayStr.match(/^(-?\d+)([A-Z]{2})$/);
      if (weekMatch) {
        const week = Number.parseInt(weekMatch[1], 10);
        const dayCode = weekMatch[2];
        const dayNames = ["SU", "MO", "TU", "WE", "TH", "FR", "SA"];
        const dayIndex = dayNames.indexOf(dayCode);

        if (dayIndex !== -1) {
          recurrenceMonthlyType.value = "weekday";
          recurrenceMonthlyWeekday.value = { week, day: dayIndex };
        }
      }
    }
    else {
      recurrenceMonthlyType.value = "day";
    }
  }
  else if (recurrenceType.value === "monthly") {
    recurrenceMonthlyType.value = "day";
  }

  if (rruleObj.byday && recurrenceType.value === "yearly") {
    const bydayStr = Array.isArray(rruleObj.byday) ? rruleObj.byday[0] : rruleObj.byday;
    if (bydayStr && bydayStr.length > 2) {
      const weekMatch = bydayStr.match(/^(-?\d+)([A-Z]{2})$/);
      if (weekMatch) {
        const week = Number.parseInt(weekMatch[1], 10);
        const dayCode = weekMatch[2];
        const dayNames = ["SU", "MO", "TU", "WE", "TH", "FR", "SA"];
        const dayIndex = dayNames.indexOf(dayCode);

        if (dayIndex !== -1) {
          recurrenceYearlyType.value = "weekday";
          const eventStart = props.event?.start instanceof Date ? props.event.start : new Date(props.event?.start || new Date());
          const month = eventStart.getMonth();
          recurrenceYearlyWeekday.value = { week, day: dayIndex, month };
        }
      }
    }
    else {
      recurrenceYearlyType.value = "day";
    }
  }
  else if (recurrenceType.value === "yearly") {
    recurrenceYearlyType.value = "day";
  }

  if (rruleObj.count) {
    recurrenceEndType.value = "count";
    recurrenceCount.value = Number.parseInt(rruleObj.count, 10);
  }
  else if (rruleObj.until) {
    recurrenceEndType.value = "until";
    const untilString = rruleObj.until;
    if (untilString && untilString.length >= 8) {
      const year = Number.parseInt(untilString.substring(0, 4), 10);
      const month = Number.parseInt(untilString.substring(4, 6), 10);
      const day = Number.parseInt(untilString.substring(6, 8), 10);
      recurrenceUntil.value = new CalendarDate(year, month, day);
    }
  }
  else {
    recurrenceEndType.value = "never";
  }
}

function generateRRULE(): string {
  if (!isRecurring.value)
    return "";

  let rrule = `FREQ=${recurrenceType.value.toUpperCase()}`;

  if (recurrenceInterval.value > 1) {
    rrule += `;INTERVAL=${recurrenceInterval.value}`;
  }

  if (recurrenceType.value === "weekly" && recurrenceDays.value.length > 0) {
    const dayNames = ["SU", "MO", "TU", "WE", "TH", "FR", "SA"];
    const byDay = recurrenceDays.value.map(day => dayNames[day]).join(",");
    rrule += `;BYDAY=${byDay}`;
  }

  if (recurrenceType.value === "monthly" && recurrenceMonthlyType.value === "weekday") {
    const dayNames = ["SU", "MO", "TU", "WE", "TH", "FR", "SA"];
    const week = recurrenceMonthlyWeekday.value.week;
    const day = recurrenceMonthlyWeekday.value.day;
    const byDay = `${week}${dayNames[day]}`;
    rrule += `;BYDAY=${byDay}`;
  }

  if (recurrenceType.value === "yearly" && recurrenceYearlyType.value === "weekday") {
    const dayNames = ["SU", "MO", "TU", "WE", "TH", "FR", "SA"];
    const week = recurrenceYearlyWeekday.value.week;
    const day = recurrenceYearlyWeekday.value.day;
    const month = recurrenceYearlyWeekday.value.month;
    const byDay = `${week}${dayNames[day]}`;
    const byMonth = month + 1;
    rrule += `;BYDAY=${byDay};BYMONTH=${byMonth}`;
  }

  if (recurrenceEndType.value === "count") {
    rrule += `;COUNT=${recurrenceCount.value}`;
  }
  else if (recurrenceEndType.value === "until") {
    const untilDate = recurrenceUntil.value.toDate(getLocalTimeZone());
    const untilString = `${untilDate.toISOString().replace(/[-:]/g, "").split(".")[0]}Z`;
    rrule += `;UNTIL=${untilString}`;
  }

  return rrule;
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

        start = new Date(startUTC.year, startUTC.month - 1, startUTC.day, startUTC.hour, startUTC.minute, startUTC.second);
        end = new Date(endUTC.year, endUTC.month - 1, endUTC.day, endUTC.hour, endUTC.minute, endUTC.second);
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

        start = new Date(startUTC.year, startUTC.month - 1, startUTC.day, startUTC.hour, startUTC.minute, startUTC.second);
        end = new Date(endUTC.year, endUTC.month - 1, endUTC.day, endUTC.hour, endUTC.minute, endUTC.second);
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
      ...(isRecurring.value && { rrule: generateRRULE() }),
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
        <h2 class="text-base font-semibold leading-6">
          {{ event?.id ? 'Edit Event' : 'Create Event' }}
        </h2>
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
        <div class="flex items-center gap-2">
          <UCheckbox
            v-model="isRecurring"
            label="Repeat"
            :disabled="isReadOnly"
          />
        </div>
        <div v-if="isRecurring" class="space-y-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <div class="flex gap-4">
            <div class="w-1/2 space-y-2">
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-200">Repeat</label>
              <USelect
                v-model="recurrenceType"
                :items="recurrenceTypeOptions"
                option-attribute="label"
                value-attribute="value"
                class="w-full"
                :ui="{ base: 'w-full' }"
                :disabled="isReadOnly"
              />
            </div>
            <div class="w-1/2 space-y-2">
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-200">Every</label>
              <UInput
                v-model.number="recurrenceInterval"
                type="number"
                min="1"
                max="99"
                class="w-full"
                :ui="{ base: 'w-full' }"
                :disabled="isReadOnly"
              />
            </div>
          </div>
          <div v-if="recurrenceType === 'weekly'" class="space-y-2">
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-200">Repeat on</label>
            <div class="flex gap-1">
              <UButton
                v-for="day in dayOptions"
                :key="day.value"
                :variant="recurrenceDays.includes(day.value) ? 'solid' : 'outline'"
                size="sm"
                class="flex-1"
                :disabled="isReadOnly"
                @click="toggleRecurrenceDay(day.value)"
              >
                {{ day.label }}
              </UButton>
            </div>
          </div>
          <div v-if="recurrenceType === 'monthly'" class="space-y-4">
            <div class="space-y-2">
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-200">Repeat on</label>
              <USelect
                v-model="recurrenceMonthlyType"
                :items="monthlyTypeOptions"
                option-attribute="label"
                value-attribute="value"
                class="w-full"
                :ui="{ base: 'w-full' }"
                :disabled="isReadOnly"
              />
            </div>
            <div v-if="recurrenceMonthlyType === 'weekday'" class="space-y-2">
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-200">Weekday</label>
              <div class="flex gap-2">
                <USelect
                  v-model="recurrenceMonthlyWeekday.week"
                  :items="weekOptions"
                  option-attribute="label"
                  value-attribute="value"
                  class="flex-1"
                  :ui="{ base: 'flex-1' }"
                  :disabled="isReadOnly"
                />
                <USelect
                  v-model="recurrenceMonthlyWeekday.day"
                  :items="dayOptions"
                  option-attribute="label"
                  value-attribute="value"
                  class="flex-1"
                  :ui="{ base: 'flex-1' }"
                  :disabled="isReadOnly"
                />
              </div>
            </div>
          </div>
          <div v-if="recurrenceType === 'yearly'" class="space-y-4">
            <div class="space-y-2">
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-200">Repeat on</label>
              <USelect
                v-model="recurrenceYearlyType"
                :items="yearlyTypeOptions"
                option-attribute="label"
                value-attribute="value"
                class="w-full"
                :ui="{ base: 'w-full' }"
                :disabled="isReadOnly"
              />
            </div>
            <div v-if="recurrenceYearlyType === 'weekday'" class="space-y-2">
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-200">Weekday</label>
              <div class="flex gap-2">
                <USelect
                  v-model="recurrenceYearlyWeekday.week"
                  :items="weekOptions"
                  option-attribute="label"
                  value-attribute="value"
                  class="flex-1"
                  :ui="{ base: 'flex-1' }"
                  :disabled="isReadOnly"
                />
                <USelect
                  v-model="recurrenceYearlyWeekday.day"
                  :items="dayOptions"
                  option-attribute="label"
                  value-attribute="value"
                  class="flex-1"
                  :ui="{ base: 'flex-1' }"
                  :disabled="isReadOnly"
                />
                <USelect
                  v-model="recurrenceYearlyWeekday.month"
                  :items="monthOptions"
                  option-attribute="label"
                  value-attribute="value"
                  class="flex-1"
                  :ui="{ base: 'flex-1' }"
                  :disabled="isReadOnly"
                />
              </div>
            </div>
          </div>
          <div class="space-y-2">
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-200">Ends</label>
            <div class="flex gap-4">
              <USelect
                v-model="recurrenceEndType"
                :items="recurrenceEndTypeOptions"
                option-attribute="label"
                value-attribute="value"
                class="flex-1"
                :ui="{ base: 'flex-1' }"
                :disabled="isReadOnly"
              />
              <UInput
                v-if="recurrenceEndType === 'count'"
                v-model.number="recurrenceCount"
                type="number"
                min="1"
                max="999"
                placeholder="10"
                class="w-20"
                :ui="{ base: 'w-20' }"
                :disabled="isReadOnly"
              />
              <UPopover v-if="recurrenceEndType === 'until'">
                <UButton
                  color="neutral"
                  variant="subtle"
                  icon="i-lucide-calendar"
                  class="flex-1 justify-between"
                  :disabled="isReadOnly"
                >
                  <NuxtTime
                    v-if="recurrenceUntil"
                    :datetime="recurrenceUntil.toDate(getLocalTimeZone())"
                    year="numeric"
                    month="short"
                    day="numeric"
                  />
                  <span v-else>Select date</span>
                </UButton>
                <template #content>
                  <UCalendar
                    :model-value="recurrenceUntil as DateValue"
                    class="p-2"
                    :disabled="isReadOnly"
                    @update:model-value="(value) => { if (value) recurrenceUntil = value as DateValue }"
                  />
                </template>
              </UPopover>
            </div>
          </div>
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
