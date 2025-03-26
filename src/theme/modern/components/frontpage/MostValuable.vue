<script setup lang="ts">
import { computed, ref, watch } from 'vue';

interface IMostValuableItem {
  killmail_id: number;
  total_value: number;
  victim: {
    ship_id: number;
    ship_name: string | Record<string, string>;
    [key: string]: any;
  };
  [key: string]: any;
}

const props = defineProps({
  days: { type: Number, default: 7 },
  limit: { type: Number, default: 7 }
});

const { t, locale } = useI18n();
const currentLocale = computed(() => locale.value);

// Define categories with distinct keys - reordered as requested
const categories = [
  { key: 'most_valuable_structures', label: t('mostValuable.structures'), icon: 'i-lucide-building' },
  { key: 'most_valuable_kills', label: t('mostValuable.kills'), icon: 'i-lucide-target' },
  { key: 'most_valuable_ships', label: t('mostValuable.ships'), icon: 'i-lucide-ship' }
];

// Use numeric index for the active tab - set "1" as default (2nd tab - Kills)
const activeTabIndex = ref("1");

// Get the type for API based on the active tab index
const getTabType = computed(() => {
  const index = parseInt(activeTabIndex.value, 10);
  return categories[index]?.key || categories[1].key;
});

// Create fetch query parameters
const queryParams = computed(() => ({
  type: getTabType.value,
  days: props.days,
  limit: props.limit
}));

// Fetch data for the active tab only
const { data: items, pending, error, refresh } = useFetch<IMostValuableItem[]>('/api/stats', {
  query: queryParams,
  key: `most-valuable-${getTabType.value}-${props.days}-${props.limit}`
});

// Watch for active tab changes and refresh data
watch(activeTabIndex, () => {
  refresh();
}, { immediate: true });

// Helper functions for data formatting and display
const getLocalizedString = (obj: any, locale: string): string => {
  if (!obj) return '';
  if (typeof obj === 'string') return obj;
  return obj[locale] || obj['en'] || '';
};

// Format ISK similar to KillList
const formatIsk = (value: number): string => {
  if (value >= 1000000000) return `${(value / 1000000000).toFixed(2)}B`;
  if (value >= 1000000) return `${(value / 1000000).toFixed(2)}M`;
  if (value >= 1000) return `${(value / 1000).toFixed(2)}K`;
  return value.toString();
};

const getShipName = (item: IMostValuableItem): string => {
  return getLocalizedString(item.victim.ship_name, currentLocale.value);
};

// Handle item click to navigate to kill details
const handleItemClick = (killmailId: number) => {
  navigateTo(`/kill/${killmailId}`);
};

// Responsive design
const { isMobile } = useResponsive();

// Customized UTab UI configuration
const tabsUi = computed(() => {
  return {
    wrapper: 'w-full',
    list: {
      base: 'flex items-center justify-between',
      background: 'bg-black',
      width: 'w-full',
      height: 'h-auto',
      divider: {
        base: 'hidden'
      },
    },
    item: {
      size: 'text-xs',
      font: 'font-medium',
      base: 'flex items-center justify-center py-2 px-4 text-center',
      active: 'text-white font-bold',
      inactive: 'text-gray-400 hover:text-gray-300'
    }
  };
});

// Generate skeleton items for loading state
const generateSkeletonItems = (count: number) => {
  return Array(count).fill(0).map((_, index) => ({
    id: `skeleton-${index}`,
    isLoading: true,
  }));
};

const skeletonItems = computed(() => generateSkeletonItems(props.limit));

// Prioritize images in the viewport
const isPriorityImage = (index: number): boolean => {
  return index < 3; // First 3 images are prioritized for immediate loading
};
</script>

<template>
  <div class="flex flex-col min-w-full rounded-lg overflow-hidden min-h-[350px] bg-white dark:bg-background-900">
    <UTabs
      v-model="activeTabIndex"
      :items="categories"
      :ui="tabsUi"
      class="w-full"
      default-selected="1"
    />

    <!-- Loading state with skeletons -->
    <div v-if="pending">
      <!-- Desktop skeleton grid -->
      <div v-if="!isMobile" class="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3 p-4">
        <div
          v-for="(_, index) in skeletonItems"
          :key="`skeleton-${index}`"
          class="flex flex-col items-center p-2 rounded"
        >
          <USkeleton class="rounded w-24 h-24 md:w-32 md:h-32 mb-2" />
          <USkeleton class="h-4 w-20 mt-1" />
          <USkeleton class="h-3 w-16 mt-1" />
        </div>
      </div>

      <!-- Mobile skeleton list -->
      <div v-else class="flex flex-col divide-y divide-gray-200 dark:divide-background-700">
        <div
          v-for="(_, index) in skeletonItems"
          :key="`skeleton-mobile-${index}`"
          class="flex items-center p-3"
        >
          <USkeleton class="rounded w-14 h-14 mr-3" />
          <div class="flex flex-col flex-grow">
            <USkeleton class="h-4 w-32 mb-1" />
            <USkeleton class="h-3 w-24" />
          </div>
          <UIcon name="i-lucide-chevron-right" class="text-gray-400 dark:text-background-400" />
        </div>
      </div>
    </div>

    <!-- Error state -->
    <div v-else-if="error" class="text-center py-8 text-red-600 dark:text-red-400">
      {{ t('common.error') }}: {{ error.message }}
    </div>

    <!-- Empty state -->
    <div v-else-if="!items || items.length === 0" class="text-center py-8 text-gray-400 dark:text-background-400">
      {{ t('mostValuable.noData') }}
    </div>

    <!-- Content - Displayed differently based on device -->
    <template v-else>
      <!-- Desktop Grid Layout -->
      <div v-if="!isMobile" class="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3 p-4">
        <div
          v-for="(item, index) in items"
          :key="item.killmail_id"
          class="flex flex-col items-center p-2 rounded transition-colors duration-300 cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-900"
          @click="handleItemClick(item.killmail_id)"
        >
          <Image
            type="type-render"
            :id="item.victim.ship_id"
            :alt="`Ship: ${getShipName(item)}`"
            class="rounded w-24 h-24 md:w-32 md:h-32 object-contain mb-2"
            size="256"
            format="webp"
            :loading="index < 7 ? 'eager' : 'lazy'"
            :priority="isPriorityImage(index)"
          />
          <div class="text-center text-sm mt-1 max-w-full truncate text-gray-900 dark:text-white">
            {{ getShipName(item) }}
          </div>
          <div class="text-center text-xs mt-1 text-gray-500 dark:text-background-300">
            {{ formatIsk(item.total_value) }} ISK
          </div>
        </div>
      </div>

      <!-- Mobile Vertical Layout -->
      <div v-else class="flex flex-col divide-y divide-gray-200 dark:divide-background-700">
        <div
          v-for="(item, index) in items"
          :key="item.killmail_id"
          class="flex items-center p-3 cursor-pointer hover:bg-gray-100 dark:hover:bg-background-800 transition-colors duration-300"
          @click="handleItemClick(item.killmail_id)"
        >
          <Image
            type="type-render"
            :id="item.victim.ship_id"
            :alt="`Ship: ${getShipName(item)}`"
            class="rounded w-14 h-14 object-contain mr-3"
            size="64"
            format="webp"
            :loading="index < 4 ? 'eager' : 'lazy'"
            :priority="index < 2"
          />
          <div class="flex flex-col flex-grow">
            <div class="text-sm truncate text-gray-900 dark:text-white">
              {{ getShipName(item) }}
            </div>
            <div class="text-xs text-gray-500 dark:text-background-300">
              {{ formatIsk(item.total_value) }} ISK
            </div>
          </div>
          <UIcon name="i-lucide-chevron-right" class="text-gray-400 dark:text-background-400" />
        </div>
      </div>

      <div class="text-sm text-center mt-2 text-gray-500 dark:text-background-400 pb-4">
        ({{ t('topBox.killsOver', { days: props.days }) }})
      </div>
    </template>
  </div>
</template>

<style scoped>
.bg-semi-transparent {
  background-color: rgba(0, 0, 0, 0.4);
}

/* Match text sizes with other components */
:deep(.text-sm) {
  font-size: 0.9rem;
  line-height: 1rem;
}

:deep(.text-xs) {
  font-size: 0.8rem;
  line-height: 1rem;
}

/* Responsive adjustments */
@media (max-width: 768px) {
  .grid {
    gap: 0.5rem;
    padding: 0.5rem;
  }

  :deep(.text-sm) {
    font-size: 0.85rem;
  }

  :deep(.text-xs) {
    font-size: 0.75rem;
  }
}

/* Table styles */
:deep(tbody tr) {
  border-color: rgb(40, 40, 40) !important;
}

:deep(tbody tr + tr) {
  border-top: 1px solid rgb(40, 40, 40) !important;
}

:deep(tbody tr):hover {
    background: light-dark(#e5e7eb, #1a1a1a);
}

</style>
