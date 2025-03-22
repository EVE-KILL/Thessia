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

const getImageUrl = (shipId: number): string => {
  return `https://images.evetech.net/types/${shipId}/render?size=128`;
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
      active: 'text-white border-b-2 border-white font-bold',
      inactive: 'text-gray-400 hover:text-gray-300'
    }
  };
});
</script>

<template>
  <div class="flex flex-col min-w-full rounded-lg overflow-hidden min-h-[316px]">
    <!-- Use UTabs with string v-model for the index - set default-selected to "1" (Kills tab) -->
    <UTabs
      v-model="activeTabIndex"
      :items="categories"
      :ui="tabsUi"
      class="w-full"
      default-selected="1"
    />

    <!-- Loading state -->
    <div v-if="pending" class="flex justify-center items-center py-12">
      <UIcon name="i-lucide-refresh-cw" class="animate-spin text-2xl text-background-400" />
      <span class="ml-2 text-background-400">{{ t('common.loading') }}</span>
    </div>

    <!-- Error state -->
    <div v-else-if="error" class="text-center py-8 text-red-400">
      {{ t('common.error') }}: {{ error.message }}
    </div>

    <!-- Empty state -->
    <div v-else-if="!items || items.length === 0" class="text-center py-8 text-background-400">
      {{ t('mostValuable.noData') }}
    </div>

    <!-- Content - Displayed differently based on device -->
    <template v-else>
      <!-- Desktop Grid Layout -->
      <div v-if="!isMobile" class="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4 justify-items-center p-4">
        <UButton
          v-for="item in items"
          :key="item.killmail_id"
          variant="ghost"
          color="neutral"
          class="flex flex-col items-center justify-center h-auto w-full p-2 rounded"
          @click="handleItemClick(item.killmail_id)"
        >
          <NuxtImg
            :src="getImageUrl(item.victim.ship_id)"
            loading="lazy"
            format="webp"
            :alt="`Ship: ${getShipName(item)}`"
            class="rounded w-16 h-16 md:w-24 md:h-24 object-contain"
          />
          <div class="text-center text-sm mt-1 max-w-full truncate">
            {{ getShipName(item) }}
          </div>
          <div class="text-center text-xs mt-1 text-background-300">
            {{ formatIsk(item.total_value) }} ISK
          </div>
        </UButton>
      </div>

      <!-- Mobile Vertical Layout -->
      <div v-else class="flex flex-col gap-2 p-2">
        <UButton
          v-for="item in items"
          :key="item.killmail_id"
          variant="ghost"
          color="neutral"
          class="flex items-center justify-start h-auto w-full p-2 rounded"
          @click="handleItemClick(item.killmail_id)"
        >
          <NuxtImg
            :src="getImageUrl(item.victim.ship_id)"
            loading="lazy"
            format="webp"
            :alt="`Ship: ${getShipName(item)}`"
            class="rounded w-14 h-14 object-contain mr-3"
          />
          <div class="flex flex-col flex-grow items-start">
            <div class="text-sm truncate">
              {{ getShipName(item) }}
            </div>
            <div class="text-xs text-background-300">
              {{ formatIsk(item.total_value) }} ISK
            </div>
          </div>
          <UIcon name="i-lucide-chevron-right" class="text-background-400" />
        </UButton>
      </div>

      <div class="text-sm text-center mt-2 text-background-400 pb-2">
        ({{ t('topBox.killsOver', { days: props.days }) }})
      </div>
    </template>
  </div>
</template>

<style scoped>
.bg-semi-transparent {
  background-color: rgba(0, 0, 0, 0.4);
}

/* Responsive adjustments */
@media (max-width: 768px) {
  .grid {
    gap: 0.5rem;
    padding: 0.5rem;
  }

  .text-sm {
    font-size: 0.8rem;
  }

  .text-xs {
    font-size: 0.7rem;
  }
}
</style>
