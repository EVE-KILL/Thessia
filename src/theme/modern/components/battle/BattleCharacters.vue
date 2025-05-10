<template>
    <div class="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
        <!-- Blue Team Characters -->
        <div>
            <div class="mb-2 text-lg font-bold text-black dark:text-white">Blue Team Characters</div>
            <Table :columns="characterColumns" :items="blueTeamCharacters" :bordered="true" :striped="false"
                :hover="true" density="normal" background="transparent" table-class="character-table">
                <template #cell-portrait="{ item }: { item: BattleCharacter }">
                    <Image :type="'character'" :id="item.id" :alt="`Character: ${item.name}`" :size="64"
                        class="w-12 h-12" />
                </template>
                <template #cell-losses="{ item }: { item: BattleCharacter }">
                    {{ item.losses }}
                </template>
                <template #cell-valueInflicted="{ item }: { item: BattleCharacter }">
                    {{ formatBillions(item.valueInflicted) }} ISK
                </template>
                <template #cell-valueSuffered="{ item }: { item: BattleCharacter }">
                    {{ formatBillions(item.valueSuffered) }} ISK
                </template>
            </Table>
        </div>
        <!-- Red Team Characters -->
        <div>
            <div class="mb-2 text-lg font-bold text-black dark:text-white">Red Team Characters</div>
            <Table :columns="characterColumns" :items="redTeamCharacters" :bordered="true" :striped="false"
                :hover="true" density="normal" background="transparent" table-class="character-table">
                <template #cell-portrait="{ item }: { item: BattleCharacter }">
                    <Image :type="'character'" :id="item.id" :alt="`Character: ${item.name}`" :size="64"
                        class="w-12 h-12" />
                </template>
                <template #cell-losses="{ item }: { item: BattleCharacter }">
                    {{ item.losses }}
                </template>
                <template #cell-valueInflicted="{ item }: { item: BattleCharacter }">
                    {{ formatBillions(item.valueInflicted) }} ISK
                </template>
                <template #cell-valueSuffered="{ item }: { item: BattleCharacter }">
                    {{ formatBillions(item.valueSuffered) }} ISK
                </template>
            </Table>
        </div>
    </div>
</template>
<script setup lang="ts">
interface BattleCharacter {
    id: number;
    name: string;
    kills: number;
    losses: number; // Added
    valueInflicted: number; // Added
    valueSuffered: number; // Added
    // totalValue: number; // Removed
}

defineProps<{
    blueTeamCharacters: BattleCharacter[],
    redTeamCharacters: BattleCharacter[]
}>();

function formatBillions(n: number) {
    if (typeof n !== 'number') return '0';
    if (n >= 1e9) return (n / 1e9).toLocaleString(undefined, { maximumFractionDigits: 2 }) + 'B';
    if (n >= 1e6) return (n / 1e6).toLocaleString(undefined, { maximumFractionDigits: 2 }) + 'M';
    // Keep lower values as full numbers for clarity
    return n.toLocaleString(undefined, { maximumFractionDigits: 0 });
}

const characterColumns = [
    { id: 'portrait', header: '', width: '15%' }, // Adjusted width
    { id: 'name', header: 'Name', width: '25%' }, // Adjusted width
    { id: 'kills', header: 'Kills', width: '15%' }, // Adjusted width
    { id: 'losses', header: 'Losses', width: '15%' }, // Added
    { id: 'valueInflicted', header: 'Value Inflicted', width: '15%' }, // Added
    { id: 'valueSuffered', header: 'Value Suffered', width: '15%' }, // Added
    // { id: 'totalValue', header: 'Total Value', width: '25%' }, // Removed
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
    background: light-dark(rgba(229, 231, 235, 0.15), rgba(35, 35, 35, 0.5));
}

.character-table :deep(.body-cell) {
    padding: 0.5rem;
    /* Adjust padding */
}
</style>
