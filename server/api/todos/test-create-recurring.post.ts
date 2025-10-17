import prisma from "~/lib/prisma";
import { consola } from "consola";
import { defineEventHandler } from "h3";

export default defineEventHandler(async () => {
  try {
    consola.info("🧪 TEST: Creating a recurring chore...");
    
    const todo = await prisma.todo.create({
      data: {
        title: "TEST Recurring Chore",
        description: "This is a test recurring chore",
        completed: false,
        recurring: true,
        isChore: true,
        points: 5,
        priority: "MEDIUM",
        order: 0,
      },
    });

    consola.info(`✅ TEST: Created recurring chore with ID ${todo.id}`);
    return { 
      success: true, 
      todo: {
        id: todo.id,
        title: todo.title,
        recurring: todo.recurring,
        points: todo.points,
        completed: todo.completed,
      },
    };
  }
  catch (error) {
    consola.error("Error creating test recurring chore:", error);
    throw createError({
      statusCode: 500,
      message: "Failed to create test recurring chore.",
    });
  }
});




