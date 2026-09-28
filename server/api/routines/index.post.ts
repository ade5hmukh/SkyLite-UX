import { PrismaClient } from "@prisma/client";
import { consola } from "consola";
import { createError, defineEventHandler, readBody } from "h3";

const prisma = new PrismaClient();

export default defineEventHandler(async (event) => {
  const input = parseRoutineInput(await readBody(event));

  try {
    const count = await prisma.routine.count();
    const routine = await prisma.routine.create({
      data: {
        name: input.name,
        icon: input.icon,
        daysOfWeek: input.daysOfWeek,
        points: input.points,
        userId: input.userId,
        enabled: input.enabled,
        order: count,
        steps: {
          create: input.steps.map((step, index) => ({
            title: step.title,
            icon: step.icon,
            durationMinutes: step.durationMinutes,
            order: index,
          })),
        },
      },
      include: routineInclude,
    });

    consola.info(`Routines: Added routine "${routine.name}"`);
    return routine;
  }
  catch (error) {
    consola.error("Routines: Failed to create routine:", error);
    throw createError({ statusCode: 500, message: "Failed to create routine" });
  }
});
