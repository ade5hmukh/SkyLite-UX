// Shared integrations configuration
// This file contains all integration configurations that are used by both client and server
import { createMealieService } from "./mealie/mealieShoppingLists";
import { createTandoorService } from "./tandoor/tandoorShoppingLists";
import { getMealieFieldsForItem } from "./mealie/mealieShoppingLists";
import { getTandoorFieldsForItem } from "./tandoor/tandoorShoppingLists";

export interface ShoppingListItemField {
  key: string;
  label: string;
  type: 'text' | 'number' | 'textarea';
  placeholder?: string;
  min?: number;
  required?: boolean;
  disabled?: boolean;
  canEdit: boolean;
}

export interface IntegrationConfig {
  type: string;
  service: string;
  settingsFields: string[];
  capabilities: string[];
  icon: string;
  files: string[];
  dialogFields: ShoppingListItemField[];
}

export const integrationConfigs: IntegrationConfig[] = [
  // Shopping integration configs can support the following list-level capabilities:
  // - add_items: Can add new items to lists
  // - clear_items: Can clear completed items from lists
  // - edit_items: Can edit existing items in lists  
  // - delete_items: Can delete items from lists
  // ================================================
  {
    type: "shopping",
    service: "tandoor",
    settingsFields: ["apiKey", "baseUrl"],
    capabilities: ["add_items", "edit_items"],
    icon: "https://cdn.jsdelivr.net/gh/selfhst/icons/svg/tandoor-recipes.svg",
    files: [
      "/integrations/tandoor/tandoorShoppingLists.ts", 
      "/server/api/integrations/tandoor/[...path].ts",
      "/server/integrations/tandoor/"
    ],
    dialogFields: [
      {
        key: 'name',
        label: 'Item Name',
        type: 'text' as const,
        placeholder: 'Milk, Bread, Apples, etc.',
        required: true,
        canEdit: true,
      },
      {
        key: 'quantity',
        label: 'Quantity',
        type: 'number' as const,
        min: 0,
        canEdit: true,
      },
      {
        key: 'unit',
        label: 'Unit',
        type: 'text' as const,
        placeholder: 'Disabled for Tandoor',
        canEdit: false,
      },
    ],
  },
  
  {
    type: "shopping",
    service: "mealie",
    settingsFields: ["apiKey", "baseUrl"],
    capabilities: ["add_items", "clear_items", "edit_items"],
    icon: "https://cdn.jsdelivr.net/gh/selfhst/icons/svg/mealie.svg",
    files: [
      "/integrations/mealie/mealieShoppingLists.ts", 
      "/server/api/integrations/mealie/[...path].ts",
      "/server/integrations/mealie/"
    ],
    dialogFields: [
      {
        key: 'quantity',
        label: 'Quantity',
        type: 'number' as const,
        min: 0,
        canEdit: true,
      },
      {
        key: 'unit',
        label: 'Unit',
        type: 'text' as const,
        placeholder: 'Disabled for Mealie',
        canEdit: false,
      },
      {
        key: 'notes',
        label: 'Notes',
        type: 'textarea' as const,
        placeholder: 'Note...',
        canEdit: true,
      },
      {
        key: 'food',
        label: 'Food Item',
        type: 'text' as const,
        placeholder: 'Disabled for Mealie',
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
  tandoor: getTandoorFieldsForItem
};

export const getIntegrationFields = (integrationType: string): ShoppingListItemField[] => {
  const config = integrationConfigs.find(c => c.service === integrationType);
  return config?.dialogFields || [];
};

export const getFieldsForItem = (item: any, integrationType: string | undefined, allFields: any[]): any[] => {
  if (!integrationType || !fieldFilters[integrationType as keyof typeof fieldFilters]) {
    return allFields;
  }
  
  return fieldFilters[integrationType as keyof typeof fieldFilters](item, allFields);
};

export const getServiceFactories = () => {
  return integrationConfigs.map(config => ({
    key: `${config.type}:${config.service}`,
    factory: serviceFactoryMap[`${config.type}:${config.service}` as keyof typeof serviceFactoryMap]
  }));
}; 