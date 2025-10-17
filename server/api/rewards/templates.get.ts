import { rewardTemplates, rewardCategories } from "~/types/rewards";

export default defineEventHandler(async (_event) => {
  return {
    templates: rewardTemplates,
    categories: rewardCategories,
  };
});

