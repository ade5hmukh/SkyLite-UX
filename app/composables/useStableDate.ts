const STABLE_DATE_REFRESH_MINUTES = 5;
let refreshTimer: ReturnType<typeof setTimeout> | null = null;

export function useStableDate() {
  const stableDate = useState<Date>("global-stable-date", () => new Date());

  const scheduleNextRefresh = () => {
    const now = new Date();
    const next = new Date(now);
    const nextMinutes = Math.floor(now.getMinutes() / STABLE_DATE_REFRESH_MINUTES + 1) * STABLE_DATE_REFRESH_MINUTES;
    next.setMinutes(nextMinutes, 0, 0);

    refreshTimer = setTimeout(() => {
      stableDate.value = new Date();
      scheduleNextRefresh();
    }, next.getTime() - now.getTime());
  };

  if (import.meta.client && !refreshTimer) {
    scheduleNextRefresh();
  }

  const getStableDate = () => stableDate.value;

  const parseStableDate = (dateInput: string | Date | undefined, fallback?: Date): Date => {
    if (!dateInput) {
      return fallback || stableDate.value;
    }
    if (dateInput instanceof Date) {
      return dateInput;
    }

    if (typeof dateInput === "string" && dateInput.includes("T") && dateInput.endsWith("Z")) {
      return new Date(dateInput);
    }

    return new Date(dateInput);
  };

  return {
    stableDate,
    getStableDate,
    parseStableDate,
  };
}
