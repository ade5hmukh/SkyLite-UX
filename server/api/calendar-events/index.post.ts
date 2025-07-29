import prisma from "~/lib/prisma";

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event);
    const { title, description, start, end, allDay, color, label, location, users } = body;

    const calendarEvent = await prisma.calendarEvent.create({
      data: {
        title,
        description,
        start: new Date(start),
        end: new Date(end),
        allDay: allDay || false,
        color: color || null,
        label,
        location,
        users: {
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
      users: calendarEvent.users.map(ce => ce.user),
    };
  }
  catch (error) {
    throw createError({
      statusCode: 500,
      message: `Failed to create calendar event: ${error}`,
    });
  }
});
