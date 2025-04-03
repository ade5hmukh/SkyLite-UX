<script setup lang="ts">
import { ScheduleXCalendar } from '@schedule-x/vue'
import {
  createCalendar,
  createViewDay,
  createViewMonthAgenda,
  createViewMonthGrid,
  createViewWeek,
} from '@schedule-x/calendar'
import '@schedule-x/theme-default/dist/index.css'
import { createDragAndDropPlugin } from '@schedule-x/drag-and-drop'
import { createEventModalPlugin } from '@schedule-x/event-modal'
import { createEventsServicePlugin } from '@schedule-x/events-service'
import { createCalendarControlsPlugin } from '@schedule-x/calendar-controls'
import { createEventRecurrencePlugin } from "@schedule-x/event-recurrence";
import { createCurrentTimePlugin } from '@schedule-x/current-time'
import { createIcalendarPlugin } from '@schedule-x/ical'
 
const icalendarPlugin = createIcalendarPlugin({
  data: 'BEGIN:VCALENDAR\n' +
    'VERSION:2.0\n' +
    'CALSCALE:GREGORIAN\n' +
    'BEGIN:VEVENT\n' +
    'SUMMARY:Good morning\n' +
    'DTSTART;TZID=America/New_York:20240801T103400\n' +
    'DTEND;TZID=America/New_York:20240801T110400\n' +
    'LOCATION:1000 Broadway Ave.\\, Brooklyn\n' +
    'DESCRIPTION: Access-A-Ride trip to 900 Jay St.\\, Brooklyn\n' +
    'STATUS:CONFIRMED\n' +
    'SEQUENCE:3\n' +
    'END:VEVENT\n' +
    'BEGIN:VEVENT\n' +
    'RRULE:FREQ=DAILY;COUNT=3\n' +
    'SUMMARY:Good night\n' +
    'DTSTART;TZID=America/New_York:20240902T200000\n' +
    'DTEND;TZID=America/New_York:20240902T203000\n' +
    'LOCATION:900 Jay St.\\, Brooklyn\n' +
    'DESCRIPTION: Access-A-Ride trip to 1000 Broadway Ave.\\, Brooklyn\n' +
    'STATUS:CONFIRMED\n' +
    'SEQUENCE:3\n' +
    'END:VEVENT\n' +
    'END:VCALENDAR',
})

const plugins = [
  createDragAndDropPlugin(),
  createEventModalPlugin(),
  createEventsServicePlugin(),
  createCalendarControlsPlugin(),
  createEventRecurrencePlugin(),
  createCurrentTimePlugin(),
  icalendarPlugin
]
// Do not use a ref here, as the calendar instance is not reactive, and doing so might cause issues
// For updating events, use the events service plugin
const calendarApp = createCalendar({
  isDark: true,
  //theme: 'static',
  selectedDate: '2024-01-05',
  views: [
    createViewDay(),
    createViewWeek(),
    createViewMonthGrid(),
    createViewMonthAgenda(),
  ],
  calendars: {
    personal: {
      colorName: 'personal',
      lightColors: {
        main: '#f9d71c',
        container: '#fff5aa',
        onContainer: '#594800',
      },
      darkColors: {
        main: '#fff5c0',
        onContainer: '#fff5de',
        container: '#a29742',
      },
    },
    work: {
      colorName: 'work',
      lightColors: {
        main: '#f91c45',
        container: '#ffd2dc',
        onContainer: '#59000d',
      },
      darkColors: {
        main: '#ffc0cc',
        onContainer: '#ffdee6',
        container: '#a24258',
      },
    },
    leisure: {
      colorName: 'leisure',
      lightColors: {
        main: '#1cf9b0',
        container: '#dafff0',
        onContainer: '#004d3d',
      },
      darkColors: {
        main: '#c0fff5',
        onContainer: '#e6fff5',
        container: '#42a297',
      },
    },
    school: {
      colorName: 'school',
      lightColors: {
        main: '#1c7df9',
        container: '#d2e7ff',
        onContainer: '#002859',
      },
      darkColors: {
        main: '#c0dfff',
        onContainer: '#dee6ff',
        container: '#426aa2',
      },
    },
  },
  events: [
    // ... other events
    {
      title: "Meeting with Mr. boss",
      start: "2024-01-05 05:15",
      end: "2024-01-05 06:00",
      id: "98d85d98541f",
      calendarId: "work"
    }, {
      title: "Sipping Aperol Spritz on the beach",
      start: "2024-01-05 12:00",
      end: "2024-01-05 15:20",
      id: "0d13aae3b8a1",
      calendarId: "leisure"
    },
  ]
}, plugins )
</script>
 
<template>
  <div>
    <ClientOnly fallback-tag="span" fallback="Loading calendar...">
      <ScheduleXCalendar :calendar-app="calendarApp" />
    </ClientOnly>
  </div>
</template>