import { consola } from "consola";

const SNF_BASE = "https://www.schoolnutritionandfitness.com/webmenus2/api";
const SNF_GRAPHQL = "https://api.schoolnutritionandfitness.com/graphql";
const MENU_CACHE_MS = 3 * 60 * 60 * 1000;
const REQUEST_TIMEOUT_MS = 20_000;

export type SchoolMenuItem = {
  name: string;
  /** Shown as "or" before this item: an alternative to the previous one. */
  alternative: boolean;
};

export type SchoolMenuMeal = {
  name: string;
  items: SchoolMenuItem[];
};

export type SchoolMenuDay = {
  /** YYYY-MM-DD */
  date: string;
  meals: SchoolMenuMeal[];
};

export type SchoolMenuInfo = {
  menuTypeId: string;
  menuTypeName: string;
  schools: string[];
};

type OpenRawMenu = {
  menu_type?: string;
  menuType?: { id?: string; name?: string; sitePaths?: { sites?: { name?: string }[] }[] };
};

type MenuTypeListing = {
  menus?: { _id?: { $id?: string }; year?: number; month?: number }[];
};

type GraphqlMenu = {
  data?: {
    menu?: {
      items?: {
        day?: number;
        hidden?: boolean;
        product?: { name?: string; hide_on_calendars?: boolean } | null;
      }[];
    };
  };
};

const cache = new Map<string, { expires: number; value: Promise<unknown> }>();

function cached<T>(key: string, load: () => Promise<T>): Promise<T> {
  const now = Date.now();
  const hit = cache.get(key);
  if (hit && hit.expires > now)
    return hit.value as Promise<T>;
  const value = load();
  cache.set(key, { expires: now + MENU_CACHE_MS, value });
  value.catch(() => cache.delete(key));
  return value;
}

/** Accepts a School Nutrition and Fitness web menu link (…/webmenus2/#/view?id=…) or a bare menu ID. */
export function parseMenuId(url: string): string | null {
  const trimmed = url.trim();
  if (/^[a-f0-9]{24}$/i.test(trimmed))
    return trimmed;
  const match = trimmed.match(/[?&#]id=([a-f0-9]{24})/i);
  return match ? match[1]! : null;
}

export async function getMenuInfo(url: string): Promise<SchoolMenuInfo> {
  const menuId = parseMenuId(url);
  if (!menuId)
    throw new Error("That doesn't look like a School Nutrition and Fitness menu link (it should contain \"view?id=\").");

  return cached(`info:${menuId}`, async () => {
    const raw = await $fetch<OpenRawMenu>(`${SNF_BASE}/menuController.php/open-raw`, {
      query: { id: menuId },
      timeout: REQUEST_TIMEOUT_MS,
    });
    const menuTypeId = raw.menu_type || raw.menuType?.id;
    if (!menuTypeId)
      throw new Error("Couldn't find that menu. Check the link.");
    const schools = (raw.menuType?.sitePaths ?? [])
      .flatMap(path => path.sites ?? [])
      .map(site => site.name?.trim())
      .filter((name): name is string => !!name);
    return {
      menuTypeId,
      menuTypeName: cleanName(raw.menuType?.name ?? "School menu"),
      schools: [...new Set(schools)],
    };
  });
}

/** Menu IDs for each published month of a menu type, keyed "YYYY-MM" (1-based month). */
function getMonthMenus(menuTypeId: string): Promise<Map<string, string>> {
  return cached(`months:${menuTypeId}`, async () => {
    const listing = await $fetch<MenuTypeListing>(`${SNF_BASE}/menutypeController.php/show`, {
      query: { _id: menuTypeId },
      timeout: REQUEST_TIMEOUT_MS,
    });
    const months = new Map<string, string>();
    for (const menu of listing.menus ?? []) {
      const id = menu._id?.$id;
      if (id && typeof menu.year === "number" && typeof menu.month === "number")
        months.set(monthKey(menu.year, menu.month + 1), id);
    }
    return months;
  });
}

function getMenuDays(menuId: string, year: number, month: number): Promise<SchoolMenuDay[]> {
  return cached(`days:${menuId}`, async () => {
    const response = await $fetch<GraphqlMenu>(SNF_GRAPHQL, {
      method: "POST",
      body: { query: `{ menu(id: "${menuId}") { items { day hidden product { name hide_on_calendars } } } }` },
      timeout: REQUEST_TIMEOUT_MS,
    });

    const byDay = new Map<number, string[]>();
    for (const item of response.data?.menu?.items ?? []) {
      const name = item.product?.name?.trim();
      if (!name || !item.day || item.hidden || item.product?.hide_on_calendars)
        continue;
      byDay.set(item.day, [...(byDay.get(item.day) ?? []), name]);
    }

    return [...byDay.entries()]
      .sort(([a], [b]) => a - b)
      .map(([day, names]) => ({
        date: `${monthKey(year, month)}-${String(day).padStart(2, "0")}`,
        meals: toMeals(names),
      }))
      .filter(day => day.meals.length > 0);
  });
}

/** Menu days between two YYYY-MM-DD dates (inclusive), across month boundaries. */
export async function getSchoolMenuDays(url: string, fromDay: string, toDay: string): Promise<SchoolMenuDay[]> {
  const info = await getMenuInfo(url);
  const months = await getMonthMenus(info.menuTypeId);

  const days: SchoolMenuDay[] = [];
  for (const key of monthsBetween(fromDay, toDay)) {
    const menuId = months.get(key);
    if (!menuId)
      continue;
    const [year, month] = key.split("-").map(Number) as [number, number];
    try {
      days.push(...await getMenuDays(menuId, year, month));
    }
    catch (error) {
      consola.warn(`School menu: Failed to load ${key} for menu type ${info.menuTypeId}:`, error instanceof Error ? error.message : error);
    }
  }
  return days.filter(day => day.date >= fromDay && day.date <= toDay);
}

function toMeals(names: string[]): SchoolMenuMeal[] {
  const meals: SchoolMenuMeal[] = [];
  let current: SchoolMenuMeal | null = null;
  let nextIsAlternative = false;

  for (const raw of names) {
    const header = raw.match(/^-+\s*([A-Z](?:[A-Z &]*[A-Z])?)\s*-+$/);
    if (header) {
      current = { name: titleCase(header[1]!), items: [] };
      meals.push(current);
      nextIsAlternative = false;
      continue;
    }
    if (/^-*\s*or\s*-*$/i.test(raw)) {
      nextIsAlternative = true;
      continue;
    }
    if (!current) {
      current = { name: "Menu", items: [] };
      meals.push(current);
    }
    current.items.push({ name: cleanName(raw), alternative: nextIsAlternative && current.items.length > 0 });
    nextIsAlternative = false;
  }

  return meals.filter(meal => meal.items.length > 0);
}

function cleanName(name: string) {
  return name
    .replace(/`/g, "'")
    .replace(/^[-.\s]+/, "")
    .replace(/-\s+/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function titleCase(value: string) {
  return value.toLowerCase().replace(/\b\w/g, letter => letter.toUpperCase());
}

function monthKey(year: number, month: number) {
  return `${year}-${String(month).padStart(2, "0")}`;
}

function monthsBetween(fromDay: string, toDay: string) {
  const keys: string[] = [];
  let [year, month] = fromDay.split("-").map(Number) as [number, number];
  const [endYear, endMonth] = toDay.split("-").map(Number) as [number, number];
  while (year < endYear || (year === endYear && month <= endMonth)) {
    keys.push(monthKey(year, month));
    month++;
    if (month > 12) {
      month = 1;
      year++;
    }
  }
  return keys;
}
