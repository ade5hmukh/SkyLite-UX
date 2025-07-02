// Shared integrations configuration
// This file contains all integration configurations that are used by both client and server

export const integrationConfigs = [
  {
    type: "shopping",
    service: "tandoor",
    requiredFields: ["apiKey", "baseUrl"],
    capabilities: ["addItems", "deleteItems", "editItems", "getItems", "getLists"],
    icon: "https://cdn.jsdelivr.net/gh/selfhst/icons/svg/tandoor-recipes.svg",
  },
  {
    type: "shopping",
    service: "mealie",
    requiredFields: ["apiKey", "baseUrl"],
    capabilities: ["addItems", "deleteItems", "editItems", "getItems", "getLists"],
    icon: "https://cdn.jsdelivr.net/gh/selfhst/icons/svg/mealie.svg",
  },
]; 