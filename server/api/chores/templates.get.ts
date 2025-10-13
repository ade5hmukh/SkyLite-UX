import { defineEventHandler } from "h3";

import { choreCategories, choreTemplates } from "~/types/chores";

export default defineEventHandler(() => {
  return {
    templates: choreTemplates,
    categories: choreCategories,
  };
});


