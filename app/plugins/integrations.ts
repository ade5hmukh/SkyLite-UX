// Log the registry contents for debugging
import { integrationRegistry } from '~/types/integrations';

// Import all integration services to ensure they are registered
import '~/integrations/tandoor/tandoorService';
import '~/integrations/mealie/mealieService';

export default defineNuxtPlugin(() => {
  console.info('The following integrations are available:', Array.from(integrationRegistry.entries()));
}); 