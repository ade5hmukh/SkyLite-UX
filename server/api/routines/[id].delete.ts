import { PrismaClient } from "@prisma/client";
import { consola } from "consola";
import { createError, defineEventHandler, getRouterParam } from "h3";

const prisma = new PrismaClient();

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, "id");
  if (!id) {
    throw createError({ statusCode: 400, message: "Routine ID is required" });
  }

  const existing = await prisma.routine.findUnique({ where: { id }, select: { name: true } });
  if (!existing) {
    throw createError({ statusCode: 404, message: "Routine not found" });
  }

  await prisma.routine.delete({ where: { id } });
  consola.info(`Routines: Deleted routine "${existing.name}"`);
  return { success: true };
});
