<template>
    <div class="campaigns-list">

        <!-- Loading State -->
        <div v-if="pending">
            <div v-if="gridLayout" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 p-4">
                <USkeleton class="h-40" v-for="i in 4" :key="i" />
            </div>
            <div v-else class="space-y-3">
                <USkeleton class="h-20" v-for="i in 3" :key="i" />
            </div>
        </div>

        <!-- Campaigns Content -->
        <div v-else-if="campaigns?.length">
            <!-- Grid Layout for Domain Pages -->
            <div v-if="gridLayout" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div v-for="campaign in campaigns" :key="campaign.campaign_id"
                    class="bg-gradient-to-br from-gray-900/40 to-gray-800/30 border border-gray-700/50 rounded-lg p-4 backdrop-blur-sm hover:bg-gray-800/40 transition-all duration-200 group">
                    <div class="flex flex-col h-full">
                        <!-- Header -->
                        <div class="campaign-header mb-3">
                            <div class="flex justify-between items-start pb-2 border-b border-gray-700/50">
                                <h4 class="font-semibold text-white text-sm truncate pr-2" :title="campaign.name">
                                    {{ campaign.name }}
                                </h4>
                                <UBadge :color="getStatusColor(campaign)" variant="subtle" size="xs">
                                    {{ getStatusLabel(campaign) }}
                                </UBadge>
                            </div>
                        </div>

                        <!-- Description -->
                        <div class="mb-3 flex-grow">
                            <p v-if="campaign.description" class="text-xs text-zinc-400 line-clamp-2 leading-relaxed"
                                :title="campaign.description">
                                {{ campaign.description }}
                            </p>
                            <p v-else class="text-xs text-zinc-500 italic">No description available</p>
                        </div>

                        <!-- Stats -->
                        <div class="stats-section mb-3 p-2 bg-gray-800/40 rounded border border-gray-700/30">
                            <div class="text-xs text-zinc-400 space-y-1">
                                <div v-if="campaign.startTime" class="flex items-center">
                                    <svg class="w-3 h-3 mr-1 text-zinc-500" fill="currentColor" viewBox="0 0 20 20">
                                        <path fill-rule="evenodd"
                                            d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z"
                                            clip-rule="evenodd" />
                                    </svg>
                                    <span>{{ formatDate(campaign.startTime) }}</span>
                                </div>
                                <div v-if="campaign.stats" class="flex justify-between items-center">
                                    <span class="flex items-center">
                                        <svg class="w-3 h-3 mr-1 text-zinc-500" fill="currentColor" viewBox="0 0 20 20">
                                            <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                        {{ campaign.stats.total_kills || 0 }}
                                    </span>
                                    <span class="flex items-center">
                                        <svg class="w-3 h-3 mr-1 text-zinc-500" fill="currentColor" viewBox="0 0 20 20">
                                            <path
                                                d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
                                        </svg>
                                        {{ campaign.stats.participants || 0 }}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <!-- Action Button -->
                        <div class="mt-auto">
                            <NuxtLink :to="`/campaigns/${campaign.campaign_id}`"
                                class="block w-full text-center px-3 py-2 text-xs font-medium text-zinc-300 bg-gray-700/40 hover:bg-gray-600/40 border border-gray-600/30 hover:border-gray-500/50 rounded transition-all duration-200 group-hover:text-white">
                                View Campaign
                            </NuxtLink>
                        </div>
                    </div>
                </div>
            </div>

            <!-- List Layout for Other Pages -->
            <div v-else class="space-y-4">
                <div v-for="campaign in campaigns" :key="campaign.campaign_id"
                    class="campaign-card bg-gray-50 dark:bg-gray-700 rounded-lg p-4 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors">
                    <div class="flex items-start justify-between">
                        <div class="flex-1">
                            <h4 class="font-semibold text-lg mb-1">{{ campaign.name }}</h4>
                            <p v-if="campaign.description" class="text-sm text-gray-600 dark:text-gray-400 mb-2">{{
                                campaign.description }}</p>
                            <div class="flex items-center space-x-4 text-xs text-gray-500">
                                <span v-if="campaign.startTime">
                                    Started: {{ formatDate(campaign.startTime) }}
                                </span>
                                <span v-if="campaign.endTime">
                                    Ends: {{ formatDate(campaign.endTime) }}
                                </span>
                                <span>{{ campaign.stats?.participants || 0 }} participants</span>
                            </div>
                        </div>
                        <div class="flex-shrink-0 ml-4">
                            <UBadge :color="getStatusColor(campaign)" variant="subtle">
                                {{ getStatusLabel(campaign) }}
                            </UBadge>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- No campaigns state -->
        <div v-else class="text-center py-8 text-gray-500">
            No campaigns available
        </div>
    </div>
</template>

<script setup lang="ts">
interface Props {
    entityFilter?: string | null
    limit?: number
    domain?: string
    gridLayout?: boolean
}

const props = withDefaults(defineProps<Props>(), {
    entityFilter: null,
    limit: 5,
    domain: '',
    gridLayout: false
})

// Use domain-specific campaigns API if domain is provided, otherwise use global campaigns API
const apiEndpoint = computed(() => {
    if (props.domain) {
        return `/api/domain/${props.domain}/campaigns`
    }
    return '/api/campaigns'
})

const { data: campaignsResponse, pending } = await useFetch(apiEndpoint.value, {
    query: computed(() => ({
        entity_filter: props.entityFilter,
        limit: props.limit,
        public_only: !props.domain, // Only apply public filter for global API
    })),
    default: () => ({ campaigns: [] })
})

// Extract campaigns from response (domain API returns { campaigns: [] }, global API returns array directly)
const campaigns = computed(() => {
    if (campaignsResponse.value) {
        return (campaignsResponse.value as any).campaigns || campaignsResponse.value
    }
    return []
})

function formatDate(date: string | Date): string {
    return new Date(date).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
    })
}

function getStatusColor(campaign: any): 'error' | 'primary' | 'secondary' | 'success' | 'info' | 'warning' | 'neutral' {
    const status = getStatus(campaign)
    switch (status) {
        case 'active': return 'success'
        case 'upcoming': return 'info'
        case 'completed': return 'neutral'
        default: return 'neutral'
    }
}

function getStatusLabel(campaign: any): string {
    const status = getStatus(campaign)
    switch (status) {
        case 'active': return 'Active'
        case 'upcoming': return 'Upcoming'
        case 'completed': return 'Completed'
        default: return 'Inactive'
    }
}

function getStatus(campaign: any): string {
    // Use the status from the API if available
    if (campaign.status) return campaign.status

    // Calculate status from dates
    const now = new Date()
    const start = new Date(campaign.startTime)
    const end = campaign.endTime ? new Date(campaign.endTime) : null

    if (start > now) return 'upcoming'
    if (end && end < now) return 'completed'
    return 'active'
}
</script>
