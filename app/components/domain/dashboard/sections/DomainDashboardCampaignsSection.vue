<template>
    <div v-if="campaigns.length > 0" class="mb-12">
        <div class="mb-6">
            <h3 class="text-2xl font-bold text-zinc-100 mb-2">Active Campaigns</h3>
            <p class="text-zinc-400">
                Current military operations and strategic campaigns
            </p>
        </div>

        <!-- Direct campaigns rendering using SSR data -->
        <div
            class="bg-gradient-to-r from-gray-900/40 via-gray-800/30 to-gray-900/40 border border-gray-700/50 rounded-xl p-6 backdrop-blur-sm">
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div v-for="campaign in campaigns.slice(0, 4)" :key="campaign.campaign_id"
                    class="bg-gradient-to-br from-gray-900/40 to-gray-800/30 border border-gray-700/50 rounded-lg p-4 backdrop-blur-sm hover:bg-gray-800/40 transition-all duration-200 group">
                    <div class="flex flex-col h-full">
                        <!-- Header -->
                        <div class="campaign-header mb-3">
                            <div class="flex justify-between items-start pb-2 border-b border-gray-700/50">
                                <h4 class="font-semibold text-white text-sm truncate pr-2" :title="campaign.name">
                                    {{ campaign.name }}
                                </h4>
                                <UBadge :color="getCampaignStatusColor(campaign)" variant="subtle" size="xs">
                                    {{ getCampaignStatusLabel(campaign) }}
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
                                    <span>{{ formatCampaignDate(campaign.startTime) }}</span>
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
        </div>
    </div>
</template>

<script setup lang="ts">
interface Campaign {
    campaign_id: string;
    name: string;
    description?: string;
    startTime?: string | Date;
    endTime?: string | Date;
    status?: 'active' | 'upcoming' | 'completed';
    stats?: {
        total_kills?: number;
        participants?: number;
    };
}

interface Props {
    /** Domain identifier */
    domain: string;
    /** List of campaigns */
    campaigns: Campaign[];
}

const props = defineProps<Props>();

const formatCampaignDate = (date: string | Date): string => {
    return new Date(date).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
    });
};

const getCampaignStatusColor = (campaign: Campaign): 'error' | 'primary' | 'secondary' | 'success' | 'info' | 'warning' | 'neutral' => {
    const status = getCampaignStatus(campaign);
    switch (status) {
        case 'active': return 'success';
        case 'upcoming': return 'info';
        case 'completed': return 'neutral';
        default: return 'neutral';
    }
};

const getCampaignStatusLabel = (campaign: Campaign): string => {
    const status = getCampaignStatus(campaign);
    switch (status) {
        case 'active': return 'Active';
        case 'upcoming': return 'Upcoming';
        case 'completed': return 'Completed';
        default: return 'Inactive';
    }
};

const getCampaignStatus = (campaign: Campaign): string => {
    // Use the status from the API if available
    if (campaign.status) return campaign.status;

    // Calculate status from dates
    const now = new Date();
    const start = campaign.startTime ? new Date(campaign.startTime) : null;
    const end = campaign.endTime ? new Date(campaign.endTime) : null;

    if (start && start > now) return 'upcoming';
    if (end && end < now) return 'completed';
    return 'active';
};
</script>
