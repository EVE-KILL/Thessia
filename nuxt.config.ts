// Import build system
import { generateAllLoaders, handleNitroBuildHooks } from "./build";

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
    css: [`~/assets/main.css`],

    fonts: {
        devtools: false,
    },

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
        name: "EVE-KILL",
        description:
            "EVE-KILL is a community-driven killboard for EVE Online, providing detailed statistics, ship loss reports, and player achievements.",
        keywords: [
            "EVE Online",
            "killboard",
            "PVP statistics",
            "ship loss reports",
            "player achievements",
            "EVE-KILL",
            "EVE community",
            "EVE Online statistics",
        ],
    },

    logLevel: process.env.NODE_ENV !== "production" ? "info" : "silent",

    nitro: {
        // use preset: node-server to get working SSE, but broken WS https://github.com/nitrojs/nitro/issues/2719
        // use preset: bun to get working WS, but broken SSE https://github.com/nitrojs/nitro/issues/2171
        preset: "node-server",
        srcDir: "server",
        minify: false,
        esbuild: {
            options: {
                target: "esnext",
                minify: false,
                minifySyntax: false,
                minifyWhitespace: false,
                minifyIdentifiers: false,
                treeShaking: true,
                charset: "utf8",
                keepNames: true,
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

        // Enable compression for public assets
        compressPublicAssets: true,

        // Add global headers for performance
        routeRules: {
            // Cache static assets for 1 year with immutable flag
            "/_nuxt/**": {
                headers: {
                    "cache-control": "s-maxage=31536000, immutable",
                },
            },
            "/_healthcheck": {
                security: {
                    rateLimiter: false, // Disable rate limiting for health checks
                },
            },
            "/images/**": {
                headers: {
                    "cache-control": "s-maxage=31536000, immutable",
                },
            },
            // Cache favicon and other root assets
            "/favicon.*": {
                headers: {
                    "cache-control": "s-maxage=31536000, immutable",
                },
            },
            "/icon.*": {
                headers: {
                    "cache-control": "s-maxage=31536000, immutable",
                },
            },
            // Admin routes - no caching
            "/admin/**": {
                robots: false,
                headers: {
                    "cache-control": "no-cache, no-store, must-revalidate",
                },
            },
            // API documentation
            "/scalar": { robots: false },
            "/swagger": { robots: false },
        },
    },

    router: {
        options: {
            scrollBehaviorType: "smooth",
        },
    },

    vue: {
        compilerOptions: {
            // Suppress Suspense experimental warning in development
            isCustomElement: () => false,
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
    },

    // Modules with automatic TypeScript support
    modules: [
        "nuxt-security",
        "@nuxt/ui",
        "@nuxt/icon",
        "@nuxtjs/i18n",
        "@nuxtjs/sitemap",
        "@nuxtjs/seo",
        "@nuxtjs/color-mode",
        "@nuxtjs/device",
        "@nuxtjs/partytown",
        "@vueuse/nuxt",
        "@pinia/nuxt",
    ],

    // Security module configuration
    security: {
        hidePoweredBy: true,
        headers: {
            contentSecurityPolicy: {
                "base-uri": ["'self'"],
                "font-src": ["'self'", "https:", "data:"],
                "form-action": ["'self'"],
                "frame-ancestors": ["'none'"],
                "img-src": [
                    "'self'",
                    "data:",
                    "https:",
                    "https://images.evetech.net",
                    "https://images.eve-kill.com",
                    "https://i.redd.it",
                    "https://i.imgur.com",
                    "https://preview.redd.it",
                ],
                "object-src": ["'none'"],
                "script-src-attr": ["'none'"],
                "style-src": ["'self'", "https:", "'unsafe-inline'"],
                "script-src": [
                    "'self'",
                    "'unsafe-inline'", // Required for Nuxt hydration
                    "'unsafe-eval'", // Required for development mode
                    "https://challenges.cloudflare.com", // Cloudflare challenges
                    "blob:", // Required for web workers
                ],
                "connect-src": [
                    "'self'",
                    "https://images.evetech.net",
                    "https://api.iconify.design",
                    "wss://ws.eve-kill.com",
                    "ws://localhost:*",
                    "wss://localhost:*",
                ],
                "upgrade-insecure-requests": true,
            },
            crossOriginOpenerPolicy: "same-origin",
            crossOriginResourcePolicy: "cross-origin",
            crossOriginEmbedderPolicy: "unsafe-none",
            originAgentCluster: "?1",
            referrerPolicy: "no-referrer",
            strictTransportSecurity: {
                maxAge: 31536000,
                includeSubdomains: true,
            },
            xContentTypeOptions: "nosniff",
            xDNSPrefetchControl: "off",
            xDownloadOptions: "noopen",
            xFrameOptions: "DENY",
            xPermittedCrossDomainPolicies: "none",
            xXSSProtection: "0",
        },
        // Rate limiting for API endpoints
        rateLimiter: {
            tokensPerInterval: 150,
            interval: 300000, // 5 minutes
            headers: false,
            whiteList: ["::1", "127.0.0.1", "10.0.0.0/8"],
        },
    },

    // Vite configuration for bundle optimization
    vite: {
        build: {
            minify: false,
            rollupOptions: {
                output: {
                    manualChunks: {
                        // Separate vendor chunks for better caching (client-safe only)
                        "vue-vendor": ["vue", "vue-router"],
                        charts: ["echarts", "vue-echarts"],
                        utils: ["date-fns", "dompurify", "micromark"],
                        "eve-specific": ["moment", "moment-timezone"], // EVE-specific utilities
                    },
                },
            },
        },
        // Optimize dependencies (exclude server-side only packages)
        optimizeDeps: {
            include: ["vue", "vue-router", "echarts"],
            exclude: [
                // Exclude Node.js/server-side packages that caused issues before
                "mongoose",
                "ioredis",
                "bullmq",
                "amqplib",
                "neo4j-driver",
                "jsonwebtoken",
                "discord.js",
                "commander",
                "chalk",
                "@nuxt/ui", // Exclude Nuxt UI as it has server-side dependencies
                "@nuxt/kit", // Exclude Nuxt kit modules
            ],
        },
    },

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

    pinia: {
        // Let Nuxt auto-discover stores in the stores/ directory
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
        detectBrowserLanguage: false,
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
                // DNS prefetch for external domains
                { rel: "dns-prefetch", href: "//images.eve-kill.com" },
                { rel: "dns-prefetch", href: "//eve-kill.com" },
                { rel: "dns-prefetch", href: "//images.evetech.net" },
                { rel: "dns-prefetch", href: "//i.imgur.com" },
                { rel: "dns-prefetch", href: "//i.redd.it" },

                // Preconnect to critical external resources
                {
                    rel: "preconnect",
                    href: "https://images.eve-kill.com",
                    crossorigin: "anonymous",
                },
                {
                    rel: "preconnect",
                    href: "https://eve-kill.com",
                    crossorigin: "anonymous",
                },
                { rel: "icon", type: "image/png", href: "/favicon.svg" },
                {
                    rel: "search",
                    type: "application/opensearchdescription+xml",
                    title: "EVE-KILL",
                    href: "/search.xml",
                },
                // Canonical URL support
                { rel: "canonical", href: "https://eve-kill.com" },
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

    // Partytown configuration
    partytown: {
        // Disable debug mode to reduce console noise
        debug: false,
        // Forward events to main thread
        forward: ["dataLayer.push"],
    },
});
