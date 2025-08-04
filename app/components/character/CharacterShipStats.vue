<template>
    <Card class="ship-stats-card">
        <template #header>
            <div class="ship-stats-header">
                <h3 class="stats-title">{{ t('character.shipStats') }}</h3>
                <p class="stats-description">{{ t('character.shipStatsDescription') }}</p>
            </div>
        </template>

        <div v-if="loading" class="loading-state">
            <Table :columns="tableColumns" :items="[]" :loading="true" :skeleton-count="10" />
        </div>

        <div v-else-if="stats.shipGroupStats && stats.shipGroupStats.length > 0" class="ship-stats-grid">
            <!-- Column 1 -->
            <div class="ship-stats-column">
                <Table :columns="tableColumns" :items="shipGroups[0]" :density="'compact'" :striped="false"
                    :bordered="true" :special-header="true" background="transparent" header-class="topbox-header">
                    <template #cell-entity="{ item }">
                        <div class="ship-name-container">
                            {{ getLocalizedString((item as ShipGroupStatItem).groupName, locale) }}
                        </div>
                    </template>
                    <template #cell-stats="{ item }">
                        <div class="ship-stats-detailed">
                            <div class="stat-row">
                                <span class="killed">{{ (item as ShipGroupStatItem).kills }}</span>
                                <span class="separator">/</span>
                                <span class="lost">{{ (item as ShipGroupStatItem).losses }}</span>
                                <span class="efficiency"
                                    :class="getEfficiencyClass((item as ShipGroupStatItem).efficiency)">
                                    ({{ (item as ShipGroupStatItem).efficiency }}%)
                                </span>
                            </div>
                        </div>
                    </template>
                    <!-- Mobile view template -->
                    <template #mobile-content="{ item }">
                        <div class="mobile-content">
                            <div class="mobile-header">
                                <span class="mobile-title">{{ getLocalizedString((item as ShipGroupStatItem).groupName,
                                    locale) }}</span>
                            </div>
                            <div class="mobile-stats">
                                <div class="mobile-stat-line">
                                    <span class="stat-label">{{ t('killed') }}:</span>
                                    <span class="killed">{{ (item as ShipGroupStatItem).kills }}</span>
                                    <span class="stat-label ml-4">{{ t('lost') }}:</span>
                                    <span class="lost">{{ (item as ShipGroupStatItem).losses }}</span>
                                </div>
                                <div class="mobile-stat-line">
                                    <span class="stat-label">{{ t('efficiency') }}:</span>
                                    <span class="efficiency"
                                        :class="getEfficiencyClass((item as ShipGroupStatItem).efficiency)">
                                        {{ (item as ShipGroupStatItem).efficiency }}%
                                    </span>
                                </div>
                            </div>
                        </div>
                    </template>
                </Table>
            </div>

            <!-- Column 2 -->
            <div class="ship-stats-column" v-if="shipGroups[1]?.length">
                <Table :columns="tableColumns" :items="shipGroups[1]" :density="'compact'" :striped="false"
                    :bordered="true" :special-header="true" background="transparent" header-class="topbox-header">
                    <template #cell-entity="{ item }">
                        <div class="ship-name-container">
                            {{ getLocalizedString((item as ShipGroupStatItem).groupName, locale) }}
                        </div>
                    </template>
                    <template #cell-stats="{ item }">
                        <div class="ship-stats-detailed">
                            <div class="stat-row">
                                <span class="killed">{{ (item as ShipGroupStatItem).kills }}</span>
                                <span class="separator">/</span>
                                <span class="lost">{{ (item as ShipGroupStatItem).losses }}</span>
                                <span class="efficiency"
                                    :class="getEfficiencyClass((item as ShipGroupStatItem).efficiency)">
                                    ({{ (item as ShipGroupStatItem).efficiency }}%)
                                </span>
                            </div>
                        </div>
                    </template>
                    <!-- Mobile view template -->
                    <template #mobile-content="{ item }">
                        <div class="mobile-content">
                            <div class="mobile-header">
                                <span class="mobile-title">{{ getLocalizedString((item as ShipGroupStatItem).groupName,
                                    locale) }}</span>
                            </div>
                            <div class="mobile-stats">
                                <div class="mobile-stat-line">
                                    <span class="stat-label">{{ t('killed') }}:</span>
                                    <span class="killed">{{ (item as ShipGroupStatItem).kills }}</span>
                                    <span class="stat-label ml-4">{{ t('lost') }}:</span>
                                    <span class="lost">{{ (item as ShipGroupStatItem).losses }}</span>
                                </div>
                                <div class="mobile-stat-line">
                                    <span class="stat-label">{{ t('efficiency') }}:</span>
                                    <span class="efficiency"
                                        :class="getEfficiencyClass((item as ShipGroupStatItem).efficiency)">
                                        {{ (item as ShipGroupStatItem).efficiency }}%
                                    </span>
                                </div>
                            </div>
                        </div>
                    </template>
                </Table>
            </div>

            <!-- Column 3 -->
            <div class="ship-stats-column" v-if="shipGroups[2]?.length">
                <Table :columns="tableColumns" :items="shipGroups[2]" :density="'compact'" :striped="false"
                    :bordered="true" :special-header="true" background="transparent" header-class="topbox-header">
                    <template #cell-entity="{ item }">
                        <div class="ship-name-container">
                            {{ getLocalizedString((item as ShipGroupStatItem).groupName, locale) }}
                        </div>
                    </template>
                    <template #cell-stats="{ item }">
                        <div class="ship-stats-detailed">
                            <div class="stat-row">
                                <span class="killed">{{ (item as ShipGroupStatItem).kills }}</span>
                                <span class="separator">/</span>
                                <span class="lost">{{ (item as ShipGroupStatItem).losses }}</span>
                                <span class="efficiency"
                                    :class="getEfficiencyClass((item as ShipGroupStatItem).efficiency)">
                                    ({{ (item as ShipGroupStatItem).efficiency }}%)
                                </span>
                            </div>
                        </div>
                    </template>
                    <!-- Mobile view template -->
                    <template #mobile-content="{ item }">
                        <div class="mobile-content">
                            <div class="mobile-header">
                                <span class="mobile-title">{{ getLocalizedString((item as ShipGroupStatItem).groupName,
                                    locale) }}</span>
                            </div>
                            <div class="mobile-stats">
                                <div class="mobile-stat-line">
                                    <span class="stat-label">{{ t('killed') }}:</span>
                                    <span class="killed">{{ (item as ShipGroupStatItem).kills }}</span>
                                    <span class="stat-label ml-4">{{ t('lost') }}:</span>
                                    <span class="lost">{{ (item as ShipGroupStatItem).losses }}</span>
                                </div>
                                <div class="mobile-stat-line">
                                    <span class="stat-label">{{ t('efficiency') }}:</span>
                                    <span class="efficiency"
                                        :class="getEfficiencyClass((item as ShipGroupStatItem).efficiency)">
                                        {{ (item as ShipGroupStatItem).efficiency }}%
                                    </span>
                                </div>
                            </div>
                        </div>
                    </template>
                </Table>
            </div>
        </div>

        <div v-else class="empty-state">
            <div class="empty-content">
                <UIcon name="i-lucide-rocket" class="empty-icon" />
                <p class="empty-text">{{ t('character.noShipStats') }}</p>
            </div>
        </div>
    </Card>
</template>

<script setup lang="ts">
import { computed } from 'vue';

// Types
interface ShipGroupStatItem {
    ship_group_id: number;
    ship_group_name: string | Record<string, string>;
    killed: number;
    lost: number;
    efficiency: number;
    kills: number;
    losses: number;
    groupName: string | Record<string, string>;
}

interface ShipGroupStats {
    shipGroupStats: ShipGroupStatItem[];
}

// Props
const props = defineProps<{
    stats: ShipGroupStats;
    loading?: boolean;
}>();

// Composables
const { t } = useI18n();
const { locale } = useI18n();

// Computed
const sortedShipGroups = computed(() => {
    if (!props.stats.shipGroupStats) return [];

    return [...props.stats.shipGroupStats].map(item => ({
        ...item,
        kills: item.killed || item.kills || 0,
        losses: item.lost || item.losses || 0,
        groupName: item.ship_group_name || item.groupName
    })).sort((a, b) => {
        // Sort by total activity (kills + losses) descending
        const totalA = a.kills + a.losses;
        const totalB = b.kills + b.losses;
        return totalB - totalA;
    });
});

// Split ship groups into 3 columns
const shipGroups = computed(() => {
    const groups = sortedShipGroups.value;
    const totalGroups = groups.length;

    // Calculate the number of items per column, trying to keep them balanced
    let itemsPerColumn = Math.ceil(totalGroups / 3);

    // Create the column arrays
    const column1 = groups.slice(0, itemsPerColumn);
    const column2 = groups.slice(itemsPerColumn, itemsPerColumn * 2);
    const column3 = groups.slice(itemsPerColumn * 2);

    return [column1, column2, column3];
});

// Table column definitions
const tableColumns = [
    {
        id: "entity",
        header: t('ship'),
        width: "60%"
    },
    {
        id: "stats",
        header: t('killsLossesEfficiency'),
        width: "40%"
    }
];

// Helper functions
const getLocalizedString = (value: string | Record<string, string>, locale: string): string => {
    if (!value) return 'Unknown';
    if (typeof value === 'string') return value;

    return value[locale] || value.en || Object.values(value)[0] || 'Unknown';
};

const getEfficiencyClass = (efficiency: number): string => {
    if (efficiency >= 75) return 'high-efficiency';
    if (efficiency >= 50) return 'medium-efficiency';
    return 'low-efficiency';
};
</script>

<style scoped>
/* Card styling */
.ship-stats-card {
    overflow: hidden;
}

/* Header */
.ship-stats-header {
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
}

.stats-title {
    font-size: var(--text-lg);
    font-weight: var(--font-weight-semibold);
    color: var(--color-text-primary);
    margin: 0;
}

.stats-description {
    font-size: var(--text-sm);
    color: var(--color-text-tertiary);
    margin: 0;
}

/* Grid layout */
.ship-stats-grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: var(--space-4);
}

@media (min-width: 768px) {
    .ship-stats-grid {
        grid-template-columns: repeat(2, 1fr);
    }
}

@media (min-width: 1024px) {
    .ship-stats-grid {
        grid-template-columns: repeat(3, 1fr);
    }
}

/* Table header styling */
:deep(.topbox-header) {
    background-color: var(--color-surface-alpha);
    padding: var(--space-2) var(--space-4);
    border-bottom: none;
    font-weight: var(--font-weight-semibold);
    color: var(--color-text-secondary);
}

/* Ship name styling */
.ship-name-container {
    padding: var(--space-1) var(--space-2);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    font-size: var(--text-sm);
    color: var(--color-text-primary);
}

/* Detailed stats layout - kills/losses/efficiency */
.ship-stats-detailed {
    display: flex;
    justify-content: flex-end;
    padding: var(--space-1) var(--space-2);
    font-size: var(--text-sm);
}

.stat-row {
    display: flex;
    align-items: center;
    gap: var(--space-1);
}

.killed {
    color: var(--color-success-500);
    font-weight: var(--font-weight-medium);
}

.lost {
    color: var(--color-error-500);
    font-weight: var(--font-weight-medium);
}

.separator {
    color: var(--color-text-muted);
}

.efficiency {
    font-size: var(--text-xs);
    font-weight: var(--font-weight-semibold);
}

.high-efficiency {
    color: var(--color-success-500);
}

.medium-efficiency {
    color: var(--color-warning-500);
}

.low-efficiency {
    color: var(--color-error-500);
}

/* Row hover effect */
:deep(tbody tr:hover) {
    background: var(--color-surface-hover);
}

/* Border styles for table cells */
:deep(tbody tr) {
    border-color: var(--color-border-default) !important;
}

:deep(tbody tr + tr) {
    border-top: 1px solid var(--color-border-default) !important;
}

/* Empty state styling */
.empty-state {
    text-align: center;
    padding: var(--space-8) 0;
}

.empty-content {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--space-4);
}

.empty-icon {
    width: var(--space-12);
    height: var(--space-12);
    color: var(--color-text-muted);
}

.empty-text {
    color: var(--color-text-muted);
    margin: 0;
}

/* Mobile view styling */
.mobile-content {
    display: flex;
    flex-direction: column;
    width: 100%;
    padding: var(--space-2);
}

.mobile-header {
    margin-bottom: var(--space-2);
    padding-bottom: var(--space-2);
    border-bottom: 1px solid var(--color-border-default);
}

.mobile-title {
    font-weight: var(--font-weight-semibold);
    font-size: var(--text-base);
    color: var(--color-text-primary);
}

.mobile-stats {
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
}

.mobile-stat-line {
    display: flex;
    align-items: center;
    font-size: var(--text-sm);
    gap: var(--space-2);
}

.stat-label {
    color: var(--color-text-tertiary);
    font-size: var(--text-xs);
    text-transform: uppercase;
    letter-spacing: var(--letter-spacing-wide);
}

.ml-4 {
    margin-left: var(--space-4);
}

/* Loading state */
.loading-state {
    opacity: var(--opacity-disabled);
}

/* Make sure table column widths are maintained on mobile */
:deep(table) {
    table-layout: fixed;
    width: 100%;
}
</style>
