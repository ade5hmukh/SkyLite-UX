<script setup lang="ts">
  const colorMode = useColorMode();
  const isDark = computed({
    get() {
      return colorMode.value === 'dark';
    },
    set() {
      colorMode.value = colorMode.value === 'dark' ? 'light' : 'dark';
    },
  });
</script>

<template>
    <UContainer class="flex items-center justify-between navbar">
      <UButtonGroup size="xl" class="navbarbtn">
        <UButton to="/calendar" color="primary" variant="subtle" icon="i-lucide-calendar-days" />
        <UButton to="/todo" color="primary" variant="subtle" icon="i-lucide-list-todo" />
        <UButton to="/lists" color="primary" variant="subtle" icon="i-lucide-shopping-cart" />
        <UButton to="/meals" color="primary" variant="subtle" icon="i-lucide-utensils" />
        <UButton to="/settings" color="primary" variant="subtle" icon="i-lucide-settings" />
      </UButtonGroup>
      <div class="flex items-center justify-center gap-2">
        <USwitch v-model="isDark" color="primary" checked-icon="i-lucide-moon" unchecked-icon="i-lucide-sun" size="xl"/>
      </div>
    </UContainer>
</template>

<style scoped>
.navbar {
  margin: 0;
  padding: 0;
  width: 100%;
  height: 75px;
  background-color: gray;
}
.navbarbtn {
  width: 75px;
  height: 50px;
}
</style>