import { useStorage } from "@vueuse/core";

import type { ClientPreferences } from "~/types/ui";

import { defaultClientPreferences } from "~/types/ui";

const STORAGE_KEY = "skylite-client-preferences";

export function useClientPreferences() {
  const preferences = useStorage<ClientPreferences>(
    STORAGE_KEY,
    defaultClientPreferences,
    undefined,
    { mergeDefaults: true },
  );

  function updatePreferences(partial: Partial<ClientPreferences>) {
    preferences.value = { ...preferences.value, ...partial };
  }

  return {
    preferences,
    updatePreferences,
  };
}
