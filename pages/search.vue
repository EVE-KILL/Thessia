<template>
  <div class="container mx-auto p-4">
    <div class="mb-8">
      <h1 class="text-3xl font-bold mb-2">{{ $t('search.results', { query: capitalizeWords(searchQuery) }) }}</h1>
    </div>

    <!-- Search form -->
    <form @submit.prevent="performSearch" class="mb-8">
      <div class="flex items-center relative">
        <UInput
          v-model="searchQuery"
          :placeholder="$t('search.placeholder')"
          :icon="isLoading ? 'i-heroicons-arrow-path' : 'i-heroicons-magnifying-glass'"
          :icon-class="isLoading ? 'animate-spin' : ''"
          size="lg"
          class="w-full md:w-1/2"
          ref="searchInputRef"
        />
        <UButton
          type="submit"
          color="primary"
          class="ml-2"
          :loading="isLoading"
          :disabled="isLoading"
        >
          {{ $t('search.searchButton') }}
        </UButton>
      </div>
    </form>

    <!-- Results -->
    <template v-if="results && results.hits.length > 0">
      <div class="mb-6 flex items-center justify-between">
        <div>
          <span class="text-sm text-gray-600 dark:text-gray-400">
            {{ $t('search.found', { count: results.estimatedTotalHits }) }}
            <span class="text-xs">({{ $t('search.processingTimeMs', { time: results.processingTimeMs }) }})</span>
          </span>
        </div>
      </div>

      <!-- Results grouped by type -->
      <div class="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <template v-for="(group, type) in groupedResults" :key="type">
          <!-- Only show column if it has results -->
          <div v-if="group.length > 0" class="col-span-1 lg:col-span-4" :class="getColumnClass(type)">
            <UCard>
              <template #header>
                <!-- Type header with icon -->
                <div class="flex items-center mb-2">
                  <UIcon
                    :name="getIconForEntityType(type)"
                    class="mr-2 text-2xl"
                    :class="getColorForEntityType(type)"
                  />
                  <h3 class="text-xl font-bold">{{ capitalizeFirstLetter(type) }}</h3>
                  <UBadge
                    :color="getBadgeColorForEntityType(type)"
                    variant="subtle"
                    size="sm"
                    class="ml-2"
                  >
                    {{ group.length }}
                  </UBadge>
                </div>
              </template>

              <!-- Results list -->
              <ul class="space-y-2">
                <li
                  v-for="hit in group"
                  :key="hit.id"
                  class="border border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-750 rounded-md transition-all"
                >
                  <UButton
                    :to="`/${hit.type}/${hit.id}`"
                    color="gray"
                    variant="ghost"
                    block
                    class="justify-between h-auto py-2"
                  >
                    <span class="font-medium">{{ hit.name }}</span>
                    <UIcon name="i-heroicons-arrow-right" class="text-gray-400" />
                  </UButton>
                </li>
              </ul>

              <!-- See more button for this type if many results -->
              <template #footer v-if="getHitCountByType(type) > group.length">
                <UButton
                  variant="soft"
                  size="sm"
                  block
                  @click="loadMoreForType(type)"
                  :loading="loadingMoreTypes[type]"
                  color="secondary"
                >
                  {{ $t('search.moreType', { type: capitalizeFirstLetter(type) + 's', count: getHitCountByType(type) }) }}
                </UButton>
              </template>
            </UCard>
          </div>
        </template>
      </div>
    </template>

    <!-- No results state -->
    <UAlert
      v-else-if="results && results.hits.length === 0 && !isLoading"
      :title="$t('search.noResultsTitle')"
      icon="i-heroicons-information-circle"
      color="warning"
    >
      {{ $t('search.noResultsDesc') }}
    </UAlert>

    <!-- Initial state - no search yet -->
    <div v-else-if="!results && !isLoading" class="text-center py-12">
      <UIcon name="i-heroicons-magnifying-glass" class="text-6xl mx-auto mb-4 text-gray-400" />
      <h2 class="text-xl font-medium text-gray-600 dark:text-gray-400">{{ $t('search.initialMessage') }}</h2>
    </div>

    <!-- Loading state shown only on initial load, not during auto-search -->
    <div v-else-if="isLoading && !results" class="flex justify-center py-8">
      <UIcon name="i-heroicons-arrow-path" class="text-4xl animate-spin text-primary-500" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { useRoute, navigateTo } from '#app';
import { useSearch, type SearchResponse, type SearchHit } from '~/composables/useSearch';

const route = useRoute();
const { search, isLoading, error, setupAutoSearch } = useSearch();
const results = ref<SearchResponse | null>(null);
const searchQuery = ref(route.query.q as string || '');
const searchInputRef = ref<HTMLInputElement | null>(null);

// Initialize auto search functionality
let autoSearchEnabled = ref(false);
const initAutoSearch = () => {
  // Create a watcher that will perform search when searchQuery changes
  watch(searchQuery, (newQuery) => {
    // Update URL to reflect current search query
    if (newQuery && newQuery.trim().length >= 3) {
      updateSearchUrl(newQuery);

      // Only perform auto-search after initial setup
      if (autoSearchEnabled.value) {
        performSearch();
      }
    } else if (!newQuery || newQuery.trim().length === 0) {
      // Clear results if search query is empty
      results.value = null;
      // Reset URL if search bar is cleared
      navigateTo({
        path: '/search',
        query: {}
      }, { replace: true });
    }
  }, { immediate: false });

  // Mark auto-search as ready after initial setup
  autoSearchEnabled.value = true;
};

// Update the URL with the search query without triggering a route change
const updateSearchUrl = (query: string) => {
  if (import.meta.client) {
    const url = new URL(window.location.href);
    url.searchParams.set('q', query);
    window.history.replaceState({}, '', url.toString());
  }
};

// Track loading state for "load more" operations by type
const loadingMoreTypes = ref<Record<string, boolean>>({});
// Track how many results we're showing for each type
const resultsPerType = ref<Record<string, number>>({});
const INITIAL_RESULTS_PER_TYPE = 10;

// Group results by type
const groupedResults = computed(() => {
  if (!results.value || !results.value.hits) return {};

  const grouped: Record<string, SearchHit[]> = {};

  // Initialize with empty arrays for known types, even if no results
  const knownTypes = ['character', 'corporation', 'alliance', 'ship', 'item', 'system', 'region'];
  knownTypes.forEach(type => {
    grouped[type] = [];

    // Initialize results per type count if not set
    if (resultsPerType.value[type] === undefined) {
      resultsPerType.value[type] = INITIAL_RESULTS_PER_TYPE;
    }
  });

  // Group hits by type
  results.value.hits.forEach(hit => {
    const type = hit.type.toLowerCase();
    if (!grouped[type]) grouped[type] = [];

    // Only add to visible results if within the count limit
    const currentCount = resultsPerType.value[type] || INITIAL_RESULTS_PER_TYPE;
    if (grouped[type].length < currentCount) {
      grouped[type].push(hit);
    }
  });

  return grouped;
});

// Helper to get total count of hits by type
const getHitCountByType = (type: string) => {
  if (!results.value || !results.value.hits) return 0;
  return results.value.hits.filter(hit => hit.type.toLowerCase() === type.toLowerCase()).length;
};

// Load more results for a specific type
const loadMoreForType = (type: string) => {
  type = type.toLowerCase();
  loadingMoreTypes.value[type] = true;

  // Increase the number of displayed results for this type
  resultsPerType.value[type] = (resultsPerType.value[type] || INITIAL_RESULTS_PER_TYPE) + 5;

  // Simply simulate loading, as we already have all results
  setTimeout(() => {
    loadingMoreTypes.value[type] = false;
  }, 300);
};

// Define column classes for different entity types for better visual organization
const getColumnClass = (type: string) => {
  switch (type.toLowerCase()) {
    case 'character': return 'order-1';
    case 'corporation': return 'order-2';
    case 'alliance': return 'order-3';
    case 'ship': return 'order-4';
    case 'item': return 'order-5';
    case 'system': return 'order-6';
    case 'region': return 'order-7';
    default: return 'order-8';
  }
};

// Get the appropriate icon for each entity type
const getIconForEntityType = (type: string) => {
  switch (type.toLowerCase()) {
    case 'character':
      return 'i-heroicons-user';
    case 'corporation':
      return 'i-heroicons-building-office';
    case 'alliance':
      return 'i-heroicons-user-group';
    case 'ship':
      return 'i-heroicons-rocket-launch';
    case 'item':
      return 'i-heroicons-cube';
    case 'system':
      return 'i-heroicons-globe-alt';
    case 'region':
      return 'i-heroicons-map';
    default:
      return 'i-heroicons-question-mark-circle';
  }
};

// Get the appropriate color for each entity type
const getColorForEntityType = (type: string) => {
  switch (type.toLowerCase()) {
    case 'character':
      return 'text-blue-600 dark:text-blue-400';
    case 'corporation':
      return 'text-green-600 dark:text-green-400';
    case 'alliance':
      return 'text-purple-600 dark:text-purple-400';
    case 'ship':
      return 'text-red-600 dark:text-red-400';
    case 'item':
      return 'text-orange-600 dark:text-orange-400';
    case 'system':
      return 'text-teal-600 dark:text-teal-400';
    case 'region':
      return 'text-indigo-600 dark:text-indigo-400';
    default:
      return 'text-gray-600 dark:text-gray-400';
  }
};

// Get the appropriate badge color for each entity type
const getBadgeColorForEntityType = (type: string) => {
  switch (type.toLowerCase()) {
    case 'character':
      return 'blue';
    case 'corporation':
      return 'green';
    case 'alliance':
      return 'purple';
    case 'ship':
      return 'red';
    case 'item':
      return 'orange';
    case 'system':
      return 'teal';
    case 'region':
      return 'indigo';
    default:
      return 'gray';
  }
};

// Helper to capitalize first letter of a string
const capitalizeFirstLetter = (string: string) => {
  return string.charAt(0).toUpperCase() + string.slice(1);
};

// Helper to capitalize the first letter of each word in a string
const capitalizeWords = (string: string) => {
  if (!string) return '';
  return string
    .split(' ')
    .map(word => capitalizeFirstLetter(word))
    .join(' ');
};

// Search function - updated to use debounce
let searchDebounceTimer: NodeJS.Timeout | null = null;
const performSearch = async () => {
  if (!searchQuery.value || searchQuery.value.trim().length < 3) return;

  // Clear any existing debounce timer
  if (searchDebounceTimer) {
    clearTimeout(searchDebounceTimer);
  }

  // Set a new debounce timer
  searchDebounceTimer = setTimeout(async () => {
    // Reset results per type to initial values
    resultsPerType.value = {};

    // Perform the search
    results.value = await search(searchQuery.value);
  }, 300);
};

// Setup auto search - when mounted if there's a query
onMounted(async () => {
  // First perform initial search if query exists in URL
  if (route.query.q) {
    searchQuery.value = route.query.q as string;
    results.value = await search(searchQuery.value);
  }

  // Initialize auto-search functionality
  initAutoSearch();

  // Add focus and select the search input after the component is mounted
  nextTick(() => {
    if (searchInputRef.value) {
      // Access the native input element within the UInput component and focus it
      const nativeInput = searchInputRef.value.$el.querySelector('input');
      if (nativeInput) {
        nativeInput.focus();
        nativeInput.select(); // Select all text in the input
      }
    }
  });
});

// Define page metadata
useHead({
  title: computed(() =>
    searchQuery.value
      ? `${searchQuery.value} - Search Results`
      : 'Search'
  ),
  meta: [
    {
      name: 'description',
      content: computed(() =>
        searchQuery.value
          ? `Search results for "${searchQuery.value}"`
          : 'Search for characters, corporations, alliances, and more'
      )
    }
  ]
});
</script>
