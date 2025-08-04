<template>
    <div class="ship-stats-container">
        <!-- Loading state with skeleton -->
        <ClientOnly>
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

            <template #fallback>
                <!-- Fallback skeleton with fixed widths to prevent hydration mismatch -->
                <div v-if="loading" class="ship-stats-grid">
                    <div class="ship-stats-column">
                        <div class="skeleton-table">
                            <div class="skeleton-header bg-gray-200 dark:bg-gray-700 animate-pulse h-10 rounded-t">
                            </div>
                            <div v-for="i in 8" :key="`fallback-skeleton-1-${i}`"
                                class="skeleton-row flex items-center p-2 border-b border-gray-200 dark:border-gray-600">
                                <div class="flex-1">
                                    <div class="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-3/4"></div>
                                </div>
                                <div class="w-12 text-right">
                                    <div class="h-4 w-8 bg-gray-200 dark:bg-gray-700 rounded animate-pulse ml-auto">
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="ship-stats-column">
                        <div class="skeleton-table">
                            <div class="skeleton-header bg-gray-200 dark:bg-gray-700 animate-pulse h-10 rounded-t">
                            </div>
                            <div v-for="i in 8" :key="`fallback-skeleton-2-${i}`"
                                class="skeleton-row flex items-center p-2 border-b border-gray-200 dark:border-gray-600">
                                <div class="flex-1">
                                    <div class="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-3/4"></div>
                                </div>
                                <div class="w-12 text-right">
                                    <div class="h-4 w-8 bg-gray-200 dark:bg-gray-700 rounded animate-pulse ml-auto">
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="ship-stats-column">
                        <div class="skeleton-table">
                            <div class="skeleton-header bg-gray-200 dark:bg-gray-700 animate-pulse h-10 rounded-t">
                            </div>
                            <div v-for="i in 8" :key="`fallback-skeleton-3-${i}`"
                                class="skeleton-row flex items-center p-2 border-b border-gray-200 dark:border-gray-600">
                                <div class="flex-1">
                                    <div class="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-3/4"></div>
                                </div>
                                <div class="w-12 text-right">
                                    <div class="h-4 w-8 bg-gray-200 dark:bg-gray-700 rounded animate-pulse ml-auto">
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </template>
        </ClientOnly>

        <!-- Actual data -->
        <div v-if="!loading && stats.shipGroupStats && stats.shipGroupStats.length > 0" class="ship-stats-grid">
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
        <div v-if="!loading && (!stats.shipGroupStats || stats.shipGroupStats.length === 0)" class="empty-state">
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

/* Common table styles */
:deep(.topbox-header) {
    background-color: var(--color-surface-alpha);
    padding: var(--space-2) var(--space-4);
    border-bottom: none;
}

/* Ship name styling */
.ship-name-container {
    padding: var(--space-1) var(--space-2);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    font-size: var(--text-sm);
}

/* Simplified stats layout - just kills */
.ship-stats-simple {
    display: flex;
    justify-content: flex-end;
    padding: var(--space-1) var(--space-2);
    font-size: var(--text-sm);
}

/* Right align all numeric values */
.text-right {
    text-align: right !important;
}

.killed {
    color: var(--color-success);
    font-weight: var(--font-medium);
}

/* Row hover effect */
:deep(tbody tr:hover) {
    background: var(--color-surface-alpha);
}

/* Border styles for table cells */
:deep(tbody tr) {
    border-color: var(--color-border-dark) !important;
}

:deep(tbody tr + tr) {
    border-top: 1px solid var(--color-border-dark) !important;
}

/* Empty state styling */
.empty-state {
    text-align: center;
    color: var(--color-text-tertiary);
    padding: var(--space-4) 0;
}

/* Mobile view styling */
.mobile-content {
    display: flex;
    flex-direction: column;
    width: 100%;
}

.mobile-header {
    margin-bottom: var(--space-2);
}

.mobile-title {
    font-weight: var(--font-semibold);
    font-size: var(--text-sm);
}

.mobile-stats {
    display: flex;
    justify-content: flex-start;
}

.mobile-stat {
    display: flex;
    align-items: center;
    font-size: var(--text-sm);
}

.stat-label {
    color: var(--color-text-tertiary);
    margin-right: var(--space-2);
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
    border: 1px solid var(--color-border-dark);
    border-radius: var(--radius-lg);
    overflow: hidden;
    background: transparent;
}

.skeleton-header {
    border-bottom: 1px solid var(--color-border-dark);
}

.skeleton-row:last-child {
    border-bottom: none;
}

/* Use global pulse animation from globals.css */
.animate-pulse {
    animation: pulse var(--duration-1500) ease-in-out infinite;
}
</style>
