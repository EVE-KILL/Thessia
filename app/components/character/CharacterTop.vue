<template>
    <div class="character-top-container">
        <!-- Period Selector -->
        <div class="period-header">
            <h2 class="top-title">
                <UIcon name="i-lucide-trophy" class="title-icon" />
                {{ $t('top') }} ({{ activePeriodLabel }})
            </h2>
            <div class="period-buttons">
                <UButton v-for="period in periods" :key="period.value" size="sm"
                    :variant="activePeriod === period.value ? 'solid' : 'outline'" @click="changePeriod(period.value)">
                    {{ period.label }}
                </UButton>
            </div>
        </div>

        <!-- Row 1: Most Valuable Kills -->
        <div class="most-valuable-section">
            <MostValuable :title="$t('character.mostValuableKills')" :apiUrl="`/api/stats/character_id/${characterId}`"
                :days="activeDays" />
        </div>

        <!-- Row 2: Top Blocks (Ships, Systems, Regions) -->
        <div class="top-boxes-grid">
            <div class="top-box-container">
                <CharacterTopBox :apiUrl="`/api/stats/character_id/${characterId}`" dataType="ships"
                    :title="$t('character.topShips')" icon="i-lucide-rocket" :days="activeDays" />
            </div>
            <div class="top-box-container">
                <CharacterTopBox :apiUrl="`/api/stats/character_id/${characterId}`" dataType="systems"
                    :title="$t('character.topSystems')" icon="i-lucide-globe" :days="activeDays" />
            </div>
            <div class="top-box-container">
                <CharacterTopBox :apiUrl="`/api/stats/character_id/${characterId}`" dataType="regions"
                    :title="$t('character.topRegions')" icon="i-lucide-map" :days="activeDays" />
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import { useRoute } from 'vue-router';
import MostValuable from '../common/MostValuable.vue';
import CharacterTopBox from './CharacterTopBox.vue';

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
const changePeriod = (period: string) => {
    activePeriod.value = period;
};
</script>

<style scoped>
/* Container */
.character-top-container {
    display: flex;
    flex-direction: column;
    gap: var(--space-4);
    padding: var(--space-2);
    padding-top: var(--space-4);
}

/* Period header */
.period-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: var(--space-4);
    flex-wrap: wrap;
    gap: var(--space-4);
}

.top-title {
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

/* Most valuable section */
.most-valuable-section {
    display: flex;
    flex-direction: column;
    gap: var(--space-4);
}

@media (min-width: 768px) {
    .most-valuable-section {
        flex-direction: row;
    }
}

/* Top boxes grid */
.top-boxes-grid {
    display: flex;
    flex-direction: column;
    gap: var(--space-4);
}

@media (min-width: 768px) {
    .top-boxes-grid {
        flex-direction: row;
    }
}

.top-box-container {
    flex: 1;
    padding-bottom: var(--space-5);
}

/* Responsive adjustments */
@media (max-width: 767px) {
    .character-top-container {
        padding: var(--space-1);
        padding-top: var(--space-2);
    }

    .period-header {
        flex-direction: column;
        align-items: stretch;
        text-align: center;
        gap: var(--space-3);
    }

    .period-buttons {
        justify-content: center;
    }
}
</style>
