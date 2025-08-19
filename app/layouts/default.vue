<script setup lang="ts">
import { computed, ref, onMounted } from "vue";
import { useI18n } from "vue-i18n";

const { getSiteBackground } = siteBackground();
const backgroundRef = getSiteBackground();
const backgroundUrl = computed(() => {
    return backgroundRef.value;
});
const { t } = useI18n();

// Lazy loading for background image
const isBackgroundLoaded = ref(false);
const backgroundImageUrl = ref('');

const loadBackgroundImage = async () => {
    if (backgroundUrl.value) {
        const img = new Image();
        img.onload = () => {
            backgroundImageUrl.value = backgroundUrl.value;
            isBackgroundLoaded.value = true;
        };
        img.onerror = () => {
            // Fallback to default background if image fails to load
            backgroundImageUrl.value = '/backgrounds/bg2.webp';
            isBackgroundLoaded.value = true;
        };
        // Preload the image
        img.src = backgroundUrl.value;
    }
};

// Load background after component is mounted (non-blocking)
onMounted(() => {
    // Use requestIdleCallback for better performance if available
    if (typeof requestIdleCallback !== 'undefined') {
        requestIdleCallback(() => {
            loadBackgroundImage();
        });
    } else {
        // Fallback for browsers without requestIdleCallback
        setTimeout(() => {
            loadBackgroundImage();
        }, 100);
    }
});

useHead({
    link: [
        { rel: "icon", type: "image/png", href: "/favicon.svg" },
        { rel: "search", type: "application/opensearchdescription+xml", href: "/search.xml" },
        // Preload critical background image (but not blocking render)
        { 
            rel: "preload", 
            as: "image", 
            href: "/backgrounds/bg2.webp",
            media: "(min-width: 768px)" // Only preload on larger screens
        }
    ],
});

useSeoMeta({
    titleTemplate: "EVE-KILL | %s",
    description:
        "EVE-KILL is a community-driven killboard for EVE Online, providing detailed statistics and analysis of player kills and losses.",
    ogDescription:
        "EVE-KILL is a community-driven killboard for EVE Online, providing detailed statistics and analysis of player kills and losses.",
    twitterDescription:
        "EVE-KILL is a community-driven killboard for EVE Online, providing detailed statistics and analysis of player kills and losses.",
    ogImage: "/icon.svg",
    twitterImage: "/icon.svg",
    ogType: "website",
    twitterCard: "summary_large_image",
    twitterTitle: "EVE-KILL",
    ogUrl: "https://eve-kill.com",
    ogSiteName: "EVE-KILL",
    twitterSite: "@eve_kill",
    twitterCreator: "@eve_kill",
    ogLocale: "en_US",
});
</script>

<template>
    <div 
        id="main-scroller" 
        class="main-scroller" 
        :class="{ 'background-loaded': isBackgroundLoaded }"
        :style="isBackgroundLoaded ? { backgroundImage: `url(${backgroundImageUrl})` } : {}"
    >
        <div class="vignette-overlay"></div>

        <Navbar />
        <UContainer id="content" class="content mx-auto">
            <div id="inner-content" class="inner-content">
                <main class="main-content">
                    <slot />
                </main>
                <Footer />
            </div>
        </UContainer>

        <BackgroundViewer />
        <BackgroundRandomizer />
        <!-- Global scroll-to-top button -->
        <ScrollTo targetSelector="#content" icon="lucide:arrow-up" title="Scroll to top" />

        <!-- Self-contained Spooderman Easter Egg -->
        <SpoodermanEasterEgg />

        <!-- Site WebSocket Manager - maintains global WebSocket connection -->
        <SiteWebSocketManager />
    </div>
</template>

<style scoped>
.main-scroller {
    /* Fallback gradient background while lazy-loading */
    background: linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #334155 100%);
    transition: background-image 0.5s ease-in-out;
}

.main-scroller.background-loaded {
    /* Smooth transition when background image loads */
    background-size: cover;
    background-position: center;
    background-repeat: no-repeat;
}

/* Optimize background loading for different screen sizes */
@media (max-width: 768px) {
    .main-scroller {
        /* On mobile, use a lighter fallback since background might not load */
        background: linear-gradient(135deg, #1e293b 0%, #334155 100%);
    }
}
</style>
