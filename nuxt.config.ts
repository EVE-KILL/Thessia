// Import build system
import { generateAllLoaders, handleNitroBuildHooks } from "./build";

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
    css: ["~/assets/main.css"],

    // Enable built-in critical CSS optimization
    features: {
        // Let critters handle critical CSS detection automatically
        inlineStyles: true,
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
      "@nuxtjs/critters",
      "@pinia/nuxt",
      "@vueuse/nuxt",
      "@prisma/nuxt",
    ],

    critters: {
        config: {
            mergeStylesheets: true,
            inlineFonts: true,
            preloadFonts: true,
            compress: true,
            preload: "body",
            // More aggressive critical CSS detection
            inlineThreshold: 0, // Inline all critical CSS regardless of size
            minimumExternalSize: 0, // Inline everything possible
            pruneSource: false, // Keep original CSS for non-critical parts
            logLevel: "info", // See what critters is doing
        },
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
        minify: true,
        sourceMap: true,
        esbuild: {
            options: {
                target: "esnext",
                minify: true,
                minifySyntax: true,
                minifyWhitespace: true,
                minifyIdentifiers: true,
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
            websocket: true,
            asyncContext: true,
            wasm: true,
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
                    "cache-control": "public, max-age=31536000, immutable",
                },
            },
            // Serve source maps with proper headers
            "/_nuxt/**/*.map": {
                headers: {
                    "content-type": "application/json",
                    "cache-control": "public, max-age=31536000, immutable",
                },
            },
            "/_healthcheck": {
                security: {
                    rateLimiter: false, // Disable rate limiting for health checks
                },
            },
            "/images/**": {
                headers: {
                    "cache-control": "public, max-age=31536000, immutable",
                },
            },
            // Cache background images
            "/backgrounds/**": {
                headers: {
                    "cache-control": "public, max-age=31536000, immutable",
                },
            },
            // Cache favicon and other root assets
            "/favicon.*": {
                headers: {
                    "cache-control": "public, max-age=31536000, immutable",
                },
            },
            "/icon.*": {
                headers: {
                    "cache-control": "public, max-age=31536000, immutable",
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
        // Optimize payload extraction
        payloadExtraction: false, // Disable if causing hydration issues
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
                    "https://images.eve-kill.com",
                    "https://eve-kill.com",
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
            tokensPerInterval: 15000,
            interval: 300000, // 5 minutes
            headers: false,
            whiteList: ["::1", "127.0.0.1", "10.0.0.0/8"],
        },
    },

    // Vite configuration
    vite: {
        build: {
            minify: process.env.NODE_ENV === "production" ? "terser" : false,
            sourcemap: true,
            terserOptions: {
                compress: {
                    drop_console: process.env.NODE_ENV === "production",
                    drop_debugger: process.env.NODE_ENV === "production",
                    pure_funcs:
                        process.env.NODE_ENV === "production"
                            ? ["console.log", "console.info", "console.debug"]
                            : [],
                },
                mangle: {
                    safari10: true,
                },
                sourceMap: true, // Always generate source maps
            },
            // Force CSS consolidation to reduce render-blocking resources
            cssCodeSplit: false, // This will bundle all CSS into fewer files
            rollupOptions: {
                output: {
                    // Force consolidation of CSS files
                    manualChunks: undefined, // Let Vite handle chunking automatically
                },
            },
        },
        css: {
            // CSS processing optimization
            devSourcemap: true,
            // Optimize CSS modules for better critical CSS detection
            modules: {
                localsConvention: "camelCase",
                generateScopedName: "[name]__[local]___[hash:base64:5]",
            },
        },
        // Optimize dependencies for better bundling
        optimizeDeps: {
            include: [
                "vue",
                "vue-router",
                "date-fns",
                "@vueuse/core",
                "dompurify",
                "isomorphic-dompurify",
            ],
            exclude: [
                "mongoose",
                "ioredis",
                "bullmq",
                "amqplib",
                "neo4j-driver",
                "jsonwebtoken",
                "discord.js",
                "commander",
                "chalk",
                "@nuxt/ui",
                "@nuxt/kit",
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
        vueI18n: "i18n/i18n.config.ts",
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
                // Preload most common background images
                {
                    rel: "preload",
                    as: "image",
                    href: "/backgrounds/bg2.webp",
                    media: "(min-width: 768px)",
                },
                {
                    rel: "preload",
                    as: "image",
                    href: "/backgrounds/bg1.webp",
                    media: "(min-width: 768px)",
                },
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
        "nitro:build:public-assets": async (nitro: any) => {
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