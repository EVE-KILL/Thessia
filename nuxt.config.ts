// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  nitro: {
    preset: "bun",
    srcDir: "server",
    //minify: true,
    //sourceMap: true,

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
  compatibilityDate: "2024-11-01",
  devtools: {
    enabled: true,

    timeline: {
      enabled: true,
    },
  },
  modules: ["@nuxtjs/tailwindcss"],
});