<template>
  <!-- This page just throws a 503 error, the actual maintenance UI is in error.vue -->
</template>

<script setup lang="ts">
definePageMeta({
    layout: "default",
});

// Get maintenance state from server
const { data: maintenanceData } = await useFetch('/api/maintenance/status');

// If maintenance is not enabled, redirect to home
if (!maintenanceData.value?.isEnabled) {
    await navigateTo('/');
}

// Throw 503 error which will be handled by error.vue with maintenance UI
throw createError({
    statusCode: 503,
    statusMessage: "Service Unavailable - Site is currently under maintenance",
    data: {
        maintenanceMessage: maintenanceData.value?.message || '',
        lastChecked: maintenanceData.value?.lastChecked || new Date().toISOString()
    }
});
</script>
