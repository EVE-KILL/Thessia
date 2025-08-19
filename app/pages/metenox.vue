<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';

const { t, locale } = useI18n();
const router = useRouter();
const currentLocale = computed(() => locale.value);

// Use the centralized date formatting composable
const { formatTimeAgo, formatDateDisplay } = useDateFormatting();

const currentPage = ref(1);
const pageSizeItems = [
    { label: "10", value: 10 },
    { label: "25", value: 25 },
    { label: "50", value: 50 },
    { label: "100", value: 100 },
];
const selectedPageSize = ref(pageSizeItems[0]?.value || 10);

// Filter and search state
const searchQuery = ref('');
const selectedSystemId = ref<number | null>(null);
const selectedRegionId = ref<number | null>(null);
const selectedMoonGooTypes = ref<string[]>([]); // For moon goo quality filtering
const selectedLocationName = ref(''); // Store the selected system or region name for display

// Search results for the main search box
const locationSearchResults = ref<{ id: number; name: string; type: 'system' | 'region' }[]>([]);
const selectedLocationResultIndex = ref(-1);
const lastLocationSearchTerm = ref('');
const justSelectedLocation = ref(false);

// Computed property to determine if any filter is active
const hasActiveFilters = computed(() => {
    return searchQuery.value !== '' || selectedSystemId.value || selectedRegionId.value || selectedMoonGooTypes.value.length > 0;
});

// Track if this is the initial data load for UI treatment
const isInitialLoad = ref(true);
// Track if we're on the client side to avoid hydration mismatches
const isClient = ref(false);

// Computed API endpoint based on filter
const apiEndpoint = computed(() => {
    if (selectedSystemId.value) {
        return `/api/intel/metenox/system/${selectedSystemId.value}`;
    } else if (selectedRegionId.value) {
        return `/api/intel/metenox/region/${selectedRegionId.value}`;
    }
    return '/api/intel/metenox';
});

const { data, pending, error, refresh } = await useFetch<IMetenoxMoonResult[]>(apiEndpoint, {
    key: 'metenox-list',
    server: false, // Client-side only for filtered data
    default: () => [],
    watch: [apiEndpoint], // Re-fetch when endpoint changes
});

// Use computed values that fall back to empty array when real data isn't loaded yet
const metenoxList = computed(() => {
    let list = data.value || [];

    // Apply text search filter (only if no location filter is active)
    if (searchQuery.value && !selectedSystemId.value && !selectedRegionId.value) {
        const query = searchQuery.value.toLowerCase();
        list = list.filter(moon =>
            moon.system_name.toLowerCase().includes(query) ||
            moon.region_name.toLowerCase().includes(query) ||
            moon.moon_name.toLowerCase().includes(query)
        );
    }

    // Apply moon goo type filter
    if (selectedMoonGooTypes.value.length > 0) {
        list = list.filter(moon => {
            if (!moon.moonType || Object.keys(moon.moonType).length === 0) {
                return false;
            }

            // Check if the moon has any of the selected goo types with count > 0
            return selectedMoonGooTypes.value.some(selectedType =>
                moon.moonType[selectedType] && moon.moonType[selectedType] > 0
            );
        });
    }

    return list;
});

// Pagination
const totalItems = computed(() => metenoxList.value.length);
const totalPages = computed(() => Math.ceil(totalItems.value / selectedPageSize.value));
const paginatedList = computed(() => {
    const start = (currentPage.value - 1) * selectedPageSize.value;
    const end = start + selectedPageSize.value;
    return metenoxList.value.slice(start, end);
});

// Watch for pending changes to track initial load state
watch(() => pending.value, (newPending) => {
    // If we're no longer pending and it was the initial load, update that state
    if (!newPending && isInitialLoad.value) {
        isInitialLoad.value = false;
    }
}, { immediate: true });

// Function to handle data refresh
const loadData = async () => {
    try {
        await refresh();
    } catch (err) {
        console.error('Error refreshing metenox data:', err);
    }
};

// On component mount, trigger the data fetch
onMounted(() => {
    // useFetch will handle the initial load automatically
    // No need for manual loading management
    isClient.value = true;
});

// Watch for changes to system search query
watch(searchQuery, (newTerm) => {
    if (justSelectedLocation.value) return;

    if (newTerm && newTerm.length >= 2) {
        debouncedLocationSearch(newTerm);
    } else {
        locationSearchResults.value = [];
    }

    selectedLocationResultIndex.value = -1;
});

// Watch for search query changes and reset page
watch(searchQuery, () => {
    currentPage.value = 1;
});

const columns = [
    { id: 'moon', header: t('metenoxMoons.moon', 'Moon'), width: '30%' },
    { id: 'location', header: t('metenoxMoons.location', 'Location'), width: '35%' },
    { id: 'moonType', header: t('metenoxMoons.moonType', 'Moon Goo'), width: '35%' },
];

const linkFn = (item: IMetenoxMoonResult) => {
    if (!item || !item.killmail_id) {
        console.error('Attempted to create link for metenox with missing killmail ID:', item);
        return '/metenox'; // Redirect to metenox list as fallback
    }
    return `/kill/${item.killmail_id}`;
};

const generateSkeletonRows = (count: number) => {
    return Array(count)
        .fill(0)
        .map((_, index) => ({
            isLoading: true,
        }));
};
const skeletonRows = computed(() => generateSkeletonRows(selectedPageSize.value));

// Filter functions
const clearAllFilters = () => {
    searchQuery.value = '';
    selectedSystemId.value = null;
    selectedRegionId.value = null;
    selectedLocationName.value = '';
    selectedMoonGooTypes.value = [];
    locationSearchResults.value = [];
    currentPage.value = 1; // Reset to first page when clearing filters
};

// Get moon goo type display
const getMoonGooDisplay = (moonType: Record<string, number>) => {
    if (!moonType || Object.keys(moonType).length === 0) {
        return [];
    }

    return Object.entries(moonType)
        .filter(([_, count]) => count > 0)
        .map(([type, count]) => ({ type, count }))
        .sort((a, b) => {
            // Sort by rarity (R64 first, then R32, etc.)
            const order = { 'R64': 1, 'R32': 2, 'R16': 3, 'R8': 4, 'R4': 5 };
            return (order[a.type as keyof typeof order] || 99) - (order[b.type as keyof typeof order] || 99);
        });
};

// Get color for moon goo type
const getMoonGooColor = (type: string): "primary" | "secondary" | "success" | "info" | "warning" | "neutral" => {
    const colors: Record<string, "primary" | "secondary" | "success" | "info" | "warning" | "neutral"> = {
        'R64': 'warning',    // purple -> warning (yellow/amber)
        'R32': 'info',       // blue -> info
        'R16': 'success',    // green -> success
        'R8': 'secondary',   // yellow -> secondary
        'R4': 'neutral'      // gray -> neutral
    };
    return colors[type] || 'neutral';
};

// Available moon goo types for filtering
const availableMoonGooTypes: Array<{ value: string; label: string; color: "primary" | "secondary" | "success" | "info" | "warning" | "neutral" }> = [
    { value: 'R64', label: 'R64', color: 'warning' },    // purple -> warning
    { value: 'R32', label: 'R32', color: 'info' },       // blue -> info
    { value: 'R16', label: 'R16', color: 'success' },    // green -> success
    { value: 'R8', label: 'R8', color: 'secondary' },    // yellow -> secondary
    { value: 'R4', label: 'R4', color: 'neutral' }       // gray -> neutral
];

// Toggle moon goo type filter
const toggleMoonGooType = (type: string) => {
    const index = selectedMoonGooTypes.value.indexOf(type);
    if (index > -1) {
        selectedMoonGooTypes.value.splice(index, 1);
    } else {
        selectedMoonGooTypes.value.push(type);
    }
    currentPage.value = 1; // Reset to first page when filter changes
};

// Search for systems and regions using the search API
const searchLocations = async (term: string) => {
    if (term.length < 2) {
        locationSearchResults.value = [];
        return;
    }

    if (lastLocationSearchTerm.value === term) return;

    try {
        const encoded = encodeURIComponent(term);
        const data = await $fetch(`/api/search/${encoded}`);

        if (data && data.hits) {
            locationSearchResults.value = data.hits
                .filter((hit: any) => hit.type === 'system' || hit.type === 'region')
                .slice(0, 10)
                .map((hit: any) => ({ id: hit.id, name: hit.name, type: hit.type }));
        }

        lastLocationSearchTerm.value = term;
    } catch (err) {
        console.error("Location search error:", err);
    }
};

// Create debounced version of search function
const debouncedLocationSearch = useDebounceFn(searchLocations, 300);

// Handle location selection
const selectLocation = (location: { id: number; name: string; type: 'system' | 'region' }) => {
    justSelectedLocation.value = true;

    // Clear previous selections
    selectedSystemId.value = null;
    selectedRegionId.value = null;

    // Set the appropriate filter based on type
    if (location.type === 'system') {
        selectedSystemId.value = location.id;
    } else if (location.type === 'region') {
        selectedRegionId.value = location.id;
    }

    selectedLocationName.value = location.name;
    searchQuery.value = location.name;
    locationSearchResults.value = [];
    selectedLocationResultIndex.value = -1;

    setTimeout(() => {
        justSelectedLocation.value = false;
    }, 500);
};

// Handle keyboard navigation for location search
const handleLocationKeyDown = (e: KeyboardEvent) => {
    if (locationSearchResults.value.length === 0) return;

    switch (e.key) {
        case 'ArrowDown':
            e.preventDefault();
            selectedLocationResultIndex.value = Math.min(selectedLocationResultIndex.value + 1, locationSearchResults.value.length - 1);
            break;
        case 'ArrowUp':
            e.preventDefault();
            selectedLocationResultIndex.value = Math.max(selectedLocationResultIndex.value - 1, 0);
            break;
        case 'Enter':
            e.preventDefault();
            if (selectedLocationResultIndex.value >= 0 && locationSearchResults.value[selectedLocationResultIndex.value]) {
                selectLocation(locationSearchResults.value[selectedLocationResultIndex.value]);
            }
            break;
        case 'Escape':
            locationSearchResults.value = [];
            break;
    }
};

// SEO Meta
useSeoMeta({
    title: computed(() => t('metenoxMoons.pageTitle', 'Metenox Moon Locations - EVE Kill')),
    description: computed(() => t('metenoxMoons.pageDescription', 'Discover Metenox moon mining structures and their valuable moon goo materials across New Eden. Find the best moon mining opportunities.')),
    ogTitle: computed(() => t('metenoxMoons.pageTitle', 'Metenox Moon Locations - EVE Kill')),
    ogDescription: computed(() => t('metenoxMoons.pageDescription', 'Discover Metenox moon mining structures and their valuable moon goo materials across New Eden. Find the best moon mining opportunities.')),
    ogType: 'website',
});
</script>

<template>
    <div class="space-y-4">
        <h1 class="text-2xl font-bold">{{ t('metenoxMoons.title', 'Metenox Moon Locations') }}</h1>

        <!-- Search and Filters Section -->
        <div class="bg-background-800 p-4 rounded-lg shadow-lg border border-gray-700/30">
            <!-- Search Input with Autocomplete -->
            <div class="mb-4 relative">
                <UInput v-model="searchQuery"
                    :placeholder="t('metenoxMoons.search.placeholder', 'Search for systems, regions, or moon names...')"
                    icon="lucide:search" size="lg" @keydown="handleLocationKeyDown">
                    <template #trailing>
                        <div v-show="searchQuery !== ''" class="flex items-center">
                            <button type="button" class="text-gray-400 hover:text-gray-200 p-1 rounded"
                                @click="searchQuery = ''; selectedSystemId = null; selectedRegionId = null; selectedLocationName = ''; locationSearchResults = [];">
                                <UIcon name="lucide:x" class="w-4 h-4" />
                            </button>
                        </div>
                    </template>
                </UInput>

                <!-- Location Search Results Dropdown -->
                <div v-if="locationSearchResults.length > 0"
                    class="absolute z-50 w-full mt-1 bg-background-800 border border-gray-700/30 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                    <div v-for="(location, index) in locationSearchResults" :key="`${location.type}-${location.id}`"
                        :class="[
                            'px-3 py-2 cursor-pointer text-sm hover:bg-background-700 flex items-center justify-between',
                            selectedLocationResultIndex === index ? 'bg-background-700' : ''
                        ]" @click="selectLocation(location)">
                        <span>{{ location.name }}</span>
                        <UBadge :color="location.type === 'system' ? 'info' : 'success'" variant="soft" size="xs">
                            {{ location.type }}
                        </UBadge>
                    </div>
                </div>
            </div>

            <!-- Clear Filters Button -->
            <div v-if="hasActiveFilters" class="flex justify-end mb-4">
                <UButton variant="outline" color="warning" size="sm" icon="lucide:x" @click="clearAllFilters">
                    {{ t('metenoxMoons.filter.clear', 'Clear Filters') }}
                </UButton>
            </div>

            <!-- Moon Goo Quality Filter -->
            <div class="mb-4">
                <div class="mb-2">
                    <span class="text-sm text-gray-300">{{ t('metenoxMoons.filter.moonGooTypes')
                        }}:</span>
                </div>
                <div class="flex gap-2 flex-wrap">
                    <UButton v-for="gooType in availableMoonGooTypes" :key="gooType.value"
                        :variant="selectedMoonGooTypes.includes(gooType.value) ? 'solid' : 'outline'"
                        :color="selectedMoonGooTypes.includes(gooType.value) ? gooType.color : 'neutral'"
                        @click="toggleMoonGooType(gooType.value)" size="sm" class="font-mono">
                        {{ gooType.label }}
                    </UButton>
                </div>
            </div>

            <!-- Active Filters Display -->
            <div v-if="hasActiveFilters" class="pt-3 border-t border-gray-700/30">
                <div class="flex flex-wrap gap-2 items-center">
                    <span class="text-sm text-gray-300">{{ t('active_filters', 'Active filters') }}:</span>
                    <UBadge v-if="searchQuery && !selectedSystemId && !selectedRegionId" color="success" variant="soft"
                        size="sm">
                        {{ t('search', 'Search') }}: "{{ searchQuery }}"
                    </UBadge>
                    <UBadge v-if="selectedSystemId && selectedLocationName" color="info" variant="soft" size="sm">
                        {{ t('metenoxMoons.system', 'System') }}: {{ selectedLocationName }}
                    </UBadge>
                    <UBadge v-if="selectedRegionId && selectedLocationName" color="success" variant="soft" size="sm">
                        {{ t('metenoxMoons.region', 'Region') }}: {{ selectedLocationName }}
                    </UBadge>
                    <UBadge v-for="gooType in selectedMoonGooTypes" :key="gooType" :color="getMoonGooColor(gooType)"
                        variant="soft" size="sm" class="font-mono">
                        {{ gooType }}
                    </UBadge>
                </div>
            </div>
        </div>

        <UAlert v-if="error" icon="i-heroicons-exclamation-triangle" color="warning" variant="soft"
            :title="t('errorFetchingData', 'Error Fetching Data')" :description="error.message" />

        <!-- Show loading spinner when data is initially loading -->
        <div v-if="!isClient" class="flex flex-col items-center justify-center py-12">
            <UIcon name="lucide:loader" class="w-12 h-12 animate-spin text-primary mb-4" />
            <span class="text-xl font-medium">{{ t('metenoxMoons.loading', 'Loading Metenox locations...') }}</span>
        </div>

        <div v-else class="space-y-4">
            <!-- Item count and per page selector -->
            <div class="w-full flex justify-between items-center">
                <!-- Item Count (Left) -->
                <div class="flex justify-start">
                    <span v-if="isClient" class="text-sm text-gray-500 dark:text-gray-400">
                        {{ t('metenoxMoons.showingResults', {
                            start: totalItems > 0 ? (currentPage - 1) * selectedPageSize + 1 : 0,
                            end: Math.min(currentPage * selectedPageSize, totalItems),
                            total: totalItems
                        }, `Showing {start}-{end} of {total} Metenox locations`) }}
                    </span>
                </div>

                <!-- Per Page Selector (Right) -->
                <div class="flex justify-end items-center">
                    <div class="flex items-center space-x-2">
                        <span class="text-sm">{{ t('perPage', 'Per Page:') }}</span>
                        <USelect v-model="selectedPageSize" :items="pageSizeItems" value-attribute="value"
                            option-attribute="label" size="xs" />
                    </div>
                </div>
            </div>

            <!-- Pagination on its own line - aligned to the right -->
            <div class="w-full flex justify-end">
                <UPagination v-if="isClient && totalItems > 0" v-model:page="currentPage" :total="totalItems"
                    :items-per-page="selectedPageSize" :disabled="pending" size="sm" />
            </div>

            <!-- Loading overlay for subsequent data fetches (not initial) -->
            <div v-if="pending && !isInitialLoad" class="relative">
                <div class="absolute inset-0 bg-background-900/50 flex items-center justify-center z-10 rounded-lg">
                    <div class="bg-background-800 p-4 rounded-lg shadow-lg flex items-center space-x-3">
                        <UIcon name="lucide:loader" class="w-6 h-6 animate-spin text-primary" />
                        <span>{{ t('refreshing', 'Refreshing data...') }}</span>
                    </div>
                </div>
            </div>

            <Table :key="`metenox-table-${pending ? 'loading' : 'data'}`" :columns="columns"
                :items="pending && !data ? skeletonRows : paginatedList" :loading="pending"
                :skeleton-count="selectedPageSize" :link-fn="linkFn" :bordered="true" :striped="false" :hover="true"
                density="normal" background="transparent" table-class="metenox-table"
                :empty-text="t('metenoxMoons.noMoonsFound', 'No Metenox moons found.')"
                empty-icon="i-heroicons-circle-stack">

                <!-- Custom Cell Rendering -->
                <template #cell-moon="{ item }">
                    <div class="flex items-center gap-2">
                        <Image :id="item.moon_id" type="system" size="32" class="w-8 h-8 rounded flex-shrink-0" />
                        <div class="text-sm">
                            <div class="font-medium">{{ item.moon_name }}</div>
                            <div class="text-gray-500 text-xs">ID: {{ item.moon_id }}</div>
                        </div>
                    </div>
                </template>

                <template #cell-location="{ item }">
                    <div class="text-sm space-y-1">
                        <div class="flex items-center gap-2">
                            <Image :id="item.system_id" type="system" size="24" class="w-6 h-6 rounded flex-shrink-0" />
                            <span class="font-medium">{{ item.system_name }}</span>
                        </div>
                        <div class="flex items-center gap-2">
                            <Image :id="item.region_id" type="region" size="24" class="w-6 h-6 rounded flex-shrink-0" />
                            <span class="text-gray-400">{{ item.region_name }}</span>
                        </div>
                    </div>
                </template>

                <template #cell-moonType="{ item }">
                    <div class="flex flex-wrap gap-1">
                        <template v-for="goo in getMoonGooDisplay(item.moonType)" :key="goo.type">
                            <UBadge :color="getMoonGooColor(goo.type)" variant="soft" size="sm" class="text-xs">
                                {{ goo.type }} ({{ goo.count }})
                            </UBadge>
                        </template>
                        <div v-if="getMoonGooDisplay(item.moonType).length === 0" class="text-gray-500 text-sm">
                            {{ t('metenoxMoons.noGooData', 'No goo data') }}
                        </div>
                    </div>
                </template>

                <!-- Custom mobile row template for metenox -->
                <template #mobile-row="{ item }">
                    <div class="flex flex-col w-full p-2 gap-2">
                        <!-- Moon name and location - Top Row -->
                        <div class="flex items-start justify-between">
                            <!-- Left side: Moon info -->
                            <div class="flex-1">
                                <div class="flex items-center gap-2">
                                    <Image :id="item.moon_id" type="system" size="24"
                                        class="w-6 h-6 rounded flex-shrink-0" />
                                    <span class="font-medium text-sm">{{ item.moon_name }}</span>
                                </div>
                                <div class="text-xs text-gray-500 ml-8">ID: {{ item.moon_id }}</div>
                            </div>

                            <!-- Right side: Killmail link -->
                            <div class="flex-none text-right">
                                <div class="text-xs text-gray-500">KM: {{ item.killmail_id }}</div>
                            </div>
                        </div>

                        <!-- Location section -->
                        <div class="flex flex-col space-y-1 text-sm">
                            <div class="flex items-center gap-2">
                                <Image :id="item.system_id" type="system" size="20"
                                    class="w-5 h-5 rounded flex-shrink-0" />
                                <span>{{ item.system_name }}</span>
                            </div>
                            <div class="flex items-center gap-2">
                                <Image :id="item.region_id" type="region" size="20"
                                    class="w-5 h-5 rounded flex-shrink-0" />
                                <span class="text-gray-400">{{ item.region_name }}</span>
                            </div>
                        </div>

                        <!-- Moon goo types -->
                        <div class="space-y-1">
                            <div class="text-xs text-gray-500">{{ t('metenoxMoons.moonGoo', 'Moon Goo') }}:</div>
                            <div class="flex flex-wrap gap-1">
                                <template v-for="goo in getMoonGooDisplay(item.moonType)" :key="goo.type">
                                    <UBadge :color="getMoonGooColor(goo.type)" variant="soft" size="sm" class="text-xs">
                                        {{ goo.type }} ({{ goo.count }})
                                    </UBadge>
                                </template>
                                <div v-if="getMoonGooDisplay(item.moonType).length === 0" class="text-gray-500 text-xs">
                                    {{ t('metenoxMoons.noGooData', 'No goo data') }}
                                </div>
                            </div>
                        </div>
                    </div>
                </template>

                <template #skeleton>
                    <div class="metenox-skeleton-container">
                        <div v-for="i in selectedPageSize" :key="`skeleton-${i}`" class="metenox-skeleton-row">
                            <!-- Moon Column Skeleton -->
                            <div class="metenox-skeleton-cell" :style="{ width: columns[0]?.width || '30%' }">
                                <div class="flex items-center gap-2">
                                    <div class="metenox-skeleton-avatar"></div>
                                    <div class="flex flex-col space-y-1">
                                        <div class="metenox-skeleton-text" style="width: 120px;"></div>
                                        <div class="metenox-skeleton-text" style="width: 80px;"></div>
                                    </div>
                                </div>
                            </div>
                            <!-- Location Column Skeleton -->
                            <div class="metenox-skeleton-cell" :style="{ width: columns[1]?.width || '35%' }">
                                <div class="flex flex-col space-y-2">
                                    <div class="flex items-center gap-2">
                                        <div class="metenox-skeleton-avatar"></div>
                                        <div class="metenox-skeleton-text" style="width: 100px;"></div>
                                    </div>
                                    <div class="flex items-center gap-2">
                                        <div class="metenox-skeleton-avatar"></div>
                                        <div class="metenox-skeleton-text" style="width: 120px;"></div>
                                    </div>
                                </div>
                            </div>
                            <!-- Moon Type Column Skeleton -->
                            <div class="metenox-skeleton-cell" :style="{ width: columns[2]?.width || '35%' }">
                                <div class="flex flex-wrap gap-1">
                                    <div class="metenox-skeleton-badge"></div>
                                    <div class="metenox-skeleton-badge"></div>
                                    <div class="metenox-skeleton-badge"></div>
                                </div>
                            </div>
                        </div>
                    </div>
                </template>
            </Table>
        </div>
    </div>
</template>

<style scoped>
/* Skeleton styling for metenox table */
.metenox-skeleton-container {
    display: table;
    width: 100%;
    border-collapse: collapse;
}

.metenox-skeleton-row {
    display: table-row;
    border-bottom: 1px solid light-dark(#e5e7eb, #374151);
}

.metenox-skeleton-cell {
    display: table-cell;
    padding: 1rem;
    vertical-align: top;
}

.metenox-skeleton-avatar {
    width: 32px;
    height: 32px;
    border-radius: 6px;
    background-color: light-dark(#e5e7eb, #374151);
    animation: pulse 1.5s ease-in-out infinite;
    flex-shrink: 0;
}

.metenox-skeleton-text {
    height: 14px;
    border-radius: 4px;
    background-color: light-dark(#e5e7eb, #374151);
    animation: pulse 1.5s ease-in-out infinite;
}

.metenox-skeleton-badge {
    width: 60px;
    height: 20px;
    border-radius: 10px;
    background-color: light-dark(#e5e7eb, #374151);
    animation: pulse 1.5s ease-in-out infinite;
}

.fade-enter-active,
.fade-leave-active {
    transition: opacity 0.15s ease;
}

.fade-enter-from,
.fade-leave-to {
    opacity: 0;
}

/* Mobile-specific enhancements for metenox list */
@media (max-width: 768px) {
    :deep(.table-row) {
        padding: 0.5rem !important;
    }
}
</style>
