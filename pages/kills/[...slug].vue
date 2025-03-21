<template>
    derp
</template>

<script setup lang="ts">
const { t } = useI18n();

// Dynamic title based on killmail information
useSeoMeta({
    title: t('kills.pageTitle')
});
</script>
