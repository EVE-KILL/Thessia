<template>
    <div>
        <!-- Show domain not found error page -->
        <DomainNotFound v-if="showNotFoundError" :domain="domain" />

        <!-- Show unverified domain error page -->
        <DomainUnverified v-else-if="showUnverifiedError" :domain="domain" />

        <!-- Show normal domain dashboard -->
        <DomainDashboard v-else :domain="domain" :initial-stats="initialStats" :initial-entities="initialEntities"
            :initial-campaigns="initialCampaigns" />
    </div>
</template>

<script setup lang="ts">
import { useDomainSettingsStore } from '~/stores/domainSettings'

const route = useRoute()
// Get domain from route parameter or from hostname for direct custom domain visits
const domain = (route.params.domain as string) || (process.client ? window.location.hostname : '')

// Check for domain errors from middleware first
const { domainError, isCustomDomain } = useDomainContext()
const domainSettingsStore = useDomainSettingsStore()

// State for error handling
const showNotFoundError = ref(false)
const showUnverifiedError = ref(false)
let initialStats: any = null
let entitiesResponse: any = null
let campaignsResponse: any = null

// Enhanced error handling with better logging
if (domainError.value) {
    if (domainError.value.type === 'domain_not_found') {
        showNotFoundError.value = true
    } else if (domainError.value.type === 'domain_unverified') {
        showUnverifiedError.value = true
    }
} else if (!isCustomDomain.value && domain && domain !== 'localhost' && !domain.includes('eve-kill.com')) {
    // If middleware didn't detect this as a custom domain but we have a domain parameter
    // that's not a main EVE-KILL domain, it might be an unknown domain
    showNotFoundError.value = true
} else if (isCustomDomain.value || !domainError.value) {
    // No errors from middleware, proceed with normal loading
    try {
        // Load domain settings into the store - let it handle all error scenarios
        await domainSettingsStore.loadDomainSettings(domain)

        // If we get here, domain is valid - pre-fetch additional data
        const [statsResponse, entitiesResp, campaignsResp] = await Promise.all([
            // Initial statistics (7d default)
            $fetch(`/api/domain/${domain}/stats`, {
                query: { timeRange: '7d' }
            }).catch((err) => {
                return null
            }),

            // Entity details with names
            $fetch(`/api/domain/${domain}/entities`).catch((err) => {
                return { entities: [] }
            }),

            // Initial campaigns
            $fetch(`/api/domain/${domain}/campaigns`, {
                query: { limit: 4 }
            }).catch((err) => {
                return { campaigns: [] }
            })
        ])

        initialStats = statsResponse
        entitiesResponse = entitiesResp
        campaignsResponse = campaignsResp
    } catch (error: any) {
        if (error?.statusCode === 403 && error?.data?.type === 'domain_unverified') {
            // Domain exists but is not verified - show verification error page
            showUnverifiedError.value = true
        } else if (error?.statusCode === 404) {
            // Domain doesn't exist at all - show not found error page
            showNotFoundError.value = true
        } else if (error?.statusCode === 400 && error?.statusMessage?.includes('Domain parameter is required')) {
            // Invalid domain parameter
            showNotFoundError.value = true
        } else {
            // Other errors - throw generic error to trigger default error page
            throw createError({
                statusCode: error?.statusCode || 500,
                statusMessage: error?.statusMessage || 'Domain lookup failed'
            })
        }
    }
}

// Extract entities from the API response
const initialEntities = entitiesResponse?.entities || []
const initialCampaigns = campaignsResponse?.campaigns || []

// SEO optimization
const domainTitle = computed(() => domainSettingsStore.domainTitle || `${domain} Killboard`)
const entityCount = computed(() => domainSettingsStore.entities?.length || 0)
const description = computed(() => `Multi-entity killboard tracking ${entityCount.value} entities in EVE Online`)

useSeoMeta({
    title: computed(() => `${domainTitle.value} - EVE Kill`),
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
