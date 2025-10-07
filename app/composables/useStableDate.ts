export function useStableDate() {
  const stableDate = useState<Date>("global-stable-date", () => new Date());

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
