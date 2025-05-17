<template>
    <div class="p-4">
        <!-- Loading state -->
        <div v-if="pending || isLoading" class="flex flex-col items-center justify-center py-12">
            <UIcon name="lucide:loader" class="w-12 h-12 animate-spin text-primary mb-4" />
            <span class="text-xl font-medium">{{ t('campaign.loading') }}</span>
        </div>

        <!-- Campaign not found -->
        <div v-else-if="!stats" class="flex flex-col items-center justify-center py-12">
            <UIcon name="lucide:alert-circle" class="w-12 h-12 text-red-500 mb-4" />
            <span class="text-xl font-medium">{{ t('campaign.not_found') }}</span>
            <p class="text-gray-500 mt-2">{{ t('campaign.not_found_desc') }}</p>
            <UButton class="mt-4" to="/campaigncreator">{{ t('campaign.create_new') }}</UButton>
        </div>

        <!-- Campaign content -->
        <div v-else class="max-w-7xl mx-auto">
            <!-- Campaign Header - Full Width -->
            <div class="campaign-header mb-6">
                <div class="flex flex-col md:flex-row justify-between items-start md:items-center mb-4">
                    <h1 class="text-2xl font-bold">{{ stats.name }}</h1>
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
                <CampaignOverview :stats="stats" />
            </div>

            <!-- Main Content - 80/20 Split -->
            <div class="flex flex-col lg:flex-row gap-6">
                <!-- Left Column - 80% -->
                <div class="lg:w-4/5">
                    <!-- Ship Stats -->
                    <CampaignShipStats :stats="stats" class="mb-6" />

                    <!-- Add Alliance/Corp layouts if needed -->
                    <div v-if="entities.alliances.length && entities.corporations.length"
                        class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                        <CampaignEntities :title="t('campaign.alliances')" :entities="entities.alliances"
                            entityType="alliance" />

                        <CampaignEntities :title="t('campaign.corporations')" :entities="entities.corporations"
                            entityType="corporation" />
                    </div>
                    <!-- If only one of them exists, show it full width -->
                    <div v-else-if="entities.alliances.length" class="mb-6">
                        <CampaignEntities :title="t('campaign.alliances')" :entities="entities.alliances"
                            entityType="alliance" />
                    </div>
                    <div v-else-if="entities.corporations.length" class="mb-6">
                        <CampaignEntities :title="t('campaign.corporations')" :entities="entities.corporations"
                            entityType="corporation" />
                    </div>

                    <!-- Campaign-specific KillList component - Pass campaign query -->
                    <CampaignKillList :campaignId="campaignId" :campaignQuery="stats?.campaignQuery" :limit="25" />
                </div>

                <!-- Right Column - 20% -->
                <div class="lg:w-1/5">
                    <!-- Top Killers Box -->
                    <div class="mb-6 campaign-sidebar-box">
                        <CampaignTopBox :title="t('campaign.top_killers')" :entities="stats.topKillersByCharacter || []"
                            :countField="'kills'" :countTitle="t('kills')" entityType="character" :loading="pending"
                            :limit="10" />
                    </div>

                    <!-- Top Damage Dealers Box -->
                    <div class="mb-6 campaign-sidebar-box">
                        <CampaignTopBox :title="t('campaign.top_damage_dealers')"
                            :entities="stats.topDamageDealersByCharacter || []" :countField="'damageDone'"
                            :countTitle="t('damage')" entityType="character" :loading="pending" :limit="10" />
                    </div>

                    <!-- Characters Box -->
                    <div class="mb-6 campaign-sidebar-box">
                        <CampaignTopBox :title="t('campaign.characters')" :entities="entities.characters"
                            :countField="'kills'" :countTitle="t('kills')" entityType="character" :loading="pending"
                            :limit="10" />
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { useRoute } from 'vue-router';
import { type ICampaignOutput } from '~/server/interfaces/ICampaignOutput';

// Composables
const { t } = useI18n();
const toast = useToast();
const route = useRoute();
const { isAuthenticated, currentUser } = useAuth();

// Get campaign ID from route
const campaignId = computed(() => route.params.id as string);

// State
const isLoading = ref(false);
const creatorName = ref<string | null>(null);
const entities = ref({
    alliances: [],
    corporations: [],
    characters: []
});

// Check if current user is the creator
const isCreator = computed(() => {
    if (!isAuthenticated.value || !currentUser.value || !stats.value?.creator_id) {
        return false;
    }
    return currentUser.value.characterId === stats.value.creator_id;
});

// Fetch campaign data
const { data: stats, pending, error } = await useFetch<ICampaignOutput>(
    () => `/api/campaign/${campaignId.value}/stats`,
    {
        key: `campaign-${campaignId.value}`,
    }
);

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

        // Extract entities from top killers and damage dealers for the entities components
        const allianceMap = new Map();
        const corpMap = new Map();
        const charMap = new Map();

        // Process top killers
        if (newStats.topKillersByCharacter) {
            newStats.topKillersByCharacter.forEach(char => {
                if (!charMap.has(char.character_id)) {
                    charMap.set(char.character_id, {
                        id: char.character_id,
                        name: char.character_name,
                        kills: char.kills,
                        losses: 0
                    });
                }
            });
        }

        entities.value = {
            alliances: Array.from(allianceMap.values()),
            corporations: Array.from(corpMap.values()),
            characters: Array.from(charMap.values())
        };
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
