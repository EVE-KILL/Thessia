// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  nitro: {
    preset: "bun",
    srcDir: "server",

    runtimeConfig: {
      enabledRunTimeCache: true,
    },

    esbuild: {
      options: {
        target: "esnext",
      },
    },

    imports: {
      dirs: ["server/models/**"],
    },

    experimental: {
      openAPI: true,
      websocket: true,
    },

    openAPI: {
      production: "runtime",
      meta: {
        title: "EVE-KILL API",
        description: "API for EVE-KILL",
        version: "1.0.0",
      },
      ui: {
        scalar: {
          route: "/scalar",
          theme: "dark",
        },
        swagger: {
          route: "/swagger",
        },
      },
    },

    storage: {
      redis: {
        driver: 'redis',
        url: `redis://${process.env.REDIS_URI || "192.168.10.10"}:${process.env.REDIS_PORT ? Number.parseInt(process.env.REDIS_PORT) : 6379}`,
        database: process.env.REDIS_DB || 0,
      }
    }
  },

  // Ensure modern compatibility mode
  compatibilityDate: "2024-11-01",

  // Development tools
  devtools: {
    enabled: true,
    timeline: {
      enabled: true,
    },
  },

  // Modules with automatic TypeScript support
  modules: [
    "@nuxt/ui",
    "@nuxt/icon",
    "@nuxt/image",
    "@vueuse/nuxt"
  ],

  // CSS imports with proper path
  css: ['~/app.css'],

  // Image optimization settings
  image: {
    format: ['webp'],
    quality: 80,
    screens: {
      xs: 320,
      sm: 640,
      md: 768,
      lg: 1024,
      xl: 1280,
      xxl: 1536,
      '2xl': 1536
    },
    presets: {
      background: {
        modifiers: {
          format: 'webp',
          width: 1920,
          quality: 80,
        }
      }
    }
  },

  // App configuration
  app: {
    head: {
      title: 'EVE-KILL - EVE Online Killboard',
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        { name: 'description', content: 'EVE Online killboard tracking kills and losses across New Eden' }
      ],
      link: [
        { rel: 'icon', type: 'image/x-icon', href: '/favicon.ico' }
      ]
    }
  }
});
