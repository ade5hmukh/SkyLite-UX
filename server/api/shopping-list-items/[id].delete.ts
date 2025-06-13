import prisma from "~/lib/prisma";

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, "id");

  if (!id) {
    throw createError({
      statusCode: 400,
      message: "Item ID is required",
    });
  }

  try {
    await prisma.shoppingListItem.delete({
      where: { id },
    });

    return { success: true };
  }
  catch (error) {
    console.error("Error deleting shopping list item:", error);
    throw createError({
      statusCode: 500,
      message: "Failed to delete shopping list item",
    });
  }
}); 