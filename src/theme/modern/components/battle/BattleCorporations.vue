<template>
    <div class="mt-4 grid grid-cols-1 gap-4" :class="gridColumnsClass">
        <!-- Dynamic Team Corporations -->
        <div v-for="sideId in sideIds" :key="sideId" class="team-column">
            <div class="mb-2 text-lg font-bold text-black dark:text-white">
                {{ getSideName(sideId) }} {{ t('corporations') }}
            </div>

            <Table :columns="corporationColumns" :items="teamCorporations[sideId] || []" :bordered="true"
                :striped="false" :hover="true" density="normal" background="transparent"
                table-class="corporation-table">
                <template #cell-name="{ item, column, index }: { item: BattleCorporation, column: any, index: number }">
                    <div class="flex items-center">
                        <Image :type="'corporation'" :id="item.id" :size="32" class="mr-2 square-img" />
                        <span class="text-black dark:text-white">{{ item.name }}</span>
                    </div>
                </template>
                <template #cell-losses="{ item }: { item: BattleCorporation }">
                    {{ item.losses }}
                </template>
                <template #cell-valueInflicted="{ item }: { item: BattleCorporation }">
                    {{ formatBillions(item.valueInflicted) }}
                </template>
                <template #cell-valueSuffered="{ item }: { item: BattleCorporation }">
                    {{ formatBillions(item.valueSuffered) }}
                </template>
            </Table>
        </div>
    </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';

const { t } = useI18n();

interface BattleCorporation {
    id: number;
    name: string;
    kills: number;
    losses: number;
    valueInflicted: number;
    valueSuffered: number;
    alliance_id?: number;
    alliance_name?: string;
}

const props = defineProps<{
    teamCorporations: Record<string, BattleCorporation[]>;
    sideIds: string[];
}>();

// Determine grid columns based on number of sides
const gridColumnsClass = computed(() => {
    const count = props.sideIds.length;
    if (count === 0) return '';
    if (count === 1) return 'md:grid-cols-1';
    if (count === 2) return 'md:grid-cols-2';
    if (count === 3) return 'lg:grid-cols-3';
    return 'xl:grid-cols-4'; // For 4 teams
});

// Get team/side name
const getSideName = (sideId: string): string => {
    const names: Record<string, string> = {
        'blue': 'Team A',
        'red': 'Team B',
        'green': 'Team C',
        'yellow': 'Team D'
    };
    return names[sideId] || sideId;
};

function formatBillions(n: number) {
    if (typeof n !== 'number') return '0';
    if (n >= 1e9) return (n / 1e9).toLocaleString(undefined, { maximumFractionDigits: 2 }) + 'B ISK';
    if (n >= 1e6) return (n / 1e6).toLocaleString(undefined, { maximumFractionDigits: 2 }) + 'M ISK';
    if (n >= 1e3) return (n / 1e3).toLocaleString(undefined, { maximumFractionDigits: 2 }) + 'K ISK';
    // Keep lower values as full numbers for clarity
    return n.toLocaleString(undefined, { maximumFractionDigits: 0 }) + ' ISK';
}

const corporationColumns = [
    { id: 'name', header: t('corporation'), width: '40%' },
    { id: 'kills', header: t('kills'), width: '15%' },
    { id: 'losses', header: t('losses'), width: '15%' },
    { id: 'valueInflicted', header: t('valueInflicted'), width: '15%' },
    { id: 'valueSuffered', header: t('valueSuffered'), width: '15%' },
];
</script>

<style scoped>
/* Team column sizing */
.team-column {
    min-width: 0;
    /* Allow columns to shrink */
}

/* Corporation Table Styling */
.corporation-table :deep(.table-header) {
    background-color: rgba(26, 26, 26, 0.5);
    color: #9ca3af;
    text-transform: uppercase;
    font-size: 0.75rem;
    padding: 0.5rem;
}

.corporation-table :deep(.header-cell) {
    padding: 0 0.5rem;
}

.corporation-table :deep(.table-row) {
    border-bottom: 1px solid #282828;
    transition: background-color 0.3s ease;
}

.corporation-table :deep(.body-cell) {
    padding: 0.5rem;
}

.corporation-table :deep(tbody tr):hover {
    background: light-dark(rgba(229, 231, 235, 0.15), rgba(35, 35, 35, 0.5));
}

.square-img {
    border-radius: 0.375rem;
    width: 32px;
    height: 32px;
    object-fit: cover;
    background: #18181b;
    border: 1px solid #282828;
}

/* Responsive adjustments for team columns */
@media (max-width: 1200px) {
    .xl\:grid-cols-4 {
        grid-template-columns: repeat(2, minmax(0, 1fr));
    }
}

@media (max-width: 992px) {
    .lg\:grid-cols-3 {
        grid-template-columns: repeat(2, minmax(0, 1fr));
    }
}

@media (max-width: 768px) {

    .md\:grid-cols-2,
    .lg\:grid-cols-3,
    .xl\:grid-cols-4 {
        grid-template-columns: minmax(0, 1fr);
    }
}
</style>
