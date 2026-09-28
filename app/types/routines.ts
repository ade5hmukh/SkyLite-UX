export type RoutineStep = {
  id: string;
  title: string;
  icon: string | null;
  durationMinutes: number | null;
  order: number;
};

export type Routine = {
  id: string;
  name: string;
  icon: string | null;
  daysOfWeek: number[];
  points: number;
  order: number;
  enabled: boolean;
  userId: string | null;
  user: { id: string; name: string; color: string | null; avatar: string | null } | null;
  steps: RoutineStep[];
  scheduledToday: boolean;
  progress: {
    completedStepIds: string[];
    completedAt: string | null;
  };
};

export type RoutinesResponse = {
  day: string;
  weekday: number;
  routines: Routine[];
};

export type RoutineStepDraft = {
  id?: string;
  title: string;
  icon: string | null;
  durationMinutes: number | null;
};

export type RoutineDraft = {
  name: string;
  icon: string | null;
  daysOfWeek: number[];
  points: number;
  userId: string | null;
  enabled: boolean;
  steps: RoutineStepDraft[];
};

export const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export const ROUTINE_ICONS: { value: string; label: string }[] = [
  { value: "i-lucide-sunrise", label: "Morning" },
  { value: "i-lucide-sun", label: "Day" },
  { value: "i-lucide-moon", label: "Bedtime" },
  { value: "i-lucide-backpack", label: "Backpack" },
  { value: "i-lucide-school", label: "School" },
  { value: "i-lucide-book-open", label: "Reading" },
  { value: "i-lucide-pencil", label: "Homework" },
  { value: "i-lucide-tablet", label: "Tablet app" },
  { value: "i-lucide-laptop", label: "Laptop" },
  { value: "i-lucide-languages", label: "Language" },
  { value: "i-lucide-piano", label: "Piano" },
  { value: "i-lucide-music", label: "Music" },
  { value: "i-lucide-palette", label: "Art" },
  { value: "i-lucide-dumbbell", label: "Exercise" },
  { value: "i-lucide-footprints", label: "Shoes" },
  { value: "i-lucide-shirt", label: "Get dressed" },
  { value: "i-lucide-utensils", label: "Eat" },
  { value: "i-lucide-apple", label: "Snack" },
  { value: "i-lucide-glass-water", label: "Water" },
  { value: "i-lucide-droplets", label: "Brush teeth" },
  { value: "i-lucide-bath", label: "Bath" },
  { value: "i-lucide-bed", label: "Bed" },
  { value: "i-lucide-toy-brick", label: "Tidy toys" },
  { value: "i-lucide-brush-cleaning", label: "Clean up" },
  { value: "i-lucide-pill", label: "Medicine" },
  { value: "i-lucide-timer", label: "Timer" },
  { value: "i-lucide-list-checks", label: "Checklist" },
];

export const ROUTINE_TEMPLATES: { label: string; draft: Omit<RoutineDraft, "userId" | "enabled"> }[] = [
  {
    label: "After school",
    draft: {
      name: "After school",
      icon: "i-lucide-backpack",
      daysOfWeek: [1, 2, 3, 4, 5],
      points: 10,
      steps: [
        { title: "Snack and water", icon: "i-lucide-apple", durationMinutes: null },
        { title: "Seesaw homework", icon: "i-lucide-tablet", durationMinutes: null },
        { title: "Level Learning", icon: "i-lucide-book-open", durationMinutes: null },
        { title: "Piano practice", icon: "i-lucide-piano", durationMinutes: 20 },
        { title: "Pack backpack for tomorrow", icon: "i-lucide-backpack", durationMinutes: null },
      ],
    },
  },
  {
    label: "Marathi school prep",
    draft: {
      name: "Marathi school prep",
      icon: "i-lucide-languages",
      daysOfWeek: [6],
      points: 10,
      steps: [
        { title: "Google Classroom homework", icon: "i-lucide-laptop", durationMinutes: null },
        { title: "Practice reading aloud", icon: "i-lucide-book-open", durationMinutes: 10 },
        { title: "Pack Marathi school bag", icon: "i-lucide-backpack", durationMinutes: null },
      ],
    },
  },
  {
    label: "Morning",
    draft: {
      name: "Morning",
      icon: "i-lucide-sunrise",
      daysOfWeek: [1, 2, 3, 4, 5],
      points: 5,
      steps: [
        { title: "Get dressed", icon: "i-lucide-shirt", durationMinutes: null },
        { title: "Breakfast", icon: "i-lucide-utensils", durationMinutes: null },
        { title: "Brush teeth", icon: "i-lucide-droplets", durationMinutes: 2 },
        { title: "Shoes on", icon: "i-lucide-footprints", durationMinutes: null },
      ],
    },
  },
  {
    label: "Bedtime",
    draft: {
      name: "Bedtime",
      icon: "i-lucide-moon",
      daysOfWeek: [],
      points: 5,
      steps: [
        { title: "Tidy toys", icon: "i-lucide-toy-brick", durationMinutes: null },
        { title: "Bath", icon: "i-lucide-bath", durationMinutes: null },
        { title: "Brush teeth", icon: "i-lucide-droplets", durationMinutes: 2 },
        { title: "Story time", icon: "i-lucide-book-open", durationMinutes: 15 },
      ],
    },
  },
];
