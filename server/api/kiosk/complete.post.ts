import { consola } from "consola";

import prisma from "~/lib/prisma";

export default defineEventHandler(async (event) => {
  const body = await readBody<{ todoId?: unknown; pin?: unknown; verifiedBy?: unknown }>(event);
  const todoId = typeof body?.todoId === "string" ? body.todoId : "";
  if (!todoId)
    throw createError({ statusCode: 400, message: "todoId is required" });

  // A wrong quiz answer needs a grown-up's PIN before the chore counts.
  let verifiedBy = body?.verifiedBy === "quiz" ? "quiz" : "none";
  if (typeof body?.pin === "string") {
    const result = checkParentPin(body.pin);
    if (result === "locked")
      throw createError({ statusCode: 429, message: "Too many tries. Wait a minute." });
    if (result === "invalid")
      throw createError({ statusCode: 403, message: "Wrong PIN" });
    verifiedBy = "parent";
  }

  const todo = await prisma.todo.findUnique({
    where: { id: todoId },
    include: { todoColumn: { select: { name: true, user: { select: { id: true, name: true } } } } },
  });
  if (!todo)
    throw createError({ statusCode: 404, message: "Item not found" });

  // Only the tap that flips it to done awards points, so double taps can't count twice.
  const { count } = await prisma.todo.updateMany({ where: { id: todoId, completed: false }, data: { completed: true } });
  const user = todo.todoColumn?.user ?? null;
  let pointsAwarded = 0;

  if (count === 1) {
    if (user && todo.points > 0) {
      pointsAwarded = todo.points;
      await prisma.user.update({
        where: { id: user.id },
        data: {
          points: { increment: todo.points },
          pointsToday: { increment: todo.points },
          pointsThisWeek: { increment: todo.points },
        },
      });
    }

    try {
      const kind = todo.isChore ? "chore" : "todo";
      await prisma.activityLog.create({
        data: {
          level: "INFO",
          serviceName: todo.isChore ? "chore" : "todolist",
          message: todo.points > 0 ? `Completed ${kind}: ${todo.title} (+${todo.points} points)` : `Completed ${kind}: ${todo.title}`,
          userId: user?.id ?? null,
          username: user?.name ?? null,
          entityType: "todo",
          entityId: todo.id,
          entityName: todo.title,
          metadata: { points: todo.points, recurring: todo.recurring, completed: true, columnName: todo.todoColumn?.name, source: "kiosk", verifiedBy },
        },
      });
    }
    catch (logError) {
      consola.warn("Kiosk: Failed to log completion:", logError);
    }
  }

  const points = user
    ? await prisma.user.findUnique({ where: { id: user.id }, select: { points: true, pointsToday: true } })
    : null;

  return {
    completed: true,
    alreadyDone: count === 0,
    pointsAwarded,
    points: points?.points ?? null,
    pointsToday: points?.pointsToday ?? null,
  };
});
