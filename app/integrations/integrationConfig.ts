// Shared integrations configuration
// This file contains all integration configurations that are used by both client and server
import { createMealieService } from "./mealie/mealieShoppingLists";
import { createTandoorService } from "./tandoor/tandoorShoppingLists";

export const integrationConfigs = [
  {
    type: "shopping",
    service: "tandoor",
    requiredFields: ["apiKey", "baseUrl"],
    capabilities: ["addItems", "deleteItems", "editItems", "getItems", "getLists"],
    icon: "https://cdn.jsdelivr.net/gh/selfhst/icons/svg/tandoor-recipes.svg",
    files: [
      "/integrations/tandoor/tandoorShoppingLists.ts", 
      "/server/api/integrations/tandoor/[...path].ts",
      "/server/utils/tandoorShoppingLists.ts"
    ],
  },
  {
    type: "shopping",
    service: "mealie",
    requiredFields: ["apiKey", "baseUrl"],
    capabilities: ["addItems", "deleteItems", "editItems", "getItems", "getLists"],
    icon: "https://cdn.jsdelivr.net/gh/selfhst/icons/svg/mealie.svg",
    files: [
      "/integrations/mealie/mealieShoppingLists.ts", 
      "/server/api/integrations/mealie/[...path].ts",
      "/server/utils/mealieShoppingLists.ts"
    ],
  },
];

const serviceFactoryMap = {
  "shopping:mealie": createMealieService,
  "shopping:tandoor": createTandoorService,
} as const;

// Helper function to get service factories from config
export const getServiceFactories = () => {
  return integrationConfigs.map(config => ({
    key: `${config.type}:${config.service}`,
    factory: serviceFactoryMap[`${config.type}:${config.service}` as keyof typeof serviceFactoryMap]
  }));
}; 