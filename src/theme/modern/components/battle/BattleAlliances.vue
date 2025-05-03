<template>
    <div class="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
        <!-- Blue Team Alliances -->
        <div>
            <div class="mb-2 text-lg font-bold text-black dark:text-white">Blue Team Alliances</div>
            <Table :columns="allianceColumns" :items="blueTeamAlliances" :bordered="true" :striped="false" :hover="true"
                density="normal" background="transparent" table-class="alliance-table">
                <template #cell-name="{ item, column, index }: { item: BattleAlliance, column: any, index: number }">
                    <div class="flex items-center">
                        <Image :type="'alliance'" :id="item.id" :size="24" class="mr-2 rounded-full" />
                        <span class="text-black dark:text-white">{{ item.name }}</span>
                    </div>
                </template>
                <template
                    #cell-totalValue="{ item, column, index }: { item: BattleAlliance, column: any, index: number }">
                    {{ formatBillions(item.totalValue) }} ISK
                </template>
            </Table>
        </div>
        <!-- Red Team Alliances -->
        <div>
            <div class="mb-2 text-lg font-bold text-black dark:text-white">Red Team Alliances</div>
            <Table :columns="allianceColumns" :items="redTeamAlliances" :bordered="true" :striped="false" :hover="true"
                density="normal" background="transparent" table-class="alliance-table">
                <template #cell-name="{ item, column, index }: { item: BattleAlliance, column: any, index: number }">
                    <div class="flex items-center">
                        <Image :type="'alliance'" :id="item.id" :size="24" class="mr-2 rounded-full" />
                        <span class="text-black dark:text-white">{{ item.name }}</span>
                    </div>
                </template>
                <template
                    #cell-totalValue="{ item, column, index }: { item: BattleAlliance, column: any, index: number }">
                    {{ formatBillions(item.totalValue) }} ISK
                </template>
            </Table>
        </div>
    </div>
</template>
<script setup lang="ts">
import Image from '../common/Image.vue'; // Import the Image component
import Table from '../common/Table.vue'; // Import the Table component

interface BattleAlliance {
    id: number;
    name: string;
    kills: number;
    totalValue: number;
}

defineProps<{
    blueTeamAlliances: BattleAlliance[],
    redTeamAlliances: BattleAlliance[]
}>();

function formatBillions(n: number) {
    if (typeof n !== 'number') return '0';
    if (n >= 1e9) return (n / 1e9).toLocaleString(undefined, { maximumFractionDigits: 2 }) + 'B';
    if (n >= 1e6) return (n / 1e6).toLocaleString(undefined, { maximumFractionDigits: 2 }) + 'M';
    return n.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

const allianceColumns = [
    { id: 'name', header: 'Alliance', width: '50%' },
    { id: 'kills', header: 'Kills', width: '25%' },
    { id: 'totalValue', header: 'Total Value', width: '25%' },
];
</script>

<style scoped>
/* Add any necessary scoped styles here to match the original table appearance */
.alliance-table :deep(.table-header) {
    background-color: rgba(26, 26, 26, 0.5);
    /* Example from TopBox */
    color: #9ca3af;
    /* Example from TopBox */
    text-transform: uppercase;
    font-size: 0.75rem;
    padding: 0.5rem;
    /* Adjust padding */
}

.alliance-table :deep(.header-cell) {
    padding: 0 0.5rem;
    /* Adjust padding */
}

.alliance-table :deep(.table-row) {
    border-bottom: 1px solid #282828;
    /* Example from original table */
    transition: background-color 0.3s ease;
}


.alliance-table :deep(.body-cell) {
    padding: 0.5rem;
    /* Adjust padding */
}

.alliance-table :deep(tbody tr):hover {
    background: light-dark(rgba(229, 231, 235, 0.15), rgba(35, 35, 35, 0.5));
}
</style>
