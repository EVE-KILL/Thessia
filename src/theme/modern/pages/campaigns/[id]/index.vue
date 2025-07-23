<template>
    <div>
        <!-- Loading/Processing state -->
        <div v-if="pending || isLoading || (stats && stats.processing)" class="flex flex-col items-center justify-center py-12">
            <UIcon name="lucide:loader" class="w-12 h-12 animate-spin text-primary mb-4" />
            <span class="text-xl font-medium">
                {{ stats?.processing ? t('campaign.processing') : t('campaign.loading') }}
            </span>
            <p v-if="stats?.processing" class="text-gray-500 mt-2">
                {{ t('campaign.processing_desc') }}
            </p>
            <p v-if="stats?.status" class="text-sm text-gray-400 mt-1">
                {{ t('campaign.status') }}: {{ stats.status }}
            </p>
        </div>

        <!-- Campaign processing failed -->
        <div v-else-if="stats?.processing && stats?.status === 'failed'" class="flex flex-col items-center justify-center py-12">
            <UIcon name="lucide:alert-triangle" class="w-12 h-12 text-red-500 mb-4" />
            <span class="text-xl font-medium">{{ t('campaign.processing_failed') }}</span>
            <p class="text-gray-500 mt-2">{{ t('campaign.processing_failed_desc') }}</p>
            <p v-if="stats.error" class="text-sm text-red-400 mt-2">{{ stats.error }}</p>
            <UButton class="mt-4" @click="retryProcessing">{{ t('campaign.retry_processing') }}</UButton>
        </div>

        <!-- Campaign not found -->
        <div v-else-if="!stats" class="flex flex-col items-center justify-center py-12">
            <UIcon name="lucide:alert-circle" class="w-12 h-12 text-red-500 mb-4" />
            <span class="text-xl font-medium">{{ t('campaign.not_found') }}</span>
            <p class="text-gray-500 mt-2">{{ t('campaign.not_found_desc') }}</p>
            <UButton class="mt-4" to="/campaigncreator">{{ t('campaign.create_new') }}</UButton>
        </div>

        <!-- Campaign content -->
        <div v-else-if="stats && !stats.processing" class="max-w-7xl mx-auto">
            <!-- Campaign Header - Full Width -->
            <div class="campaign-header mb-6">
                <div class="flex flex-col md:flex-row justify-between items-start md:items-center mb-4">
                    <div class="flex items-center gap-3">
                        <h1 class="text-2xl font-bold">{{ stats.name }}</h1>
                        <!-- Privacy indicator - only show if private and user is creator -->
                        <UBadge v-if="!stats.public && isCreator" color="orange" variant="soft" size="sm">
                            <UIcon name="lucide:lock" class="w-3 h-3 mr-1" />
                            {{ t('campaign.private') }}
                        </UBadge>
                    </div>
                    <div class="flex flex-col md:flex-row gap-2 items-end md:items-center">
                        <!-- Edit button - only show for campaign creator -->
                        <UButton v-if="isCreator" :to="`/campaigncreator?campaignId=${campaignId}`" size="sm"
                            class="mr-2" icon="lucide:edit-2">
                            {{ t('edit') }}
                        </UButton>

                        <div class="campaign-meta">
                            <span class="text-gray-400 text-sm">
                                {{ t('campaign.created_by') }}:
                                <NuxtLink v-if="creatorName" :to="`/character/${stats.creator_id}`"
                                    class="text-blue-500 hover:underline">
                                    {{ creatorName }}
                                </NuxtLink>
                                <span v-else>{{ t('campaign.unknown') }}</span>
                            </span>
                        </div>
                    </div>
                </div>

                <p v-if="stats.description" class="text-gray-300 mb-4">{{ stats.description }}</p>
            </div>

            <!-- Campaign Filters Box - Full Width -->
            <CampaignFilters :campaignId="campaignId" :campaignQuery="stats.campaignQuery"
                :filterEntities="stats.filterEntities" class="mb-6" />

            <!-- Campaign Overview - Full Width -->
            <div class="mb-6">
                <CampaignOverview :stats="stats" :showAdvancedStats="showAdvancedStats" />
            </div>

            <!-- Desktop Layout (hidden on mobile) -->
            <div class="hidden lg:flex lg:flex-row gap-6">
                <!-- Left Column - 80% -->
                <div class="lg:w-4/5">
                    <!-- Ship Stats -->
                    <CampaignShipStats :stats="stats" class="mb-6" />

                    <!-- Most Valuable Kills -->
                    <div v-if="stats.mostValuableKills && stats.mostValuableKills.length > 0" class="mb-6">
                        <CampaignMostValuable :title="t('campaign.most_valuable_kills')" :items="stats.mostValuableKills"
                            :limit="7" :loading="pending" />
                    </div>

                    <!-- Campaign-specific KillList component - Pass campaign query -->
                    <CampaignKillList :campaignId="campaignId" :campaignQuery="stats?.campaignQuery" :limit="25" />
                </div>

                <!-- Right Column - 20% -->
                <div class="lg:w-1/5">
                    <!-- Top Killers Box - Show if we have attacker definitions -->
                    <div v-if="hasAttackerDefinitions && stats.topKillersByCharacter?.length" class="mb-6 campaign-sidebar-box">
                        <CampaignTopBox
                            :title="t('campaign.top_killers')"
                            :entities="stats.topKillersByCharacter"
                            :countField="'kills'"
                            :countTitle="t('kills')"
                            entityType="character"
                            :loading="pending"
                            :limit="10" />
                    </div>

                    <!-- Top Victims Box - Show if we have victim definitions -->
                    <div v-if="hasVictimDefinitions && stats.topVictimsByCharacter?.length" class="mb-6 campaign-sidebar-box">
                        <CampaignTopBox
                            :title="t('campaign.top_victims')"
                            :entities="stats.topVictimsByCharacter"
                            :countField="'losses'"
                            :countTitle="t('losses')"
                            entityType="character"
                            :loading="pending"
                            :limit="10" />
                    </div>

                    <!-- Top Damage Dealers Box - Show if we have attackers -->
                    <div v-if="hasAttackerDefinitions && stats.topDamageDealersByCharacter?.length" class="mb-6 campaign-sidebar-box">
                        <CampaignTopBox :title="t('campaign.top_damage_dealers')"
                            :entities="stats.topDamageDealersByCharacter" :countField="'damageDone'"
                            :countTitle="t('damage')" entityType="character" :loading="pending" :limit="10" />
                    </div>

                    <!-- Top Damage Takers Box - Show if we have victims -->
                    <div v-if="hasVictimDefinitions && stats.topDamageTakersByCharacter?.length" class="mb-6 campaign-sidebar-box">
                        <CampaignTopBox :title="t('campaign.top_damage_takers')"
                            :entities="stats.topDamageTakersByCharacter" :countField="'damageTaken'"
                            :countTitle="t('damage')" entityType="character" :loading="pending" :limit="10" />
                    </div>

                    <!-- Top Killer Alliances Box -->
                    <div v-if="stats.topKillersByAlliance?.length" class="mb-6 campaign-sidebar-box">
                        <CampaignTopBox :title="t('campaign.top_killer_alliances')"
                            :entities="stats.topKillersByAlliance"
                            :countField="'kills'"
                            :countTitle="t('kills')"
                            entityType="alliance"
                            :loading="pending"
                            :limit="10" />
                    </div>

                    <!-- Top Victim Alliances Box -->
                    <div v-if="stats.topVictimsByAlliance?.length" class="mb-6 campaign-sidebar-box">
                        <CampaignTopBox :title="t('campaign.top_victim_alliances')"
                            :entities="stats.topVictimsByAlliance"
                            :countField="'losses'"
                            :countTitle="t('losses')"
                            entityType="alliance"
                            :loading="pending"
                            :limit="10" />
                    </div>

                    <!-- Top Killer Corporations Box -->
                    <div v-if="stats.topKillersByCorporation?.length" class="mb-6 campaign-sidebar-box">
                        <CampaignTopBox :title="t('campaign.top_killer_corporations')"
                            :entities="stats.topKillersByCorporation"
                            :countField="'kills'"
                            :countTitle="t('kills')"
                            entityType="corporation"
                            :loading="pending"
                            :limit="10" />
                    </div>

                    <!-- Top Victim Corporations Box -->
                    <div v-if="stats.topVictimsByCorporation?.length" class="mb-6 campaign-sidebar-box">
                        <CampaignTopBox :title="t('campaign.top_victim_corporations')"
                            :entities="stats.topVictimsByCorporation"
                            :countField="'losses'"
                            :countTitle="t('losses')"
                            entityType="corporation"
                            :loading="pending"
                            :limit="10" />
                    </div>
                </div>
            </div>

            <!-- Mobile Layout with Tabs (visible only on mobile) -->
            <div class="lg:hidden mb-4">
                <Tabs v-model="activeTabId" :items="tabItems" :ui="tabsUi" color="neutral"
                    mobile-display-mode="icon-only">
                    <!-- Ship Stats Tab -->
                    <template #ships>
                        <div class="mt-4 space-y-6">
                            <CampaignShipStats :stats="stats" />

                            <!-- Most Valuable Kills on mobile -->
                            <div v-if="stats.mostValuableKills && stats.mostValuableKills.length > 0">
                                <CampaignMostValuable :title="t('campaign.most_valuable_kills')" :items="stats.mostValuableKills"
                                    :limit="4" :loading="pending" />
                            </div>
                        </div>
                    </template>

                    <!-- Organizations Tab -->
                    <template #organizations>
                        <div class="mt-4 space-y-6">
                            <!-- Alliance Statistics -->
                            <div v-if="stats.topKillersByAlliance?.length || stats.topVictimsByAlliance?.length">
                                <div class="space-y-4">
                                    <CampaignTopBox v-if="stats.topKillersByAlliance?.length"
                                        :title="t('campaign.top_killer_alliances')"
                                        :entities="stats.topKillersByAlliance"
                                        :countField="'kills'"
                                        :countTitle="t('kills')"
                                        entityType="alliance"
                                        :loading="pending"
                                        :limit="10" />

                                    <CampaignTopBox v-if="stats.topVictimsByAlliance?.length"
                                        :title="t('campaign.top_victim_alliances')"
                                        :entities="stats.topVictimsByAlliance"
                                        :countField="'losses'"
                                        :countTitle="t('losses')"
                                        entityType="alliance"
                                        :loading="pending"
                                        :limit="10" />
                                </div>
                            </div>

                            <!-- Corporation Statistics -->
                            <div v-if="stats.topKillersByCorporation?.length || stats.topVictimsByCorporation?.length">
                                <div class="space-y-4">
                                    <CampaignTopBox v-if="stats.topKillersByCorporation?.length"
                                        :title="t('campaign.top_killer_corporations')"
                                        :entities="stats.topKillersByCorporation"
                                        :countField="'kills'"
                                        :countTitle="t('kills')"
                                        entityType="corporation"
                                        :loading="pending"
                                        :limit="10" />

                                    <CampaignTopBox v-if="stats.topVictimsByCorporation?.length"
                                        :title="t('campaign.top_victim_corporations')"
                                        :entities="stats.topVictimsByCorporation"
                                        :countField="'losses'"
                                        :countTitle="t('losses')"
                                        entityType="corporation"
                                        :loading="pending"
                                        :limit="10" />
                                </div>
                            </div>

                            <div v-if="!stats.topKillersByAlliance?.length && !stats.topVictimsByAlliance?.length &&
                                     !stats.topKillersByCorporation?.length && !stats.topVictimsByCorporation?.length"
                                class="text-center py-8 text-gray-500">
                                {{ t('campaign.no_organizations_found') }}
                            </div>
                        </div>
                    </template>

                    <!-- Characters Tab -->
                    <template #characters>
                        <div class="mt-4 space-y-6">
                            <!-- Top Killers Box - Show if we have attacker definitions -->
                            <div v-if="hasAttackerDefinitions && stats.topKillersByCharacter?.length" class="mb-6 campaign-sidebar-box">
                                <CampaignTopBox
                                    :title="t('campaign.top_killers')"
                                    :entities="stats.topKillersByCharacter"
                                    :countField="'kills'"
                                    :countTitle="t('kills')"
                                    entityType="character"
                                    :loading="pending"
                                    :limit="10" />
                            </div>

                            <!-- Top Victims Box - Show if we have victim definitions -->
                            <div v-if="hasVictimDefinitions && stats.topVictimsByCharacter?.length" class="mb-6 campaign-sidebar-box">
                                <CampaignTopBox
                                    :title="t('campaign.top_victims')"
                                    :entities="stats.topVictimsByCharacter"
                                    :countField="'losses'"
                                    :countTitle="t('losses')"
                                    entityType="character"
                                    :loading="pending"
                                    :limit="10" />
                            </div>

                            <!-- Top Damage Dealers Box - Show if we have attackers -->
                            <div v-if="hasAttackerDefinitions && stats.topDamageDealersByCharacter?.length" class="mb-6 campaign-sidebar-box">
                                <CampaignTopBox :title="t('campaign.top_damage_dealers')"
                                    :entities="stats.topDamageDealersByCharacter" :countField="'damageDone'"
                                    :countTitle="t('damage')" entityType="character" :loading="pending" :limit="10" />
                            </div>

                            <!-- Top Damage Takers Box - Show if we have victims -->
                            <div v-if="hasVictimDefinitions && stats.topDamageTakersByCharacter?.length" class="mb-6 campaign-sidebar-box">
                                <CampaignTopBox :title="t('campaign.top_damage_takers')"
                                    :entities="stats.topDamageTakersByCharacter" :countField="'damageTaken'"
                                    :countTitle="t('damage')" entityType="character" :loading="pending" :limit="10" />
                            </div>
                        </div>
                    </template>

                    <!-- Kills Tab -->
                    <template #kills>
                        <div class="w-full">
                            <CampaignKillList :campaignId="campaignId" :campaignQuery="stats?.campaignQuery" :limit="25" />
                        </div>
                    </template>
                </Tabs>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { type ICampaignOutput } from '~/server/interfaces/ICampaignOutput';

// Composables
const { t } = useI18n();
const toast = useToast();
const route = useRoute();
const router = useRouter();
const { isAuthenticated, currentUser } = useAuth();

// Get campaign ID from route
const campaignId = computed(() => route.params.id as string);

// State
const isLoading = ref(false);
const creatorName = ref<string | null>(null);

// Polling for processing status
const isPolling = ref(false);
const pollingInterval = ref<NodeJS.Timeout | null>(null);

// For mobile tabs
const activeTabId = ref('ships');

// Set up tab navigation with icons
const tabItems = computed(() => [
    { id: 'ships', label: t('campaign.tabs.ships'), icon: 'lucide:ship', slot: 'ships' },
    { id: 'characters', label: t('campaign.tabs.characters'), icon: 'lucide:users', slot: 'characters' },
    { id: 'kills', label: t('campaign.tabs.kills'), icon: 'lucide:target', slot: 'kills' },
    { id: 'organizations', label: t('campaign.tabs.organizations'), icon: 'lucide:flag', slot: 'organizations' }
]);

const tabsUi = {
    list: "mb-0",
    tab: "p-2 text-sm font-semibold text-white rounded-lg bg-background-700 hover:bg-background-600 ml-2"
};

// Handle tab navigation and URL hash synchronization
onMounted(() => {
    if (tabItems.value.length > 0) {
        const hash = route.hash.substring(1);
        const validTab = tabItems.value.find(item => item.id === hash);
        if (validTab) {
            activeTabId.value = hash;
        } else if (hash) {
            // If there's a hash but it's not a valid tab, use the first tab
            router.replace({ hash: `#${tabItems.value[0].id}` });
            activeTabId.value = tabItems.value[0].id;
        }
    }
});

watch(() => route.hash, (newHash) => {
    const tabIdFromHash = newHash.substring(1);
    if (tabItems.value.some(item => item.id === tabIdFromHash)) {
        activeTabId.value = tabIdFromHash;
    } else if (!tabIdFromHash && tabItems.value.length > 0) {
        activeTabId.value = tabItems.value[0].id;
    }
});

watch(activeTabId, (newId, oldId) => {
    if (oldId &&
        newId !== oldId &&
        route.hash !== `#${newId}`) {
        router.push({ hash: `#${newId}` });
    }
});

// Check if current user is the creator
const isCreator = computed(() => {
    if (!isAuthenticated.value || !currentUser.value || !stats.value?.creator_id) {
        return false;
    }
    return currentUser.value.characterId === stats.value.creator_id;
});

// Determine campaign type based on query
const campaignType = computed(() => {
    if (!stats.value?.campaignQuery) return 'mixed';

    const hasAttackers = Object.keys(stats.value.campaignQuery).some(key => key.startsWith('attackers.'));
    const hasVictims = Object.keys(stats.value.campaignQuery).some(key => key.startsWith('victim.'));

    if (hasAttackers && hasVictims) return 'mixed'; // Both attackers and victims
    if (hasAttackers) return 'attacker-only'; // Only attackers
    if (hasVictims) return 'victim-only'; // Only victims
    return 'general'; // No specific targeting (location/time only)
});

// Check if we have attacker/victim definitions
const hasAttackerDefinitions = computed(() => {
    if (!stats.value?.campaignQuery) return false;
    return Object.keys(stats.value.campaignQuery).some(key => key.startsWith('attackers.'));
});

const hasVictimDefinitions = computed(() => {
    if (!stats.value?.campaignQuery) return false;
    return Object.keys(stats.value.campaignQuery).some(key => key.startsWith('victim.'));
});

// Determine if we should show efficiency and ISK damage stats
const showAdvancedStats = computed(() => {
    return campaignType.value === 'mixed'; // Only show for mixed campaigns
});

// Fetch campaign data
const { data: stats, pending, error, refresh } = await useFetch<ICampaignOutput>(
    () => `/api/campaign/${campaignId.value}/stats`,
    {
        key: `campaign-${campaignId.value}`,
    }
);

// Start polling if campaign is processing
const startPolling = () => {
    if (isPolling.value) return;

    isPolling.value = true;
    pollingInterval.value = setInterval(async () => {
        try {
            await refresh();

            // Stop polling if processing is complete or failed
            if (stats.value && (!stats.value.processing || stats.value.status === 'completed' || stats.value.status === 'failed')) {
                stopPolling();
            }
        } catch (error) {
            console.error('Polling error:', error);
            stopPolling();
        }
    }, 5000); // Poll every 5 seconds
};

const stopPolling = () => {
    if (pollingInterval.value) {
        clearInterval(pollingInterval.value);
        pollingInterval.value = null;
    }
    isPolling.value = false;
};

// Start polling if we detect processing state
watch(stats, (newStats) => {
    if (newStats?.processing && (newStats.status === 'pending' || newStats.status === 'processing')) {
        startPolling();
    } else {
        stopPolling();
    }
}, { immediate: true });

// Clean up polling on unmount
onUnmounted(() => {
    stopPolling();
});

// Retry processing function
const retryProcessing = async () => {
    try {
        await $fetch(`/api/campaign/${campaignId.value}/reprocess`, {
            method: 'POST'
        });

        toast.add({
            title: t('success'),
            description: t('campaign.reprocess_queued'),
            color: 'green',
            timeout: 3000
        });

        // Refresh the stats and start polling
        await refresh();
        startPolling();
    } catch (error: any) {
        console.error('Retry processing error:', error);
        toast.add({
            title: t('error'),
            description: t('campaign.reprocess_failed'),
            color: 'red',
            timeout: 5000
        });
    }
};

// SEO
useSeoMeta({
    title: () => stats.value ? `${stats.value.name} - Campaign` : 'Campaign',
    description: () => stats.value?.description || t('campaign.default_description'),
    ogTitle: () => stats.value ? `${stats.value.name} - Campaign` : 'Campaign',
    ogDescription: () => stats.value?.description || t('campaign.default_description'),
});

// Load creator name if creator_id is available
const fetchCreatorName = async () => {
    if (!stats.value?.creator_id) return;

    try {
        const response = await $fetch(`/api/characters/${stats.value.creator_id}`);
        if (response && response.name) {
            creatorName.value = response.name;
        }
    } catch (error) {
        console.error('Error fetching creator name:', error);
    }
};

// Update document title when stats are loaded
watch(stats, (newStats) => {
    if (newStats) {
        fetchCreatorName();
    }
}, { immediate: true });

// Handle errors
if (error.value) {
    console.error('Error loading campaign:', error.value);
}
</script>

<style scoped>
.campaign-header {
    background-color: var(--background-800);
    padding: 1rem;
    border-radius: 0.5rem;
    box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
    border: 1px solid rgba(55, 65, 81, 0.3);
}

.campaign-sidebar-box {
    background-color: var(--background-800);
    border-radius: 0.5rem;
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
    border: 1px solid rgba(55, 65, 81, 0.3);
    overflow: hidden;
}

@media (min-width: 1024px) {
    .lg\:w-4\/5 {
        width: 80%;
    }

    .lg\:w-1\/5 {
        width: 20%;
    }
}
</style>
