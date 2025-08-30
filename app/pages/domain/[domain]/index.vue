<template>
    <div>
        <!-- Domain landing page - redirect to customizer -->
    </div>
</template>

<script setup lang="ts">
// Get domain from route params
const route = useRoute();
const domain = route.params.domain as string;

// Redirect to dashboard customizer
await navigateTo(`/domain/dashboard/customizer?domain=${domain}`);
</script>
