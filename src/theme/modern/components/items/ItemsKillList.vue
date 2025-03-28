<template>
  <div class="w-full p-4 rounded bg-background-800 bg-opacity-75">
    <h2 class="text-xl font-bold mb-4">{{ $t('items.latestKills') }}</h2>

    <!-- Loading state -->
    <div v-if="isLoading" class="overflow-x-auto">
      <Table
        :columns="tableColumns"
        :items="[]"
        :loading="true"
        :skeleton-count="5"
        :empty-text="$t('items.noKills')"
        background="transparent"
      />
    </div>

    <!-- Error state -->
    <div v-else-if="error" class="p-4 text-red-500">
      {{ $t('common.errorLoading') }}
    </div>

    <!-- Data loaded state -->
    <div v-else-if="killmails?.length > 0" class="overflow-x-auto">
      <Table
        :columns="tableColumns"
        :items="killmails"
        :loading="false"
        :empty-text="$t('items.noKills')"
        :link-fn="generateKillLink"
        :bordered="true"
        :striped="false"
        :hover="true"
        background="transparent"
      >
        <!-- Ship column -->
        <template #cell-ship="{ item }">
          <div class="flex items-center">
            <Image
              type="type-render"
              :id="item.victim.ship_id"
              format="webp"
              :alt="`Ship: ${getLocalizedString(item.victim.ship_name, currentLocale)}`"
              class="rounded w-16 h-16 m-1"
              size="64"
            />
          </div>
        </template>

        <!-- Victim column - Redesigned layout -->
        <template #cell-victim="{ item }">
          <div class="flex items-center">
            <!-- Character image - same size as ship image -->
            <div class="flex-shrink-0">
              <Image
                type="character"
                :id="item.victim.character_id"
                format="webp"
                :alt="`Character: ${item.victim.character_name}`"
                class="rounded w-16 h-16 m-1"
                size="64"
              />
            </div>

            <!-- Corp/Alliance images stacked -->
            <div class="flex flex-col mr-2">
              <!-- Corporation -->
              <Image
                type="corporation"
                :id="item.victim.corporation_id"
                format="webp"
                :alt="`Corporation: ${item.victim.corporation_name}`"
                class="rounded w-10 h-10 mb-1"
                size="64"
              />

              <!-- Alliance (if available) -->
              <Image
                v-if="item.victim.alliance_id && item.victim.alliance_id > 0"
                type="alliance"
                :id="item.victim.alliance_id"
                format="webp"
                :alt="`Alliance: ${item.victim.alliance_name}`"
                class="rounded w-10 h-10"
                size="64"
              />
            </div>

            <!-- Text information -->
            <div class="flex flex-col">
              <span class="text-primary-400">
                <NuxtLink :to="`/character/${item.victim.character_id}`" @click.stop>
                  {{ item.victim.character_name }}
                </NuxtLink>
              </span>

              <span class="text-primary-400">
                <NuxtLink :to="`/corporation/${item.victim.corporation_id}`" @click.stop>
                  {{ item.victim.corporation_name }}
                </NuxtLink>
              </span>

              <span v-if="item.victim.alliance_id && item.victim.alliance_id > 0" class="text-primary-400">
                <NuxtLink :to="`/alliance/${item.victim.alliance_id}`" @click.stop>
                  {{ item.victim.alliance_name }}
                </NuxtLink>
              </span>
            </div>
          </div>
        </template>
      </Table>
    </div>

    <!-- Empty state -->
    <div v-else class="text-center p-4">
      {{ $t('items.noKills') }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute } from 'vue-router';

const { t, locale } = useI18n();
const currentLocale = computed(() => locale.value);
const route = useRoute();

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

// State
const killmails = ref([]);
const isLoading = ref(true);
const error = ref(null);

// Fetch key based on item id to ensure proper cache invalidation
const fetchKey = computed(() => `item-killmails-${props.item?.type_id || 'none'}-${Date.now()}`);

// Fetch killmails data when item is available
const { data, pending, error: fetchError } = useAsyncData(
  fetchKey.value,
  async () => {
    if (!props.item?.type_id) return [];

    try {
      const result = await $fetch(`/api/items/${props.item.type_id}/killmails?limit=20`);
      return result;
    } catch (err) {
      console.error('Error fetching killmail data:', err);
      error.value = err;
      return [];
    }
  },
  {
    watch: [() => props.item?.type_id],
    server: false,
    immediate: !!props.item?.type_id,
  }
);

// Set error from fetch error
watch(fetchError, (newError) => {
  if (newError) {
    error.value = newError;
  }
});

// Update loading state whenever props.loading or pending changes
watch([() => props.loading, pending], ([propsLoading, asyncPending]) => {
  isLoading.value = propsLoading || asyncPending;
}, { immediate: true });

// Update kill list when data changes
watch(data, (newData) => {
  if (newData) {
    killmails.value = newData;
    isLoading.value = false;
  }
}, { immediate: true });

// Handle route changes and ensure data refreshes
watch(() => route.params.id, () => {
  isLoading.value = true;
}, { immediate: true });

// Table configuration
const tableColumns = [
  {
    id: 'ship',
    header: computed(() => t('killList.ship')),
    width: '20%'
  },
  {
    id: 'victim',
    header: computed(() => t('killList.victim')),
    width: '80%'
  }
];

/**
 * Gets localized string from an object containing translations
 */
function getLocalizedString(obj: any, locale: string): string {
  if (!obj) return '';
  return obj[locale] || obj['en'] || '';
}

/**
 * Generate killmail link
 */
const generateKillLink = (item: any): string => {
  return `/kill/${item.killmail_id}`;
};
</script>

<style scoped>
:deep(.table-header) {
  background-color: light-dark(rgba(245, 245, 245, 0.05), rgba(26, 26, 26, 0.5)) !important;
  padding: 0.5rem 1rem !important;
}

:deep(.header-cell) {
  font-size: 0.75rem;
  color: light-dark(#4b5563, #9ca3af) !important;
}

/* Ensure there's room for the stacked corp/alliance images */
:deep(.body-cell) {
  height: auto;
  min-height: 4.5rem;
}

/* Ensure row links work properly */
:deep(.table-row) {
  cursor: pointer;
}

/* Fix nested links */
:deep(.text-primary-400 a) {
  position: relative;
  z-index: 2;
}
</style>
