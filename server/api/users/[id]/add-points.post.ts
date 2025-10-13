import { PrismaClient } from "@prisma/client";
import { consola } from "consola";
import { createError, defineEventHandler, readBody } from "h3";

const prisma = new PrismaClient();

export default defineEventHandler(async (event) => {
  try {
    const userId = event.context.params?.id;
    if (!userId) {
      throw createError({
        statusCode: 400,
        message: "User ID is required",
      });
    }

    const body = await readBody(event);
    const { points } = body;

    if (typeof points !== "number" || points <= 0) {
      throw createError({
        statusCode: 400,
        message: "Valid points value is required",
      });
    }

    // Get current user points
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { points: true },
    });

    if (!user) {
      throw createError({
        statusCode: 404,
        message: "User not found",
      });
    }

    // Update user points
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        points: user.points + points,
      },
      select: {
        id: true,
        name: true,
        points: true,
      },
    });

    consola.debug(`Added ${points} points to user ${userId}. New total: ${updatedUser.points}`);

    return updatedUser;
  }
  catch (error: unknown) {
    consola.error("Error adding points to user:", error);
    const statusCode = error && typeof error === "object" && "statusCode" in error ? Number(error.statusCode) : 500;
    const message = error && typeof error === "object" && "message" in error ? String(error.message) : "Failed to add points";
    throw createError({
      statusCode,
      message,
    });
  }
});


