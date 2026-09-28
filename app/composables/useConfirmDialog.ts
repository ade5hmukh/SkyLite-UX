type ConfirmDialogOptions = {
  title: string;
  message?: string;
  confirmLabel?: string;
};

type ConfirmDialogState = ConfirmDialogOptions & {
  resolve: (confirmed: boolean) => void;
};

const pendingConfirm = ref<ConfirmDialogState | null>(null);

export function useConfirmDialog() {
  function confirmAction(options: ConfirmDialogOptions): Promise<boolean> {
    pendingConfirm.value?.resolve(false);
    return new Promise((resolve) => {
      pendingConfirm.value = { ...options, resolve };
    });
  }

  function settle(confirmed: boolean) {
    const current = pendingConfirm.value;
    pendingConfirm.value = null;
    current?.resolve(confirmed);
  }

  return {
    pendingConfirm: readonly(pendingConfirm),
    confirmAction,
    settle,
  };
}
