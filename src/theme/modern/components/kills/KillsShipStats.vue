<template>
    <div class="ship-stats-container">
        <!-- Loading state with skeleton -->
        <div v-if="loading" class="ship-stats-grid">
            <!-- Column 1 skeleton -->
            <div class="ship-stats-column">
                <div class="skeleton-table">
                    <div class="skeleton-header bg-gray-200 dark:bg-gray-700 animate-pulse h-10 rounded-t"></div>
                    <div v-for="i in 8" :key="`skeleton-1-${i}`"
                        class="skeleton-row flex items-center p-2 border-b border-gray-200 dark:border-gray-600">
                        <div class="flex-1">
                            <div class="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"
                                :style="`width: ${60 + Math.random() * 30}%`"></div>
                        </div>
                        <div class="w-12 text-right">
                            <div class="h-4 w-8 bg-gray-200 dark:bg-gray-700 rounded animate-pulse ml-auto"></div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Column 2 skeleton -->
            <div class="ship-stats-column">
                <div class="skeleton-table">
                    <div class="skeleton-header bg-gray-200 dark:bg-gray-700 animate-pulse h-10 rounded-t"></div>
                    <div v-for="i in 8" :key="`skeleton-2-${i}`"
                        class="skeleton-row flex items-center p-2 border-b border-gray-200 dark:border-gray-600">
                        <div class="flex-1">
                            <div class="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"
                                :style="`width: ${60 + Math.random() * 30}%`"></div>
                        </div>
                        <div class="w-12 text-right">
                            <div class="h-4 w-8 bg-gray-200 dark:bg-gray-700 rounded animate-pulse ml-auto"></div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Column 3 skeleton -->
            <div class="ship-stats-column">
                <div class="skeleton-table">
                    <div class="skeleton-header bg-gray-200 dark:bg-gray-700 animate-pulse h-10 rounded-t"></div>
                    <div v-for="i in 8" :key="`skeleton-3-${i}`"
                        class="skeleton-row flex items-center p-2 border-b border-gray-200 dark:border-gray-600">
                        <div class="flex-1">
                            <div class="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"
                                :style="`width: ${60 + Math.random() * 30}%`"></div>
                        </div>
                        <div class="w-12 text-right">
                            <div class="h-4 w-8 bg-gray-200 dark:bg-gray-700 rounded animate-pulse ml-auto"></div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Actual data -->
        <div v-else-if="stats.shipGroupStats && stats.shipGroupStats.length > 0" class="ship-stats-grid">
            <!-- Column 1 -->
            <div class="ship-stats-column">
                <Table :columns="tableColumns" :items="shipGroups[0]" :density="'compact'" :striped="false"
                    :bordered="true" :special-header="true" background="transparent" header-class="topbox-header">
                    <template #cell-entity="{ item }">
                        <div class="ship-name-container">
                            {{ getLocalizedString(item.ship_group_name, locale) }}
                        </div>
                    </template>
                    <template #cell-stats="{ item }">
                        <div class="ship-stats-simple">
                            <div class="killed text-right">{{ item.killed }}</div>
                        </div>
                    </template>
                    <!-- Mobile view template -->
                    <template #mobile-content="{ item }">
                        <div class="mobile-content">
                            <div class="mobile-header">
                                <span class="mobile-title">{{ getLocalizedString(item.ship_group_name, locale) }}</span>
                            </div>
                            <div class="mobile-stats">
                                <div class="mobile-stat">
                                    <span class="stat-label">{{ t('killed') }}:</span>
                                    <span class="killed">{{ item.killed }}</span>
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
                            {{ getLocalizedString(item.ship_group_name, locale) }}
                        </div>
                    </template>
                    <template #cell-stats="{ item }">
                        <div class="ship-stats-simple">
                            <div class="killed text-right">{{ item.killed }}</div>
                        </div>
                    </template>
                    <!-- Mobile view template -->
                    <template #mobile-content="{ item }">
                        <div class="mobile-content">
                            <div class="mobile-header">
                                <span class="mobile-title">{{ getLocalizedString(item.ship_group_name, locale) }}</span>
                            </div>
                            <div class="mobile-stats">
                                <div class="mobile-stat">
                                    <span class="stat-label">{{ t('killed') }}:</span>
                                    <span class="killed">{{ item.killed }}</span>
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
                            {{ getLocalizedString(item.ship_group_name, locale) }}
                        </div>
                    </template>
                    <template #cell-stats="{ item }">
                        <div class="ship-stats-simple">
                            <div class="killed text-right">{{ item.killed }}</div>
                        </div>
                    </template>
                    <!-- Mobile view template -->
                    <template #mobile-content="{ item }">
                        <div class="mobile-content">
                            <div class="mobile-header">
                                <span class="mobile-title">{{ getLocalizedString(item.ship_group_name, locale) }}</span>
                            </div>
                            <div class="mobile-stats">
                                <div class="mobile-stat">
                                    <span class="stat-label">{{ t('killed') }}:</span>
                                    <span class="killed">{{ item.killed }}</span>
                                </div>
                            </div>
                        </div>
                    </template>
                </Table>
            </div>
        </div>

        <!-- Empty state -->
        <div v-else-if="!loading" class="empty-state">
            {{ t('advancedview.no_ship_stats') }}
        </div>
    </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

// Props - simplified interface for kills page
interface KillsViewStats {
    shipGroupStats: Array<{
        ship_group_id: number;
        ship_group_name: string | Record<string, string>;
        killed: number;
    }>;
}

const props = defineProps<{
    stats: KillsViewStats;
    loading?: boolean;
}>();

// Composables
const { t } = useI18n();
const { locale } = useI18n();

// Computed
const sortedShipGroups = computed(() => {
    if (!props.stats?.shipGroupStats || props.loading) return [];

    return [...props.stats.shipGroupStats].sort((a, b) => {
        // Sort by kills (descending)
        return b.killed - a.killed;
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
        header: "",
        width: "70%"
    },
    {
        id: "stats",
        header: "",
        width: "30%"
    }
];

// Helpers
const getLocalizedString = (value: string | Record<string, string>, locale: string): string => {
    if (!value) return 'Unknown';
    if (typeof value === 'string') return value;

    return (value as any)[locale] || (value as any).en || Object.values(value)[0] || 'Unknown';
};
</script>

<style scoped>
.ship-stats-container {
    display: block;
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

/* Common table styles */
:deep(.topbox-header) {
    background-color: light-dark(rgba(245, 245, 245, 0.05), rgba(26, 26, 26, 0.5));
    padding: 0.5rem 1rem;
    border-bottom: none;
}

/* Ship name styling */
.ship-name-container {
    padding: 0.25rem 0.5rem;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    font-size: 0.9rem;
}

/* Simplified stats layout - just kills */
.ship-stats-simple {
    display: flex;
    justify-content: flex-end;
    padding: 0.25rem 0.5rem;
    font-size: 0.85rem;
}

/* Right align all numeric values */
.text-right {
    text-align: right !important;
}

.killed {
    color: #10b981;
    /* green */
    font-weight: 500;
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
    padding: 1rem 0;
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
    justify-content: flex-start;
}

.mobile-stat {
    display: flex;
    align-items: center;
    font-size: 0.85rem;
}

.stat-label {
    color: #9ca3af;
    margin-right: 0.5rem;
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

/* Skeleton styles */
.skeleton-table {
    border: 1px solid rgb(40, 40, 40);
    border-radius: 0.5rem;
    overflow: hidden;
    background: transparent;
}

.skeleton-header {
    border-bottom: 1px solid rgb(40, 40, 40);
}

.skeleton-row:last-child {
    border-bottom: none;
}

/* Consistent animation timing for all skeleton elements */
@keyframes pulse {

    0%,
    100% {
        opacity: 1;
    }

    50% {
        opacity: 0.5;
    }
}

.animate-pulse {
    animation: pulse 1.5s ease-in-out infinite;
}
</style>
