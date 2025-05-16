<template>
    <div class="mt-4 grid grid-cols-1 gap-4" :class="gridColumnsClass">
        <!-- Dynamic Team Alliances -->
        <div v-for="sideId in sideIds" :key="sideId" class="team-column">
            <div class="mb-2 text-lg font-bold text-black dark:text-white">
                {{ getSideName(sideId) }} Alliances
            </div>

            <Table :columns="allianceColumns" :items="teamAlliances[sideId] || []" :bordered="true" :striped="false"
                :hover="true" density="normal" background="transparent" table-class="alliance-table">
                <template #cell-name="{ item, column, index }: { item: BattleAlliance, column: any, index: number }">
                    <div class="flex items-center">
                        <Image :type="'alliance'" :id="item.id" :size="32" class="mr-2 square-img" />
                        <span class="text-black dark:text-white">{{ item.name }}</span>
                    </div>
                </template>
                <template #cell-losses="{ item }: { item: BattleAlliance }">
                    {{ item.losses }}
                </template>
                <template #cell-valueInflicted="{ item }: { item: BattleAlliance }">
                    {{ formatIsk(item.valueInflicted) }}
                </template>
                <template #cell-valueSuffered="{ item }: { item: BattleAlliance }">
                    {{ formatIsk(item.valueSuffered) }}
                </template>
            </Table>
        </div>
    </div>
</template>

<script setup lang="ts">
interface BattleAlliance {
    id: number;
    name: string;
    kills: number;
    losses: number;
    valueInflicted: number;
    valueSuffered: number;
}

const props = defineProps<{
    teamAlliances: Record<string, BattleAlliance[]>;
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

// Format ISK values
function formatIsk(isk: number): string {
    if (!isk) return "0 ISK";
    if (isk >= 1000000000000) {
        return `${(isk / 1000000000000).toFixed(2)}T ISK`;
    } else if (isk >= 1000000000) {
        return `${(isk / 1000000000).toFixed(2)}B ISK`;
    } else if (isk >= 1000000) {
        return `${(isk / 1000000).toFixed(2)}M ISK`;
    } else if (isk >= 1000) {
        return `${(isk / 1000).toFixed(2)}K ISK`;
    }
    return `${isk.toFixed(2)} ISK`;
}

const allianceColumns = [
    { id: 'name', header: 'Alliance', width: '40%' },
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

/* Alliance Table Styling */
.alliance-table :deep(.table-header) {
    background-color: rgba(26, 26, 26, 0.5);
    color: #9ca3af;
    text-transform: uppercase;
    font-size: 0.75rem;
    padding: 0.5rem;
}

.alliance-table :deep(.header-cell) {
    padding: 0 0.5rem;
}

.alliance-table :deep(.table-row) {
    border-bottom: 1px solid #282828;
    transition: background-color 0.3s ease;
}

.alliance-table :deep(.body-cell) {
    padding: 0.5rem;
}

.alliance-table :deep(tbody tr):hover {
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
