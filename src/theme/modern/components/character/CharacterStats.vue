<template>
    <div class="character-stats-container">
        <!-- Ship Stats Section -->
        <div class="ship-stats-section mb-8">
            <h2 class="text-xl font-semibold mb-4 flex items-center gap-2">
                <UIcon name="i-lucide-rocket" class="h-5 w-5" />
                {{ t('character.shipStats') }}
            </h2>
            <CharacterShipStats :stats="shipStats" :loading="shipStatsLoading" />
        </div>

        <!-- Monthly History Section -->
        <div class="monthly-history-section">
            <h2 class="text-xl font-semibold mb-4 flex items-center gap-2">
                <UIcon name="i-lucide-calendar" class="h-5 w-5" />
                {{ t('character.monthlyHistory') }}
            </h2>
            <CharacterMonthlyHistory :stats="monthlyStats" :loading="monthlyStatsLoading" />
        </div>
    </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import { useRoute } from 'vue-router';

const { t } = useI18n();
const route = useRoute();
const characterId = route.params.id;

// Fetch ship stats
const { data: shipStats, pending: shipStatsLoading } = await useFetch(`/api/stats/character/${characterId}/ships`, {
    key: `character-ship-stats-${characterId}`,
    default: () => ({ shipGroupStats: [] })
});

// Fetch monthly stats
const { data: monthlyStats, pending: monthlyStatsLoading } = await useFetch(`/api/stats/character/${characterId}/monthly`, {
    key: `character-monthly-stats-${characterId}`,
    default: () => ({ monthlyStats: [] })
});
</script>

<style scoped>
.character-stats-container {
    padding: 1rem;
}

@media (max-width: 768px) {
    .character-stats-container {
        padding: 0.5rem;
    }
}
</style>
