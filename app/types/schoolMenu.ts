export type SchoolMenuItem = {
  name: string;
  alternative: boolean;
};

export type SchoolMenuMeal = {
  name: string;
  items: SchoolMenuItem[];
  details?: string[];
};

export type SchoolMenuDay = {
  date: string;
  meals: SchoolMenuMeal[];
};

export type SchoolMenu = {
  id: string;
  title: string;
  schools: string[];
  people: { id: string; name: string; color: string | null }[];
  days: SchoolMenuDay[];
  error: string | null;
};

export type SchoolMenusResponse = {
  today: string;
  tomorrow: string;
  menus: SchoolMenu[];
};

export function getMealParts(meal: SchoolMenuMeal) {
  return meal.items.map((item, index) => ({
    separator: index === 0 ? "" : item.alternative ? " or " : ", ",
    name: item.name,
  }));
}

export function getMealIcon(mealName: string) {
  const name = mealName.toLowerCase();
  if (name.includes("breakfast"))
    return "i-lucide-egg-fried";
  if (name.includes("lunch"))
    return "i-lucide-sandwich";
  if (name.includes("snack"))
    return "i-lucide-apple";
  return "i-lucide-utensils";
}
