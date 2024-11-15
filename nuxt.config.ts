// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  devtools: {
    enabled: true,
  },

  modules: [
    "@nuxt/content",
    "nuxt-mongoose",
    "@nuxtjs/tailwindcss",
    "@nuxt/image",
    "nuxt-security"
  ],

  image: {
    quality: 80,
    formats: ["webp"],
    domains: ["images.evetech.net"],
  },

  mongoose: {
    uri: process.env.NODE_ENV === 'production' ? process.env.MONGO_URI_PROD : process.env.MONGO_URI_DEV,
    options: {},
    modelsDir: "models",
    devtools: true,
  },

  routeRules: {
    "/": {
      prerender: true,
    },
    "/api/**": {
      cors: true,
      //cache: {
      //  maxAge: 60,
      //  staleMaxAge: -1,
      //  swr: true,
      //}
    },
  },

  nitro: {
    experimental: {
      websocket: true,
      tasks: true,
      openAPI: false, // Currently broken in 3.14
    },

    scheduledTasks: {
      '0 0 * * *': ['updatePrices']
    },

    openAPI: {
      meta: {
        title: "EVE-KILL API",
        description: "API for EVE-KILL",
        version: "1.0.0",
      },
      ui: {
        scalar: {
          theme: "dark",
        },
      },
    },

    storage: {
      redis: {
        driver: "redis",
        url: process.env.NODE_ENV === 'production' ? process.env.REDIS_URI_PROD : process.env.REDIS_URI_DEV,
      },
    },
  },

  compatibilityDate: "2024-10-13",
});
