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

console.log(`[Domain Page] Processing domain: ${domain}`)

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
    console.log(`[Domain Page] Domain error detected:`, domainError.value)
    if (domainError.value.type === 'domain_not_found') {
        console.log(`[Domain Page] Showing domain not found for: ${domain}`)
        showNotFoundError.value = true
    } else if (domainError.value.type === 'domain_unverified') {
        console.log(`[Domain Page] Showing domain unverified for: ${domain}`)
        showUnverifiedError.value = true
    }
} else if (!isCustomDomain.value && domain && domain !== 'localhost' && !domain.includes('eve-kill.com')) {
    // If middleware didn't detect this as a custom domain but we have a domain parameter
    // that's not a main EVE-KILL domain, it might be an unknown domain
    console.log(`[Domain Page] Domain not detected by middleware, treating as not found: ${domain}`)
    showNotFoundError.value = true
} else if (isCustomDomain.value || !domainError.value) {
    // No errors from middleware, proceed with normal loading
    try {
        console.log(`[Domain Page] Loading domain settings for: ${domain}`)
        
        // Load domain settings into the store - let it handle all error scenarios
        await domainSettingsStore.loadDomainSettings(domain)
        
        console.log(`[Domain Page] Domain settings loaded successfully for: ${domain}`)

        // If we get here, domain is valid - pre-fetch additional data
        const [statsResponse, entitiesResp, campaignsResp] = await Promise.all([
            // Initial statistics (7d default)
            $fetch(`/api/domain/${domain}/stats`, {
                query: { timeRange: '7d' }
            }).catch((err) => {
                console.warn(`[Domain Page] Failed to load stats for ${domain}:`, err)
                return null
            }),

            // Entity details with names
            $fetch(`/api/domain/${domain}/entities`).catch((err) => {
                console.warn(`[Domain Page] Failed to load entities for ${domain}:`, err)
                return { entities: [] }
            }),

            // Initial campaigns
            $fetch(`/api/domain/${domain}/campaigns`, {
                query: { limit: 4 }
            }).catch((err) => {
                console.warn(`[Domain Page] Failed to load campaigns for ${domain}:`, err)
                return { campaigns: [] }
            })
        ])

        initialStats = statsResponse
        entitiesResponse = entitiesResp
        campaignsResponse = campaignsResp

        console.log(`[Domain Page] Pre-fetch completed for ${domain}`)

    } catch (error: any) {
        console.error(`[Domain Page] Domain lookup error for ${domain}:`, error)

        if (error?.statusCode === 403 && error?.data?.type === 'domain_unverified') {
            // Domain exists but is not verified - show verification error page
            console.log(`[Domain Page] Domain unverified error (403) for: ${domain}`)
            showUnverifiedError.value = true
        } else if (error?.statusCode === 404) {
            // Domain doesn't exist at all - show not found error page
            console.log(`[Domain Page] Domain not found error (404) for: ${domain}`)
            showNotFoundError.value = true
        } else if (error?.statusCode === 400 && error?.statusMessage?.includes('Domain parameter is required')) {
            // Invalid domain parameter
            console.log(`[Domain Page] Invalid domain parameter for: ${domain}`)
            showNotFoundError.value = true
        } else {
            // Other errors - throw generic error to trigger default error page
            console.error(`[Domain Page] Throwing error for ${domain}:`, error)
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
