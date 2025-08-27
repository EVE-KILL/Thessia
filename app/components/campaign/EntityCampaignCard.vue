<template>
    <div
        class="campaign-card bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-shadow">
        <!-- Campaign Header -->
        <div class="p-6 border-b border-gray-200 dark:border-gray-700">
            <div class="flex items-start justify-between">
                <div class="flex-1">
                    <h4 class="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                        {{ campaign.name }}
                    </h4>
                    <p class="text-gray-600 dark:text-gray-400 text-sm line-clamp-2">
                        {{ campaign.description }}
                    </p>
                </div>

                <!-- Campaign Status Badge -->
                <UBadge :color="getStatusColor(campaign)" variant="soft" size="sm">
                    {{ getStatusText(campaign) }}
                </UBadge>
            </div>
        </div>

        <!-- Campaign Stats -->
        <div class="p-6">
            <div class="grid grid-cols-2 gap-4 mb-4">
                <div class="text-center">
                    <div class="text-2xl font-bold text-primary">
                        {{ formatNumber(campaign.stats?.totalKills || 0) }}
                    </div>
                    <div class="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                        {{ $t('kills') }}
                    </div>
                </div>

                <div class="text-center">
                    <div class="text-2xl font-bold text-primary">
                        {{ formatNumber(campaign.stats?.totalParticipants || 0) }}
                    </div>
                    <div class="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                        {{ $t('participants') }}
                    </div>
                </div>
            </div>

            <!-- Time Information -->
            <div class="space-y-2 mb-4">
                <div class="flex items-center justify-between text-sm">
                    <span class="text-gray-600 dark:text-gray-400">{{ $t('campaign.startTime') }}:</span>
                    <span class="font-medium text-gray-900 dark:text-white">
                        {{ formatDate(campaign.startTime) }}
                    </span>
                </div>

                <div v-if="campaign.endTime" class="flex items-center justify-between text-sm">
                    <span class="text-gray-600 dark:text-gray-400">{{ $t('campaign.endTime') }}:</span>
                    <span class="font-medium text-gray-900 dark:text-white">
                        {{ formatDate(campaign.endTime) }}
                    </span>
                </div>

                <div v-else class="flex items-center justify-between text-sm">
                    <span class="text-gray-600 dark:text-gray-400">{{ $t('campaign.duration') }}:</span>
                    <span class="font-medium text-primary">
                        {{ $t('campaign.ongoing') }}
                    </span>
                </div>
            </div>

            <!-- Entity Information (if needed) -->
            <div v-if="showEntityInfo && campaign.entityInfo"
                class="border-t border-gray-200 dark:border-gray-700 pt-4 mb-4">
                <div class="flex items-center gap-3">
                    <img :src="getEntityIcon(campaign.entityInfo)" :alt="campaign.entityInfo.name"
                        class="w-8 h-8 rounded" />
                    <div>
                        <div class="font-medium text-gray-900 dark:text-white text-sm">
                            {{ campaign.entityInfo.name }}
                        </div>
                        <div class="text-xs text-gray-500 dark:text-gray-400">
                            {{ $t(campaign.entityInfo.type) }}
                        </div>
                    </div>
                </div>
            </div>

            <!-- Action Buttons -->
            <div class="flex gap-2">
                <UButton :to="`/campaign/${campaign.campaign_id}`" color="primary" size="sm" class="flex-1">
                    {{ $t('campaign.viewDetails') }}
                </UButton>

                <UButton v-if="canJoinCampaign(campaign)" @click="joinCampaign" color="success" variant="outline"
                    size="sm" :loading="isJoining">
                    {{ $t('campaign.join') }}
                </UButton>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
interface Props {
    campaign: any; // Campaign object
    showEntityInfo?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
    showEntityInfo: true
});

const { t } = useI18n();
const toast = useToast();
const isJoining = ref(false);

// Get campaign status
const getStatusText = (campaign: any) => {
    const now = new Date();
    const start = new Date(campaign.startTime);
    const end = campaign.endTime ? new Date(campaign.endTime) : null;

    if (start > now) {
        return t('campaign.upcoming');
    } else if (!end || end >= now) {
        return t('campaign.active');
    } else {
        return t('campaign.completed');
    }
};

// Get status color
const getStatusColor = (campaign: any) => {
    const now = new Date();
    const start = new Date(campaign.startTime);
    const end = campaign.endTime ? new Date(campaign.endTime) : null;

    if (start > now) {
        return 'warning';
    } else if (!end || end >= now) {
        return 'success';
    } else {
        return 'neutral';
    }
};

// Format numbers
const formatNumber = (num: number) => {
    if (num >= 1000000) {
        return (num / 1000000).toFixed(1) + 'M';
    } else if (num >= 1000) {
        return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
};

// Format dates
const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
};

// Get entity icon
const getEntityIcon = (entity: any) => {
    const baseUrl = 'https://images.evetech.net';
    switch (entity.type) {
        case 'character':
            return `${baseUrl}/characters/${entity.id}/portrait?size=64`;
        case 'corporation':
            return `${baseUrl}/corporations/${entity.id}/logo?size=64`;
        case 'alliance':
            return `${baseUrl}/alliances/${entity.id}/logo?size=64`;
        default:
            return '';
    }
};

// Check if user can join campaign
const canJoinCampaign = (campaign: any) => {
    const now = new Date();
    const start = new Date(campaign.startTime);
    const end = campaign.endTime ? new Date(campaign.endTime) : null;

    // Campaign must be active and user must not already be participating
    return start <= now && (!end || end >= now) && !campaign.userParticipating;
};

// Join campaign
const joinCampaign = async () => {
    isJoining.value = true;
    try {
        await $fetch(`/api/campaign/${props.campaign.campaign_id}/join`, {
            method: 'POST'
        });

        // Show success toast
        toast.add({
            title: t('campaign.joinSuccess'),
            color: 'success'
        });

        // Refresh campaign data or emit event
        await refreshCookie('campaign-data');

    } catch (error: any) {
        // Show error toast
        toast.add({
            title: t('error.generic'),
            description: error.data?.message || error.message,
            color: 'error'
        });
    } finally {
        isJoining.value = false;
    }
};
</script>

<style scoped>
.campaign-card {
    /* Custom styles for campaign card */
}

.line-clamp-2 {
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
}
</style>
