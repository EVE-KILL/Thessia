// Import build system
import { generateAllLoaders, handleNitroBuildHooks } from "./build";

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
    css: [`~/assets/main.css`],

    components: [
        {
            path: "~/components",
            pathPrefix: false,
        },
        {
            path: "~/components/common",
            pathPrefix: false,
        },
    ],
    site: {
        url: "https://eve-kill.com",
    },
    logLevel: process.env.NODE_ENV !== "production" ? "info" : "silent",
    nitro: {
        preset: "node-server", // https://github.com/nitrojs/nitro/issues/2719
        srcDir: "server",
        minify: true,
        esbuild: {
            options: {
                target: "esnext",
                minify: true,
                minifySyntax: true,
                minifyWhitespace: true,
                minifyIdentifiers: true,
                treeShaking: true,
                charset: "utf8",
                keepNames: false,
            },
        },

        imports: {
            autoImport: true,
            dirs: [
                "server/models/**",
                "server/helpers/**",
                "server/interfaces/**",
                "server/utils/**",
                "server/plugins/**",
                "server/queue/**",
            ],
        },

        experimental: {
            openAPI: true,
            websocket: true,
            asyncContext: true,
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

        future: {
            nativeSWR: true,
        },
    },

    router: {
        options: {
            scrollBehaviorType: "smooth",
        },
    },
    experimental: {
        renderJsonPayloads: true,
        writeEarlyHints: true,
        viewTransition: true,
    },

    // Ensure modern compatibility mode
    compatibilityDate: "2024-11-01",

    // Development tools
    devtools: {
        enabled: process.env.NODE_ENV !== "production",
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
        "@nuxtjs/sitemap",
        "@nuxtjs/seo",
        "@nuxtjs/color-mode",
        "@nuxtjs/device",
        "@nuxtjs/partytown",
        "@vueuse/nuxt",
    ],

    colorMode: {
        classSuffix: "",
        storage: "localStorage",
        storageKey: "theme",
        preference: "dark",
        fallback: "dark",
    },
    imports: {
        dirs: ["utils/**"],
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

        compilation: {
            strictMessage: false,
        },
        defaultLocale: "en",
        strategy: "no_prefix",
        langDir: "locales/",
        detectBrowserLanguage: {
            useCookie: true,
            cookieKey: "i18n_locale",
            redirectOn: "root",
            alwaysRedirect: false,
        },
    },

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
        domains: [
            "i.redd.it",
            "i.imgur.com",
            "preview.redd.it",
            "images.evetech.net",
        ],
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
                {
                    rel: "preconnect",
                    href: "https://images.eve-kill.com",
                    crossorigin: "anonymous",
                },
                { rel: "icon", type: "image/png", href: "/favicon.svg" },
                {
                    rel: "search",
                    type: "application/opensearchdescription+xml",
                    title: "EVE-KILL",
                    href: "/search.xml",
                },
                // Preload critical fonts if you use any
                // { rel: 'preload', as: 'font', href: '/fonts/your-font.woff2', crossorigin: 'anonymous' }
            ],
        },
        keepalive: true,
        // Extract critical CSS for above-the-fold content
        rootId: "app",
        buildAssetsDir: "/_nuxt/",
    },

    hooks: {
        // Generate loaders before build
        "build:before": async () => {
            generateAllLoaders();
        },

        // Also generate loaders on dev server start
        "app:resolve": async () => {
            generateAllLoaders();
        },

        // Process Cloudflare beacon and copy docs during build
        "nitro:build:public-assets": async (nitro) => {
            await handleNitroBuildHooks(nitro);
        },
    },
});
