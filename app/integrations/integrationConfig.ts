import type { JsonObject } from "type-fest";

// Shared integrations configuration
// This file contains all integration configurations that are used by both client and server
import { createMealieService, getMealieFieldsForItem } from "./mealie/mealieShoppingLists";
import { createTandoorService, getTandoorFieldsForItem } from "./tandoor/tandoorShoppingLists";

export type DialogField = {
  key: string;
  label: string;
  type: "text" | "number" | "textarea";
  placeholder?: string;
  min?: number;
  required?: boolean;
  disabled?: boolean;
  canEdit: boolean;
};

export type IntegrationSettingsField = {
  key: string;
  label: string;
  type: "text" | "password" | "url";
  placeholder?: string;
  required?: boolean;
  description?: string;
};

export type IntegrationConfig = {
  type: string;
  service: string;
  settingsFields: IntegrationSettingsField[];
  capabilities: string[];
  icon: string;
  files: string[];
  dialogFields: DialogField[];
};

export const integrationConfigs: IntegrationConfig[] = [
  // ================================================
  // Calendar integration configs can support the following list-level capabilities:
  // ================================================
  // Todo integration configs can support the following list-level capabilities:
  // ================================================
  // Shopping integration configs can support the following list-level capabilities:
  // - add_items: Can add new items to lists
  // - clear_items: Can clear completed items from lists
  // - edit_items: Can edit existing items in lists
  // - delete_items: Can delete items from lists
  // ================================================
  // Meal integration configs can support the following list-level capabilities:
  // ================================================
  {
    type: "shopping",
    service: "tandoor",
    settingsFields: [
      {
        key: "apiKey",
        label: "API Key",
        type: "password" as const,
        placeholder: "Scope needs to be \"read write\"",
        required: true,
        description: "Your Tandoor API key for authentication",
      },
      {
        key: "baseUrl",
        label: "Base URL",
        type: "url" as const,
        placeholder: "http://your-tandoor-instance:port",
        required: true,
        description: "The base URL of your Tandoor instance",
      },
    ],
    capabilities: ["add_items", "edit_items"],
    icon: "https://cdn.jsdelivr.net/gh/selfhst/icons/svg/tandoor-recipes.svg",
    files: [
      "/integrations/tandoor/tandoorShoppingLists.ts",
      "/server/api/integrations/tandoor/[...path].ts",
      "/server/integrations/tandoor/",
    ],
    dialogFields: [
      {
        key: "name",
        label: "Item Name",
        type: "text" as const,
        placeholder: "Milk, Bread, Apples, etc.",
        required: true,
        canEdit: true,
      },
      {
        key: "quantity",
        label: "Quantity",
        type: "number" as const,
        min: 0,
        canEdit: true,
      },
      {
        key: "unit",
        label: "Unit",
        type: "text" as const,
        placeholder: "Disabled for Tandoor",
        canEdit: false,
      },
    ],
  },

  {
    type: "shopping",
    service: "mealie",
    settingsFields: [
      {
        key: "apiKey",
        label: "API Key",
        type: "password" as const,
        placeholder: "Enter your Mealie API key",
        required: true,
        description: "Your Mealie API key for authentication",
      },
      {
        key: "baseUrl",
        label: "Base URL",
        type: "url" as const,
        placeholder: "http://your-mealie-instance:port",
        required: true,
        description: "The base URL of your Mealie instance",
      },
    ],
    capabilities: ["add_items", "clear_items", "edit_items"],
    icon: "https://cdn.jsdelivr.net/gh/selfhst/icons/svg/mealie.svg",
    files: [
      "/integrations/mealie/mealieShoppingLists.ts",
      "/server/api/integrations/mealie/[...path].ts",
      "/server/integrations/mealie/",
    ],
    dialogFields: [
      {
        key: "quantity",
        label: "Quantity",
        type: "number" as const,
        min: 0,
        canEdit: true,
      },
      {
        key: "unit",
        label: "Unit",
        type: "text" as const,
        placeholder: "Disabled for Mealie",
        canEdit: false,
      },
      {
        key: "notes",
        label: "Notes",
        type: "textarea" as const,
        placeholder: "Note...",
        canEdit: true,
      },
      {
        key: "food",
        label: "Food Item",
        type: "text" as const,
        placeholder: "Disabled for Mealie",
        canEdit: false,
      },
    ],
  },
];

const serviceFactoryMap = {
  "shopping:mealie": createMealieService,
  "shopping:tandoor": createTandoorService,
} as const;

const fieldFilters = {
  mealie: getMealieFieldsForItem,
  tandoor: getTandoorFieldsForItem,
};

export function getIntegrationFields(integrationType: string): DialogField[] {
  const config = integrationConfigs.find(c => c.service === integrationType);
  return config?.dialogFields || [];
}

export function getFieldsForItem(item: unknown, integrationType: string | undefined, allFields: { key: string }[]): { key: string }[] {
  if (!integrationType || !fieldFilters[integrationType as keyof typeof fieldFilters]) {
    return allFields;
  }

  return fieldFilters[integrationType as keyof typeof fieldFilters](item as unknown as JsonObject, allFields);
}

export function getServiceFactories() {
  return integrationConfigs.map(config => ({
    key: `${config.type}:${config.service}`,
    factory: serviceFactoryMap[`${config.type}:${config.service}` as keyof typeof serviceFactoryMap],
  }));
}
