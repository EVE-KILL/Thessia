<script setup lang="ts">
import { ref, computed, nextTick, watch, onMounted, onUnmounted } from 'vue';
import { useSearch } from '~/composables/useSearch';

const { t } = useI18n();

// Use the search composable
const { query, results, isLoading, navigateToSearch, setupAutoSearch } = useSearch();

// Set up auto search with debounce (min characters: 3, debounce time: 300ms)
setupAutoSearch(3, 300);

// Track active item in dropdown
const activeItemIndex = ref(-1);
const activeCategory = ref('');
const shouldShowDropdown = ref(false);
const dropdownRef = ref<HTMLElement | null>(null);

const { isMobile } = useResponsive();
const isFullscreenMobile = ref(false);

// Watch for changes in query and mobile state
watch([() => query.value, isMobile], ([newQuery, isMobileDevice]) => {
  // Only auto-close when query is cleared
  if (newQuery.length === 0) {
    isFullscreenMobile.value = false;
  }
}, { immediate: true });

// Fix animation and positioning issues
const dropdownTransition = ref({
  entering: false
});

// Group results by type for fancy category-based display
const groupedResults = computed(() => {
  if (!results.value?.hits || results.value.hits.length === 0) return {};

  const grouped: Record<string, any[]> = {};

  results.value.hits.forEach(hit => {
    if (!grouped[hit.type]) {
      grouped[hit.type] = [];
    }
    grouped[hit.type].push(hit);
  });

  return grouped;
});

// Calculate number of columns based on category count
const columnCount = computed(() => {
  const categoryCount = Object.keys(groupedResults.value).length;
  // Use between 1-4 columns based on category count
  return Math.min(Math.max(categoryCount, 1), 4);
});

// Create a flat array of all results for keyboard navigation
const flattenedResults = computed(() => {
  if (!results.value?.hits) return [];
  return results.value.hits;
});

// Track if dropdown should be displayed
const showResults = computed(() => {
  return shouldShowDropdown.value &&
         results.value?.hits &&
         results.value.hits.length > 0 &&
         query.value.length >= 3;
});

// Watch for changes in results to properly show/hide dropdown
watch(() => results.value?.hits, (newHits) => {
  if (newHits && newHits.length > 0 && query.value.length >= 3) {
    shouldShowDropdown.value = true;
  }
}, { deep: true });

// Reset active item when results change
watch(() => results.value?.hits, () => {
  activeItemIndex.value = -1;
  activeCategory.value = '';
}, { deep: true });

// Handle form submission - navigate to search page
const handleSearchSubmit = (e: Event) => {
  e.preventDefault();

  // If we have an active item, navigate to it
  if (activeItemIndex.value >= 0 && flattenedResults.value[activeItemIndex.value]) {
    const activeHit = flattenedResults.value[activeItemIndex.value];
    navigateTo(`/${activeHit.type}/${activeHit.id}`);
    query.value = '';
    shouldShowDropdown.value = false;
    isFullscreenMobile.value = false;
  } else {
    // Otherwise go to search page
    navigateToSearch();
    isFullscreenMobile.value = false;
  }
};

// Handle keyboard navigation
const handleKeydown = (e: KeyboardEvent) => {
  if (!showResults.value && !isFullscreenMobile.value) return;

  // Handle arrow keys for dropdown navigation
  switch (e.key) {
    case 'ArrowDown':
      e.preventDefault();
      activeItemIndex.value = Math.min(
        activeItemIndex.value + 1,
        flattenedResults.value.length - 1
      );
      updateActiveCategoryFromIndex();
      scrollActiveItemIntoView();
      break;

    case 'ArrowUp':
      e.preventDefault();
      activeItemIndex.value = Math.max(activeItemIndex.value - 1, -1);
      updateActiveCategoryFromIndex();
      scrollActiveItemIntoView();
      break;

    case 'Escape':
      if (isFullscreenMobile.value) {
        isFullscreenMobile.value = false;
        query.value = '';
      } else {
        shouldShowDropdown.value = false;
      }
      break;
  }
};

// Update active category based on active index
const updateActiveCategoryFromIndex = () => {
  if (activeItemIndex.value >= 0 && flattenedResults.value[activeItemIndex.value]) {
    activeCategory.value = flattenedResults.value[activeItemIndex.value].type;
  } else {
    activeCategory.value = '';
  }
};

// Make sure active item is visible in dropdown
const scrollActiveItemIntoView = () => {
  nextTick(() => {
    const activeElement = document.querySelector('.search-result-item.active');
    if (activeElement && dropdownRef.value) {
      activeElement.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  });
};

// Helper functions for entity types
const getIconForEntityType = (type: string) => {
  switch (type.toLowerCase()) {
    case 'character':
      return 'lucide:user';
    case 'corporation':
      return 'lucide:building';
    case 'alliance':
      return 'lucide:users';
    case 'ship':
      return 'lucide:ship';
    case 'item':
      return 'lucide:box';
    case 'system':
      return 'lucide:globe';
    case 'region':
      return 'lucide:map';
    default:
      return 'lucide:circle';
  }
};

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

// Helper to get category label
const getCategoryLabel = (type: string) => {
  const key = `search.category.${type}`;
  return t(key);
};

// Helper to capitalize first letter of a string
const capitalizeFirstLetter = (string: string) => {
  return string.charAt(0).toUpperCase() + string.slice(1);
};

// Show dropdown when input is focused - UPDATED
const handleFocus = () => {
  // Only show dropdown if we already have results
  if (results.value?.hits && results.value.hits.length > 0) {
    shouldShowDropdown.value = true;
  }

  // For mobile, show fullscreen search
  if (isMobile.value && query.value.length > 0) {
    isFullscreenMobile.value = true;
  }
};

// Replace previous click outside handler with simpler logic
// since Dropdown component handles this for us
const handleClickOutside = () => {};

// Click on search result
const handleResultClick = (hit: any) => {
  navigateTo(`/${hit.type}/${hit.id}`);
  query.value = '';
  shouldShowDropdown.value = false;
  isFullscreenMobile.value = false;
};

// Close mobile fullscreen search
const closeMobileSearch = () => {
  isFullscreenMobile.value = false;
  query.value = '';
};

// Open mobile search
const openMobileSearch = () => {
  isFullscreenMobile.value = true;
  nextTick(() => {
    // Focus the input in the modal after it opens
    const searchInput = document.getElementById('mobile-search-input');
    if (searchInput) {
      searchInput.focus();
    }
  });
};

// Set up and clean up click outside handler - simplified as Dropdown handles this
onMounted(() => {});
onUnmounted(() => {});
</script>

<template>
  <div class="search-container w-full relative">
    <form @submit.prevent="handleSearchSubmit" class="flex items-center">
      <div class="relative w-full">
        <!-- Desktop search input using icon prop -->
        <UInput
          v-if="!isMobile"
          v-model="query"
          :icon="isLoading ? 'i-lucide-refresh-ccw' : 'i-lucide-search'"
          :placeholder="t('search.placeholder')"
          class="search-input w-full py-1.5 rounded-md bg-gray-100 dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-primary-500 text-base"
          type="search"
          @keydown="handleKeydown"
          @focus="handleFocus"
        />

        <!-- Mobile search input (that opens modal) -->
        <UInput
          v-else
          :icon="isLoading ? 'i-lucide-refresh-ccw' : 'i-lucide-search'"
          :placeholder="t('search.placeholder')"
          class="search-input w-full py-1.5 rounded-md bg-gray-100 dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-primary-500 text-base"
          type="search"
          @focus="openMobileSearch"
        />
      </div>
    </form>

    <!-- Desktop Search Results using Dropdown component -->
    <Dropdown
      v-model="shouldShowDropdown"
      position="bottom"
      align="center"
      :smart-position="true"
      width="800px"
      :max-height="70"
    >
      <template #trigger>
        <!-- Empty invisible trigger because we control open state separately -->
        <div class="invisible h-0 w-0"></div>
      </template>

      <div class="dropdown-content p-2 divide-y divide-gray-100 dark:divide-gray-700">
        <!-- Search Header -->
        <div class="flex items-center justify-between mb-2">
          <h3 class="text-base font-medium text-gray-800 dark:text-gray-200">
            {{ t('search.results') }}
          </h3>
        </div>

        <!-- Categorized Results with dynamic column count -->
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 pt-2"
             :style="{ 'grid-template-columns': `repeat(${columnCount}, minmax(0, 1fr))` }">
          <template v-for="(hits, type) in groupedResults" :key="type">
            <div class="category-section">
              <!-- Category Heading -->
              <div class="category-heading flex items-center mt-1 mb-2 px-2">
                <UIcon
                  :name="getIconForEntityType(type)"
                  class="mr-2"
                  :class="getColorForEntityType(type)"
                />
                <h3 class="text-sm font-semibold text-gray-700 dark:text-gray-300">
                  {{ getCategoryLabel(type) }}
                </h3>
              </div>

              <!-- Category Items -->
              <div class="category-items">
                <div
                  v-for="(hit, index) in hits.slice(0, 5)"
                  :key="`${hit.id}-${index}`"
                  class="search-result-item py-1.5 px-3 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md cursor-pointer transition-colors"
                  :class="{
                    'bg-gray-100 dark:bg-gray-700 active':
                      flattenedResults.indexOf(hit) === activeItemIndex
                  }"
                  @click="handleResultClick(hit)"
                >
                  <div class="flex items-center">
                    <div class="flex-1 min-w-0">
                      <div class="font-medium text-sm truncate text-gray-800 dark:text-gray-200">{{ hit.name }}</div>
                    </div>
                  </div>
                </div>

                <!-- Show more if there are more than 5 results in this category -->
                <div v-if="hits.length > 5" class="text-center mt-1">
                  <button
                    class="text-xs text-primary-600 dark:text-primary-400 hover:underline py-1 cursor-pointer"
                    @click="navigateToSearch(); shouldShowDropdown = false;"
                  >
                    +{{ hits.length - 5 }} {{ t('search.more') }}
                  </button>
                </div>
              </div>
            </div>
          </template>
        </div>

        <!-- View all results button - FIX FOR NULL REFERENCE -->
        <div class="pt-2 mt-2">
          <button
            class="w-full text-center py-2 px-3 text-sm text-primary-600 dark:text-primary-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md cursor-pointer"
            @click="navigateToSearch(); shouldShowDropdown = false;"
          >
            {{ t('search.viewAllResults', { count: results?.estimatedTotalHits || results?.hits?.length || 0 }) }}
          </button>
        </div>
      </div>
    </Dropdown>

    <!-- Mobile Fullscreen Search using the shared modal component -->
    <MobileFullscreen
      :open="isFullscreenMobile"
      :title="t('search.title', 'Search')"
      @close="closeMobileSearch"
    >
      <!-- Custom header slot with search input -->
      <template #header>
        <div class="flex items-center flex-grow mr-3 w-full">
          <UIcon
            :name="isLoading ? 'lucide:refresh-ccw' : 'lucide:search'"
            :class="{'animate-spin': isLoading}"
            class="text-gray-400 mr-3"
          />
          <input
            id="mobile-search-input"
            v-model="query"
            :placeholder="t('search.placeholder')"
            class="w-full py-1.5 bg-transparent border-none text-lg focus:outline-none text-gray-900 dark:text-white"
            type="search"
            @keydown="handleKeydown"
            autocomplete="off"
            autofocus
          />
        </div>
      </template>

      <!-- Search results content -->
      <div v-if="results && results.hits && results.hits.length > 0">
        <div v-for="(hits, type) in groupedResults" :key="type" class="mb-6">
          <!-- Type Header -->
          <div class="flex items-center mt-1 mb-2">
            <UIcon
              :name="getIconForEntityType(type)"
              class="mr-2 text-lg"
              :class="getColorForEntityType(type)"
            />
            <h3 class="text-lg font-semibold text-gray-800 dark:text-gray-200">
              {{ getCategoryLabel(type) }}
            </h3>
          </div>

          <!-- Results -->
          <div class="space-y-2">
            <div
              v-for="(hit, index) in hits.slice(0, 5)"
              :key="`${hit.id}-${index}`"
              class="search-result-item p-3 bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md cursor-pointer transition-colors"
              :class="{
                'bg-gray-100 dark:bg-gray-700 border-l-4 border-primary-500':
                  flattenedResults.indexOf(hit) === activeItemIndex
              }"
              @click="handleResultClick(hit)"
            >
              <div class="font-medium text-gray-800 dark:text-gray-200">
                {{ hit.name }}
              </div>
              <div class="text-sm text-gray-500 dark:text-gray-400">
                {{ capitalizeFirstLetter(hit.type) }}
              </div>
            </div>

            <!-- "Show more" button if there are more than 5 results in this category -->
            <button
              v-if="hits.length > 5"
              class="w-full text-center py-2 px-3 text-sm text-primary-600 dark:text-primary-400 bg-gray-50 dark:bg-gray-800/30 hover:bg-gray-100 dark:hover:bg-gray-700/50 rounded-md"
              @click="navigateToSearch({ category: type }); isFullscreenMobile = false;"
            >
              {{ t('search.showMoreCategory', { count: hits.length - 5, category: getCategoryLabel(type).toLowerCase() }) }}
            </button>
          </div>
        </div>
      </div>

      <!-- No results or searching -->
      <div
        v-else-if="query.length >= 3"
        class="flex flex-col items-center justify-center min-h-[60vh] text-center text-gray-600 dark:text-gray-400"
      >
        <UIcon name="lucide:search" class="text-5xl mb-4" />
        <p v-if="isLoading">{{ t('search.searching') }}</p>
        <p v-else>{{ t('search.noResults') }}</p>
      </div>

      <!-- Type to search -->
      <div
        v-else
        class="flex flex-col items-center justify-center min-h-[60vh] text-center text-gray-600 dark:text-gray-400"
      >
        <UIcon name="lucide:search" class="text-5xl mb-4" />
        <p>{{ t('search.placeholder') }}</p>
      </div>

      <!-- Footer slot for search all button - FIX FOR NULL REFERENCE -->
      <template #footer>
        <div v-if="results && results.hits && results.hits.length > 0" class="fixed-bottom-button">
          <button
            class="w-full py-2 px-4 bg-primary-500 hover:bg-primary-600 text-white rounded-md font-medium transition-colors"
            @click="navigateToSearch(); isFullscreenMobile = false;"
          >
            {{ t('search.viewAllResults', { count: results?.estimatedTotalHits || results?.hits?.length || 0 }) }}
          </button>
        </div>
      </template>
    </MobileFullscreen>
  </div>
</template>

<style scoped>
@media (min-width: 768px) {
  .search-input {
    width: 320px; /* Wider on desktop */
  }
}

@media (min-width: 1024px) {
  .search-input {
    width: 360px; /* Even wider on larger screens */
  }
}

/* Category styling */
.category-heading {
  position: sticky;
  top: 0;
  background: inherit;
  z-index: 1;
}

/* Prevent iOS zoom on input focus */
@media (max-width: 767px) {
  input[type="search"] {
    font-size: 16px !important; /* Minimum font size to prevent iOS zoom */
  }
}

/* Fixed bottom button styling (for "View all results" button) */
.fixed-bottom-button {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 0.5rem;
  background-color: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  border-top: 1px solid rgba(229, 231, 235);
  z-index: 10;
}

:root.dark .fixed-bottom-button {
  background-color: rgba(0, 0, 0, 0.9);
  border-top-color: rgba(55, 65, 81);
}

/* Ensure all buttons and interactive elements have pointer cursor */
button,
.search-result-item,
a {
  cursor: pointer;
}
</style>
