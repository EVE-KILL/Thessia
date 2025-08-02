<script setup lang="ts">
import { computed, nextTick, ref } from "vue";

const { t } = useI18n();
const { isMobile } = useResponsive();

// Search component reference
const searchRef = ref<any>(null);
const mobileSearchRef = ref<any>(null);

// Mobile search state
const isFullscreenMobile = ref(false);

// Search query state
const searchQuery = ref('');

// API configuration for the search
const apiUrl = computed(() => (query: string) => `/api/search/${encodeURIComponent(query)}`);

// Transform the API response to our expected format
const transformResponse = (response: any) => {
    if (response?.data?.hits) {
        return response.data.hits;
    }
    if (response?.hits) {
        return response.hits;
    }
    return [];
};

// Group results by type for display
const groupResultsByType = (results: any[]) => {
    const grouped: Record<string, any[]> = {};
    results.forEach(result => {
        if (!grouped[result.type]) {
            grouped[result.type] = [];
        }
        grouped[result.type]!.push(result);
    });
    return grouped;
};

// Handle result selection
const handleResultSelected = (hit: any) => {
    // Map ship type back to item for navigation since ships are items in the database
    const routeType = hit.type === 'ship' ? 'item' : hit.type;
    navigateTo(`/${routeType}/${hit.id}`);
    // Clear search and close mobile if needed
    searchQuery.value = '';
    isFullscreenMobile.value = false;
};

// Handle view all results
const handleViewAllResults = () => {
    const { navigateToSearch } = useSearch();
    navigateToSearch();
    isFullscreenMobile.value = false;
    searchQuery.value = '';
};

// Helper functions for entity types
const getIconForEntityType = (type: string) => {
    switch (type.toLowerCase()) {
        case "character":
            return "lucide:user";
        case "corporation":
            return "lucide:building";
        case "alliance":
            return "lucide:users";
        case "ship":
            return "lucide:ship";
        case "item":
            return "lucide:box";
        case "system":
            return "lucide:globe";
        case "region":
            return "lucide:map";
        default:
            return "lucide:circle";
    }
};

const getColorForEntityType = (type: string) => {
    switch (type.toLowerCase()) {
        case "character":
            return "text-blue-600 dark:text-blue-400";
        case "corporation":
            return "text-green-600 dark:text-green-400";
        case "alliance":
            return "text-purple-600 dark:text-purple-400";
        case "ship":
            return "text-red-600 dark:text-red-400";
        case "item":
            return "text-orange-600 dark:text-orange-400";
        case "system":
            return "text-teal-600 dark:text-teal-400";
        case "region":
            return "text-indigo-600 dark:text-indigo-400";
        default:
            return "text-gray-600 dark:text-gray-400";
    }
};

// Helper to get category label
const getCategoryLabel = (type: string) => {
    const key = `${type}`;
    return t(key);
};

// Helper to capitalize first letter of a string
const capitalizeFirstLetter = (string: string) => {
    return string.charAt(0).toUpperCase() + string.slice(1);
};

// Helper function to determine if entity type should show ticker
const shouldShowTicker = (type: string) => {
    return ['corporation', 'alliance'].includes(type.toLowerCase());
};

// Close mobile fullscreen search
const closeMobileSearch = () => {
    isFullscreenMobile.value = false;
    searchRef.value?.clearSearch();
};

// Open mobile search
const openMobileSearch = () => {
    isFullscreenMobile.value = true;
    nextTick(() => {
        // Focus the input in the modal after it opens
        const searchInput = document.getElementById("mobile-search-input");
        if (searchInput) {
            searchInput.focus();
        }
    });
};

// Handle mobile search navigation with category
const navigateToSearchWithCategory = (category?: string) => {
    const { navigateToSearch } = useSearch();
    navigateToSearch({ category });
    isFullscreenMobile.value = false;
};

// Get entity image URL
const getEntityImageUrl = (entity: any, type: string) => {
    if (type === 'corporation') {
        return `https://images.evetech.net/corporations/${entity.id}/logo?size=64`;
    } else if (type === 'alliance') {
        return `https://images.evetech.net/alliances/${entity.id}/logo?size=64`;
    } else if (type === 'character') {
        return `https://images.evetech.net/characters/${entity.id}/portrait?size=64`;
    }
    return '';
};
</script>

<template>
    <div class="search-container w-full relative">
        <!-- Desktop Search -->
        <div v-if="!isMobile">
            <Search ref="searchRef" v-model="searchQuery" :placeholder="t('searchFor')" :min-length="3"
                :debounce-ms="300" :api-url="apiUrl" :transform-response="transformResponse"
                :result-key="(result) => result.id" :result-name="(result) => result.name"
                :result-type="(result) => result.type"
                :result-image="(result) => getEntityImageUrl(result, result.type)" wrapper-class="w-full"
                dropdown-class="min-w-[900px] !bg-white dark:!bg-gray-800 !border !border-gray-200 dark:!border-gray-700 !rounded-lg !shadow-lg max-h-96 overflow-y-auto !left-1/2 !transform !-translate-x-1/2"
                @select="handleResultSelected">

                <!-- Custom input slot for desktop with navbar styling -->
                <template #input="{ modelValue, updateQuery, isLoading }">
                    <div class="relative">
                        <input :value="modelValue" @input="updateQuery" :placeholder="t('searchFor')"
                            class="custom-input search-input with-icon" type="search" />
                        <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <UIcon :name="isLoading ? 'i-lucide-refresh-ccw' : 'i-lucide-search'"
                                :class="{ 'animate-spin': isLoading }" class="text-gray-400" />
                        </div>
                    </div>
                </template>

                <!-- Custom results slot for navbar styling -->
                <template #results="{ results, selectResult, highlightedIndex }">
                    <div class="p-4">
                        <!-- Search Header -->
                        <div class="flex items-center justify-between mb-4">
                            <h3 class="text-base font-medium text-gray-800 dark:text-gray-200">
                                {{ t('searchResults') }}
                            </h3>
                        </div>

                        <!-- Group results by type -->
                        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            <template v-for="(hits, type) in groupResultsByType(results)" :key="type">
                                <div class="category-section">
                                    <!-- Category Heading -->
                                    <div class="category-heading flex items-center mb-3">
                                        <UIcon :name="getIconForEntityType(String(type))" class="mr-2"
                                            :class="getColorForEntityType(String(type))" />
                                        <h3 class="text-sm font-semibold text-gray-700 dark:text-gray-300">
                                            {{ getCategoryLabel(String(type)) }}
                                        </h3>
                                    </div>

                                    <!-- Category Items -->
                                    <div class="category-items space-y-1">
                                        <div v-for="(hit, index) in hits.slice(0, 5)" :key="`${hit.id}-${index}`"
                                            class="search-result-item py-2 px-3 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md cursor-pointer transition-colors"
                                            :class="{
                                                'bg-gray-100 dark:bg-gray-700 active':
                                                    results.indexOf(hit) === highlightedIndex
                                            }" @click="selectResult(hit)">
                                            <div class="flex items-center">
                                                <!-- Entity Image -->
                                                <div class="flex-shrink-0 mr-3">
                                                    <Image :type="hit.type === 'ship' ? 'type-icon' : hit.type"
                                                        :id="hit.id" :size="32" />
                                                </div>

                                                <div class="flex-1 min-w-0">
                                                    <!-- Entity Name (with truncation) -->
                                                    <div
                                                        class="font-medium text-sm text-gray-800 dark:text-gray-200 truncate">
                                                        {{ hit.name }}
                                                    </div>

                                                    <!-- Ticker (if applicable) -->
                                                    <div v-if="hit.ticker && shouldShowTicker(hit.type)"
                                                        class="text-xs text-gray-500 dark:text-gray-400">
                                                        [{{ hit.ticker }}]
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <!-- Show more if there are more than 5 results in this category -->
                                        <div v-if="hits.length > 5" class="text-center pt-2">
                                            <button
                                                class="text-xs text-primary-600 dark:text-primary-400 hover:underline py-1 cursor-pointer"
                                                @click="handleViewAllResults">
                                                +{{ hits.length - 5 }} {{ t('more') }}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </template>
                        </div>

                        <!-- View all results button -->
                        <div class="pt-4 mt-4 border-t border-gray-200 dark:border-gray-700">
                            <button
                                class="w-full text-center py-2 px-3 text-sm text-primary-600 dark:text-primary-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md cursor-pointer"
                                @click="handleViewAllResults">
                                {{ t('viewAllResults', { count: results.length }) }}
                            </button>
                        </div>
                    </div>
                </template>
            </Search>
        </div>

        <!-- Mobile Search (trigger only) -->
        <div v-else class="relative">
            <input :placeholder="t('searchFor')" class="custom-input search-input with-icon" type="search"
                @focus="openMobileSearch" />
            <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <UIcon name="i-lucide-search" class="text-gray-400" />
            </div>
        </div>

        <!-- Mobile Fullscreen Search using the shared modal component -->
        <MobileFullscreen :open="isFullscreenMobile" :title="t('searchTitle')" @close="closeMobileSearch">
            <!-- Custom header slot with search input -->
            <template #header>
                <Search ref="mobileSearchRef" v-model="searchQuery" :placeholder="t('searchFor')" :min-length="3"
                    :debounce-ms="300" :api-url="apiUrl" :transform-response="transformResponse"
                    :result-key="(result) => result.id" :result-name="(result) => result.name"
                    :result-type="(result) => result.type"
                    :result-image="(result) => getEntityImageUrl(result, result.type)" @select="handleResultSelected">

                    <!-- Custom input for mobile fullscreen -->
                    <template #input="{ modelValue, updateQuery, isLoading }">
                        <div class="flex items-center flex-grow mr-3 w-full">
                            <UIcon :name="isLoading ? 'lucide:refresh-ccw' : 'lucide:search'"
                                :class="{ 'animate-spin': isLoading }" class="text-gray-400 mr-3" />
                            <input id="mobile-search-input" :value="modelValue" @input="updateQuery"
                                :placeholder="t('searchFor')"
                                class="w-full py-1.5 bg-transparent border-none text-lg focus:outline-none text-gray-900 dark:text-white"
                                type="search" autocomplete="off" autofocus />
                        </div>
                    </template>

                    <!-- Custom results for mobile - render inline instead of dropdown -->
                    <template #results="{ results, selectResult, highlightedIndex, isLoading }">
                        <!-- Mobile search results content -->
                        <div v-if="results && results.length > 0">
                            <div v-for="(hits, type) in groupResultsByType(results)" :key="type" class="mb-6">
                                <!-- Type Header -->
                                <div class="flex items-center mt-1 mb-2">
                                    <UIcon :name="getIconForEntityType(String(type))" class="mr-2 text-lg"
                                        :class="getColorForEntityType(String(type))" />
                                    <h3 class="text-lg font-semibold text-gray-800 dark:text-gray-200">
                                        {{ getCategoryLabel(String(type)) }}
                                    </h3>
                                </div>

                                <!-- Results -->
                                <div class="space-y-2">
                                    <div v-for="(hit, index) in hits.slice(0, 5)" :key="`${hit.id}-${index}`"
                                        class="search-result-item p-3 bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md cursor-pointer transition-colors"
                                        :class="{
                                            'bg-gray-100 dark:bg-gray-700 border-l-4 border-primary-500':
                                                results.indexOf(hit) === highlightedIndex
                                        }" @click="selectResult(hit)">
                                        <div class="flex items-center">
                                            <!-- Entity Image -->
                                            <div class="flex-shrink-0 mr-3">
                                                <Image :type="hit.type === 'ship' ? 'type-icon' : hit.type" :id="hit.id"
                                                    :size="40" />
                                            </div>

                                            <div class="flex-1 min-w-0 flex items-center">
                                                <!-- Entity Name (with truncation) -->
                                                <div class="font-medium text-gray-800 dark:text-gray-200 truncate mr-2">
                                                    {{ hit.name }}
                                                </div>

                                                <!-- Ticker (if applicable) -->
                                                <div v-if="hit.ticker && shouldShowTicker(hit.type)"
                                                    class="text-sm text-gray-500 dark:text-gray-400 flex-shrink-0">
                                                    [{{ hit.ticker }}]
                                                </div>

                                                <!-- Type (if no ticker) -->
                                                <div v-else
                                                    class="text-sm text-gray-500 dark:text-gray-400 flex-shrink-0">
                                                    {{ capitalizeFirstLetter(hit.type) }}
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <!-- "Show more" button if there are more than 5 results in this category -->
                                    <button v-if="hits.length > 5"
                                        class="w-full text-center py-2 px-3 text-sm text-primary-600 dark:text-primary-400 bg-gray-50 dark:bg-gray-800/30 hover:bg-gray-100 dark:hover:bg-gray-700/50 rounded-md"
                                        @click="navigateToSearchWithCategory(String(type))">
                                        {{ t('searchShowMoreCategoryXCountY', {
                                            count: hits.length - 5, category:
                                                getCategoryLabel(String(type)).toLowerCase()
                                        }) }}
                                    </button>
                                </div>
                            </div>
                        </div>

                        <!-- No results or searching -->
                        <div v-else-if="searchQuery.length >= 3"
                            class="flex flex-col items-center justify-center min-h-[60vh] text-center text-gray-600 dark:text-gray-400">
                            <UIcon name="lucide:search" class="text-5xl mb-4" />
                            <p v-if="isLoading">{{ t('searching') }}</p>
                            <p v-else>{{ t('noResults') }}</p>
                        </div>

                        <!-- Type to search -->
                        <div v-else
                            class="flex flex-col items-center justify-center min-h-[60vh] text-center text-gray-600 dark:text-gray-400">
                            <UIcon name="lucide:search" class="text-5xl mb-4" />
                            <p>{{ t('searchFor') }}</p>
                        </div>
                    </template>
                </Search>
            </template>

            <!-- Footer slot for search all button -->
            <template #footer>
                <div v-if="searchQuery && searchQuery.length >= 3" class="fixed-bottom-button">
                    <button
                        class="w-full py-2 px-4 bg-primary-500 hover:bg-primary-600 text-white rounded-md font-medium transition-colors"
                        @click="handleViewAllResults">
                        {{ t('viewAllResults') }}
                    </button>
                </div>
            </template>
        </MobileFullscreen>
    </div>
</template>

<style scoped>
/* Search input takes full available width */
.search-input {
    width: 100%;
}

/* Medium screens and up */
@media (min-width: 768px) {
    .search-container {
        width: 100%;
        max-width: 640px;
    }
}

/* Large screens */
@media (min-width: 1024px) {
    .search-container {
        max-width: 720px;
    }
}

/* X-Large screens */
@media (min-width: 1280px) {
    .search-container {
        max-width: 800px;
    }
}

/* Custom input styling matching battle generator */
.custom-input {
    display: block;
    width: 100%;
    height: 38px;
    padding: 0.5rem 0.75rem;
    font-size: 0.875rem;
    font-family: inherit;
    color: #111827;
    background-color: white;
    border: 1px solid #d1d5db;
    border-radius: 0.375rem;
    box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
    outline: none;
    transition: border-color 0.15s ease-in-out, box-shadow 0.15s ease-in-out;
}

/* Style for input with icon - ensures text doesn't overlap with the icon */
.custom-input.with-icon {
    padding-left: 2rem;
    /* Increased padding to make room for icon */
}

/* Make sure placeholder text is also properly positioned */
.custom-input.with-icon::placeholder {
    color: #9ca3af;
}

/* Dark mode styles */
.dark .custom-input {
    color: #f9fafb;
    background-color: #1f2937;
    border-color: #4b5563;
}

.dark .custom-input:focus {
    border-color: #60a5fa;
    box-shadow: 0 0 0 2px rgba(96, 165, 250, 0.3);
}

.dark .custom-input:disabled {
    background-color: #374151;
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
        font-size: 16px !important;
        /* Minimum font size to prevent iOS zoom */
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

/* Additional styling for the redesigned dropdown items */
.search-result-item {
    transition: all 0.15s ease;
}

.category-items .search-result-item:hover {
    transform: translateX(2px);
}
</style>
