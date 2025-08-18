<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";

const { getSiteBackground } = siteBackground();
const backgroundRef = getSiteBackground();
const backgroundUrl = computed(() => {
    return backgroundRef.value;
});
const { t } = useI18n();

useHead({
    link: [
        { rel: "icon", type: "image/png", href: "/favicon.svg" },
        { rel: "search", type: "application/opensearchdescription+xml", href: "/search.xml" },
    ],
});

// Background handling without preload to avoid browser warnings
// Modern browsers are efficient at loading images when needed

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
    <div id="main-scroller" class="main-scroller" :style="{ backgroundImage: `url(${backgroundUrl})` }">
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
