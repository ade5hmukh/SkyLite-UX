import prisma from "~/lib/prisma";

export default defineEventHandler(async (_event) => {
  try {
    const events = await prisma.calendarEvent.findMany({
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
      orderBy: {
        start: "asc",
      },
    });

    return events.map(event => ({
      id: event.id,
      title: event.title,
      description: event.description,
      start: event.start,
      end: event.end,
      allDay: event.allDay,
      color: event.color as string | string[] | undefined,
      label: event.label,
      location: event.location,
      rrule: event.rrule,
      users: event.users.map(ce => ce.user),
    }));
  }
  catch (error) {
    throw createError({
      statusCode: 500,
      message: `Failed to fetch calendar events: ${error}`,
    });
  }
});
