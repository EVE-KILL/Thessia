<template>
    <DomainDashboardRenderer :domain="domain" :client-only="false" />
</template>

<script setup lang="ts">
interface Props {
    domain: string
    initialStats?: any
    initialEntities?: any
    initialCampaigns?: any
}

// Accept the props for compatibility but don't use them since DomainDashboardRenderer
// handles its own data fetching
defineProps<Props>()
</script>
