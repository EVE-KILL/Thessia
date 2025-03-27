<script setup lang="ts">
const locale = useI18n();

useHead({
    script: [
        process.env.NODE_ENV !== 'production' ? {} :
        {
            src: '/_ca/cloudflare-beacon.js',
            type: 'text/javascript',
            async: true,
            'data-cf-beacon': JSON.stringify({ token: process.env.CLOUDFLARE_ANALYTICS_TOKEN, spa: true })
        }
    ]
})

</script>

<template>
    <UApp :local="locale">
        <NuxtLayout>
            <NuxtPage />
        </NuxtLayout>
    </UApp>
</template>
