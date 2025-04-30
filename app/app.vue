<template>
  <UApp>
    <NuxtPage class="page" />
    <GlobalNavbar class="navbar bg-gray-900 dark:bg-gray-950 fixed bottom-0 w-full" />
  </UApp>
</template>

<style lang="css">
.page {
  margin: 0;
  padding: 0;
  min-height: 100vh;
  padding-bottom: 50px; /* Add padding to prevent content from being hidden behind navbar */
}

.navbar {
  margin: 0;
  height: 50px;
  z-index: 50;
  box-sizing: border-box;
  border: none;
  padding: 10px;
}
</style>
