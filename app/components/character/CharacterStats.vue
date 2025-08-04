<template>
    <div class="character-stats-container">
        <!-- Period Selector -->
        <div class="period-header">
            <h2 class="stats-title">
                <UIcon name="i-lucide-bar-chart-3" class="title-icon" />
                {{ $t('stats') }} ({{ activePeriodLabel }})
            </h2>
            <div class="period-buttons">
                <UButton v-for="period in periods" :key="period.value" size="sm"
                    :variant="activePeriod === period.value ? 'solid' : 'outline'" @click="changePeriod(period.value)">
                    {{ period.label }}
                </UButton>
            </div>
        </div>

        <!-- Ship Stats Section -->
        <Card class="stats-section">
            <template #header>
                <div class="section-header">
                    <UIcon name="i-lucide-rocket" class="section-icon" />
                    {{ t('character.shipStats') }}
                </div>
            </template>
            <CharacterShipStats :stats="shipStats || { shipGroupStats: [] }" :loading="shipStatsLoading" />
        </Card>

        <!-- Monthly History Section -->
        <Card class="stats-section">
            <template #header>
                <div class="section-header">
                    <UIcon name="i-lucide-calendar" class="section-icon" />
                    {{ t('character.monthlyHistory') }}
                </div>
            </template>
            <CharacterMonthlyHistory :stats="monthlyStats || { monthlyStats: [] }" :loading="monthlyStatsLoading" />
        </Card>
    </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import { useRoute } from 'vue-router';

const { t } = useI18n();
const route = useRoute();
const characterId = route.params.id;

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
const { data: shipStats, pending: shipStatsLoading, refresh: refreshShipStats } = useFetch(() => `/api/stats/character_id/${characterId}?dataType=shipGroupStats&days=${activeDays.value}`, {
    key: () => `character-ship-stats-${characterId}-${activePeriod.value}`,
    default: () => ({ shipGroupStats: [] }),
    watch: [activeDays]
});

// Fetch monthly stats - reactive to period changes
const { data: monthlyStats, pending: monthlyStatsLoading, refresh: refreshMonthlyStats } = useFetch(() => `/api/stats/character_id/${characterId}?dataType=monthlyStats&days=${activeDays.value}`, {
    key: () => `character-monthly-stats-${characterId}-${activePeriod.value}`,
    default: () => ({ monthlyStats: [] }),
    watch: [activeDays]
});
</script>

<style scoped>
/* Container */
.character-stats-container {
    padding: var(--space-4);
    display: flex;
    flex-direction: column;
    gap: var(--space-6);
}

@media (max-width: 768px) {
    .character-stats-container {
        padding: var(--space-2);
        gap: var(--space-4);
    }
}

/* Period header */
.period-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-wrap: wrap;
    gap: var(--space-4);
    margin-bottom: var(--space-2);
}

.stats-title {
    font-size: var(--text-xl);
    font-weight: var(--font-weight-semibold);
    color: var(--color-text-primary);
    display: flex;
    align-items: center;
    gap: var(--space-2);
    margin: 0;
}

.title-icon {
    width: var(--space-5);
    height: var(--space-5);
    color: var(--color-text-secondary);
}

.period-buttons {
    display: flex;
    gap: var(--space-2);
    flex-wrap: wrap;
}

/* Section styling */
.stats-section {
    overflow: hidden;
}

.section-header {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    font-size: var(--text-lg);
    font-weight: var(--font-weight-semibold);
    color: var(--color-text-primary);
}

.section-icon {
    width: var(--space-5);
    height: var(--space-5);
    color: var(--color-text-secondary);
}
</style>
