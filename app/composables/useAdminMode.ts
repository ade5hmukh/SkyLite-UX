import { ref, computed } from "vue";

const ADMIN_MODE_TIMEOUT = 10 * 60 * 1000; // 10 minutes

const isAdminMode = ref(false);
let adminModeTimer: NodeJS.Timeout | null = null;

export function useAdminMode() {
  const parentalPin = String(useRuntimeConfig().public.parentPin || "1111");

  const activateAdminMode = () => {
    isAdminMode.value = true;
    resetTimer();
  };

  const deactivateAdminMode = () => {
    isAdminMode.value = false;
    clearTimer();
  };

  const verifyPin = (pin: string): boolean => {
    return pin === parentalPin;
  };

  const resetTimer = () => {
    clearTimer();
    adminModeTimer = setTimeout(() => {
      deactivateAdminMode();
    }, ADMIN_MODE_TIMEOUT);
  };

  const clearTimer = () => {
    if (adminModeTimer) {
      clearTimeout(adminModeTimer);
      adminModeTimer = null;
    }
  };

  const isActive = computed(() => isAdminMode.value);

  return {
    isActive,
    activateAdminMode,
    deactivateAdminMode,
    verifyPin,
  };
}

