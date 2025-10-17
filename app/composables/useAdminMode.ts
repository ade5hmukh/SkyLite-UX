import { ref, computed } from "vue";

const ADMIN_MODE_TIMEOUT = 10 * 60 * 1000; // 10 minutes
const PARENTAL_PIN = "1111"; // TODO: Move to environment variable or settings

const isAdminMode = ref(false);
let adminModeTimer: NodeJS.Timeout | null = null;

export function useAdminMode() {
  const activateAdminMode = () => {
    isAdminMode.value = true;
    resetTimer();
  };

  const deactivateAdminMode = () => {
    isAdminMode.value = false;
    clearTimer();
  };

  const verifyPin = (pin: string): boolean => {
    return pin === PARENTAL_PIN;
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

