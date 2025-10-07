import prisma from "~/lib/prisma";

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event);
    const { reorders } = body;

    await prisma.$transaction(
      reorders.map((reorder: { id: string; order: number }) =>
        prisma.todoColumn.update({
          where: { id: reorder.id },
          data: { order: reorder.order },
        }),
      ),
    );

    const todoColumns = await prisma.todoColumn.findMany({
      include: {
        user: {
          select: {
            id: true,
            name: true,
            avatar: true,
          },
        },
        _count: {
          select: { todos: true },
        },
      },
      orderBy: {
        order: "asc",
      },
    });

    return todoColumns;
  }
  catch (error) {
    throw createError({
      statusCode: 500,
      message: `Failed to reorder todo column: ${error}`,
    });
  }
});
