<template>
    <div class="mt-4 grid grid-cols-1 gap-4" :class="gridColumnsClass">
        <!-- Dynamic Team Characters -->
        <div v-for="sideId in sideIds" :key="sideId" class="team-column">
            <div class="mb-2 text-lg font-bold text-black dark:text-white">
                {{ getSideName(sideId) }} Characters
            </div>

            <Table :columns="characterColumns" :items="teamCharacters[sideId] || []" :bordered="true" :striped="false"
                :hover="true" density="normal" background="transparent" table-class="character-table">
                <template #cell-portrait="{ item }: { item: BattleCharacter }">
                    <Image :type="'character'" :id="item.id" :alt="`Character: ${item.name}`" :size="64"
                        class="w-12 h-12" />
                </template>
                <template #cell-losses="{ item }: { item: BattleCharacter }">
                    {{ item.losses }}
                </template>
                <template #cell-valueInflicted="{ item }: { item: BattleCharacter }">
                    {{ formatBillions(item.valueInflicted) }}
                </template>
                <template #cell-valueSuffered="{ item }: { item: BattleCharacter }">
                    {{ formatBillions(item.valueSuffered) }}
                </template>
            </Table>
        </div>
    </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

interface BattleCharacter {
    id: number;
    name: string;
    kills: number;
    losses: number;
    valueInflicted: number;
    valueSuffered: number;
    corporation_id?: number;
    corporation_name?: string;
    alliance_id?: number;
    alliance_name?: string;
}

const props = defineProps<{
    teamCharacters: Record<string, BattleCharacter[]>;
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

const characterColumns = [
    { id: 'portrait', header: '', width: '15%' },
    { id: 'name', header: 'Name', width: '25%' },
    { id: 'kills', header: 'Kills', width: '15%' },
    { id: 'losses', header: 'Losses', width: '15%' },
    { id: 'valueInflicted', header: 'Value Inflicted', width: '15%' },
    { id: 'valueSuffered', header: 'Value Suffered', width: '15%' },
];
</script>

<style scoped>
/* Team column sizing */
.team-column {
    min-width: 0;
    /* Allow columns to shrink */
}

/* Character Table Styling */
.character-table :deep(.table-header) {
    background-color: rgba(26, 26, 26, 0.5);
    color: #9ca3af;
    text-transform: uppercase;
    font-size: 0.75rem;
    padding: 0.5rem;
}

.character-table :deep(.header-cell) {
    padding: 0 0.5rem;
}

.character-table :deep(.table-row) {
    border-bottom: 1px solid #282828;
    transition: background-color 0.3s ease;
}

.character-table :deep(.table-row:hover) {
    background: light-dark(rgba(229, 231, 235, 0.15), rgba(35, 35, 35, 0.5));
}

.character-table :deep(.body-cell) {
    padding: 0.5rem;
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
