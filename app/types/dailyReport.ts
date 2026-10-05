export type DailyReportItem = {
  title: string;
  kind: "chore" | "todo" | "routine";
  points: number;
  // e.g. "3/5 steps" for a routine that was started but not finished
  detail?: string;
};

export type DailyReportEntry = {
  userId: string;
  userName: string;
  userColor: string | null;
  userAvatar: string | null;
  day: string;
  completed: DailyReportItem[];
  incomplete: DailyReportItem[];
  pointsEarned: number;
  estimated: boolean;
  // Today's progress so far, not a saved report
  live: boolean;
};

export type DailyReportsResponse = {
  today: string;
  reports: DailyReportEntry[];
};
