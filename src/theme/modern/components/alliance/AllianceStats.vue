<template>
    <div class="alliance-stats-container">
        <!-- Ship Stats Section -->
        <div class="ship-stats-section mb-8">
            <h2 class="text-xl font-semibold mb-4 flex items-center gap-2">
                <UIcon name="i-lucide-rocket" class="h-5 w-5" />
                {{ t('alliance.shipStats') }}
            </h2>
            <AllianceShipStats :stats="shipStats" :loading="shipStatsLoading" />
        </div>

        <!-- Monthly History Section -->
        <div class="monthly-history-section">
            <h2 class="text-xl font-semibold mb-4 flex items-center gap-2">
                <UIcon name="i-lucide-calendar" class="h-5 w-5" />
                {{ t('alliance.monthlyHistory') }}
            </h2>
            <AllianceMonthlyHistory :stats="monthlyStats" :loading="monthlyStatsLoading" />
        </div>
    </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import { useRoute } from 'vue-router';

const { t } = useI18n();
const route = useRoute();
const allianceId = route.params.id;

// Fetch ship stats
const { data: shipStats, pending: shipStatsLoading } = await useFetch(`/api/stats/alliance/${allianceId}/ships`, {
    key: `alliance-ship-stats-${allianceId}`,
    default: () => ({ shipGroupStats: [] })
});

// Fetch monthly stats
const { data: monthlyStats, pending: monthlyStatsLoading } = await useFetch(`/api/stats/alliance/${allianceId}/monthly`, {
    key: `alliance-monthly-stats-${allianceId}`,
    default: () => ({ monthlyStats: [] })
});
</script>

<style scoped>
.alliance-stats-container {
    padding: 1rem;
}

@media (max-width: 768px) {
    .alliance-stats-container {
        padding: 0.5rem;
    }
}
</style>
