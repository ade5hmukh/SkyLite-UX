import { getFontStack } from "~/types/ui";

export default defineNuxtPlugin(() => {
  const { preferences } = useClientPreferences();
  const colorMode = useColorMode();

  watch(() => preferences.value.colorMode, (mode) => {
    colorMode.preference = mode ?? "system";
  }, { immediate: true });

  watch(() => preferences.value.font, (font) => {
    document.documentElement.style.setProperty("--app-font-sans", getFontStack(font));
  }, { immediate: true });
});
