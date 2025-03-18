// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  nitro: {
    preset: "bun",
    srcDir: "server",
    minify: true,
    sourceMap: true,

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

  runtimeConfig: {
    enabledRunTimeCache: true,
    public: {
      sentry: {
        dsn: process.env.SENTRY_DSN,
        environment: process.env.NODE_ENV,
        organization: process.env.SENTRY_ORG,
        project: process.env.SENTRY_PROJECT,
      },
    },
    mongodb: {
      uri: process.env.MONGO_URI,
    },
    redis: {
      uri: process.env.REDIS_URI,
      port: process.env.REDIS_PORT,
      db: process.env.REDIS_DB,
    },
    redisq: {
      id: process.env.REDISQ_ID,
    },
    meilisearch: {
      uri: process.env.MEILISEARCH_URI,
    },
    discord: {
      backend: process.env.BACKEND_DISCORD_URL,
    },
    esi: {
      url: process.env.ESI_URL,
      rateLimit: process.env.ESI_RATE_LIMIT,
      clientID: process.env.NODE_ENV === 'production' ? process.env.EVE_CLIENT_ID : process.env.EVE_CLIENT_ID_DEV,
      clientSecret: process.env.NODE_ENV === 'production' ? process.env.EVE_CLIENT_SECRET : process.env.EVE_CLIENT_SECRET_DEV,
      clientRedirect: process.env.NODE_ENV === 'production' ? process.env.EVE_CLIENT_REDIRECT : process.env.EVE_CLIENT_REDIRECT_DEV,
    },
    tasks: {
      processKillmails: process.env.PROCESS_KILLMAILS,
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
    vscode: {
      enabled: false
    }
  },

  // Modules with automatic TypeScript support
  modules: [
    "@nuxt/ui",
    "@nuxt/icon",
    "@nuxt/image",
    "@nuxtjs/i18n",
    "@vueuse/nuxt",
    "@pinia/nuxt",
    '@nuxtjs/sitemap',
    '@sentry/nuxt/module',
    '@nuxtjs/seo',
    '@nuxtjs/color-mode',
    'nuxt-purgecss'
  ],

  // Sourcemaps
  sourcemap: {
    client: true
  },

  // Sentry configuration
  sentry: {
    sourceMapsUploadOptions: {
      org: process.env.SENTRY_ORG,
      project: process.env.SENTRY_PROJECT,
      authToken: process.env.SENTRY_AUTH_TOKEN,
    }
  },

  // i18n configuration
  i18n: {
    vueI18n: 'i18n.config.ts', // No need to change this, it knows it's supposed to look in the ./i18n directory for it
    locales: [
      {
        code: 'en',
        name: 'English',
        file: 'en.json'
      },
      {
        code: 'de',
        name: 'Deutsch',
        file: 'de.json'
      },
      {
        code: 'es',
        name: 'Español',
        file: 'es.json'
      },
      {
        code: 'fr',
        name: 'Français',
        file: 'fr.json'
      },
      {
        code: 'ja',
        name: '日本語',
        file: 'ja.json'
      },
      {
        code: 'ko',
        name: '한국어',
        file: 'ko.json'
      },
      {
        code: 'ru',
        name: 'Русский',
        file: 'ru.json'
      },
      {
        code: 'zh',
        name: '中文',
        file: 'zh.json'
      }
    ],
    defaultLocale: 'en',
    strategy: 'no_prefix',
    lazy: true,
    langDir: 'locales/',
    detectBrowserLanguage: {
      useCookie: true,
      cookieKey: 'i18n_locale',
      redirectOn: 'root',
      alwaysRedirect: false
    }
  },

  // CSS imports with proper path
  css: ['~/app.css'],

  // Image optimization settings - Fixed configuration
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
    // Updated providers configuration
    domains: ['i.redd.it', 'i.imgur.com', 'preview.redd.it'],
    // Use ipx as default provider - it handles both local and remote images
    provider: 'ipx',
    providers: {
      // Remove the custom proxy provider and use ipx's built-in remote image handling
    },
    presets: {
      background: {
        modifiers: {
          format: 'webp',
          width: 1920,
          height: 1080,
          fit: 'cover',
          quality: 80
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
        { name: 'viewport', content: 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no' },
        { name: 'description', content: 'EVE Online killboard tracking kills and losses across New Eden' }
      ],
      link: [
        { rel: 'icon', type: 'image/x-icon', href: '/favicon.png' },
        { rel: 'search', type: 'application/opensearchdescription+xml', title: 'EVE-KILL', href: '/search.xml' },
      ]
    }
  },

  colorMode: {
    classSuffix: '',
    storage: 'cookie',
    storageKey: 'theme',
    preference: 'system',
    fallback: 'dark'
  }
});
