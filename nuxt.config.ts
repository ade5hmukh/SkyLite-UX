// https://nuxt.com/docs/api/configuration/nuxt-config
import pkg from "./package.json";

export default defineNuxtConfig({
  devtools: {
    enabled: true,
  },

  runtimeConfig: {
    // Server-only. Set with NUXT_PARENT_PIN (NUXT_PUBLIC_PARENT_PIN is still accepted).
    parentPin: "",
    // Server-only. NUXT_QUIZ_USERS: comma-separated names who answer a math question before a chore counts ("off" for nobody).
    quizUsers: "Siana",
    // Server-only. NUXT_NTFY_URL (e.g. https://ntfy.sh), NUXT_NTFY_TOPIC, optional NUXT_NTFY_TOKEN.
    ntfy: {
      url: "",
      topic: "",
      token: "",
      eventLeadMinutes: 30,
      morningTime: "07:00",
      eveningTime: "19:30",
    },
    // Server-only. NUXT_GEMINI_API_KEY enables importing events from emails and flyers.
    gemini: {
      apiKey: "",
      model: "gemini-3.5-flash",
      fallbackModel: "gemini-3.1-flash-lite",
    },
    // Server-only. NUXT_KINDERCARE_SESSION is the _himama_session cookie from classroom.kindercare.com.
    kindercare: {
      session: "",
    },
    public: {
      skyliteVersion: pkg.version,
      nuxtVersion: pkg.devDependencies.nuxt,
      nuxtUiVersion: pkg.dependencies["@nuxt/ui"],
      // consola log level. See https://github.com/unjs/consola/blob/main/src/constants.ts
      logLevel: "info", // Default log level, can be overridden by NUXT_PUBLIC_LOG_LEVEL env var
      tz: "America/Los_Angeles", // Default timezone, can be overridden by NUXT_PUBLIC_TZ env var
    },
  },

  modules: ["@nuxt/ui", "@nuxt/eslint", "@nuxtjs/html-validator", "@vite-pwa/nuxt"],

  // Use as i-skylite-<file name>, e.g. i-skylite-hands-praying
  icon: {
    customCollections: [{ prefix: "skylite", dir: "./app/assets/icons" }],
  },

  pwa: {
    registerType: "autoUpdate",
    manifest: {
      name: "SkyLite Family Manager",
      short_name: "SkyLite",
      description: "Family chores, rewards, and calendar with gamification for kids",
      theme_color: "#06b6d4",
      background_color: "#ffffff",
      display: "standalone",
      orientation: "portrait",
      scope: "/",
      start_url: "/",
      icons: [
        {
          src: "/icon-192.png",
          sizes: "192x192",
          type: "image/png",
          purpose: "any",
        },
        {
          src: "/icon-512.png",
          sizes: "512x512",
          type: "image/png",
          purpose: "any",
        },
        {
          src: "/icon-maskable-192.png",
          sizes: "192x192",
          type: "image/png",
          purpose: "maskable",
        },
        {
          src: "/icon-maskable-512.png",
          sizes: "512x512",
          type: "image/png",
          purpose: "maskable",
        },
      ],
      categories: ["productivity", "lifestyle"],
    },
    workbox: {
      navigateFallback: "/",
      // /kiosk is a separate server-rendered page for old tablets, not part of the app shell.
      navigateFallbackDenylist: [/^\/kiosk/, /^\/api\//],
      globPatterns: ["**/*.{js,css,html,png,svg,ico,json}"],
      runtimeCaching: [
        {
          urlPattern: /^https:\/\/api\..*/i,
          handler: "NetworkFirst",
          options: {
            cacheName: "api-cache",
            expiration: {
              maxEntries: 100,
              maxAgeSeconds: 60 * 60 * 24, // 24 hours
            },
          },
        },
      ],
    },
    devOptions: {
      enabled: true,
      type: "module",
    },
  },

  components: {
    dirs: [
      {
        path: "~/components",
        pathPrefix: false,
        // work around to fix global components not being in their own chunk
        // /app/app/components/global/globalAppLoading.vue is dynamically imported by /app/app/components/global/globalAppLoading.vue?nuxt_component=async&nuxt_component_name=GlobalAppLoading&nuxt_component_export=default but also statically imported by /app/app/app.vue?vue&type=script&setup=true&lang.ts, dynamic import will not move module into another chunk.
        ignore: ["**/global/globalAppLoading.vue", "**/global/globalSideBar.vue", "**/global/globalDock.vue"],
      },
    ],
  },

  app: {
    head: {
      htmlAttrs: {
        lang: "en",
      },
      title: "SkyLite UX",
      meta: [
        { charset: "utf-8" },
        { name: "viewport", content: "width=device-width, initial-scale=1, maximum-scale=5, user-scalable=yes" },
        { name: "description", content: "Family chores, rewards, and calendar with gamification for kids" },
        { name: "format-detection", content: "telephone=no" },
        { name: "mobile-web-app-capable", content: "yes" },
        { name: "apple-mobile-web-app-capable", content: "yes" },
        { name: "apple-mobile-web-app-status-bar-style", content: "default" },
        { name: "theme-color", content: "#06b6d4" },
      ],
      link: [
        { rel: "icon", type: "image/x-icon", href: "/favicon.ico" },
        { rel: "apple-touch-icon", href: "/icon-192.png" },
      ],
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
        "no-unknown-elements": "error",
        "element-permitted-content": "error",
        "no-implicit-button-type": "error",
        "no-dup-class": "off",
        "wcag/h30": "off",
        "no-redundant-role": "off",
        "element-required-attributes": "off",
        "element-required-content": "off",
        "valid-id": "off",
        "prefer-native-element": "off",
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
      standalone: false,
    },
  },

  vite: {
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
    "~/plugins/04.clientPreferences.client.ts",
  ],

  fonts: {
    families: [
      { name: "Inclusive Sans", provider: "google", global: true },
      { name: "Noto Sans", provider: "google", global: true },
      { name: "EB Garamond", provider: "google", global: true },
      { name: "IBM Plex Mono", provider: "google", global: true },
      { name: "Ovo", provider: "google", global: true },
      { name: "Handlee", provider: "google", global: true },
    ],
  },

  future: {
    compatibilityVersion: 4,
  },

  compatibilityDate: "2024-11-27",
});
