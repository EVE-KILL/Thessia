<template>
    <div class="ship-stats-container">
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
                            {{ getLocalizedString(item.groupName, locale) }}
                        </div>
                    </template>
                    <template #cell-stats="{ item }">
                        <div class="ship-stats-detailed">
                            <div class="stat-row">
                                <span class="killed">{{ item.kills }}</span>
                                <span class="separator">/</span>
                                <span class="lost">{{ item.losses }}</span>
                                <span class="efficiency" :class="getEfficiencyClass(item.efficiency)">
                                    ({{ item.efficiency }}%)
                                </span>
                            </div>
                        </div>
                    </template>
                    <!-- Mobile view template -->
                    <template #mobile-content="{ item }">
                        <div class="mobile-content">
                            <div class="mobile-header">
                                <span class="mobile-title">{{ getLocalizedString(item.groupName, locale) }}</span>
                            </div>
                            <div class="mobile-stats">
                                <div class="mobile-stat-line">
                                    <span class="stat-label">{{ t('killed') }}:</span>
                                    <span class="killed">{{ item.kills }}</span>
                                    <span class="stat-label ml-4">{{ t('lost') }}:</span>
                                    <span class="lost">{{ item.losses }}</span>
                                </div>
                                <div class="mobile-stat-line">
                                    <span class="stat-label">{{ t('efficiency') }}:</span>
                                    <span class="efficiency" :class="getEfficiencyClass(item.efficiency)">
                                        {{ item.efficiency }}%
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
                            {{ getLocalizedString(item.groupName, locale) }}
                        </div>
                    </template>
                    <template #cell-stats="{ item }">
                        <div class="ship-stats-detailed">
                            <div class="stat-row">
                                <span class="killed">{{ item.kills }}</span>
                                <span class="separator">/</span>
                                <span class="lost">{{ item.losses }}</span>
                                <span class="efficiency" :class="getEfficiencyClass(item.efficiency)">
                                    ({{ item.efficiency }}%)
                                </span>
                            </div>
                        </div>
                    </template>
                    <!-- Mobile view template -->
                    <template #mobile-content="{ item }">
                        <div class="mobile-content">
                            <div class="mobile-header">
                                <span class="mobile-title">{{ getLocalizedString(item.groupName, locale) }}</span>
                            </div>
                            <div class="mobile-stats">
                                <div class="mobile-stat-line">
                                    <span class="stat-label">{{ t('killed') }}:</span>
                                    <span class="killed">{{ item.kills }}</span>
                                    <span class="stat-label ml-4">{{ t('lost') }}:</span>
                                    <span class="lost">{{ item.losses }}</span>
                                </div>
                                <div class="mobile-stat-line">
                                    <span class="stat-label">{{ t('efficiency') }}:</span>
                                    <span class="efficiency" :class="getEfficiencyClass(item.efficiency)">
                                        {{ item.efficiency }}%
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
                            {{ getLocalizedString(item.groupName, locale) }}
                        </div>
                    </template>
                    <template #cell-stats="{ item }">
                        <div class="ship-stats-detailed">
                            <div class="stat-row">
                                <span class="killed">{{ item.kills }}</span>
                                <span class="separator">/</span>
                                <span class="lost">{{ item.losses }}</span>
                                <span class="efficiency" :class="getEfficiencyClass(item.efficiency)">
                                    ({{ item.efficiency }}%)
                                </span>
                            </div>
                        </div>
                    </template>
                    <!-- Mobile view template -->
                    <template #mobile-content="{ item }">
                        <div class="mobile-content">
                            <div class="mobile-header">
                                <span class="mobile-title">{{ getLocalizedString(item.groupName, locale) }}</span>
                            </div>
                            <div class="mobile-stats">
                                <div class="mobile-stat-line">
                                    <span class="stat-label">{{ t('killed') }}:</span>
                                    <span class="killed">{{ item.kills }}</span>
                                    <span class="stat-label ml-4">{{ t('lost') }}:</span>
                                    <span class="lost">{{ item.losses }}</span>
                                </div>
                                <div class="mobile-stat-line">
                                    <span class="stat-label">{{ t('efficiency') }}:</span>
                                    <span class="efficiency" :class="getEfficiencyClass(item.efficiency)">
                                        {{ item.efficiency }}%
                                    </span>
                                </div>
                            </div>
                        </div>
                    </template>
                </Table>
            </div>
        </div>

        <div v-else class="empty-state">
            <div class="text-center py-8">
                <UIcon name="i-lucide-rocket" class="h-12 w-12 mx-auto mb-4 text-gray-400" />
                <p class="text-gray-500">{{ t('alliance.noShipStats') }}</p>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

// Props
interface ShipGroupStats {
    shipGroupStats: Array<{
        ship_group_id: number;
        groupName: string | Record<string, string>;
        kills: number;
        losses: number;
        efficiency: number;
    }>;
}

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

    return [...props.stats.shipGroupStats].sort((a, b) => {
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

// Helpers
const getLocalizedString = (value: string | ITranslation, locale: string): string => {
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
.ship-stats-container {
    /* Clean container styling */
}

.ship-stats-grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: 1rem;
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
    background-color: light-dark(rgba(245, 245, 245, 0.05), rgba(26, 26, 26, 0.5));
    padding: 0.5rem 1rem;
    border-bottom: none;
    font-weight: 600;
}

/* Ship name styling */
.ship-name-container {
    padding: 0.25rem 0.5rem;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    font-size: 0.9rem;
}

/* Detailed stats layout - kills/losses/efficiency */
.ship-stats-detailed {
    display: flex;
    justify-content: flex-end;
    padding: 0.25rem 0.5rem;
    font-size: 0.85rem;
}

.stat-row {
    display: flex;
    align-items: center;
    gap: 0.25rem;
}

.killed {
    color: #10b981;
    /* green */
    font-weight: 500;
}

.lost {
    color: #ef4444;
    /* red */
    font-weight: 500;
}

.separator {
    color: #6b7280;
    /* gray */
}

.efficiency {
    font-size: 0.75rem;
    font-weight: 600;
}

.high-efficiency {
    color: #10b981;
    /* green - 75%+ */
}

.medium-efficiency {
    color: #f59e0b;
    /* yellow - 50-74% */
}

.low-efficiency {
    color: #ef4444;
    /* red - <50% */
}

/* Row hover effect */
:deep(tbody tr:hover) {
    background: light-dark(#e5e7eb, #1a1a1a);
}

/* Border styles for table cells */
:deep(tbody tr) {
    border-color: rgb(40, 40, 40) !important;
}

:deep(tbody tr + tr) {
    border-top: 1px solid rgb(40, 40, 40) !important;
}

/* Empty state styling */
.empty-state {
    text-align: center;
    color: #9ca3af;
    padding: 2rem 0;
}

/* Mobile view styling */
.mobile-content {
    display: flex;
    flex-direction: column;
    width: 100%;
}

.mobile-header {
    margin-bottom: 0.5rem;
}

.mobile-title {
    font-weight: 600;
    font-size: 0.95rem;
}

.mobile-stats {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
}

.mobile-stat-line {
    display: flex;
    align-items: center;
    font-size: 0.85rem;
}

.stat-label {
    color: #9ca3af;
    margin-right: 0.5rem;
}

.ml-4 {
    margin-left: 1rem;
}

/* Loading state */
.loading-state {
    opacity: 0.7;
}

/* Fix caption styling if needed */
:deep(caption) {
    display: none;
}

/* Make sure table column widths are maintained on mobile */
:deep(table) {
    table-layout: fixed;
    width: 100%;
}
</style>
