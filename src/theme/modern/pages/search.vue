<template>
    <div class="container mx-auto">
        <div class="mb-8">
            <h1 class="text-3xl font-bold mb-2">{{ $t('searchResults', { query: capitalizeWords(searchQuery) }) }}</h1>
        </div>

        <!-- Search form -->
        <form @submit.prevent="performSearch" class="mb-8">
            <div class="flex items-center relative">
                <UInput v-model="searchQuery" :placeholder="$t('searchFor')"
                    :icon="isLoading ? 'lucide:loader' : 'lucide:search'" :icon-class="isLoading ? 'animate-spin' : ''"
                    size="lg" class="w-full md:w-1/2" ref="searchInputRef" />
                <UButton type="submit" color="primary" class="ml-2" :loading="isLoading" :disabled="isLoading">
                    {{ $t('searchButton') }}
                </UButton>
            </div>
        </form>

        <!-- Results -->
        <template v-if="results && results.hits.length > 0">
            <div class="mb-6 flex items-center justify-between">
                <div>
                    <span class="text-sm text-gray-600 dark:text-gray-400">
                        {{ $t('searchFound', { count: results.estimatedTotalHits }) }}
                        <span class="text-xs">({{ $t('processingTimeMs', { time: results.processingTimeMs })
                            }})</span>
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
                                    <UIcon :name="getIconForEntityType(type)" class="mr-2 text-2xl"
                                        :class="getColorForEntityType(type)" />
                                    <h3 class="text-xl font-bold">{{ capitalizeFirstLetter(type) }}</h3>
                                    <UBadge variant="subtle" size="sm" class="ml-2"
                                        :class="getBadgeColorForEntityType(type)">
                                        {{ group.length }}
                                    </UBadge>
                                </div>
                            </template>

                            <!-- Results list -->
                            <ul class="space-y-2">
                                <li v-for="hit in group" :key="hit.id"
                                    class="border border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-750 rounded-md transition-all">
                                    <UButton :to="`/${hit.type}/${hit.id}`" variant="ghost" block
                                        class="justify-between h-auto py-2">
                                        <span class="font-medium">{{ hit.name }}</span>
                                        <UIcon name="lucide:arrow-right" class="text-gray-400" />
                                    </UButton>
                                </li>
                            </ul>

                            <!-- See more button for this type if many results -->
                            <template #footer v-if="getHitCountByType(type) > group.length">
                                <UButton variant="soft" size="sm" block @click="loadMoreForType(type)"
                                    :loading="loadingMoreTypes[type]" color="secondary">
                                    {{ $t('more', {
                                        type: capitalizeFirstLetter(type) + 's', count:
                                            getHitCountByType(type)
                                    }) }}
                                </UButton>
                            </template>
                        </UCard>
                    </div>
                </template>
            </div>
        </template>

        <!-- No results state -->
        <UAlert v-else-if="results && results.hits.length === 0 && !isLoading" :title="$t('search.noResultsTitle')"
            icon="lucide:info" color="warning">
            {{ $t('search.noResultsDesc') }}
        </UAlert>

        <!-- Initial state - no search yet -->
        <div v-else-if="!results && !isLoading" class="text-center py-12">
            <UIcon name="lucide:search" class="text-6xl mx-auto mb-4 text-gray-400" />
            <h2 class="text-xl font-medium text-gray-600 dark:text-gray-400">{{ $t('search.initialMessage') }}</h2>
        </div>

        <!-- Loading state shown only on initial load, not during auto-search -->
        <div v-else-if="isLoading && !results" class="flex justify-center py-8">
            <UIcon name="lucide:loader" class="text-4xl animate-spin text-primary-500" />
        </div>
    </div>
</template>

<script setup lang="ts">
import { type SearchHit, type SearchResponse, useSearch } from "~/composables/useSearch";

const { t } = useI18n();
const route = useRoute();
const { search, isLoading, error, currentLocale } = useSearch();
const results = ref<SearchResponse | null>(null);
const searchQuery = ref((route.query.q as string) || "");
const searchInputRef = ref<HTMLInputElement | null>(null);

// Initialize auto search functionality
const autoSearchEnabled = ref(false);
const initAutoSearch = () => {
    // Create a watcher that will perform search when searchQuery changes
    watch(
        searchQuery,
        (newQuery) => {
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
                navigateTo(
                    {
                        path: "/search",
                        query: {},
                    },
                    { replace: true },
                );
            }
        },
        { immediate: false },
    );

    // Also watch for locale changes and re-search if we have an active query
    watch(currentLocale, () => {
        if (searchQuery.value && searchQuery.value.trim().length >= 3) {
            performSearch();
        }
    });

    // Mark auto-search as ready after initial setup
    autoSearchEnabled.value = true;
};

// Update the URL with the search query without triggering a route change
const updateSearchUrl = (query: string) => {
    if (import.meta.client) {
        const url = new URL(window.location.href);
        url.searchParams.set("q", query);
        window.history.replaceState({}, "", url.toString());
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
    const knownTypes = ["character", "corporation", "alliance", "ship", "item", "system", "region"];
    for (const type of knownTypes) {
        grouped[type] = [];

        // Initialize results per type count if not set
        if (resultsPerType.value[type] === undefined) {
            resultsPerType.value[type] = INITIAL_RESULTS_PER_TYPE;
        }
    };

    // Group hits by type
    results.value.hits.forEach((hit) => {
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
    return results.value.hits.filter((hit) => hit.type.toLowerCase() === type.toLowerCase()).length;
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
        case "character":
            return "order-1";
        case "corporation":
            return "order-2";
        case "alliance":
            return "order-3";
        case "ship":
            return "order-4";
        case "item":
            return "order-5";
        case "system":
            return "order-6";
        case "region":
            return "order-7";
        default:
            return "order-8";
    }
};

// Get the appropriate icon for each entity type
const getIconForEntityType = (type: string) => {
    switch (type.toLowerCase()) {
        case "character":
            return "lucide:user";
        case "corporation":
            return "lucide:building";
        case "alliance":
            return "lucide:users";
        case "ship":
            return "lucide:rocket";
        case "item":
            return "lucide:box";
        case "system":
            return "lucide:globe";
        case "region":
            return "lucide:map";
        default:
            return "lucide:help-circle";
    }
};

// Get the appropriate color for each entity type
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

// Get the appropriate badge color class for each entity type
const getBadgeColorForEntityType = (type: string) => {
    switch (type.toLowerCase()) {
        case "character":
            return "badge-blue";
        case "corporation":
            return "badge-green";
        case "alliance":
            return "badge-purple";
        case "ship":
            return "badge-red";
        case "item":
            return "badge-orange";
        case "system":
            return "badge-teal";
        case "region":
            return "badge-indigo";
        default:
            return "badge-gray";
    }
};

// Helper to capitalize first letter of a string
const capitalizeFirstLetter = (string: string) => {
    return string.charAt(0).toUpperCase() + string.slice(1);
};

// Helper to capitalize the first letter of each word in a string
const capitalizeWords = (string: string) => {
    if (!string) return "";
    return string
        .split(" ")
        .map((word) => capitalizeFirstLetter(word))
        .join(" ");
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

        // Perform the search with the current locale
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
            const nativeInput = searchInputRef.value.$el.querySelector("input");
            if (nativeInput) {
                nativeInput.focus();
                nativeInput.select(); // Select all text in the input
            }
        }
    });
});

// Define page metadata using useSeoMeta instead of useHead
useSeoMeta({
    title: computed(() => (searchQuery.value ? `${searchQuery.value} - searchResults` : "Search")),
});
</script>

<style scoped>
/* Custom badge color classes */
.badge-blue {
    background-color: rgba(59, 130, 246, 0.1);
    color: rgb(59, 130, 246);
}

.badge-green {
    background-color: rgba(16, 185, 129, 0.1);
    color: rgb(16, 185, 129);
}

.badge-purple {
    background-color: rgba(139, 92, 246, 0.1);
    color: rgb(139, 92, 246);
}

.badge-red {
    background-color: rgba(239, 68, 68, 0.1);
    color: rgb(239, 68, 68);
}

.badge-orange {
    background-color: rgba(249, 115, 22, 0.1);
    color: rgb(249, 115, 22);
}

.badge-teal {
    background-color: rgba(20, 184, 166, 0.1);
    color: rgb(20, 184, 166);
}

.badge-indigo {
    background-color: rgba(99, 102, 241, 0.1);
    color: rgb(99, 102, 241);
}

.badge-gray {
    background-color: rgba(107, 114, 128, 0.1);
    color: rgb(107, 114, 128);
}
</style>
