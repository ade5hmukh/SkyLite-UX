// https://nuxt.com/docs/api/configuration/nuxt-config
import tailwindcss from "@tailwindcss/vite";

export default defineNuxtConfig({
  devtools: { enabled: true },
  
  modules: [
    "@nuxt/ui",
    "@nuxt/eslint",
  ],
  eslint: {
    config: {
      standalone: false, // <---
    },
  },

  vite: {
    plugins: [tailwindcss()],
    optimizeDeps: {
      include: [
        "date-fns", 
        "@internationalized/date",
      ],
    },
  },

  css: ["~/assets/css/main.css"],

  nitro: {
    plugins: [
      "../server/plugins/integrations.ts"
    ]
  },

  future: {
    compatibilityVersion: 4,
  },

  compatibilityDate: "2024-11-27",
});
