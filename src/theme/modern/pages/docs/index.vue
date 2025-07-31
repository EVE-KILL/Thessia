<template>
    <div>
        <!-- This will redirect to the dynamic docs page -->
        <NuxtPage />
    </div>
</template>

<script setup lang="ts">
// Redirect to docs index
await navigateTo('/docs/index');
</script>
