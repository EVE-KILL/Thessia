import { readFileSync } from "node:fs";
import yaml from "yaml";

// Load apiCacheTimes.yaml
const apiCacheTimes = readFileSync("./apiCacheTimes.yaml", "utf8");

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
    site: {
        url: 'https://eve-kill.net'
    },
    sourcemap: true,
    logLevel: process.env.NODE_ENV !== 'production' ? 'info' : 'silent',
    nitro: {
        preset: "bun",
        srcDir: "server",
        minify: true,

        esbuild: {
            options: {
                target: "esnext",
            },
        },

        routeRules: process.env.NODE_ENV === 'production' ? routeRuleGenerator() : {},

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
                driver: "redis",
                url: `redis://${process.env.REDIS_URI || "192.168.10.10"}:${
                    process.env.REDIS_PORT
                        ? Number.parseInt(process.env.REDIS_PORT)
                        : 6379
                }`,
                database: process.env.REDIS_DB || 0,
            },
        },
    },

    runtimeConfig: {
        public: {
            sentry: {
                dsn: process.env.SENTRY_DSN,
                environment: process.env.NODE_ENV,
                organization: process.env.SENTRY_ORG,
                project: process.env.SENTRY_PROJECT,
            }
        }
    },
    // Ensure modern compatibility mode
    compatibilityDate: "2024-11-01",

    // Development tools
    devtools: {
        enabled: process.env.NODE_ENV !== 'production',
        timeline: {
            enabled: true,
        },
        vscode: {
            enabled: false,
        },
    },

    // Modules with automatic TypeScript support
    modules: [
      "@nuxt/ui",
      "@nuxt/icon",
      "@nuxt/image",
      "@nuxtjs/i18n",
      "@vueuse/nuxt",
      "@nuxtjs/sitemap",
      "@nuxtjs/seo",
      //"nuxt-security",
      "@nuxtjs/color-mode",
      "@nuxtjs/device",
      "@sentry/nuxt/module"
    ],

    // Sentry configuration
    sentry: {
        sourceMapsUploadOptions: {
            org: process.env.SENTRY_ORG,
            project: process.env.SENTRY_PROJECT,
            authToken: process.env.SENTRY_AUTH_TOKEN,
        },
    },

    // i18n configuration
    i18n: {
        vueI18n: "i18n.config.ts", // No need to change this, it knows it's supposed to look in the ./i18n directory for it
        locales: [
            {
                code: "en",
                name: "English",
                file: "en.json",
            },
            {
                code: "de",
                name: "Deutsch",
                file: "de.json",
            },
            {
                code: "es",
                name: "Español",
                file: "es.json",
            },
            {
                code: "fr",
                name: "Français",
                file: "fr.json",
            },
            {
                code: "ja",
                name: "日本語",
                file: "ja.json",
            },
            {
                code: "ko",
                name: "한국어",
                file: "ko.json",
            },
            {
                code: "ru",
                name: "Русский",
                file: "ru.json",
            },
            {
                code: "zh",
                name: "中文",
                file: "zh.json",
            },
        ],
        defaultLocale: "en",
        strategy: "no_prefix",
        lazy: true,
        langDir: "locales/",
        detectBrowserLanguage: {
            useCookie: true,
            cookieKey: "i18n_locale",
            redirectOn: "root",
            alwaysRedirect: false,
        },
    },

    // CSS imports with proper path
    css: ["~/app.css"],

    // Image optimization settings - Fixed configuration
    image: {
        format: ["webp"],
        quality: 80,
        screens: {
            xs: 320,
            sm: 640,
            md: 768,
            lg: 1024,
            xl: 1280,
            xxl: 1536,
            "2xl": 1536,
        },
        // Updated providers configuration
        domains: ["i.redd.it", "i.imgur.com", "preview.redd.it", "images.evetech.net"],
        // Use ipx as default provider - it handles both local and remote images
        provider: "ipx",
        providers: {
            // Remove the custom proxy provider and use ipx's built-in remote image handling
        },
        presets: {
            background: {
                modifiers: {
                    format: "webp",
                    width: 1920,
                    height: 1080,
                    fit: "cover",
                    quality: 80,
                },
            },
        },
    },

    // App configuration
    app: {
        head: {
            charset: "utf-8",
            viewport: "width=device-width, initial-scale=1",
            title: "EVE-KILL",
            titleTemplate: "EVE-KILL | %s",
            base: {
                href: "/",
            },
            link: [
                { rel: "icon", type: "image/png", href: "/favicon.png" },
                {
                    rel: "search",
                    type: "application/opensearchdescription+xml",
                    title: "EVE-KILL",
                    href: "/search.xml",
                },
            ],
        },
    },

    security: {
        headers: {
            contentSecurityPolicy: false,
        },
    },

    colorMode: {
        classSuffix: "",
        storage: "cookie",
        storageKey: "theme",
        preference: "system",
        fallback: "dark",
    },
    ssr: true,
    imports: {
        autoImport: true,
    },
});

function routeRuleGenerator(debug = false): Record<string, any> {
  // Build route rules as an object with a default rule for /api/**
  const rules: Record<string, any> = {
    "/api/**": { cors: true },
  };

  if (debug === true) {
    return rules;
  }

  // Parse YAML
  const cacheTimes = yaml.parse(apiCacheTimes);

  // Merge routes from YAML:
  for (const route in cacheTimes) {
    rules[`/api${route}`] = {
      cors: true,
      cache: {
        maxAge: cacheTimes[route].maxAge || 60,
        staleMaxAge: cacheTimes[route].staleMaxAge || -1,
        swr: cacheTimes[route].swr || true,
      },
    };
  }

  return rules;
}
