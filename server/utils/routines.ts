import { createError } from "h3";

export type RoutineStepInput = {
  id?: string;
  title: string;
  icon: string | null;
  durationMinutes: number | null;
};

export type RoutineInput = {
  name: string;
  icon: string | null;
  daysOfWeek: number[];
  points: number;
  userId: string | null;
  enabled: boolean;
  steps: RoutineStepInput[];
};

export const routineInclude = {
  steps: { orderBy: { order: "asc" as const } },
  user: { select: { id: true, name: true, color: true, avatar: true } },
};

function optionalString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export function parseRoutineInput(body: unknown): RoutineInput {
  const input = (body ?? {}) as Record<string, unknown>;
  const name = optionalString(input.name);
  if (!name) {
    throw createError({ statusCode: 400, message: "Routine name is required" });
  }

  const rawSteps = Array.isArray(input.steps) ? input.steps : [];
  const steps: RoutineStepInput[] = rawSteps
    .map((raw) => {
      const step = (raw ?? {}) as Record<string, unknown>;
      const minutes = Number(step.durationMinutes);
      return {
        id: optionalString(step.id) ?? undefined,
        title: optionalString(step.title) ?? "",
        icon: optionalString(step.icon),
        durationMinutes: Number.isFinite(minutes) && minutes > 0 ? Math.min(Math.round(minutes), 240) : null,
      };
    })
    .filter(step => step.title);

  if (steps.length === 0) {
    throw createError({ statusCode: 400, message: "A routine needs at least one step" });
  }

  const daysOfWeek = Array.isArray(input.daysOfWeek)
    ? [...new Set(input.daysOfWeek.map(Number).filter(d => Number.isInteger(d) && d >= 0 && d <= 6))].sort()
    : [];
  const points = Math.max(0, Math.min(Math.round(Number(input.points) || 0), 1000));

  return {
    name,
    icon: optionalString(input.icon),
    daysOfWeek,
    points,
    userId: optionalString(input.userId),
    enabled: input.enabled !== false,
    steps,
  };
}
