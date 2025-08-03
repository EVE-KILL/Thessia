<template>
    <div class="p-4 max-w-7xl mx-auto">
        <!-- Page Header -->
        <div class="mb-6 bg-background-800 p-4 rounded-lg shadow-lg border border-gray-700/30">
            <div class="flex justify-between items-center">
                <div>
                    <h1 class="text-2xl font-bold">{{ t('campaign.list.title') }}</h1>
                    <p class="text-gray-300 mt-2">{{ t('campaign.list.description') }}</p>
                </div>
                <UButton to="/campaigncreator" color="primary" icon="lucide:plus" size="lg">
                    {{ t('campaign.create_new') }}
                </UButton>
            </div>

            <!-- Filters Section -->
            <div class="mt-5 pt-4 border-t border-gray-700/30">
                <div class="grid grid-cols-1 lg:grid-cols-5 gap-4">
                    <!-- Status Filter - Make it wider (3 columns out of 5) -->
                    <div class="filter-group lg:col-span-3">
                        <label class="text-sm font-medium text-gray-300 mb-1 block">{{ t('status') }}</label>
                        <div class="flex gap-2 flex-wrap status-buttons">
                            <UButton :color="statusFilter === 'all' ? 'primary' : 'gray'"
                                :variant="statusFilter === 'all' ? 'solid' : 'outline'" @click="setStatusFilter('all')"
                                class="flex-1 min-w-[90px] transition-all duration-200 hover:scale-105 hover:shadow-md cursor-pointer">
                                {{ t('all') }}
                            </UButton>
                            <UButton :color="statusFilter === 'active' ? 'primary' : 'gray'"
                                :variant="statusFilter === 'active' ? 'solid' : 'outline'"
                                @click="setStatusFilter('active')"
                                class="flex-1 min-w-[90px] transition-all duration-200 hover:scale-105 hover:shadow-md cursor-pointer">
                                {{ t('campaign.active') }}
                            </UButton>
                            <UButton :color="statusFilter === 'upcoming' ? 'primary' : 'gray'"
                                :variant="statusFilter === 'upcoming' ? 'solid' : 'outline'"
                                @click="setStatusFilter('upcoming')"
                                class="flex-1 min-w-[90px] transition-all duration-200 hover:scale-105 hover:shadow-md cursor-pointer">
                                {{ t('campaign.upcoming') }}
                            </UButton>
                            <UButton :color="statusFilter === 'completed' ? 'primary' : 'gray'"
                                :variant="statusFilter === 'completed' ? 'solid' : 'outline'"
                                @click="setStatusFilter('completed')"
                                class="flex-1 min-w-[90px] transition-all duration-200 hover:scale-105 hover:shadow-md cursor-pointer">
                                {{ t('campaign.completed') }}
                            </UButton>
                            <UButton v-if="isAuthenticated" :color="statusFilter === 'private' ? 'primary' : 'gray'"
                                :variant="statusFilter === 'private' ? 'solid' : 'outline'"
                                @click="setStatusFilter('private')"
                                class="flex-1 min-w-[90px] transition-all duration-200 hover:scale-105 hover:shadow-md cursor-pointer"
                                :title="t('campaign.private_tooltip')">
                                {{ t('campaign.private') }}
                            </UButton>
                        </div>
                    </div>

                    <!-- Search Field - Narrower (2 columns out of 5) -->
                    <div class="filter-group lg:col-span-2">
                        <label class="text-sm font-medium text-gray-300 mb-1 block">{{ t('search') }}</label>
                        <div class="flex">
                            <UInput v-model="searchQuery" :placeholder="t('campaign.search_placeholder')"
                                class="flex-grow mr-2" />
                            <div class="flex-shrink-0">
                                <UButton v-if="searchQuery" color="gray" @click="searchQuery = ''"
                                    class="mr-2 hover:scale-105 transition-transform duration-200 cursor-pointer">
                                    <UIcon name="lucide:x" class="w-4 h-4" />
                                </UButton>
                                <UButton color="primary" icon="lucide:search" @click="currentPage = 1"
                                    class="hover:scale-105 transition-transform duration-200 cursor-pointer">
                                    {{ t('search') }}
                                </UButton>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Clear All Filters Button - only show when filters are active -->
                <div v-if="hasActiveFilters" class="mt-4 flex justify-end">
                    <UButton variant="link" size="sm" @click="clearAllFilters"
                        class="text-gray-400 hover:text-gray-200">
                        <UIcon name="lucide:x" class="w-4 h-4 mr-1" />
                        {{ t('clear_all_filters') }}
                    </UButton>
                </div>
            </div>
        </div>

        <!-- Loading State -->
        <div v-if="pending"
            class="flex flex-col items-center justify-center py-12 bg-background-800 p-6 rounded-lg shadow-lg border border-gray-700/30">
            <UIcon name="lucide:loader" class="w-16 h-16 animate-spin text-primary mb-6" />
            <span class="text-xl font-semibold">{{ t('loading') }}</span>
        </div>

        <!-- Error State -->
        <div v-else-if="error"
            class="flex flex-col items-center justify-center py-12 bg-background-800 p-6 rounded-lg shadow-lg border border-red-700/30">
            <UIcon name="lucide:alert-circle" class="w-16 h-16 text-red-500 mb-6" />
            <span class="text-xl font-semibold">{{ t('error.loading_failed') }}</span>
            <p class="text-gray-300 mt-2 mb-6 text-center max-w-md">{{ t('campaign.list.error_loading') }}</p>
            <UButton @click="refreshData" icon="lucide:refresh-cw" color="red" size="lg">
                {{ t('retry') }}
            </UButton>
        </div>

        <!-- No Campaigns State -->
        <div v-else-if="campaigns?.length === 0"
            class="flex flex-col items-center justify-center py-12 bg-background-800 p-6 rounded-lg shadow-lg border border-gray-700/30">
            <UIcon name="lucide:folder-open" class="w-16 h-16 text-gray-300 mb-6" />
            <span class="text-xl font-semibold">{{ t('campaign.list.no_campaigns') }}</span>
            <p class="text-gray-300 mt-2 mb-6 text-center max-w-md">{{ t('campaign.list.create_first') }}</p>
            <UButton to="/campaigncreator" icon="lucide:plus" color="primary" size="lg">
                {{ t('campaign.create_new') }}
            </UButton>
        </div>

        <!-- Campaigns List -->
        <div v-else class="space-y-4">
            <!-- Campaigns Card Grid -->
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div v-for="campaign in campaigns" :key="campaign.campaign_id" class="campaign-card">
                    <div
                        class="bg-background-800 p-4 rounded-lg shadow-lg border border-gray-700/30 h-full flex flex-col">
                        <div class="campaign-header mb-3">
                            <div class="flex justify-between items-center pb-2 border-b border-gray-700/30">
                                <h2 class="text-lg font-semibold truncate" :title="campaign.name">
                                    {{ campaign.name }}
                                </h2>
                                <div v-if="isActive(campaign)" class="status-badge status-active">
                                    <UIcon name="lucide:activity" class="w-4 h-4 mr-1" />
                                    {{ t('campaign.active') }}
                                </div>
                                <div v-else-if="isUpcoming(campaign)" class="status-badge status-upcoming">
                                    <UIcon name="lucide:clock" class="w-4 h-4 mr-1" />
                                    {{ t('campaign.upcoming') }}
                                </div>
                                <div v-else class="status-badge status-completed">
                                    <UIcon name="lucide:check-circle" class="w-4 h-4 mr-1" />
                                    {{ t('campaign.completed') }}
                                </div>
                            </div>
                        </div>

                        <!-- Campaign Description -->
                        <div class="mb-4 flex-grow">
                            <p v-if="campaign.description" class="text-sm text-gray-300 line-clamp-2"
                                :title="campaign.description">
                                {{ campaign.description }}
                            </p>
                            <p v-else class="text-sm text-gray-500 italic">
                                {{ t('campaign.no_description') }}
                            </p>
                        </div>

                        <!-- Stats grid section - full width for time field -->
                        <div class="stats-grid mb-3">
                            <!-- Campaign Time Period - now full width -->
                            <div class="stat-item col-span-2">
                                <span class="stat-label">{{ t('time') }}:</span>
                                <span class="stat-value flex items-center gap-1">
                                    <UIcon name="lucide:calendar" class="w-4 h-4 flex-shrink-0" />
                                    <span class="truncate">{{ formatDate(campaign.startTime) }}</span>
                                    <span v-if="campaign.endTime" class="truncate">- {{ formatDate(campaign.endTime)
                                    }}</span>
                                    <span v-else class="truncate">- {{ t('campaign.ongoing') }}</span>
                                </span>
                            </div>
                        </div>

                        <!-- Filter Counts - Like a mini team display -->
                        <div v-if="campaign.filterCounts"
                            class="filter-badges p-2 rounded-md mb-4 bg-background-700/50 border border-gray-700/30">
                            <div class="flex flex-wrap gap-2 justify-center">
                                <div v-if="campaign.filterCounts.locations" class="filter-badge">
                                    <div class="flex items-center gap-1 text-gray-300">
                                        <UIcon name="lucide:map-pin" class="w-4 h-4" />
                                        <span class="font-medium">{{ campaign.filterCounts.locations }}</span>
                                        <span>{{ t('campaign.locations') }}</span>
                                    </div>
                                </div>
                                <div v-if="campaign.filterCounts.attackers" class="filter-badge blue">
                                    <div class="flex items-center gap-1 text-blue-300">
                                        <UIcon name="lucide:sword" class="w-4 h-4" />
                                        <span class="font-medium">{{ campaign.filterCounts.attackers }}</span>
                                        <span>{{ t('campaign.attacker_side') }}</span>
                                    </div>
                                </div>
                                <div v-if="campaign.filterCounts.victims" class="filter-badge red">
                                    <div class="flex items-center gap-1 text-red-300">
                                        <UIcon name="lucide:target" class="w-4 h-4" />
                                        <span class="font-medium">{{ campaign.filterCounts.victims }}</span>
                                        <span>{{ t('campaign.victim_side') }}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- View Button -->
                        <div class="mt-auto">
                            <UButton :to="`/campaigns/${campaign.campaign_id}`" block color="primary" variant="solid">
                                {{ t('view') }}
                            </UButton>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Pagination -->
            <div v-if="data && data.totalPages > 1" class="mt-8 flex flex-col items-center">
                <div class="bg-background-800 p-3 rounded-lg shadow-lg border border-gray-700/30">
                    <UPagination v-model:page="currentPage" :items-per-page="itemsPerPage" :total="data.totalItems"
                        :ui="{ wrapper: 'flex items-center gap-2' }" />
                </div>
                <p class="text-sm text-gray-400 mt-3" v-if="data.totalItems">
                    {{ t('showingResults', {
                        start: ((currentPage - 1) * itemsPerPage) + 1, end:
                            Math.min(currentPage * itemsPerPage, data.totalItems), total: data.totalItems
                    }) }}
                </p>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';

// i18n setup
const { t } = useI18n();

// Auth setup
const authStore = useAuthStore();
const { isAuthenticated, currentUser } = storeToRefs(authStore);

// SEO setup
useSeoMeta({
    title: () => t('seo.campaignsList.title'),
    description: () => t('seo.campaignsList.description'),
    ogTitle: () => t('seo.campaignsList.title'),
    ogDescription: () => t('seo.campaignsList.description'),
    ogType: 'website',
    twitterCard: 'summary_large_image',
    twitterTitle: () => t('seo.campaignsList.title'),
    twitterDescription: () => t('seo.campaignsList.description')
});

// Pagination
const currentPage = ref(1);
const itemsPerPage = ref(20);

// Filter state
const statusFilter = ref('all'); // 'all', 'active', 'upcoming', 'completed', or 'private'
const searchQuery = ref('');

// Computed property to determine if any filter is active
const hasActiveFilters = computed(() => {
    return statusFilter.value !== 'all' || searchQuery.value !== '';
});

// Create query params for API
const queryParams = computed(() => ({
    page: currentPage.value,
    limit: itemsPerPage.value,
    status: statusFilter.value !== 'all' ? statusFilter.value : undefined,
    search: searchQuery.value || undefined,
    // Add user info for private campaigns filter
    userId: statusFilter.value === 'private' && currentUser.value ? currentUser.value.characterId : undefined,
    userCorpId: statusFilter.value === 'private' && currentUser.value ? currentUser.value.corporationId : undefined,
    userAllianceId: statusFilter.value === 'private' && currentUser.value ? currentUser.value.allianceId : undefined
}));

const fetchKey = computed(() => {
    return `campaigns-${queryParams.value.page}-${queryParams.value.limit}-${statusFilter.value}-${searchQuery.value}`;
});

// Manual fetch approach
const data = ref(null);
const pending = ref(true);
const error = ref(null);

const fetchCampaigns = async () => {
    try {
        pending.value = true;
        error.value = null;

        const response = await $fetch('/api/campaign', {
            query: queryParams.value
        });

        data.value = response;
    } catch (err) {
        error.value = err;
        console.error('Error fetching campaigns:', err);
    } finally {
        pending.value = false;
    }
};

// Initial fetch
fetchCampaigns();

// Watch for changes and refetch
watch(queryParams, () => {
    console.log('Query params changed, fetching...', queryParams.value);
    fetchCampaigns();
}, { deep: true });

const refresh = () => {
    fetchCampaigns();
};

// Extract campaigns from data
const campaigns = computed(() => data.value?.campaigns || []);

// Filter functions
const setStatusFilter = (status) => {
    statusFilter.value = status;
    currentPage.value = 1;
};

const clearAllFilters = () => {
    statusFilter.value = 'all';
    searchQuery.value = '';
    currentPage.value = 1;
};

// Date formatting
const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
};

const formatDateTime = (dateString: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

// Campaign status helpers
const isActive = (campaign: any) => {
    if (campaign.status) return campaign.status === 'active';

    const now = new Date();
    const start = new Date(campaign.startTime);
    const end = campaign.endTime ? new Date(campaign.endTime) : null;
    return start <= now && (!end || end >= now);
};

const isUpcoming = (campaign: any) => {
    if (campaign.status) return campaign.status === 'upcoming';

    const now = new Date();
    const start = new Date(campaign.startTime);
    return start > now;
};

// Refresh data function
const refreshData = () => {
    refresh();
    scrollToTop();
};

// Helper function to scroll to top
const scrollToTop = () => {
    window.scrollTo({
        top: 0,
        behavior: 'smooth'
    });
};

// Watch for page changes to scroll to top (but don't interfere with useFetch watching)
watch(currentPage, (newPage, oldPage) => {
    // Only scroll if page actually changed and it's not the initial load
    if (oldPage !== undefined && newPage !== oldPage) {
        console.log(`Page changed from ${oldPage} to ${newPage}`);
        scrollToTop();
    }
});

// Debug watch for data changes
watch(data, (newData) => {
    console.log('Data changed:', newData);
}, { deep: true });

// Debug watch for queryParams changes
watch(queryParams, (newParams) => {
    console.log('Query params changed:', newParams);
}, { deep: true });
</script>

<style scoped>
.campaign-card {
    transition: box-shadow 0.2s;
}

.campaign-card:hover {
    box-shadow: 0 8px 12px -3px rgba(0, 0, 0, 0.2), 0 4px 6px -2px rgba(0, 0, 0, 0.1);
}

/* Status badges styling */
.status-badge {
    display: flex;
    align-items: center;
    font-size: 0.85rem;
    font-weight: 600;
    padding: 0.25rem 0.75rem;
    border-radius: 9999px;
    letter-spacing: 0.025em;
}

.status-active {
    background-color: rgba(16, 185, 129, 0.2);
    color: rgb(16, 185, 129);
    border: 1px solid rgba(16, 185, 129, 0.3);
    box-shadow: 0 0 10px rgba(16, 185, 129, 0.2);
}

.status-upcoming {
    background-color: rgba(59, 130, 246, 0.2);
    color: rgb(59, 130, 246);
    border: 1px solid rgba(59, 130, 246, 0.3);
    box-shadow: 0 0 10px rgba(59, 130, 246, 0.2);
}

.status-completed {
    background-color: rgba(156, 163, 175, 0.2);
    color: rgb(156, 163, 175);
    border: 1px solid rgba(156, 163, 175, 0.3);
}

/* Updated stats grid styling */
.stats-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.5rem;
    padding: 0.75rem;
    border-radius: 0.5rem;
    background-color: light-dark(rgba(245, 245, 245, 0.1), rgba(26, 26, 26, 0.4));
    border: 1px solid light-dark(rgba(229, 231, 235, 0.2), rgba(75, 85, 99, 0.2));
}

/* Add column span utility */
.col-span-2 {
    grid-column: span 2 / span 2;
}

/* Status button styling */
.status-buttons {
    display: flex;
    width: 100%;
}

.status-buttons .u-button {
    flex: 1;
    min-width: 80px;
    padding: 0.5rem;
    font-size: 0.875rem;
}

/* Fix btn-outline to ensure buttons are visible */
.u-button[variant="outline"] {
    border-width: 1px;
    border-color: rgba(156, 163, 175, 0.5);
}

/* Ensure the stat value can wrap if needed */
.stat-value {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    word-break: break-word;
    font-size: 0.9rem;
    font-weight: 600;
    color: light-dark(#1f2937, #f3f4f6);
}

/* Filter badges */
.filter-badges {
    position: relative;
    overflow: hidden;
}

.filter-badges::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-image: linear-gradient(45deg, rgba(0, 0, 0, 0.05) 25%, transparent 25%, transparent 50%, rgba(0, 0, 0, 0.05) 50%, rgba(0, 0, 0, 0.05) 75%, transparent 75%, transparent);
    background-size: 4px 4px;
    z-index: -1;
    opacity: 0.2;
}

/* Filter section styling */
.filter-group {
    position: relative;
}

.filter-badge {
    font-size: 0.85rem;
    padding: 0.15rem 0.3rem;
}

.filter-badge.blue {
    text-shadow: 0 0 10px rgba(59, 130, 246, 0.3);
}

.filter-badge.red {
    text-shadow: 0 0 10px rgba(239, 68, 68, 0.3);
}

.campaign-header h2 {
    font-weight: 600;
    letter-spacing: 0.01em;
    text-shadow: 0 0 10px rgba(255, 255, 255, 0.1);
}
</style>
