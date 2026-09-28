import { PrismaClient } from "@prisma/client";
import { consola } from "consola";
import { createError, defineEventHandler, getRouterParam, readBody } from "h3";

const prisma = new PrismaClient();

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, "id");
  const body = await readBody<{ stepId?: unknown; done?: unknown }>(event);
  const stepId = typeof body?.stepId === "string" ? body.stepId : "";
  if (!id || !stepId) {
    throw createError({ statusCode: 400, message: "Routine ID and step ID are required" });
  }

  const routine = await prisma.routine.findUnique({
    where: { id },
    include: { steps: { select: { id: true } }, user: { select: { id: true, name: true } } },
  });
  if (!routine || !routine.steps.some(step => step.id === stepId)) {
    throw createError({ statusCode: 404, message: "Routine step not found" });
  }

  const day = getAppDayKey();
  const stepIds = new Set(routine.steps.map(step => step.id));
  const markDone = body.done !== false;

  const completionKey = { routineId_day: { routineId: id, day } };
  let completion = await prisma.routineCompletion.findUnique({ where: completionKey });
  if (!completion) {
    try {
      completion = await prisma.routineCompletion.create({ data: { routineId: id, day, completedStepIds: [] } });
    }
    catch (error) {
      // Another tap created today's row first.
      if ((error as { code?: string }).code !== "P2002")
        throw error;
      completion = await prisma.routineCompletion.findUniqueOrThrow({ where: completionKey });
    }
  }

  // Toggle in a single statement so simultaneous taps on different steps can't drop each other.
  if (markDone) {
    await prisma.$executeRaw`UPDATE "routine_completions" SET "completedStepIds" = array_append(array_remove("completedStepIds", ${stepId}), ${stepId}), "updatedAt" = NOW() WHERE "id" = ${completion.id}`;
  }
  else {
    await prisma.$executeRaw`UPDATE "routine_completions" SET "completedStepIds" = array_remove("completedStepIds", ${stepId}), "updatedAt" = NOW() WHERE "id" = ${completion.id}`;
  }

  const current = await prisma.routineCompletion.findUnique({ where: { id: completion.id } });
  const done = new Set((current?.completedStepIds ?? []).filter(existingId => stepIds.has(existingId)));

  let pointsAwarded = 0;
  if (done.size === stepIds.size) {
    // Only the request that flips completedAt from null awards points.
    const { count } = await prisma.routineCompletion.updateMany({
      where: { id: completion.id, completedAt: null },
      data: { completedAt: new Date(), pointsAwarded: routine.user ? routine.points : 0 },
    });

    if (count === 1) {
      if (routine.user && routine.points > 0) {
        pointsAwarded = routine.points;
        await prisma.user.update({
          where: { id: routine.user.id },
          data: {
            points: { increment: routine.points },
            pointsToday: { increment: routine.points },
            pointsThisWeek: { increment: routine.points },
          },
        });
      }

      try {
        await prisma.activityLog.create({
          data: {
            level: "INFO",
            serviceName: "routine",
            message: pointsAwarded > 0
              ? `Completed routine: ${routine.name} (+${pointsAwarded} points)`
              : `Completed routine: ${routine.name}`,
            userId: routine.user?.id ?? null,
            username: routine.user?.name ?? null,
            entityType: "routine",
            entityId: routine.id,
            entityName: routine.name,
            metadata: { day, points: pointsAwarded },
          },
        });
      }
      catch (logError) {
        consola.warn("Routines: Failed to log completion:", logError);
      }
    }
  }

  const updated = await prisma.routineCompletion.findUnique({ where: { id: completion.id } });
  return {
    day,
    completedStepIds: [...done],
    completedAt: updated?.completedAt ?? null,
    pointsAwarded,
  };
});
