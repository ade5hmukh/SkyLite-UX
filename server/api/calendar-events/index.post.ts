import prisma from "~/lib/prisma";

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event);
    const { title, description, start, end, allDay, color, label, location, users } = body;

    // Ensure dates are properly converted to UTC
    const startDate = new Date(start);
    const endDate = new Date(end);

    // Convert all dates to UTC before storing
    // The client sends dates in local timezone, but we need to store them as UTC
    let utcStart = startDate;
    let utcEnd = endDate;

    if (allDay) {
      // For all-day events, create dates at midnight UTC for the specified date
      const startYear = startDate.getUTCFullYear();
      const startMonth = startDate.getUTCMonth();
      const startDay = startDate.getUTCDate();
      const endYear = endDate.getUTCFullYear();
      const endMonth = endDate.getUTCMonth();
      const endDay = endDate.getUTCDate();

      utcStart = new Date(Date.UTC(startYear, startMonth, startDay, 0, 0, 0, 0));
      utcEnd = new Date(Date.UTC(endYear, endMonth, endDay, 23, 59, 59, 999));
    } else {
      // For timed events, convert local time to UTC
      // Extract the local time components and create UTC dates
      const startYear = startDate.getFullYear();
      const startMonth = startDate.getMonth();
      const startDay = startDate.getDate();
      const startHours = startDate.getHours();
      const startMinutes = startDate.getMinutes();
      const startSeconds = startDate.getSeconds();
      const startMilliseconds = startDate.getMilliseconds();

      const endYear = endDate.getFullYear();
      const endMonth = endDate.getMonth();
      const endDay = endDate.getDate();
      const endHours = endDate.getHours();
      const endMinutes = endDate.getMinutes();
      const endSeconds = endDate.getSeconds();
      const endMilliseconds = endDate.getMilliseconds();

      // Create UTC dates with the local time components
      utcStart = new Date(Date.UTC(startYear, startMonth, startDay, startHours, startMinutes, startSeconds, startMilliseconds));
      utcEnd = new Date(Date.UTC(endYear, endMonth, endDay, endHours, endMinutes, endSeconds, endMilliseconds));
    }

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
