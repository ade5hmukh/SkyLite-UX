<script setup lang="ts">
import { format, isBefore } from 'date-fns'

interface CalendarEvent {
  id: string
  title: string
  description?: string
  start: Date | string
  end: Date | string
  allDay?: boolean
  location?: string
  color?: string
}

type EventColor = 'blue' | 'violet' | 'rose' | 'emerald' | 'orange'

const props = defineProps<{
  event: CalendarEvent | null
  isOpen: boolean
  position?: { top: number; left: number }
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'save', event: CalendarEvent): void
  (e: 'delete', eventId: string): void
}>()

// Constants
const StartHour = 0
const EndHour = 23
const DefaultStartHour = 9
const DefaultEndHour = 10

// Form state
const title = ref('')
const description = ref('')
const startDate = ref(new Date())
const endDate = ref(new Date())
const startTime = ref(DefaultStartHour + ':00')
const endTime = ref(DefaultEndHour + ':00')
const allDay = ref(false)
const location = ref('')
const color = ref<EventColor>('blue')
const error = ref<string | null>(null)
const startDateOpen = ref(false)
const endDateOpen = ref(false)

// Color options
const colorOptions = [
  {
    value: 'blue',
    label: 'Blue',
    bgClass: 'bg-blue-400 data-[state=checked]:bg-blue-400',
    borderClass: 'border-blue-400 data-[state=checked]:border-blue-400'
  },
  {
    value: 'violet',
    label: 'Violet',
    bgClass: 'bg-violet-400 data-[state=checked]:bg-violet-400',
    borderClass: 'border-violet-400 data-[state=checked]:border-violet-400'
  },
  {
    value: 'rose',
    label: 'Rose',
    bgClass: 'bg-rose-400 data-[state=checked]:bg-rose-400',
    borderClass: 'border-rose-400 data-[state=checked]:border-rose-400'
  },
  {
    value: 'emerald',
    label: 'Emerald',
    bgClass: 'bg-emerald-400 data-[state=checked]:bg-emerald-400',
    borderClass: 'border-emerald-400 data-[state=checked]:border-emerald-400'
  },
  {
    value: 'orange',
    label: 'Orange',
    bgClass: 'bg-orange-400 data-[state=checked]:bg-orange-400',
    borderClass: 'border-orange-400 data-[state=checked]:border-orange-400'
  }
]

// Time options
const timeOptions = computed(() => {
  const options = []
  for (let hour = StartHour; hour <= EndHour; hour++) {
    for (let minute = 0; minute < 60; minute += 15) {
      const formattedHour = hour.toString().padStart(2, '0')
      const formattedMinute = minute.toString().padStart(2, '0')
      const value = formattedHour + ':' + formattedMinute
      const date = new Date(2000, 0, 1, hour, minute)
      const label = format(date, 'h:mm a')
      options.push({ value, label })
    }
  }
  return options
})

// Watch for event changes
watch(() => props.event, (newEvent) => {
  if (newEvent) {
    title.value = newEvent.title || ''
    description.value = newEvent.description || ''
    startDate.value = new Date(newEvent.start)
    endDate.value = new Date(newEvent.end)
    startTime.value = formatTimeForInput(new Date(newEvent.start))
    endTime.value = formatTimeForInput(new Date(newEvent.end))
    allDay.value = newEvent.allDay || false
    location.value = newEvent.location || ''
    color.value = (newEvent.color as EventColor) || 'blue'
    error.value = null
  } else {
    resetForm()
  }
}, { immediate: true })

function resetForm() {
  title.value = ''
  description.value = ''
  startDate.value = new Date()
  endDate.value = new Date()
  startTime.value = DefaultStartHour + ':00'
  endTime.value = DefaultEndHour + ':00'
  allDay.value = false
  location.value = ''
  color.value = 'blue'
  error.value = null
}

function formatTimeForInput(date: Date) {
  const hours = date.getHours().toString().padStart(2, '0')
  const minutes = Math.floor(date.getMinutes() / 15) * 15
  return hours + ':' + minutes.toString().padStart(2, '0')
}

function handleSave() {
  const start = new Date(startDate.value)
  const end = new Date(endDate.value)

  if (!allDay.value) {
    const [startHours = 0, startMinutes = 0] = startTime.value.split(':').map(Number)
    const [endHours = 0, endMinutes = 0] = endTime.value.split(':').map(Number)

    if (
      startHours < StartHour ||
      startHours > EndHour ||
      endHours < StartHour ||
      endHours > EndHour
    ) {
      error.value = 'Selected time must be between ' + StartHour + ':00 and ' + EndHour + ':00'
      return
    }

    start.setHours(startHours, startMinutes, 0)
    end.setHours(endHours, endMinutes, 0)
  } else {
    start.setHours(0, 0, 0, 0)
    end.setHours(23, 59, 59, 999)
  }

  if (isBefore(end, start)) {
    error.value = 'End date cannot be before start date'
    return
  }

  const eventTitle = title.value.trim() ? title.value : '(no title)'

  emit('save', {
    id: props.event?.id || '',
    title: eventTitle,
    description: description.value,
    start,
    end,
    allDay: allDay.value,
    location: location.value,
    color: color.value
  })
}

function handleDelete() {
  if (props.event?.id) {
    emit('delete', props.event.id)
  }
}
</script>

<template>
  <div
    v-if="isOpen"
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
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
          color="gray"
          variant="ghost"
          icon="i-lucide-x"
          class="-my-1"
          @click="emit('close')" 
        />
      </div>

      <div class="p-4 space-y-4">
        <div v-if="error" class="bg-red-50 dark:bg-red-950 text-red-600 dark:text-red-400 rounded-md px-3 py-2 text-sm">
          {{ error }}
        </div>

        <div class="space-y-1.5">
          <label class="text-sm font-medium">Title</label>
          <UInput
            v-model="title"
            placeholder="Event title"
          />
        </div>

        <div class="space-y-1.5">
          <label class="text-sm font-medium">Description</label>
          <UTextarea
            v-model="description"
            placeholder="Event description"
            :rows="3"
          />
        </div>

        <div class="flex gap-4">
          <div class="flex-1 space-y-1.5">
            <label class="text-sm font-medium">Start Date</label>
            <UPopover
              :model-value="startDateOpen"
              @update:model-value="startDateOpen = $event"
            >
              <UButton
                block
                variant="outline"
                :ui="{ base: 'w-full justify-between' }"
              >
                {{ format(startDate, 'PPP') }}
                <template #trailing>
                  <UIcon name="i-lucide-calendar" class="text-gray-500" />
                </template>
              </UButton>

              <template #content>
                <UCalendar
                  v-model="startDate"
                  :disabled="{ before: new Date() }"
                  @update:model-value="(date) => {
                    if (date) {
                      startDate = date
                      if (isBefore(endDate, date)) {
                        endDate = date
                      }
                      error = null
                      startDateOpen = false
                    }
                  }"
                />
              </template>
            </UPopover>
          </div>

          <div v-if="!allDay" class="min-w-28 space-y-1.5">
            <label class="text-sm font-medium">Start Time</label>
            <USelect
              v-model="startTime"
              :options="timeOptions"
              option-attribute="label"
              value-attribute="value"
            />
          </div>
        </div>

        <div class="flex gap-4">
          <div class="flex-1 space-y-1.5">
            <label class="text-sm font-medium">End Date</label>
            <UPopover
              :model-value="endDateOpen"
              @update:model-value="endDateOpen = $event"
            >
              <UButton
                block
                variant="outline"
                :ui="{ base: 'w-full justify-between' }"
              >
                {{ format(endDate, 'PPP') }}
                <template #trailing>
                  <UIcon name="i-lucide-calendar" class="text-gray-500" />
                </template>
              </UButton>

              <template #content>
                <UCalendar
                  v-model="endDate"
                  :disabled="{ before: startDate }"
                  @update:model-value="(date) => {
                    if (date) {
                      endDate = date
                      error = null
                      endDateOpen = false
                    }
                  }"
                />
              </template>
            </UPopover>
          </div>

          <div v-if="!allDay" class="min-w-28 space-y-1.5">
            <label class="text-sm font-medium">End Time</label>
            <USelect
              v-model="endTime"
              :options="timeOptions"
              option-attribute="label"
              value-attribute="value"
            />
          </div>
        </div>

        <div class="flex items-center gap-2">
          <UCheckbox
            v-model="allDay"
            label="All day"
          />
        </div>

        <div class="space-y-1.5">
          <label class="text-sm font-medium">Location</label>
          <UInput
            v-model="location"
            placeholder="Event location"
          />
        </div>

        <div class="space-y-4">
          <label class="text-sm font-medium">Color</label>
          <URadioGroup
            v-model="color"
            :options="colorOptions"
            option-attribute="label"
            value-attribute="value"
            class="flex gap-1.5"
          >
            <template #option="{ option }">
              <div
                class="size-6 rounded-full"
                :class="[option.bgClass, option.borderClass]"
              />
            </template>
          </URadioGroup>
        </div>
      </div>

      <div class="flex justify-between p-4 border-t border-gray-200 dark:border-gray-700">
        <UButton
          v-if="event?.id"
          color="red"
          variant="ghost"
          icon="i-lucide-trash"
          @click="handleDelete"
        >
          Delete
        </UButton>
        <div class="flex gap-2">
          <UButton
            color="gray"
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
