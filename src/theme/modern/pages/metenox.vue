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

// Computed property to determine if any filter is active
const hasActiveFilters = computed(() => {
    return filter.value !== 'all' || searchQuery.value !== '' || selectedSystemId.value || selectedRegionId.value;
});

// Add a separate loading state ref to track loading beyond what useFetch provides
const isLoading = ref(true);
// Track if this is the initial data load for UI treatment
const isInitialLoad = ref(true);

// Initialize with empty data structure for immediate rendering
const initialData = ref<IMetenoxMoonResult[]>([]);

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

// Watch for changes to pagination params, search, filter, and locale, and refresh the data
watch([currentPage, selectedPageSize, searchQuery, filter, selectedSystemId, selectedRegionId, currentLocale], () => {
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
    }
    if (newFilter !== 'region') {
        selectedRegionId.value = null;
    }
};

const clearAllFilters = () => {
    searchQuery.value = '';
    filter.value = 'all';
    selectedSystemId.value = null;
    selectedRegionId.value = null;
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

// System and Region search functionality
const systemSearchQuery = ref('');
const regionSearchQuery = ref('');

// Mock data for system/region search - in real implementation, these would come from API
const searchSystems = async (query: string) => {
    if (!query || query.length < 2) return [];
    // This would be replaced with actual API call
    return [
        { system_id: 30000142, system_name: 'Jita' },
        { system_id: 30002187, system_name: 'Amarr' },
        // Add more systems as needed
    ];
};

const searchRegions = async (query: string) => {
    if (!query || query.length < 2) return [];
    // This would be replaced with actual API call
    return [
        { region_id: 10000002, region_name: 'The Forge' },
        { region_id: 10000043, region_name: 'Domain' },
        // Add more regions as needed
    ];
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

            <!-- Specific System/Region Input -->
            <div v-if="filter === 'system' || filter === 'region'" class="mb-4">
                <div v-if="filter === 'system'">
                    <UInput
                        v-model="systemSearchQuery"
                        :placeholder="t('metenoxMoons.search.systemPlaceholder', 'Enter system name or ID...')"
                        icon="lucide:globe"
                        size="md"
                    />
                    <!-- Here you would add autocomplete functionality -->
                </div>
                <div v-if="filter === 'region'">
                    <UInput
                        v-model="regionSearchQuery"
                        :placeholder="t('metenoxMoons.search.regionPlaceholder', 'Enter region name or ID...')"
                        icon="lucide:map"
                        size="md"
                    />
                    <!-- Here you would add autocomplete functionality -->
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
                    <UBadge v-if="selectedSystemId" color="orange" variant="soft" size="sm">
                        {{ t('metenoxMoons.system', 'System') }}: {{ selectedSystemId }}
                    </UBadge>
                    <UBadge v-if="selectedRegionId" color="orange" variant="soft" size="sm">
                        {{ t('metenoxMoons.region', 'Region') }}: {{ selectedRegionId }}
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
                        {{ t('showingResults', {
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
