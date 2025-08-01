<template>
    <div>
        <!-- Loading state -->
        <div v-if="pending || isLoading" class="flex flex-col items-center justify-center py-12">
            <UIcon name="lucide:loader" class="w-12 h-12 animate-spin text-primary mb-4" />
            <span class="text-xl font-medium">{{ t('campaign.loading') }}</span>
        </div>

        <!-- Error state -->
        <div v-else-if="error" class="flex flex-col items-center justify-center py-12">
            <UIcon name="lucide:alert-circle" class="w-12 h-12 text-red-500 mb-4" />
            <span class="text-xl font-medium">{{ t('campaign.preview_error') }}</span>
            <p class="text-gray-500 mt-2">{{ error }}</p>
            <UButton class="mt-4" @click="$emit('close')">{{ t('close') }}</UButton>
        </div>

        <!-- Campaign content -->
        <div v-else-if="stats" class="max-w-7xl mx-auto">
            <!-- Campaign Header -->
            <div class="campaign-header mb-6">
                <div class="flex flex-col md:flex-row justify-between items-start md:items-center mb-4">
                    <h1 class="text-2xl font-bold">{{ stats.name }} <span class="text-sm text-gray-400">({{
                        t('campaign.preview') }})</span></h1>
                </div>
                <p v-if="stats.description" class="text-gray-300 mb-4">{{ stats.description }}</p>
            </div>

            <!-- Campaign Filters Box -->
            <CampaignFilters :campaignId="'preview'" :campaignQuery="stats.campaignQuery"
                :filterEntities="stats.filterEntities" class="mb-6" />

            <!-- Campaign Overview -->
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
                    <div v-else-if="entities.alliances.length" class="mb-6">
                        <CampaignEntities :title="t('campaign.alliances')" :entities="entities.alliances"
                            entityType="alliance" />
                    </div>
                    <div v-else-if="entities.corporations.length" class="mb-6">
                        <CampaignEntities :title="t('campaign.corporations')" :entities="entities.corporations"
                            entityType="corporation" />
                    </div>

                    <!-- Preview note instead of killmails -->
                    <UCard class="mb-6">
                        <div class="p-4 text-center">
                            <UIcon name="lucide:info" class="w-8 h-8 text-blue-500 mx-auto mb-2" />
                            <h3 class="text-lg font-medium">{{ t('campaign.killmail_preview_note') }}</h3>
                            <p class="text-gray-500 mt-2">{{ t('campaign.killmail_preview_description') }}</p>
                        </div>
                    </UCard>
                </div>

                <!-- Right Column - 20% -->
                <div class="lg:w-1/5">
                    <!-- Top Killers Box -->
                    <div class="mb-6 campaign-sidebar-box">
                        <CampaignTopBox :title="t('campaign.top_killers')" :entities="stats.topKillersByCharacter || []"
                            :countField="'kills'" :countTitle="t('kills')" entityType="character" :loading="false"
                            :limit="10" />
                    </div>

                    <!-- Top Damage Dealers Box -->
                    <div class="mb-6 campaign-sidebar-box">
                        <CampaignTopBox :title="t('campaign.top_damage_dealers')"
                            :entities="stats.topDamageDealersByCharacter || []" :countField="'damageDone'"
                            :countTitle="t('damage')" entityType="character" :loading="false" :limit="10" />
                    </div>

                    <!-- Characters Box -->
                    <div class="mb-6 campaign-sidebar-box">
                        <CampaignTopBox :title="t('campaign.characters')" :entities="entities.characters"
                            :countField="'kills'" :countTitle="t('kills')" entityType="character" :loading="false"
                            :limit="10" />
                    </div>
                </div>
            </div>

            <!-- Action buttons -->
            <div class="flex justify-end space-x-4 mt-6">
                <UButton @click="$emit('close')" variant="outline">{{ t('cancel') }}</UButton>
                <UButton @click="$emit('save')" color="primary">{{ t('campaign.save_campaign') }}</UButton>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';

// Props
const props = defineProps({
    campaignData: {
        type: Object,
        required: true
    }
});

// Emits
defineEmits(['close', 'save']);

// Composables
const { t } = useI18n();

// State
const isLoading = ref(false);
const error = ref<string | null>(null);
const entities = ref({
    alliances: [],
    corporations: [],
    characters: []
});

// Fetch campaign preview data
const { data: stats, pending } = useFetch<ICampaignOutput>(
    '/api/campaign/preview',
    {
        method: 'POST',
        body: props.campaignData,
        key: `campaign-preview-${JSON.stringify(props.campaignData)}`,
        onResponseError(error) {
            console.error('Error loading campaign preview:', error);
        }
    }
);

// Process stats data when it changes
watch(stats, (newStats) => {
    if (newStats) {
        // Extract entities from top killers and damage dealers for the entity components
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
