<template>
    <div class="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
        <!-- Blue Team Corporations -->
        <div>
            <div class="mb-2 text-lg font-bold text-black dark:text-white">Blue Team Corporations</div>
            <Table :columns="corporationColumns" :items="blueTeamCorporations" :bordered="true" :striped="false"
                :hover="true" density="normal" background="transparent" table-class="corporation-table">
                <template #cell-name="{ item, column, index }: { item: BattleCorporation, column: any, index: number }">
                    <div class="flex items-center">
                        <Image :type="'corporation'" :id="item.id" :size="24" class="mr-2 rounded-full" />
                        <span class="text-black dark:text-white">{{ item.name }}</span>
                    </div>
                </template>
                <template
                    #cell-totalValue="{ item, column, index }: { item: BattleCorporation, column: any, index: number }">
                    {{ formatBillions(item.totalValue) }} ISK
                </template>
            </Table>
        </div>
        <!-- Red Team Corporations -->
        <div>
            <div class="mb-2 text-lg font-bold text-black dark:text-white">Red Team Corporations</div>
            <Table :columns="corporationColumns" :items="redTeamCorporations" :bordered="true" :striped="false"
                :hover="true" density="normal" background="transparent" table-class="corporation-table">
                <template #cell-name="{ item, column, index }: { item: BattleCorporation, column: any, index: number }">
                    <div class="flex items-center">
                        <Image :type="'corporation'" :id="item.id" :size="24" class="mr-2 rounded-full" />
                        <span class="text-black dark:text-white">{{ item.name }}</span>
                    </div>
                </template>
                <template
                    #cell-totalValue="{ item, column, index }: { item: BattleCorporation, column: any, index: number }">
                    {{ formatBillions(item.totalValue) }} ISK
                </template>
            </Table>
        </div>
    </div>
</template>
<script setup lang="ts">
import Image from '../common/Image.vue'; // Import the Image component
import Table from '../common/Table.vue'; // Import the Table component

interface BattleCorporation {
    id: number;
    name: string;
    kills: number;
    totalValue: number;
}

defineProps<{
    blueTeamCorporations: BattleCorporation[],
    redTeamCorporations: BattleCorporation[]
}>();

function formatBillions(n: number) {
    if (typeof n !== 'number') return '0';
    if (n >= 1e9) return (n / 1e9).toLocaleString(undefined, { maximumFractionDigits: 2 }) + 'B';
    if (n >= 1e6) return (n / 1e6).toLocaleString(undefined, { maximumFractionDigits: 2 }) + 'M';
    return n.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

const corporationColumns = [
    { id: 'name', header: 'Corporation', width: '50%' },
    { id: 'kills', header: 'Kills', width: '25%' },
    { id: 'totalValue', header: 'Total Value', width: '25%' },
];
</script>

<style scoped>
/* Add any necessary scoped styles here to match the original table appearance */
.corporation-table :deep(.table-header) {
    background-color: rgba(26, 26, 26, 0.5);
    /* Example from TopBox */
    color: #9ca3af;
    /* Example from TopBox */
    text-transform: uppercase;
    font-size: 0.75rem;
    padding: 0.5rem;
    /* Adjust padding */
}

.corporation-table :deep(.header-cell) {
    padding: 0 0.5rem;
    /* Adjust padding */
}

.corporation-table :deep(.table-row) {
    border-bottom: 1px solid #282828;
    /* Example from original table */
    transition: background-color 0.3s ease;
}


.corporation-table :deep(.body-cell) {
    padding: 0.5rem;
    /* Adjust padding */
}

.corporation-table :deep(tbody tr):hover {
    background: light-dark(rgba(229, 231, 235, 0.15), rgba(35, 35, 35, 0.5));
}
</style>
