export type CalendarView = "month" | "week" | "day" | "agenda";

export type CalendarEvent = {
  id: string;
  title: string;
  description?: string;
  start: Date;
  end: Date;
  allDay?: boolean;
  color?: string | string[];
  label?: string;
  location?: string;
  integrationId?: string;
  users?: Array<{
    id: string;
    name: string;
    avatar?: string | null;
    color?: string | null;
  }>;
};

export type PlaceholderEvent = CalendarEvent & {
  isPlaceholder: true;
  position: number;
};
