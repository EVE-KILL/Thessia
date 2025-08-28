<template>
    <DomainDashboard :domain="domain" :initial-stats="initialStats" :initial-entities="initialEntities"
        :initial-campaigns="initialCampaigns" />
</template>

<script setup lang="ts">
const route = useRoute()
const domain = route.params.domain as string

// Pre-fetch all data server-side for SSR
const [
    { data: domainConfig },
    { data: initialStats },
    { data: entitiesResponse },
    { data: campaignsResponse }
] = await Promise.all([
    // Domain configuration lookup
    $fetch(`/api/domains/lookup`, {
        query: { domain }
    }).catch(() => null),

    // Initial statistics (7d default)
    $fetch(`/api/domain/${domain}/stats`, {
        query: { timeRange: '7d' }
    }).catch(() => null),

    // Entity details with names
    $fetch(`/api/domain/${domain}/entities`).catch(() => ({ entities: [] })),

    // Initial campaigns
    $fetch(`/api/domain/${domain}/campaigns`, {
        query: { limit: 4 }
    }).catch(() => ({ campaigns: [] }))
])

// Handle domain not found
if (!domainConfig) {
    throw createError({
        statusCode: 404,
        statusMessage: 'Domain not found'
    })
}

// Extract entities from the API response
const initialEntities = entitiesResponse?.entities || []
const initialCampaigns = campaignsResponse?.campaigns || []

// SEO optimization
const domainTitle = domainConfig?.branding?.header_title || `${domain} Killboard`
const entityCount = domainConfig?.entities?.length || 0
const description = `Multi-entity killboard tracking ${entityCount} entities in EVE Online`

useSeoMeta({
    title: `${domainTitle} - EVE Kill`,
    description: description,
    ogTitle: domainTitle,
    ogDescription: description,
    ogType: 'website',
    twitterCard: 'summary',
    twitterTitle: domainTitle,
    twitterDescription: description
})

// Set page title
useHead({
    title: domainTitle,
    titleTemplate: '%s - EVE Kill'
})
</script>
