<template>
    <KillList :killlistType="'latest'" />
</template>

<script setup lang="ts">
import KillList from '~/components/KillList.vue';

const { t } = useI18n();
useSeoMeta({
  title: t('home.pageTitle')
});


</script>

<style scoped>

</style>
