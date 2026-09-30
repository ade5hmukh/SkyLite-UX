import type { CalendarView } from "~/types/calendar";
import type { ShoppingList, TodoList } from "~/types/database";

export type ConnectionTestResult = {
  success: boolean;
  message?: string;
  error?: string;
  isLoading?: boolean;
} | null;

export type ShoppingListWithIntegration = ShoppingList & {
  source: "native" | "integration";
  integrationId?: string;
  integrationName?: string;
  integrationIcon?: string | null;
};

export type TodoListWithIntegration = TodoList & {
  source: "native" | "integration";
  integrationId?: string;
  integrationName?: string;
  integrationIcon?: string | null;
  user?: {
    id: string;
    name: string;
    avatar: string | null;
    points: number;
    pointsToday: number;
    pointsThisWeek: number;
  };
};

export type AnyListWithIntegration = ShoppingListWithIntegration | TodoListWithIntegration;

export type ToggleEvent = {
  itemId: string;
  checked: boolean;
};

export type ReorderEvent = {
  itemId: string;
  newOrder: number;
  direction?: "up" | "down";
};

export type ReorderDirectionEvent = {
  itemId: string;
  direction: "up" | "down";
};

export type DialogField = {
  key: string;
  label: string;
  type: "text" | "number" | "textarea";
  placeholder?: string;
  min?: number;
  required?: boolean;
  disabled?: boolean;
  canEdit: boolean;
};

export type IntegrationSettingsField = {
  key: string;
  label: string;
  type: "text" | "password" | "url" | "color" | "boolean";
  placeholder?: string;
  required?: boolean;
  description?: string;
};

export type ToastType = "error" | "warning" | "success" | "info";

const SYSTEM_FONT_STACK = "ui-sans-serif, system-ui, sans-serif";

const FONT_PREFERENCES = [
  { value: "system", label: "System", stack: SYSTEM_FONT_STACK },
  { value: "inclusiveSans", label: "Inclusive Sans", stack: `"Inclusive Sans", ${SYSTEM_FONT_STACK}` },
  { value: "notoSans", label: "Noto Sans", stack: `"Noto Sans", ${SYSTEM_FONT_STACK}` },
  { value: "ebGaramond", label: "EB Garamond", stack: `"EB Garamond", ${SYSTEM_FONT_STACK}` },
  { value: "ibmPlexMono", label: "IBM Plex Mono", stack: `"IBM Plex Mono", ${SYSTEM_FONT_STACK}` },
  { value: "ovo", label: "Ovo", stack: `"Ovo", ${SYSTEM_FONT_STACK}` },
  { value: "handlee", label: "Handlee", stack: `"Handlee", ${SYSTEM_FONT_STACK}` },
] as const;

export type FontPreference = (typeof FONT_PREFERENCES)[number]["value"];

export type TodoSortMode = "manual" | "date" | "priority" | "alpha";

export type ClientPreferences = {
  colorMode?: "light" | "dark" | "system";
  font?: FontPreference;
  todoSortBy?: TodoSortMode;
  defaultView?: string;
  calendarView?: CalendarView;
};

export const MAIN_VIEW_OPTIONS: { path: string; label: string }[] = [
  { path: "/calendar", label: "Calendar" },
  { path: "/toDoLists", label: "Todo Lists" },
  { path: "/routines", label: "Routines" },
  { path: "/rewards", label: "Rewards" },
  { path: "/leaderboard", label: "Leaderboard" },
  { path: "/schoolMenu", label: "School Menu" },
];

export const COLOR_MODE_OPTIONS: { value: NonNullable<ClientPreferences["colorMode"]>; label: string }[] = [
  { value: "system", label: "Match device" },
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
];

export const defaultClientPreferences: ClientPreferences = {
  colorMode: "system",
  font: "system",
  todoSortBy: "manual",
  defaultView: "/calendar",
  calendarView: "week",
};

export const TODO_SORT_OPTIONS: { value: TodoSortMode; label: string }[] = [
  { value: "manual", label: "My order" },
  { value: "date", label: "Due date" },
  { value: "priority", label: "Priority" },
  { value: "alpha", label: "A-Z" },
];

export const FONT_OPTIONS: { label: string; value: FontPreference }[]
  = FONT_PREFERENCES.map(({ value, label }) => ({ value, label }));

export function getFontStack(font: FontPreference | undefined): string {
  return FONT_PREFERENCES.find(f => f.value === font)?.stack ?? SYSTEM_FONT_STACK;
}
