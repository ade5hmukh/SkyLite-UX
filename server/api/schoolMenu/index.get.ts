import { PrismaClient } from "@prisma/client";
import { consola } from "consola";
import { addDays } from "date-fns";
import { defineEventHandler } from "h3";

import type { SchoolMenuDay } from "../../integrations/schoolMenu/client";

import { getKinderCareMenuDays, KinderCareLoginError } from "../../integrations/kinderCare/client";
import { getMenuInfo, getSchoolMenuDays } from "../../integrations/schoolMenu/client";

const prisma = new PrismaClient();
const AFTER_SCHOOL_TIME = "14:00";

export default defineEventHandler(async () => {
  const [integrations, users] = await Promise.all([
    prisma.integration.findMany({ where: { type: "meal", service: { in: ["School Menu", "KinderCare"] }, enabled: true }, orderBy: { createdAt: "asc" } }),
    prisma.user.findMany({ select: { id: true, name: true, color: true } }),
  ]);
  const usersById = new Map(users.map(user => [user.id, user]));

  const now = new Date();
  const today = getAppDayKey(now);
  const tomorrow = getAppDayKey(addDays(now, 1));
  const lastDay = getAppDayKey(addDays(now, 13));
  // Once school is out, today's menu is no longer useful; lead with the next school day.
  const featuredFrom = getAppTimeOfDay(now) >= AFTER_SCHOOL_TIME ? tomorrow : today;

  const menus = await Promise.all(integrations.map(async (integration) => {
    const settings = (integration.settings ?? {}) as { user?: string[] };
    const people = (settings.user ?? []).map(id => usersById.get(id)).filter(user => !!user);
    let days: SchoolMenuDay[] = [];
    let title = integration.name;
    let schools: string[] = [];
    let error: string | null = null;
    try {
      if (integration.service === "KinderCare") {
        schools = ["KinderCare"];
        title = integration.name || "KinderCare";
        days = await getKinderCareMenuDays(today, lastDay);
      }
      else {
        const info = await getMenuInfo(integration.baseUrl ?? "");
        schools = info.schools;
        title = integration.name || info.menuTypeName;
        days = await getSchoolMenuDays(integration.baseUrl ?? "", today, lastDay);
      }
    }
    catch (loadError) {
      consola.warn(`School menu: Failed to load integration ${integration.id}:`, loadError instanceof Error ? loadError.message : loadError);
      error = loadError instanceof KinderCareLoginError ? loadError.message : "Couldn't load this menu right now.";
    }
    return { id: integration.id, title, schools, people, days, error };
  }));

  return {
    today,
    tomorrow,
    menus: menus.map(menu => ({ ...menu, days: menu.days.filter(day => day.date >= featuredFrom) })),
  };
});
