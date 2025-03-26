<script setup lang="ts">
const { getOptimizedImageUrl, getSiteBackground } = siteBackground();
const backgroundRef = getSiteBackground();
const backgroundUrl = computed(() => {
    return getOptimizedImageUrl(backgroundRef.value);
});

useHead({
    link: [
        { rel: 'preload', as: 'image', href: backgroundUrl.value }
    ]
});

useSeoMeta({
    titleTemplate: 'EVE-KILL | %s',
    description: 'EVE-KILL is a community-driven killboard for EVE Online, providing detailed statistics and analysis of player kills and losses.',
    ogDescription: 'EVE-KILL is a community-driven killboard for EVE Online, providing detailed statistics and analysis of player kills and losses.',
    twitterDescription: 'EVE-KILL is a community-driven killboard for EVE Online, providing detailed statistics and analysis of player kills and losses.',
    ogImage: '/icon.svg',
    twitterImage: '/icon.svg',
    ogType: 'website',
    twitterCard: 'summary_large_image',
    twitterTitle: 'EVE-KILL',
    ogUrl: 'https://eve-kill.com',
    ogSiteName: 'EVE-KILL',
    twitterSite: '@eve_kill',
    twitterCreator: '@eve_kill',
    ogLocale: 'en_US',
})

useHead({
    link: [
        {
            rel: 'icon',
            type: 'image/png',
            href: '/favicon.png'
        }
    ]
})
</script>

<template>
    <div :style="{
        backgroundColor: 'black',
        backgroundImage: `url(${backgroundUrl})`,
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed',
        backgroundSize: 'cover',
        position: 'relative',
        height: '100%',
        overflow: 'auto'
    }">
        <div class="vignette-overlay"></div>

        <UContainer id="content" class="content mx-auto">
            <div id="inner-content" class="inner-content">
                <Navbar />
                <main class="main-content py-8 px-4">
                    <slot />
                </main>
                <Footer />
            </div>
        </UContainer>

        <BackgroundViewer />
    </div>
</template>

<style>
html,
body {
    height: 100%;
    margin: 0;
    padding: 0;
    font-family: 'Shentox', sans-serif;
    font-size: 1.1em;
    color: black;
    overflow-x: hidden;
}

html.dark,
html.dark body {
    color: white;
}

html {
    background-color: black !important;
    background-image: var(--bg-image-url) !important;
    background-repeat: no-repeat !important;
    background-position: center !important;
    background-attachment: fixed !important;
    background-size: cover !important;
    position: relative;
    min-height: 100%;
    overflow-y: auto;
}

html.dark {
    background-color: black;
}

html::before {
    content: '';
    position: fixed;
    top: 0;
    right: 0;
    bottom: 0;
    left: 0;
    background: radial-gradient(circle, transparent, white 95%);
    pointer-events: none;
    z-index: 0;
}

html.dark::before {
    background: radial-gradient(circle, transparent, black 95%);
}

body {
    display: flex;
    flex-direction: column;
    min-height: 100vh;
    position: relative;
    z-index: 1;
    background-color: transparent;
    padding-right: 0 !important;
    overflow-y: auto;
    overflow-x: hidden;
}

.content {
    position: relative;
    z-index: 2;
    max-width: 85rem;
    background-color: rgba(245, 245, 245, 0.7) !important;
    border-left: 2px solid #e5e5e5;
    border-right: 2px solid #e5e5e5;
    padding: 5px 5px 0px 5px;
    width: 100%;
    box-sizing: border-box;
    min-height: 100vh;
    height: auto;
    overflow: visible;
    display: flex;
    flex-direction: column;
}

.inner-content {
    max-width: 84rem;
    margin: 0 auto;
    height: auto;
    min-height: 100vh;
    width: 100%;
    display: flex;
    flex-direction: column;
    overflow: visible;
}

html.dark .content {
    background-color: rgba(21, 21, 21, 0.7) !important;
    border-left: 2px solid #252525;
    border-right: 2px solid #252525;
}

#content>#inner-content {
    display: flex;
    flex-direction: column;
    padding: 5px 5px 0 5px;
    background: rgba(255, 255, 255, 0.25);
    min-height: 100vh;
    box-sizing: border-box;
    margin: 0;
    height: auto;
    overflow: visible;
}

.main-content {
    flex: 1;
    padding-bottom: 20px;
    width: 100%;
    overflow: visible;
}

@media (min-width: 768px) {
    #content>#inner-content {
        padding-right: 25px;
        padding-left: 25px;
    }
}

html.dark #content>#inner-content {
    background: rgba(0, 0, 0, 0.80);
}

html #content>#inner-content {
    background: rgba(255, 255, 255, 0.80);
}

@media (max-width: 767px) {
    .content {
        border-left: none;
        border-right: none;
    }

    html.dark .content {
        border-left: none;
        border-right: none;
    }
}

#inner-content {
    padding-top: 1rem;
}

.vignette-overlay {
    position: fixed;
    top: 0;
    right: 0;
    bottom: 0;
    left: 0;
    background: radial-gradient(
        circle,
        transparent 30%,
        rgba(245, 245, 245, 0.3) 70%,
        rgba(220, 220, 220, 0.8) 100%
    );
    pointer-events: none;
    z-index: 1;
    transition: background 0.5s ease;
}

html.dark .vignette-overlay {
    background: radial-gradient(
        circle,
        transparent 30%,
        rgba(0, 0, 0, 0.5) 70%,
        rgba(0, 0, 0, 0.85) 100%
    );
}

@keyframes subtle-pulse {
    0% { opacity: 0.95; }
    50% { opacity: 1; }
    100% { opacity: 0.95; }
}

.vignette-overlay {
    animation: subtle-pulse 8s infinite ease-in-out;
}

footer {
    margin-bottom: 0;
    align-self: end;
    grid-row-start: 3;
    height: auto;
    min-height: 0;
    margin: 0 !important;
    padding-bottom: 0 !important;
    width: 100%;
    box-sizing: border-box;
    margin-top: auto !important;
}

.u-container {
    margin: 0 !important;
    padding: 0 !important;
    height: auto !important;
    min-height: 100vh !important;
    display: flex !important;
    flex-direction: column !important;
    overflow: visible !important;
}
</style>
