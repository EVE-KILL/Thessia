<template>
    <div class="rounded bg-background-800 bg-opacity-75">
        <h2 class="text-xl font-bold mb-4">{{ $t('marketPricesX', { region: 'The Forge' }) }}</h2>

        <Table :columns="tableColumns" :items="prices" :loading="isLoading" :skeleton-count="10"
            :empty-text="$t('noPrices')" :bordered="true" :striped="false" :hover="true" background="transparent"
            :error="error" :error-text="$t('common.errorLoading')">
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
import { computed, ref, watch } from "vue";

const props = defineProps({
    item: {
        type: Object,
        default: null,
    },
    loading: {
        type: Boolean,
        default: false,
    },
});

// Interface for price data
interface PriceData {
    date: string;
    lowest: number;
    average: number;
    highest: number;
}

// State
const prices = ref<PriceData[]>([]);
const isLoading = ref(true);
const error = ref(null);

// Table configuration
const tableColumns = [
    {
        id: "date",
        header: computed(() => "Date"),
        width: "25%",
    },
    {
        id: "lowest",
        header: computed(() => "Min Price"),
        width: "25%",
        cellClass: "text-right",
    },
    {
        id: "average",
        header: computed(() => "Avg Price"),
        width: "25%",
        cellClass: "text-right",
    },
    {
        id: "highest",
        header: computed(() => "Max Price"),
        width: "25%",
        cellClass: "text-right",
    },
];

// The Forge region ID is 10000002
const REGION_ID = 10000002;

// Fetch key based on item id to ensure proper cache invalidation
const fetchKey = computed(() => `item-prices-${props.item?.type_id || "none"}-${Date.now()}`);

// Fetch pricing data when item is available
const {
    data,
    pending,
    error: fetchError,
    refresh
} = useAsyncData<PriceData[]>(
    fetchKey.value,
    async () => {
        // Only fetch if we have an item with type_id
        if (!props.item?.type_id) {
            console.log('No type_id available for fetching prices');
            return [];
        }

        try {
            const result = await $fetch<PriceData[]>(
                `/api/items/${props.item.type_id}/pricing?regionId=${REGION_ID}&days=30`,
            );
            return result;
        } catch (err) {
            console.error("Error fetching price data:", err);
            error.value = err;
            return [];
        }
    },
    {
        watch: false, // Don't automatically watch
        server: false,
        immediate: false, // Changed to false, will trigger manually
    },
);

// Watch for fetch errors
watch(fetchError, (newError) => {
    if (newError) {
        console.error("Fetch error in prices:", newError);
        error.value = newError;
    }
});

// Watch for item changes and trigger the fetch
watch(
    () => props.item?.type_id,
    (newTypeId) => {
        if (newTypeId) {
            refresh();
        }
    },
    { immediate: true }
);

// Update loading state whenever props.loading or pending changes
watch(
    [() => props.loading, pending],
    ([propsLoading, asyncPending]) => {
        isLoading.value = propsLoading || asyncPending;
    },
    { immediate: true },
);

// Update prices when data changes
watch(
    data,
    (newData) => {
        if (newData) {
            console.log(`Updating prices with ${newData.length} entries`);
            prices.value = newData;
        }
    },
    { immediate: true },
);

// Handle route changes and ensure data refreshes
const route = useRoute();
watch(
    () => route.params.id,
    () => {
        isLoading.value = true;
    },
    { immediate: true },
);

/**
 * Format number with appropriate commas and decimals
 */
function formatNumber(value: number): string {
    if (value >= 1000000000) {
        return `${(value / 1000000000).toFixed(2)}B`;
    }
    if (value >= 1000000) {
        return `${(value / 1000000).toFixed(2)}M`;
    }
    if (value >= 1000) {
        return `${(value / 1000).toFixed(2)}K`;
    }
    return value.toFixed(2);
}

/**
 * Format date to YYYY-MM-DD
 */
function formatDate(dateString: string): string {
    return moment(dateString).format("YYYY-MM-DD");
}
</script>

<style scoped>
:deep(.table-header) {
    background-color: light-dark(rgba(245, 245, 245, 0.05), rgba(26, 26, 26, 0.5)) !important;
    padding: 0.5rem 1rem !important;
}

:deep(.header-cell) {
    font-size: 0.75rem;
    color: light-dark(#4b5563, #9ca3af) !important;
    text-transform: uppercase;
}

/* Make the table more compact for price data */
:deep(.table-row) {
    padding: 0 !important;
}

:deep(.body-cell) {
    padding: 0 !important;
}

/* Make the mobile display more compact */
@media (max-width: 768px) {
    :deep(.table-row) {
        padding: 0.5rem !important;
    }
}
</style>
