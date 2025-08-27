<template>
    <div class="entity-campaigns">
        <!-- Header -->
        <div class="flex justify-between items-center mb-6">
            <div>
                <h3 class="text-xl font-bold text-gray-900 dark:text-white">
                    {{ $t('campaigns.entityCampaigns') }}
                </h3>
                <p class="text-gray-600 dark:text-gray-400 mt-1">
                    {{ $t('campaigns.entityCampaignsDescription', { entityType: $t(entityType) }) }}
                </p>
            </div>

            <UButton v-if="canCreateCampaign" to="/campaigncreator" color="primary" icon="i-heroicons-plus">
                {{ $t('campaign.create_new') }}
            </UButton>
        </div>

        <!-- Loading State -->
        <div v-if="pending" class="flex items-center justify-center py-12">
            <div class="text-center">
                <UIcon name="i-heroicons-arrow-path" class="w-8 h-8 animate-spin text-primary mx-auto mb-2" />
                <p class="text-gray-600 dark:text-gray-400">{{ $t('loading') }}</p>
            </div>
        </div>

        <!-- Error State -->
        <UAlert v-else-if="error" color="error" variant="soft" :title="$t('error.loadingFailed')"
            :description="error.message" />

        <!-- No Campaigns State -->
        <div v-else-if="!campaigns || campaigns.length === 0" class="text-center py-12">
            <UIcon name="i-heroicons-flag" class="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h4 class="text-lg font-medium text-gray-900 dark:text-white mb-2">
                {{ $t('campaigns.noCampaigns') }}
            </h4>
            <p class="text-gray-600 dark:text-gray-400 mb-6">
                {{ $t('campaigns.noCampaignsDescription') }}
            </p>
            <UButton v-if="canCreateCampaign" to="/campaigncreator" color="primary" icon="i-heroicons-plus">
                {{ $t('campaign.createFirst') }}
            </UButton>
        </div>

        <!-- Campaigns Grid -->
        <div v-else class="space-y-6">
            <!-- Filter Bar -->
            <div class="flex items-center gap-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div class="flex items-center gap-2">
                    <label class="text-sm font-medium text-gray-700 dark:text-gray-300">
                        {{ $t('status') }}:
                    </label>
                    <USelectMenu v-model="statusFilter" :options="statusOptions" size="sm" />
                </div>

                <div class="flex items-center gap-2">
                    <label class="text-sm font-medium text-gray-700 dark:text-gray-300">
                        {{ $t('sortBy') }}:
                    </label>
                    <USelectMenu v-model="sortBy" :options="sortOptions" size="sm" />
                </div>
            </div>

            <!-- Campaigns List -->
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <EntityCampaignCard v-for="campaign in filteredAndSortedCampaigns" :key="campaign.campaign_id"
                    :campaign="campaign" :show-entity-info="false" />
            </div>

            <!-- Pagination -->
            <div v-if="data && data.totalPages > 1" class="flex justify-center mt-8">
                <UPagination v-model="currentPage" :page-count="data.totalPages" :total="data.totalItems" />
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
interface Props {
    entityType: "character" | "corporation" | "alliance";
    entityId: number;
}

const props = defineProps<Props>();
const { t } = useI18n();
const { isCustomDomain } = useDomainContext();

// Reactive state
const currentPage = ref(1);
const statusFilter = ref('all');
const sortBy = ref('newest');

// Check if user can create campaigns for this entity
const canCreateCampaign = computed(() => {
    // This would need to check user permissions
    // For now, just check if on custom domain
    return isCustomDomain.value;
});

// Filter and sort options
const statusOptions = computed(() => [
    { label: t('all'), value: 'all' },
    { label: t('campaign.active'), value: 'active' },
    { label: t('campaign.upcoming'), value: 'upcoming' },
    { label: t('campaign.completed'), value: 'completed' }
]);

const sortOptions = computed(() => [
    { label: t('campaigns.newest'), value: 'newest' },
    { label: t('campaigns.oldest'), value: 'oldest' },
    { label: t('campaigns.mostActive'), value: 'active' }
]);

// Build query parameters
const queryParams = computed(() => ({
    page: currentPage.value,
    limit: 12,
    status: statusFilter.value !== 'all' ? statusFilter.value : undefined,
    public_only: true,
    // Add entity filters to find campaigns involving this entity
    [`${props.entityType}_id`]: props.entityId,
    sort: sortBy.value
}));

// Fetch campaigns
const {
    data,
    pending,
    error,
    refresh
} = await useFetch('/api/campaign', {
    query: queryParams,
    default: () => ({ campaigns: [], totalPages: 0, totalItems: 0 })
});

const campaigns = computed(() => data.value?.campaigns || []);

// Filter and sort campaigns client-side for better UX
const filteredAndSortedCampaigns = computed(() => {
    let filtered = [...campaigns.value];

    // Apply status filter
    if (statusFilter.value !== 'all') {
        const now = new Date();
        filtered = filtered.filter(campaign => {
            switch (statusFilter.value) {
                case 'active':
                    return isActiveCampaign(campaign, now);
                case 'upcoming':
                    return isUpcomingCampaign(campaign, now);
                case 'completed':
                    return isCompletedCampaign(campaign, now);
                default:
                    return true;
            }
        });
    }

    // Apply sorting
    switch (sortBy.value) {
        case 'newest':
            filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
            break;
        case 'oldest':
            filtered.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
            break;
        case 'active':
            filtered.sort((a, b) => {
                const aActive = isActiveCampaign(a, new Date()) ? 1 : 0;
                const bActive = isActiveCampaign(b, new Date()) ? 1 : 0;
                return bActive - aActive;
            });
            break;
    }

    return filtered;
});

// Campaign status helpers
const isActiveCampaign = (campaign: any, now: Date) => {
    const start = new Date(campaign.startTime);
    const end = campaign.endTime ? new Date(campaign.endTime) : null;
    return start <= now && (!end || end >= now);
};

const isUpcomingCampaign = (campaign: any, now: Date) => {
    const start = new Date(campaign.startTime);
    return start > now;
};

const isCompletedCampaign = (campaign: any, now: Date) => {
    const end = campaign.endTime ? new Date(campaign.endTime) : null;
    return end && end < now;
};

// Watch for filter changes and reset pagination
watch([statusFilter, sortBy], () => {
    currentPage.value = 1;
});

// Watch for query parameter changes and refetch
watch(queryParams, () => {
    refresh();
}, { deep: true });
</script>

<style scoped>
.entity-campaigns {
    /* Custom styles for entity campaigns */
}
</style>
