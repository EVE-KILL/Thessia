<template>
    <div class="alliance-stats-container">
        <!-- Period Selector -->
        <div class="flex justify-between items-center mb-6">
            <h2 class="text-xl font-semibold flex items-center gap-2">
                <UIcon name="i-lucide-bar-chart-3" class="h-5 w-5" />
                {{ $t('stats') }} ({{ activePeriodLabel }})
            </h2>
            <div class="flex gap-2">
                <UButton v-for="period in periods" :key="period.value" size="sm"
                    :variant="activePeriod === period.value ? 'solid' : 'outline'" @click="changePeriod(period.value)">
                    {{ period.label }}
                </UButton>
            </div>
        </div>

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

// Period management
const activePeriod = ref("all");

const periods = [
    { value: "14", label: "14d" },
    { value: "30", label: "30d" },
    { value: "90", label: "90d" },
    { value: "all", label: t("allTime") },
];

const activePeriodLabel = computed(() => {
    if (activePeriod.value === "all") return t("allTime");
    return `${activePeriod.value}d`;
});

const activeDays = computed(() => {
    return activePeriod.value === "all" ? 0 : parseInt(activePeriod.value);
});

// Function to handle period change
const changePeriod = async (period: string) => {
    activePeriod.value = period;
    // The reactive watch will automatically trigger refetch
};

// Fetch ship stats - reactive to period changes
const { data: shipStats, pending: shipStatsLoading, refresh: refreshShipStats } = await useFetch(() => `/api/stats/alliance_id/${allianceId}?dataType=shipGroupStats&days=${activeDays.value}`, {
    key: () => `alliance-ship-stats-${allianceId}-${activePeriod.value}`,
    default: () => ({ shipGroupStats: [] }),
    watch: [activeDays],
    server: true, // Enable SSR rendering
    lazy: false, // Show immediately
});

// Fetch monthly stats - reactive to period changes
const { data: monthlyStats, pending: monthlyStatsLoading, refresh: refreshMonthlyStats } = await useFetch(() => `/api/stats/alliance_id/${allianceId}?dataType=monthlyStats&days=${activeDays.value}`, {
    key: () => `alliance-monthly-stats-${allianceId}-${activePeriod.value}`,
    default: () => ({ monthlyStats: [] }),
    watch: [activeDays],
    server: true, // Enable SSR rendering
    lazy: false, // Show immediately
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
