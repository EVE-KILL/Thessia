<template>
    <div class="container mx-auto p-4">
        <h1 class="text-3xl font-bold text-center mb-8 text-white">EVE Online Historical Statistics</h1>

        <!-- Filter Buttons -->
        <div v-if="loaded" class="flex flex-wrap justify-center gap-2 mb-8">
            <UButton
                v-for="filter in filters"
                :key="filter.key"
                :color="activeFilter === filter.key ? 'primary' : 'gray'"
                :variant="activeFilter === filter.key ? 'solid' : 'outline'"
                @click="setActiveFilter(filter.key)"
                class="mb-2"
            >
                {{ t(`historicalStats.filters.${filter.key}`) }}
            </UButton>
        </div>

        <div v-if="loaded" class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <!-- Largest Section -->
            <template v-if="activeFilter === 'all' || activeFilter === 'largest'">
                <StatsListDisplay entityType="alliance" listType="largest" title="Largest Alliances" :limit="10"
                    :show-member-count="true" :show-changes="true" />
                <StatsListDisplay entityType="corporation" listType="largest" title="Largest Corporations" :limit="10"
                    :show-member-count="true" :show-changes="true" />
            </template>

            <!-- Security Rankings Section -->
            <template v-if="activeFilter === 'all' || activeFilter === 'security'">
                <!-- Information card explaining weighted scores -->
                <div class="md:col-span-2 bg-gray-900 rounded-lg p-4 mb-2">
                    <div class="flex justify-between items-center mb-2">
                        <h2 class="text-xl font-medium text-white">{{ $t('historicalStats.securityRankings') }}</h2>
                        <UButton color="gray" variant="ghost" @click="toggleScoreInfo"
                            :icon="showScoreInfo ? 'i-lucide-chevron-up' : 'i-lucide-chevron-down'">
                            {{ showScoreInfo ? $t('common.hide') : $t('common.showMore') }}
                        </UButton>
                    </div>

                    <div v-if="showScoreInfo" class="text-sm text-gray-300 space-y-3">
                        <p>{{ $t('historicalStats.weightedScoreInfo') }}</p>
                        <div class="flex flex-col sm:flex-row gap-4">
                            <div class="flex-1 bg-gray-800 p-3 rounded-lg">
                                <h3 class="font-medium text-red-400 mb-1">{{ $t('historicalStats.pirateScoreTitle') }}</h3>
                                <p>{{ $t('historicalStats.pirateScoreExplanation') }}</p>
                                <div class="mt-2 p-2 bg-gray-700 rounded font-mono text-sm">
                                    weighted_score = avg_sec_status × ln(member_count)
                                </div>
                            </div>
                            <div class="flex-1 bg-gray-800 p-3 rounded-lg">
                                <h3 class="font-medium text-blue-400 mb-1">{{ $t('historicalStats.carebearScoreTitle') }}
                                </h3>
                                <p>{{ $t('historicalStats.carebearScoreExplanation') }}</p>
                                <div class="mt-2 p-2 bg-gray-700 rounded font-mono text-sm">
                                    weighted_score = avg_sec_status × ln(member_count)
                                </div>
                            </div>
                        </div>
                        <p class="text-xs">{{ $t('historicalStats.minimumRequirements') }}</p>
                    </div>
                </div>

                <!-- Most Pirate -->
                <StatsListDisplay entityType="alliance" listType="most_pirate" title="Most Pirate Alliances" :limit="10"
                    :show-member-count="true" :show-sec-status="true" />
                <StatsListDisplay entityType="corporation" listType="most_pirate" title="Most Pirate Corporations"
                    :limit="10" :show-member-count="true" :show-sec-status="true" />

                <!-- Most Carebear -->
                <StatsListDisplay entityType="alliance" listType="most_carebear" title="Most Carebear Alliances" :limit="10"
                    :show-member-count="true" :show-sec-status="true" />
                <StatsListDisplay entityType="corporation" listType="most_carebear" title="Most Carebear Corporations"
                    :limit="10" :show-member-count="true" :show-sec-status="true" />
            </template>

            <!-- Newest Section -->
            <template v-if="activeFilter === 'all' || activeFilter === 'newest'">
                <StatsListDisplay entityType="alliance" listType="newest" title="Newest Alliances" :limit="10"
                    :show-member-count="true" :show-date-founded="true" />
                <StatsListDisplay entityType="corporation" listType="newest" title="Newest Corporations" :limit="10"
                    :show-member-count="true" :show-date-founded="true" />
            </template>

            <!-- Growth & Decline Section -->
            <template v-if="activeFilter === 'all' || activeFilter === 'growth'">
                <!-- Growing 1d -->
                <StatsListDisplay entityType="alliance" listType="growing" period="1d" title="Top Growing Alliances (1d)"
                    :limit="10" :show-member-count="true" :show-changes="true" />
                <StatsListDisplay entityType="corporation" listType="growing" period="1d"
                    title="Top Growing Corporations (1d)" :limit="10" :show-member-count="true" :show-changes="true" />

                <!-- Shrinking 1d -->
                <StatsListDisplay entityType="alliance" listType="shrinking" period="1d"
                    title="Top Shrinking Alliances (1d)" :limit="10" :show-member-count="true" :show-changes="true" />
                <StatsListDisplay entityType="corporation" listType="shrinking" period="1d"
                    title="Top Shrinking Corporations (1d)" :limit="10" :show-member-count="true" :show-changes="true" />

                <!-- Growing 7d -->
                <StatsListDisplay entityType="alliance" listType="growing" period="7d" title="Top Growing Alliances (7d)"
                    :limit="10" :show-member-count="true" :show-changes="true" />
                <StatsListDisplay entityType="corporation" listType="growing" period="7d"
                    title="Top Growing Corporations (7d)" :limit="10" :show-member-count="true" :show-changes="true" />

                <!-- Shrinking 7d -->
                <StatsListDisplay entityType="alliance" listType="shrinking" period="7d"
                    title="Top Shrinking Alliances (7d)" :limit="10" :show-member-count="true" :show-changes="true" />
                <StatsListDisplay entityType="corporation" listType="shrinking" period="7d"
                    title="Top Shrinking Corporations (7d)" :limit="10" :show-member-count="true" :show-changes="true" />

                <!-- Growing 14d -->
                <StatsListDisplay entityType="alliance" listType="growing" period="14d" title="Top Growing Alliances (14d)"
                    :limit="10" :show-member-count="true" :show-changes="true" />
                <StatsListDisplay entityType="corporation" listType="growing" period="14d"
                    title="Top Growing Corporations (14d)" :limit="10" :show-member-count="true" :show-changes="true" />

                <!-- Shrinking 14d -->
                <StatsListDisplay entityType="alliance" listType="shrinking" period="14d"
                    title="Top Shrinking Alliances (14d)" :limit="10" :show-member-count="true" :show-changes="true" />
                <StatsListDisplay entityType="corporation" listType="shrinking" period="14d"
                    title="Top Shrinking Corporations (14d)" :limit="10" :show-member-count="true" :show-changes="true" />

                <!-- Growing 30d -->
                <StatsListDisplay entityType="alliance" listType="growing" period="30d" title="Top Growing Alliances (30d)"
                    :limit="10" :show-member-count="true" :show-changes="true" />
                <StatsListDisplay entityType="corporation" listType="growing" period="30d"
                    title="Top Growing Corporations (30d)" :limit="10" :show-member-count="true" :show-changes="true" />

                <!-- Shrinking 30d -->
                <StatsListDisplay entityType="alliance" listType="shrinking" period="30d"
                    title="Top Shrinking Alliances (30d)" :limit="10" :show-member-count="true" :show-changes="true" />
                <StatsListDisplay entityType="corporation" listType="shrinking" period="30d"
                    title="Top Shrinking Corporations (30d)" :limit="10" :show-member-count="true" :show-changes="true" />
            </template>

            <!-- Achievement Points Section -->
            <template v-if="activeFilter === 'all' || activeFilter === 'achievements'">
                <div class="md:col-span-2 bg-gray-900 rounded-lg p-4 mb-2">
                    <h2 class="text-xl font-medium text-white mb-4">{{ $t('historicalStats.achievementRankings') }}</h2>
                    <p class="text-sm text-gray-300">{{ $t('historicalStats.achievementRankingsInfo') }}</p>
                </div>

                <!-- Character Achievement Rankings -->
                <CharacterAchievementDisplay listType="highest" title="Highest Achievement Points (Characters)" :limit="10" />
                <CharacterAchievementDisplay listType="lowest" title="Lowest Achievement Points (Characters)" :limit="10" />

                <!-- Alliance Achievement Rankings -->
                <StatsListDisplay entityType="alliance" listType="highest_achievement_points"
                    title="Highest Achievement Points (Alliances)" :limit="10" :show-member-count="true" :show-achievement-points="true" />
                <StatsListDisplay entityType="alliance" listType="lowest_achievement_points"
                    title="Lowest Achievement Points (Alliances)" :limit="10" :show-member-count="true" :show-achievement-points="true" />

                <!-- Corporation Achievement Rankings -->
                <StatsListDisplay entityType="corporation" listType="highest_achievement_points"
                    title="Highest Achievement Points (Corporations)" :limit="10" :show-member-count="true" :show-achievement-points="true" />
                <StatsListDisplay entityType="corporation" listType="lowest_achievement_points"
                    title="Lowest Achievement Points (Corporations)" :limit="10" :show-member-count="true" :show-achievement-points="true" />
            </template>
        </div>
    </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import StatsListDisplay from '../components/historicalStats/StatsListDisplay.vue';
import CharacterAchievementDisplay from '../components/historicalStats/CharacterAchievementDisplay.vue';

const { t } = useI18n();
const loaded = ref(false);
const showMoreStats = ref(false);
const showScoreInfo = ref(false);
const activeFilter = ref('all');

const filters = [
    { key: 'all', label: 'All Statistics' },
    { key: 'largest', label: 'Largest' },
    { key: 'security', label: 'Security Rankings' },
    { key: 'newest', label: 'Newest' },
    { key: 'growth', label: 'Growth & Decline' },
    { key: 'achievements', label: 'Achievement Points' }
];

const setActiveFilter = (filter: string) => {
    activeFilter.value = filter;
};

const toggleScoreInfo = () => {
    showScoreInfo.value = !showScoreInfo.value;
};

onMounted(() => {
    // Give the page a moment to initialize before showing content
    setTimeout(() => {
        loaded.value = true;
    }, 100);
});

useSeoMeta({
    title: () => t('seo.stats.title'),
    description: () => t('seo.stats.description'),
    ogTitle: () => t('seo.stats.title'),
    ogDescription: () => t('seo.stats.description'),
    ogType: 'website',
    twitterCard: 'summary_large_image',
    twitterTitle: () => t('seo.stats.title'),
    twitterDescription: () => t('seo.stats.description')
});
</script>

<style scoped>
/* Add any page-specific styles here */
.container {
    max-width: 1600px;
}
</style>
