<template>
  <div class="w-full p-4 rounded bg-background-800 bg-opacity-75">
    <h2 class="text-xl font-bold mb-4">{{ $t('items.marketPrices', { region: 'The Forge' }) }}</h2>

    <!-- Loading state -->
    <div v-if="isLoading" class="overflow-x-auto">
      <div class="w-full">
        <div class="table-header-skeleton grid grid-cols-4 p-2 bg-background-700 bg-opacity-50">
          <USkeleton class="h-5 w-20" />
          <USkeleton class="h-5 w-20 justify-self-end" />
          <USkeleton class="h-5 w-20 justify-self-end" />
          <USkeleton class="h-5 w-20 justify-self-end" />
        </div>
        <div v-for="i in 10" :key="i" class="table-row-skeleton grid grid-cols-4 p-2 border-b border-background-700">
          <USkeleton class="h-5 w-24" />
          <USkeleton class="h-5 w-20 justify-self-end" />
          <USkeleton class="h-5 w-20 justify-self-end" />
          <USkeleton class="h-5 w-20 justify-self-end" />
        </div>
      </div>
    </div>

    <!-- Error state -->
    <div v-else-if="error" class="p-4 text-red-500">
      {{ $t('common.errorLoading') }}
    </div>

    <!-- Data loaded state -->
    <div v-else-if="prices && prices.length > 0" class="overflow-x-auto">
      <table class="table-auto w-full text-left text-sm bg-background-900 rounded-lg shadow-lg">
        <thead>
          <tr class="bg-background-700 text-black dark:text-white uppercase text-xs leading-normal">
            <th class="px-2 py-1">{{ $t('items.date') }}</th>
            <th class="px-2 py-1 text-right">{{ $t('items.minPrice') }}</th>
            <th class="px-2 py-1 text-right">{{ $t('items.avgPrice') }}</th>
            <th class="px-2 py-1 text-right">{{ $t('items.maxPrice') }}</th>
          </tr>
        </thead>
        <tbody class="text-black dark:text-white text-sm">
          <tr
            v-for="price in prices"
            :key="price.date"
            class="border-b border-background-700 hover:bg-background-700 transition-colors duration-300"
          >
            <td class="px-2 py-1">{{ formatDate(price.date) }}</td>
            <td class="px-2 py-1 text-right">{{ formatNumber(price.lowest) }} ISK</td>
            <td class="px-2 py-1 text-right">{{ formatNumber(price.average) }} ISK</td>
            <td class="px-2 py-1 text-right">{{ formatNumber(price.highest) }} ISK</td>
          </tr>
        </tbody>
      </table>
      <p class="text-gray-500 dark:text-gray-400 text-xs mt-2 text-left">
        {{ $t('items.priceSource') }}
        <a
          href="https://data.everef.net/market-history/"
          target="_blank"
          rel="noopener noreferrer"
          class="text-primary-400 hover:text-primary-300"
        >https://data.everef.net/market-history/</a>.
      </p>
    </div>

    <!-- Empty state -->
    <div v-else class="text-center p-4">
      {{ $t('items.noPrices') }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, computed } from 'vue';
import moment from 'moment';

const props = defineProps({
  item: {
    type: Object,
    default: null
  },
  loading: {
    type: Boolean,
    default: false
  }
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

// The Forge region ID is 10000002
const REGION_ID = 10000002;

// Fetch key based on item id to ensure proper cache invalidation
const fetchKey = computed(() => `item-prices-${props.item?.type_id || 'none'}-${Date.now()}`);

// Fetch pricing data when item is available
const { data, pending, error: fetchError } = useAsyncData<PriceData[]>(
  fetchKey.value,
  async () => {
    // Only fetch if we have an item with type_id
    if (!props.item?.type_id) {
      return [];
    }

    try {
      const result = await $fetch<PriceData[]>(
        `/api/items/${props.item.type_id}/pricing?regionId=${REGION_ID}&days=30`
      );
      return result;
    } catch (err) {
      console.error('Error fetching price data:', err);
      error.value = err;
      return [];
    }
  },
  {
    watch: [() => props.item?.type_id],
    server: false,
    immediate: !!props.item?.type_id
  }
);

// Watch for fetch errors
watch(fetchError, (newError) => {
  if (newError) {
    error.value = newError;
  }
});

// Update loading state whenever props.loading or pending changes
watch([() => props.loading, pending], ([propsLoading, asyncPending]) => {
  isLoading.value = propsLoading || asyncPending;
}, { immediate: true });

// Update prices when data changes
watch(data, (newData) => {
  if (newData) {
    prices.value = newData;
    isLoading.value = false;
  }
}, { immediate: true });

// Handle route changes and ensure data refreshes
const route = useRoute();
watch(() => route.params.id, () => {
  isLoading.value = true;
}, { immediate: true });

/**
 * Format number with appropriate commas and decimals
 */
function formatNumber(value: number): string {
  if (value >= 1000000000) {
    return (value / 1000000000).toFixed(2) + 'B';
  } else if (value >= 1000000) {
    return (value / 1000000).toFixed(2) + 'M';
  } else if (value >= 1000) {
    return (value / 1000).toFixed(2) + 'K';
  } else {
    return value.toFixed(2);
  }
}

/**
 * Format date to YYYY-MM-DD
 */
function formatDate(dateString: string): string {
  return moment(dateString).format('YYYY-MM-DD');
}
</script>

<style scoped>
.table-header-skeleton {
  border-radius: 4px 4px 0 0;
}

tbody tr {
  border-color: rgb(40, 40, 40) !important;
}

tbody tr + tr {
  border-top: 1px solid rgb(40, 40, 40) !important;
}

tbody tr:hover {
  background: light-dark(#e5e7eb, #1a1a1a);
}
</style>
