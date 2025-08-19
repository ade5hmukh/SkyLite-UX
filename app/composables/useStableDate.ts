/**
 * Global stable date composable for SSR-safe date operations
 * Ensures all components use the same date reference to prevent hydration mismatches
 */
export function useStableDate() {
  // Single global stable date instance
  const stableDate = useState<Date>("global-stable-date", () => new Date());

  // Helper function to get the stable date
  const getStableDate = () => stableDate.value;

  // Helper function to parse dates consistently
  const parseStableDate = (dateInput: string | Date | undefined, fallback?: Date): Date => {
    if (!dateInput) {
      return fallback || stableDate.value;
    }
    if (dateInput instanceof Date) {
      return dateInput;
    }
    
    // For ISO strings, ensure we preserve UTC timezone
    if (typeof dateInput === "string" && dateInput.includes("T") && dateInput.endsWith("Z")) {
      // This is a UTC ISO string, parse it as UTC
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
