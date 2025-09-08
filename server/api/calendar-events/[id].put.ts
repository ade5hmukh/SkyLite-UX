import prisma from "~/lib/prisma";

export default defineEventHandler(async (event) => {
  try {
    const id = getRouterParam(event, "id");
    const body = await readBody(event);
    const { title, description, start, end, allDay, color, label, location, rrule, users } = body;

    if (!id) {
      throw createError({
        statusCode: 400,
        message: "Calendar event ID is required",
      });
    }

    const utcStart = new Date(start);
    const utcEnd = new Date(end);

    const calendarEvent = await prisma.calendarEvent.update({
      where: { id },
      data: {
        title,
        description,
        start: utcStart,
        end: utcEnd,
        allDay: allDay || false,
        color: color || null,
        label,
        location,
        rrule: rrule || null,
        users: {
          deleteMany: {},
          create: users?.map((user: { id: string }) => ({
            userId: user.id,
          })) || [],
        },
      },
      include: {
        users: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                avatar: true,
                color: true,
              },
            },
          },
        },
      },
    });

    return {
      id: calendarEvent.id,
      title: calendarEvent.title,
      description: calendarEvent.description,
      start: calendarEvent.start,
      end: calendarEvent.end,
      allDay: calendarEvent.allDay,
      color: calendarEvent.color as string | string[] | undefined,
      label: calendarEvent.label,
      location: calendarEvent.location,
      rrule: calendarEvent.rrule,
      users: calendarEvent.users.map(ce => ce.user),
    };
  }
  catch (error) {
    throw createError({
      statusCode: 500,
      message: `Failed to update calendar event: ${error}`,
    });
  }
});
