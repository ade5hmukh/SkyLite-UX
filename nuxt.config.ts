// https://nuxt.com/docs/api/configuration/nuxt-config
import tailwindcss from "@tailwindcss/vite";

export default defineNuxtConfig({
  devtools: {
    enabled: false,
  },

  runtimeConfig: {
    public: {
      // consola log level. See https://github.com/unjs/consola/blob/main/src/constants.ts
      logLevel: "info", // Default log level, can be overridden by NUXT_PUBLIC_LOG_LEVEL env var
    },
  },

  modules: ["@nuxt/ui", "@nuxt/eslint", "@nuxtjs/html-validator"],

  app: {
    head: {
      htmlAttrs: {
        lang: "en",
      },
      title: "SkyLite UX",
    },
  },

  htmlValidator: {
    logLevel: "warning",
    failOnError: false,
    options: {
      extends: [
        "html-validate:document",
        "html-validate:recommended",
      ],
      rules: {
        // Focus on hydration-related issues
        "no-unknown-elements": "error",
        "element-permitted-content": "error",
        "no-implicit-button-type": "error",

        // Disable rules that don't affect hydration
        "no-dup-class": "off", // Duplicate classes from UI components don't affect hydration
        "wcag/h30": "off",
        "no-redundant-role": "off",
        "element-required-attributes": "off",
        "element-required-content": "off",
        "valid-id": "off", // Ignore Nuxt-generated IDs
        "prefer-native-element": "off", // We have valid reasons for using div instead of button

        // Disable formatting rules
        "void-style": "off",
        "no-trailing-whitespace": "off",
        "require-sri": "off",
        "attribute-boolean-style": "off",
        "doctype-style": "off",
        "no-inline-style": "off",
      },
    },
  },

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
      "../server/plugins/01.logging.ts",
      "../server/plugins/02.syncManager.ts",
    ],
  },

  plugins: [
    "~/plugins/01.logging.ts",
    "~/plugins/02.appInit.ts",
    "~/plugins/03.syncManager.client.ts",
  ],

  future: {
    compatibilityVersion: 4,
  },

  compatibilityDate: "2024-11-27",
});
