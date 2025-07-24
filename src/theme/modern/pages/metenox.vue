<script setup lang="ts">
import moment from 'moment';
import { computed, onMounted, ref, watch } from 'vue';
import type { IMetenoxMoonResult } from '~/server/api/intel/metenox/_utils';

const { t, locale } = useI18n();
const router = useRouter();
const currentLocale = computed(() => locale.value);

const currentPage = ref(1);
const pageSizeItems = [
    { label: "10", value: 10 },
    { label: "25", value: 25 },
    { label: "50", value: 50 },
    { label: "100", value: 100 },
];
const selectedPageSize = ref(pageSizeItems[0].value);

// Filter and search state
const searchQuery = ref('');
const filter = ref('all'); // 'all', 'system', 'region'
const selectedSystemId = ref<number | null>(null);
const selectedRegionId = ref<number | null>(null);
const selectedMoonGooTypes = ref<string[]>([]); // For moon goo quality filtering

// Computed property to determine if any filter is active
const hasActiveFilters = computed(() => {
    return filter.value !== 'all' || searchQuery.value !== '' || selectedSystemId.value || selectedRegionId.value || selectedMoonGooTypes.value.length > 0;
});

// Add a separate loading state ref to track loading beyond what useFetch provides
const isLoading = ref(true);
// Track if this is the initial data load for UI treatment
const isInitialLoad = ref(true);

// Initialize with empty data structure for immediate rendering
const initialData = ref<IMetenoxMoonResult[]>([]);

// System and Region search functionality - Move declarations here before watchers
const systemSearchQuery = ref('');
const regionSearchQuery = ref('');
const systemSearchResults = ref<{ id: number; name: string }[]>([]);
const regionSearchResults = ref<{ id: number; name: string }[]>([]);
const selectedSystemResultIndex = ref(-1);
const selectedRegionResultIndex = ref(-1);
const lastSystemSearchTerm = ref('');
const lastRegionSearchTerm = ref('');
const justSelectedSystem = ref(false);
const justSelectedRegion = ref(false);

// Computed API endpoint based on filter
const apiEndpoint = computed(() => {
    if (selectedSystemId.value) {
        return `/api/intel/metenox/system/${selectedSystemId.value}`;
    } else if (selectedRegionId.value) {
        return `/api/intel/metenox/region/${selectedRegionId.value}`;
    }
    return '/api/intel/metenox';
});

const { data, pending, error, refresh } = useFetch<IMetenoxMoonResult[]>(apiEndpoint, {
    key: 'metenox-list',
    // Use lazy to not block initial render
    lazy: true,
});

// Use computed values that fall back to initial data when real data isn't loaded yet
const metenoxList = computed(() => {
    let list = data.value || initialData.value;

    // Apply search filter
    if (searchQuery.value) {
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

// Better loading state management with watch on pending
watch(() => pending.value, (newPending) => {
    isLoading.value = newPending;

    // If we're no longer pending and it was the initial load, update that state
    if (!newPending && isInitialLoad.value) {
        isInitialLoad.value = false;
    }
}, { immediate: true });

// Function to handle data refresh
const loadData = async () => {
    try {
        isLoading.value = true;
        await refresh();
    } catch (err) {
        console.error('Error refreshing metenox data:', err);
    } finally {
        // Always update loading state regardless of success/failure
        isLoading.value = pending.value;
        isInitialLoad.value = false;
    }
};

// On component mount, trigger the data fetch
onMounted(() => {
    loadData();

    // Safeguard against stuck loading state
    const timeout = setTimeout(() => {
        if (isLoading.value) {
            isLoading.value = false;
            isInitialLoad.value = false;
            console.warn('Loading timeout reached, forcing loading state to complete');
        }
        clearTimeout(timeout);
    }, 10000); // 10 second safety timeout
});

// Watch for changes to system search query
watch(systemSearchQuery, (newTerm) => {
    if (justSelectedSystem.value) return;

    if (newTerm && newTerm.length >= 2) {
        debouncedSystemSearch(newTerm);
    } else {
        systemSearchResults.value = [];
    }

    selectedSystemResultIndex.value = -1;
});

// Watch for changes to region search query
watch(regionSearchQuery, (newTerm) => {
    if (justSelectedRegion.value) return;

    if (newTerm && newTerm.length >= 2) {
        debouncedRegionSearch(newTerm);
    } else {
        regionSearchResults.value = [];
    }

    selectedRegionResultIndex.value = -1;
});

// Watch for changes to pagination params, search, filter, and locale, and refresh the data
watch([currentPage, selectedPageSize, searchQuery, filter, selectedSystemId, selectedRegionId, selectedMoonGooTypes, currentLocale], () => {
    moment.locale(currentLocale.value);
    loadData();
});

// Watch for search query changes and reset page
watch(searchQuery, () => {
    currentPage.value = 1;
});

const columns = [
    { id: 'moon', header: computed(() => t('metenoxMoons.moon', 'Moon')), width: '30%' },
    { id: 'location', header: computed(() => t('metenoxMoons.location', 'Location')), width: '35%' },
    { id: 'moonType', header: computed(() => t('metenoxMoons.moonType', 'Moon Goo')), width: '35%' },
];

moment.locale(currentLocale.value); // Set locale once

const formatTimeAgo = (date: string | Date): string => {
    moment.locale(currentLocale.value);
    return moment.utc(date).fromNow();
};

const formatDateDisplay = (date: string | Date): string => {
    moment.locale(currentLocale.value);
    return moment.utc(date).format('Do MMMM YYYY');
};

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
const setFilter = (newFilter: string) => {
    filter.value = newFilter;
    currentPage.value = 1; // Reset to first page when filter changes

    // Clear specific filters when changing filter type
    if (newFilter !== 'system') {
        selectedSystemId.value = null;
        systemSearchQuery.value = '';
        systemSearchResults.value = [];
    }
    if (newFilter !== 'region') {
        selectedRegionId.value = null;
        regionSearchQuery.value = '';
        regionSearchResults.value = [];
    }
};

const clearAllFilters = () => {
    searchQuery.value = '';
    filter.value = 'all';
    selectedSystemId.value = null;
    selectedRegionId.value = null;
    selectedMoonGooTypes.value = [];
    systemSearchQuery.value = '';
    regionSearchQuery.value = '';
    systemSearchResults.value = [];
    regionSearchResults.value = [];
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
const getMoonGooColor = (type: string) => {
    const colors = {
        'R64': 'purple',
        'R32': 'blue',
        'R16': 'green',
        'R8': 'yellow',
        'R4': 'gray'
    };
    return colors[type as keyof typeof colors] || 'gray';
};

// Available moon goo types for filtering
const availableMoonGooTypes = [
    { value: 'R64', label: 'R64', color: 'purple' },
    { value: 'R32', label: 'R32', color: 'blue' },
    { value: 'R16', label: 'R16', color: 'green' },
    { value: 'R8', label: 'R8', color: 'yellow' },
    { value: 'R4', label: 'R4', color: 'gray' }
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

// Search for systems using the search API
const searchSystems = async (term: string) => {
    if (term.length < 2) {
        systemSearchResults.value = [];
        return;
    }

    if (lastSystemSearchTerm.value === term) return;

    try {
        const encoded = encodeURIComponent(term);
        const { data } = await useFetch(`/api/search/${encoded}`);

        if (data.value && data.value.hits) {
            systemSearchResults.value = data.value.hits
                .filter((hit: any) => hit.type === 'system')
                .slice(0, 10)
                .map((hit: any) => ({ id: hit.id, name: hit.name }));
        }

        lastSystemSearchTerm.value = term;
    } catch (err) {
        console.error("System search error:", err);
    }
};

// Search for regions using the search API
const searchRegions = async (term: string) => {
    if (term.length < 2) {
        regionSearchResults.value = [];
        return;
    }

    if (lastRegionSearchTerm.value === term) return;

    try {
        const encoded = encodeURIComponent(term);
        const { data } = await useFetch(`/api/search/${encoded}`);

        if (data.value && data.value.hits) {
            regionSearchResults.value = data.value.hits
                .filter((hit: any) => hit.type === 'region')
                .slice(0, 10)
                .map((hit: any) => ({ id: hit.id, name: hit.name }));
        }

        lastRegionSearchTerm.value = term;
    } catch (err) {
        console.error("Region search error:", err);
    }
};

// Create debounced versions of search functions
const debouncedSystemSearch = useDebounceFn(searchSystems, 300);
const debouncedRegionSearch = useDebounceFn(searchRegions, 300);

// Handle system selection
const selectSystem = (system: { id: number; name: string }) => {
    justSelectedSystem.value = true;
    selectedSystemId.value = system.id;
    systemSearchQuery.value = system.name;
    systemSearchResults.value = [];
    selectedSystemResultIndex.value = -1;

    setTimeout(() => {
        justSelectedSystem.value = false;
    }, 500);
};

// Handle region selection
const selectRegion = (region: { id: number; name: string }) => {
    justSelectedRegion.value = true;
    selectedRegionId.value = region.id;
    regionSearchQuery.value = region.name;
    regionSearchResults.value = [];
    selectedRegionResultIndex.value = -1;

    setTimeout(() => {
        justSelectedRegion.value = false;
    }, 500);
};

// Handle keyboard navigation for system search
const handleSystemKeyDown = (e: KeyboardEvent) => {
    if (systemSearchResults.value.length === 0) return;

    switch (e.key) {
        case 'ArrowDown':
            e.preventDefault();
            selectedSystemResultIndex.value = Math.min(selectedSystemResultIndex.value + 1, systemSearchResults.value.length - 1);
            break;
        case 'ArrowUp':
            e.preventDefault();
            selectedSystemResultIndex.value = Math.max(selectedSystemResultIndex.value - 1, 0);
            break;
        case 'Enter':
            e.preventDefault();
            if (selectedSystemResultIndex.value >= 0) {
                selectSystem(systemSearchResults.value[selectedSystemResultIndex.value]);
            }
            break;
        case 'Escape':
            systemSearchResults.value = [];
            break;
    }
};

// Handle keyboard navigation for region search
const handleRegionKeyDown = (e: KeyboardEvent) => {
    if (regionSearchResults.value.length === 0) return;

    switch (e.key) {
        case 'ArrowDown':
            e.preventDefault();
            selectedRegionResultIndex.value = Math.min(selectedRegionResultIndex.value + 1, regionSearchResults.value.length - 1);
            break;
        case 'ArrowUp':
            e.preventDefault();
            selectedRegionResultIndex.value = Math.max(selectedRegionResultIndex.value - 1, 0);
            break;
        case 'Enter':
            e.preventDefault();
            if (selectedRegionResultIndex.value >= 0) {
                selectRegion(regionSearchResults.value[selectedRegionResultIndex.value]);
            }
            break;
        case 'Escape':
            regionSearchResults.value = [];
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
            <!-- Search Input -->
            <div class="mb-4">
                <UInput
                    v-model="searchQuery"
                    :placeholder="t('metenoxMoons.search.placeholder', 'Search by moon, system, or region name...')"
                    icon="lucide:search"
                    size="lg"
                    :ui="{
                        icon: {
                            trailing: {
                                pointer: '',
                            },
                        },
                    }"
                >
                    <template #trailing>
                        <UButton
                            v-show="searchQuery !== ''"
                            color="gray"
                            variant="link"
                            icon="lucide:x"
                            :padded="false"
                            @click="searchQuery = ''"
                        />
                    </template>
                </UInput>
            </div>

            <!-- Filter Buttons -->
            <div class="flex flex-col sm:flex-row gap-2 mb-4">
                <div class="flex gap-2 flex-wrap">
                    <UButton
                        :variant="filter === 'all' ? 'solid' : 'outline'"
                        :color="filter === 'all' ? 'primary' : 'gray'"
                        @click="setFilter('all')"
                        size="sm"
                    >
                        {{ t('metenoxMoons.filter.all', 'All Moons') }}
                    </UButton>
                    <UButton
                        :variant="filter === 'system' ? 'solid' : 'outline'"
                        :color="filter === 'system' ? 'primary' : 'gray'"
                        @click="setFilter('system')"
                        size="sm"
                    >
                        {{ t('metenoxMoons.filter.system', 'By System') }}
                    </UButton>
                    <UButton
                        :variant="filter === 'region' ? 'solid' : 'outline'"
                        :color="filter === 'region' ? 'primary' : 'gray'"
                        @click="setFilter('region')"
                        size="sm"
                    >
                        {{ t('metenoxMoons.filter.region', 'By Region') }}
                    </UButton>
                </div>

                <!-- Clear Filters Button -->
                <div class="flex justify-end sm:ml-auto">
                    <UButton
                        v-if="hasActiveFilters"
                        variant="outline"
                        color="red"
                        size="sm"
                        icon="lucide:x"
                        @click="clearAllFilters"
                    >
                        {{ t('metenoxMoons.filter.clear', 'Clear Filters') }}
                    </UButton>
                </div>
            </div>

            <!-- Moon Goo Quality Filter -->
            <div class="mb-4">
                <div class="mb-2">
                    <span class="text-sm text-gray-300">{{ t('metenoxMoons.filter.moonGooTypes', 'Filter by Moon Goo Quality') }}:</span>
                </div>
                <div class="flex gap-2 flex-wrap">
                    <UButton
                        v-for="gooType in availableMoonGooTypes"
                        :key="gooType.value"
                        :variant="selectedMoonGooTypes.includes(gooType.value) ? 'solid' : 'outline'"
                        :color="selectedMoonGooTypes.includes(gooType.value) ? gooType.color : 'gray'"
                        @click="toggleMoonGooType(gooType.value)"
                        size="sm"
                        class="font-mono"
                    >
                        {{ gooType.label }}
                    </UButton>
                </div>
            </div>

            <!-- Specific System/Region Input -->
            <div v-if="filter === 'system' || filter === 'region'" class="mb-4">
                <div v-if="filter === 'system'" class="relative">
                    <UInput
                        v-model="systemSearchQuery"
                        :placeholder="t('metenoxMoons.search.systemPlaceholder', 'Enter system name...')"
                        icon="lucide:globe"
                        size="md"
                        @keydown="handleSystemKeyDown"
                    />

                    <!-- System Search Results Dropdown -->
                    <div v-if="systemSearchResults.length > 0"
                         class="absolute z-50 w-full mt-1 bg-background-800 border border-gray-700/30 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                        <div
                            v-for="(system, index) in systemSearchResults"
                            :key="system.id"
                            :class="[
                                'px-3 py-2 cursor-pointer text-sm hover:bg-background-700',
                                selectedSystemResultIndex === index ? 'bg-background-700' : ''
                            ]"
                            @click="selectSystem(system)"
                        >
                            {{ system.name }}
                        </div>
                    </div>
                </div>

                <div v-if="filter === 'region'" class="relative">
                    <UInput
                        v-model="regionSearchQuery"
                        :placeholder="t('metenoxMoons.search.regionPlaceholder', 'Enter region name...')"
                        icon="lucide:map"
                        size="md"
                        @keydown="handleRegionKeyDown"
                    />

                    <!-- Region Search Results Dropdown -->
                    <div v-if="regionSearchResults.length > 0"
                         class="absolute z-50 w-full mt-1 bg-background-800 border border-gray-700/30 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                        <div
                            v-for="(region, index) in regionSearchResults"
                            :key="region.id"
                            :class="[
                                'px-3 py-2 cursor-pointer text-sm hover:bg-background-700',
                                selectedRegionResultIndex === index ? 'bg-background-700' : ''
                            ]"
                            @click="selectRegion(region)"
                        >
                            {{ region.name }}
                        </div>
                    </div>
                </div>
            </div>

            <!-- Active Filters Display -->
            <div v-if="hasActiveFilters" class="pt-3 border-t border-gray-700/30">
                <div class="flex flex-wrap gap-2 items-center">
                    <span class="text-sm text-gray-300">{{ t('active_filters', 'Active filters') }}:</span>
                    <UBadge v-if="filter !== 'all'" color="blue" variant="soft" size="sm">
                        {{ t(`metenoxMoons.filter.${filter}`) }}
                    </UBadge>
                    <UBadge v-if="searchQuery" color="green" variant="soft" size="sm">
                        {{ t('search', 'Search') }}: "{{ searchQuery }}"
                    </UBadge>
                    <UBadge v-if="selectedSystemId && systemSearchQuery" color="orange" variant="soft" size="sm">
                        {{ t('metenoxMoons.system', 'System') }}: {{ systemSearchQuery }}
                    </UBadge>
                    <UBadge v-if="selectedRegionId && regionSearchQuery" color="orange" variant="soft" size="sm">
                        {{ t('metenoxMoons.region', 'Region') }}: {{ regionSearchQuery }}
                    </UBadge>
                    <UBadge
                        v-for="gooType in selectedMoonGooTypes"
                        :key="gooType"
                        :color="getMoonGooColor(gooType)"
                        variant="soft"
                        size="sm"
                        class="font-mono"
                    >
                        {{ gooType }}
                    </UBadge>
                </div>
            </div>
        </div>

        <UAlert v-if="error" icon="i-heroicons-exclamation-triangle" color="red" variant="soft"
            :title="t('errorFetchingData', 'Error Fetching Data')" :description="error.message" />

        <!-- Show loading spinner when data is initially loading -->
        <div v-if="isLoading && isInitialLoad" class="flex flex-col items-center justify-center py-12">
            <UIcon name="lucide:loader" class="w-12 h-12 animate-spin text-primary mb-4" />
            <span class="text-xl font-medium">{{ t('metenoxMoons.loading', 'Loading Metenox locations...') }}</span>
        </div>

        <div v-else class="space-y-4">
            <!-- Item count and per page selector -->
            <div class="w-full flex justify-between items-center">
                <!-- Item Count (Left) -->
                <div class="flex justify-start">
                    <span class="text-sm text-gray-500 dark:text-gray-400">
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
                <UPagination v-model:page="currentPage" :total="totalItems" :items-per-page="selectedPageSize"
                    :disabled="isLoading" size="sm" />
            </div>

            <!-- Loading overlay for subsequent data fetches (not initial) -->
            <div v-if="isLoading && !isInitialLoad" class="relative">
                <div class="absolute inset-0 bg-background-900/50 flex items-center justify-center z-10 rounded-lg">
                    <div class="bg-background-800 p-4 rounded-lg shadow-lg flex items-center space-x-3">
                        <UIcon name="lucide:loader" class="w-6 h-6 animate-spin text-primary" />
                        <span>{{ t('refreshing', 'Refreshing data...') }}</span>
                    </div>
                </div>
            </div>

            <Table :key="`metenox-table-${isLoading ? 'loading' : 'data'}`" :columns="columns"
                :items="isLoading && !data ? skeletonRows : paginatedList" :loading="isLoading"
                :skeleton-count="selectedPageSize" :link-fn="linkFn" :bordered="true" :striped="false" :hover="true"
                density="normal" background="transparent" table-class="metenox-table"
                :empty-text="t('metenoxMoons.noMoonsFound', 'No Metenox moons found.')" empty-icon="i-heroicons-circle-stack">

                <!-- Custom Cell Rendering -->
                <template #cell-moon="{ item }">
                    <div class="flex items-center gap-2">
                        <Image :id="item.moon_id" type="system" size="32" format="webp"
                            class="w-8 h-8 rounded flex-shrink-0" />
                        <div class="text-sm">
                            <div class="font-medium">{{ item.moon_name }}</div>
                            <div class="text-gray-500 text-xs">ID: {{ item.moon_id }}</div>
                        </div>
                    </div>
                </template>

                <template #cell-location="{ item }">
                    <div class="text-sm space-y-1">
                        <div class="flex items-center gap-2">
                            <Image :id="item.system_id" type="system" size="24" format="webp"
                                class="w-6 h-6 rounded flex-shrink-0" />
                            <span class="font-medium">{{ item.system_name }}</span>
                        </div>
                        <div class="flex items-center gap-2">
                            <Image :id="item.region_id" type="region" size="24" format="webp"
                                class="w-6 h-6 rounded flex-shrink-0" />
                            <span class="text-gray-400">{{ item.region_name }}</span>
                        </div>
                    </div>
                </template>

                <template #cell-moonType="{ item }">
                    <div class="flex flex-wrap gap-1">
                        <template v-for="goo in getMoonGooDisplay(item.moonType)" :key="goo.type">
                            <UBadge
                                :color="getMoonGooColor(goo.type)"
                                variant="soft"
                                size="sm"
                                class="text-xs"
                            >
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
                                    <Image :id="item.moon_id" type="system" size="24" format="webp"
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
                                <Image :id="item.system_id" type="system" size="20" format="webp"
                                    class="w-5 h-5 rounded flex-shrink-0" />
                                <span>{{ item.system_name }}</span>
                            </div>
                            <div class="flex items-center gap-2">
                                <Image :id="item.region_id" type="region" size="20" format="webp"
                                    class="w-5 h-5 rounded flex-shrink-0" />
                                <span class="text-gray-400">{{ item.region_name }}</span>
                            </div>
                        </div>

                        <!-- Moon goo types -->
                        <div class="space-y-1">
                            <div class="text-xs text-gray-500">{{ t('metenoxMoons.moonGoo', 'Moon Goo') }}:</div>
                            <div class="flex flex-wrap gap-1">
                                <template v-for="goo in getMoonGooDisplay(item.moonType)" :key="goo.type">
                                    <UBadge
                                        :color="getMoonGooColor(goo.type)"
                                        variant="soft"
                                        size="sm"
                                        class="text-xs"
                                    >
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
                            <div class="metenox-skeleton-cell" :style="{ width: columns[0].width }">
                                <div class="flex items-center gap-2">
                                    <div class="metenox-skeleton-avatar"></div>
                                    <div class="flex flex-col space-y-1">
                                        <div class="metenox-skeleton-text" style="width: 120px;"></div>
                                        <div class="metenox-skeleton-text" style="width: 80px;"></div>
                                    </div>
                                </div>
                            </div>
                            <!-- Location Column Skeleton -->
                            <div class="metenox-skeleton-cell" :style="{ width: columns[1].width }">
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
                            <div class="metenox-skeleton-cell" :style="{ width: columns[2].width }">
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
