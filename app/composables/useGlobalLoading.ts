const globalState = {
  isLoading: ref(true),
  loadingMessage: ref("Organizing your life..."),
};

export function useGlobalLoading() {
  const setLoading = (loading: boolean) => {
    globalState.isLoading.value = loading;
  };

  const setMessage = (message: string) => {
    globalState.loadingMessage.value = message;
  };

  const setLoadingState = (loading: boolean, message?: string) => {
    globalState.isLoading.value = loading;
    if (message)
      globalState.loadingMessage.value = message;
  };

  return {
    isLoading: readonly(globalState.isLoading),
    loadingMessage: readonly(globalState.loadingMessage),

    setLoading,
    setMessage,
    setLoadingState,
  };
}
