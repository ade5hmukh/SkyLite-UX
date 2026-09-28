import { PrismaClient } from "@prisma/client";
import { consola } from "consola";
import { createError, defineEventHandler, getRouterParam, readBody } from "h3";

const prisma = new PrismaClient();

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, "id");
  if (!id) {
    throw createError({ statusCode: 400, message: "Routine ID is required" });
  }
  const input = parseRoutineInput(await readBody(event));

  const existing = await prisma.routine.findUnique({ where: { id }, include: { steps: true } });
  if (!existing) {
    throw createError({ statusCode: 404, message: "Routine not found" });
  }

  try {
    const existingStepIds = new Set(existing.steps.map(step => step.id));
    const keptStepIds = input.steps.map(step => step.id).filter((stepId): stepId is string => !!stepId && existingStepIds.has(stepId));

    // Existing step IDs are kept so today's ticked steps survive an edit.
    const routine = await prisma.$transaction(async (tx) => {
      await tx.routineStep.deleteMany({ where: { routineId: id, id: { notIn: keptStepIds } } });
      for (const [index, step] of input.steps.entries()) {
        const data = { title: step.title, icon: step.icon, durationMinutes: step.durationMinutes, order: index };
        if (step.id && existingStepIds.has(step.id)) {
          await tx.routineStep.update({ where: { id: step.id }, data });
        }
        else {
          await tx.routineStep.create({ data: { ...data, routineId: id } });
        }
      }
      return tx.routine.update({
        where: { id },
        data: {
          name: input.name,
          icon: input.icon,
          daysOfWeek: input.daysOfWeek,
          points: input.points,
          userId: input.userId,
          enabled: input.enabled,
        },
        include: routineInclude,
      });
    });

    consola.info(`Routines: Updated routine "${routine.name}"`);
    return routine;
  }
  catch (error) {
    consola.error("Routines: Failed to update routine:", error);
    throw createError({ statusCode: 500, message: "Failed to update routine" });
  }
});
