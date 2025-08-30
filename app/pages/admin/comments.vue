<template>
    <AdminComments />
</template>

<script setup lang="ts">
// Set layout
definePageMeta({
    layout: 'admin'
});

// Set page title
const { t } = useI18n();
useSeoMeta({
    title: `${t('admin.comments.title')} - Admin Panel`,
    description: t('admin.comments.description'),
});
</script>
