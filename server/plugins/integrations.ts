import { consola } from "consola";

import { integrationConfigs } from "~/integrations/integrationConfig";
// Server-side integrations plugin
// Import integration registry and shared configurations
import { integrationRegistry, registerIntegration } from "~/types/integrations";

// Register all integrations from shared configuration
integrationConfigs.forEach((config) => {
  registerIntegration(config);
});

export default defineNitroPlugin(() => {
  consola.start("Server-side integrations plugin loaded");
  consola.start("The following integrations are available:", Array.from(integrationRegistry.entries()));
});
