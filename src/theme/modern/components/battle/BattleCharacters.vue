<template>
    <div class="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
        <!-- Blue Team Characters -->
        <div>
            <div class="mb-2 text-lg font-bold">Blue Team Characters</div>
            <Table :columns="characterColumns" :items="blueTeamCharacters" :bordered="true" :striped="false"
                :hover="true" density="normal" background="transparent" table-class="character-table">
                <template #cell-portrait="{ item }">
                    <img :src="`https://images.eve-kill.com/characters/${item.id}/portrait?size=64`"
                        :alt="`Character: ${item.name}`" class="w-8 h-8 rounded-full" />
                </template>
                <template #cell-totalValue="{ item }">
                    {{ formatBillions(item.totalValue) }} ISK
                </template>
            </Table>
        </div>
        <!-- Red Team Characters -->
        <div>
            <div class="mb-2 text-lg font-bold">Red Team Characters</div>
            <Table :columns="characterColumns" :items="redTeamCharacters" :bordered="true" :striped="false"
                :hover="true" density="normal" background="transparent" table-class="character-table">
                <template #cell-portrait="{ item }">
                    <img :src="`https://images.eve-kill.com/characters/${item.id}/portrait?size=64`"
                        :alt="`Character: ${item.name}`" class="w-8 h-8 rounded-full" />
                </template>
                <template #cell-totalValue="{ item }">
                    {{ formatBillions(item.totalValue) }} ISK
                </template>
            </Table>
        </div>
    </div>
</template>
<script setup lang="ts">
import Table from '../common/Table.vue'; // Import the Table component

interface BattleCharacter {
    id: number;
    name: string;
    kills: number;
    totalValue: number;
}

defineProps<{
    blueTeamCharacters: BattleCharacter[],
    redTeamCharacters: BattleCharacter[]
}>();

function formatBillions(n: number) {
    if (typeof n !== 'number') return '0';
    if (n >= 1e9) return (n / 1e9).toLocaleString(undefined, { maximumFractionDigits: 2 }) + 'B';
    if (n >= 1e6) return (n / 1e6).toLocaleString(undefined, { maximumFractionDigits: 2 }) + 'M';
    return n.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

const characterColumns = [
    { id: 'portrait', header: 'Portrait', width: '10%' },
    { id: 'name', header: 'Name', width: '40%' },
    { id: 'kills', header: 'Kills', width: '25%' },
    { id: 'totalValue', header: 'Total Value', width: '25%' },
];
</script>

<style scoped>
/* Add any necessary scoped styles here to match the original table appearance */
.character-table :deep(.table-header) {
    background-color: rgba(26, 26, 26, 0.5);
    /* Example from TopBox */
    color: #9ca3af;
    /* Example from TopBox */
    text-transform: uppercase;
    font-size: 0.75rem;
    padding: 0.5rem;
    /* Adjust padding */
}

.character-table :deep(.header-cell) {
    padding: 0 0.5rem;
    /* Adjust padding */
}

.character-table :deep(.table-row) {
    border-bottom: 1px solid #282828;
    /* Example from original table */
    transition: background-color 0.3s ease;
}

.character-table :deep(.table-row:hover) {
    background-color: #1a1a1a;
    /* Example from original table */
}

.character-table :deep(.body-cell) {
    padding: 0.5rem;
    /* Adjust padding */
}
</style>
