<template>
    <div class="ship-stats-container">
        <div v-if="stats.shipGroupStats && stats.shipGroupStats.length > 0" class="ship-stats-grid">
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
                        <div class="ship-stats-grid-inner">
                            <div class="killed text-right">{{ item.killed }}</div>
                            <div class="lost text-right">{{ item.lost }}</div>
                            <div class="total text-right">{{ item.killed + item.lost }}</div>
                            <div class="efficiency text-right" :style="{ color: getEfficiencyColor(item) }">
                                {{ Math.round(calculateEfficiencyPercentage(item)) }}%
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
                        <div class="ship-stats-grid-inner">
                            <div class="killed text-right">{{ item.killed }}</div>
                            <div class="lost text-right">{{ item.lost }}</div>
                            <div class="total text-right">{{ item.killed + item.lost }}</div>
                            <div class="efficiency text-right" :style="{ color: getEfficiencyColor(item) }">
                                {{ Math.round(calculateEfficiencyPercentage(item)) }}%
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
                        <div class="ship-stats-grid-inner">
                            <div class="killed text-right">{{ item.killed }}</div>
                            <div class="lost text-right">{{ item.lost }}</div>
                            <div class="total text-right">{{ item.killed + item.lost }}</div>
                            <div class="efficiency text-right" :style="{ color: getEfficiencyColor(item) }">
                                {{ Math.round(calculateEfficiencyPercentage(item)) }}%
                            </div>
                        </div>
                    </template>
                </Table>
            </div>
        </div>

        <div v-else class="empty-state">
            {{ t('campaign.no_ship_stats') }}
        </div>
    </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { type ICampaignOutput } from '~/server/interfaces/ICampaignOutput';
import { type ITranslation } from '~/server/interfaces/ITranslation';

// Props
const props = defineProps<{
    stats: ICampaignOutput;
}>();

// Composables
const { t } = useI18n();
const { locale } = useI18n();

// Computed
const sortedShipGroups = computed(() => {
    if (!props.stats.shipGroupStats) return [];

    return [...props.stats.shipGroupStats].sort((a, b) => {
        // First sort by total ships involved (killed + lost)
        const aTotalShips = a.killed + a.lost;
        const bTotalShips = b.killed + b.lost;

        if (bTotalShips !== aTotalShips) {
            return bTotalShips - aTotalShips;
        }

        // Then by efficiency
        const aEfficiency = calculateEfficiency(a);
        const bEfficiency = calculateEfficiency(b);

        return bEfficiency - aEfficiency;
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
        width: "55%"
    },
    {
        id: "stats",
        header: "",
        width: "45%"
    }
];

// Helpers
const getLocalizedString = (value: string | ITranslation, locale: string): string => {
    if (!value) return 'Unknown';
    if (typeof value === 'string') return value;

    return value[locale] || value.en || Object.values(value)[0] || 'Unknown';
};

const calculateEfficiency = (shipGroup: { killed: number, lost: number }): number => {
    if (shipGroup.killed === 0 && shipGroup.lost === 0) return 0;
    return shipGroup.killed / (shipGroup.killed + shipGroup.lost);
};

const calculateEfficiencyPercentage = (shipGroup: { killed: number, lost: number }): number => {
    return calculateEfficiency(shipGroup) * 100;
};

const getEfficiencyColor = (shipGroup: { killed: number, lost: number }): string => {
    const efficiency = calculateEfficiency(shipGroup);

    if (efficiency >= 0.75) return '#10b981'; // green-500
    if (efficiency >= 0.5) return '#f59e0b'; // yellow-500
    return '#ef4444'; // red-500
};
</script>

<style scoped>
.ship-stats-container {
    background-color: var(--background-800);
    box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
}

.ship-stats-title {
    font-size: 1.125rem;
    font-weight: 700;
    margin-bottom: 1rem;
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

/* Style for header title in each table */
.title-text {
    width: 100%;
    text-align: center;
    font-size: 0.75rem;
    font-weight: 600;
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

/* Stats grid layout */
.ship-stats-grid-inner {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 0.25rem;
    padding: 0.25rem 0.5rem;
    text-align: center;
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

.lost {
    color: #ef4444;
    /* red */
}

.total,
.efficiency {
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

/* Fix caption styling if needed */
:deep(caption) {
    display: none;
}

/* Add header for stats section */
:deep(thead tr) {
    color: light-dark(#111827, white);
    font-weight: 600;
}

/* Ship column subtitle headers */
.ship-column-header {
    font-size: 0.75rem;
    font-weight: 600;
    background-color: var(--background-700);
    padding: 0.25rem 0;
    text-align: center;
}
</style>
