<template>
    <div class="rounded bg-background-800 bg-opacity-75">
        <h2 class="text-xl font-bold mb-4">{{ $t('marketPricesX', { region: 'The Forge' }) }}</h2>

        <Table :columns="tableColumns" :items="prices" :loading="loading" :skeleton-count="10"
            :empty-text="$t('noPrices')" :bordered="true" :striped="false" :hover="true" background="transparent">
            <!-- Date column -->
            <template #cell-date="{ item }">
                <div class="px-2 py-1">{{ formatDate(item.date) }}</div>
            </template>

            <!-- Min price column -->
            <template #cell-lowest="{ item }">
                <div class="px-2 py-1 text-right">{{ formatNumber(item.lowest) }} ISK</div>
            </template>

            <!-- Average price column -->
            <template #cell-average="{ item }">
                <div class="px-2 py-1 text-right">{{ formatNumber(item.average) }} ISK</div>
            </template>

            <!-- Max price column -->
            <template #cell-highest="{ item }">
                <div class="px-2 py-1 text-right">{{ formatNumber(item.highest) }} ISK</div>
            </template>

            <!-- Custom mobile row template -->
            <template #mobile-row="{ item }">
                <div class="grid grid-cols-2 p-2 w-full">
                    <div class="self-center">{{ formatDate(item.date) }}</div>
                    <div class="flex flex-col items-end">
                        <div class="flex items-center justify-between w-full">
                            <span class="text-xs text-gray-400">{{ $t('min') }}:</span>
                            <span>{{ formatNumber(item.lowest) }} ISK</span>
                        </div>
                        <div class="flex items-center justify-between w-full">
                            <span class="text-xs text-gray-400">{{ $t('avg') }}:</span>
                            <span>{{ formatNumber(item.average) }} ISK</span>
                        </div>
                        <div class="flex items-center justify-between w-full">
                            <span class="text-xs text-gray-400">{{ $t('max') }}:</span>
                            <span>{{ formatNumber(item.highest) }} ISK</span>
                        </div>
                    </div>
                </div>
            </template>
        </Table>

        <p class="text-gray-500 dark:text-gray-400 text-xs mt-2 text-left">
            {{ $t('priceSource') }}
            <a href="https://data.everef.net/market-history/" target="_blank" rel="noopener noreferrer"
                class="text-primary-400 hover:text-primary-300">https://data.everef.net/market-history/</a>.
        </p>
    </div>
</template>

<script setup lang="ts">
import moment from "moment";

const props = defineProps({
    prices: {
        type: Array,
        default: () => [],
    },
    loading: {
        type: Boolean,
        default: false,
    },
});

// Table configuration
const tableColumns = [
    {
        id: "date",
        header: "Date",
        width: "25%",
    },
    {
        id: "lowest",
        header: "Min Price",
        width: "25%",
        cellClass: "text-right",
    },
    {
        id: "average",
        header: "Avg Price",
        width: "25%",
        cellClass: "text-right",
    },
    {
        id: "highest",
        header: "Max Price",
        width: "25%",
        cellClass: "text-right",
    },
];

/**
 * Format date for display
 */
function formatDate(dateString: string): string {
    const date = moment(dateString);
    return date.format('MMM DD');
}

/**
 * Format large numbers with K/M/B suffix
 */
function formatNumber(value: number): string {
    return formatIsk(value);
}
</script>

<style scoped>
:deep(.table-header) {
    background-color: light-dark(rgba(245, 245, 245, 0.05), rgba(26, 26, 26, 0.5)) !important;
}
</style>
