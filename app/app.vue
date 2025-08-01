<script setup lang="ts">
const locale = useI18n();

useHead({
    script: [
        {
            src: "/_ca/cloudflare-beacon.js",
            type: "text/partytown",
            async: true,
            "data-cf-beacon": JSON.stringify({
                token: process.env.CLOUDFLARE_ANALYTICS_TOKEN,
                spa: true,
            }),
        },
    ]
});
</script>

<style global>
html {
    /* CSS variable for zoom that can be used in other components */
    --app-zoom: 100%;
}

/* Fallback for browsers that don't support the zoom property */
@supports not (zoom: 1) {
    html {
        transform: scale(calc(var(--app-zoom) / 100));
        transform-origin: top left;
    }
}
</style>

<template>
    <UApp :local="locale">
        <NuxtLayout>
            <NuxtPage />
        </NuxtLayout>
    </UApp>
</template>
