import prisma from "~/lib/prisma";

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event);
    const { title, description, start, end, allDay, color, label, location, users } = body;

    // Trust the frontend's ical.js timezone conversion
    // The frontend now properly converts local time to UTC using ical.js
    // No additional manipulation needed - save the dates as-is
    const utcStart = new Date(start);
    const utcEnd = new Date(end);

    const calendarEvent = await prisma.calendarEvent.create({
      data: {
        title,
        description,
        start: utcStart,
        end: utcEnd,
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
