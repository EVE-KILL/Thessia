<script setup lang="ts">
import moment from 'moment';
import { computed, ref, watch } from 'vue';

const { t, locale } = useI18n();
const router = useRouter();
const currentLocale = computed(() => locale.value);

// Filter and search state
const searchQuery = ref('');
const filter = ref('all'); // 'all' or 'custom'

// SEO setup with dynamic content based on filters
const seoTitle = computed(() => {
    if (filter.value !== 'all') {
        return t('seo.battlesFilter.title', { filter: filter.value });
    }
    return t('seo.battlesList.title');
});

const seoDescription = computed(() => {
    if (filter.value !== 'all') {
        return t('seo.battlesFilter.description', { filter: filter.value });
    }
    return t('seo.battlesList.description');
});

useSeoMeta({
    title: seoTitle,
    description: seoDescription,
    ogTitle: seoTitle,
    ogDescription: seoDescription,
    ogType: 'website',
    twitterCard: 'summary_large_image',
    twitterTitle: seoTitle,
    twitterDescription: seoDescription
});

const currentPage = ref(1);
const pageSizeItems = [
    { label: "10", value: 10 },
    { label: "25", value: 25 },
    { label: "50", value: 50 },
    { label: "100", value: 100 },
];
const selectedPageSize = ref(pageSizeItems[0].value);

// Computed property to determine if any filter is active
const hasActiveFilters = computed(() => {
    return filter.value !== 'all' || searchQuery.value !== '';
});

const queryParams = computed(() => ({
    page: currentPage.value,
    limit: selectedPageSize.value,
    search: searchQuery.value || undefined,
    filter: filter.value !== 'all' ? filter.value : undefined,
}));

interface BattlesApiResponse {
    battles: IBattlesDocument[];
    totalItems: number;
    totalPages: number;
    currentPage: number;
    itemsPerPage: number;
}

// Add a separate loading state ref to track loading beyond what useFetch provides
const isLoading = ref(false);
// Track if this is the initial data load for UI treatment
const isInitialLoad = ref(true);

// Initialize with empty data structure for immediate rendering
const initialData = ref<BattlesApiResponse>({
    battles: [],
    totalItems: 0,
    totalPages: 0,
    currentPage: 1,
    itemsPerPage: selectedPageSize.value
});

const { data, pending, error, refresh } = useFetch<BattlesApiResponse>('/api/battles', {
    query: queryParams,
    key: 'battles-list',
    server: true,
    default: () => initialData.value,
});

// Use computed values that fall back to initial data when real data isn't loaded yet
const battlesList = computed(() => data?.value?.battles || initialData.value.battles);
const totalItems = computed(() => data?.value?.totalItems || initialData.value.totalItems);

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
        await refresh();
    } catch (err) {
        console.error('Error refreshing battles data:', err);
    }
};

// Watch for changes to pagination params, search, filter, and locale, and refresh the data
watch([currentPage, selectedPageSize, searchQuery, filter, currentLocale], () => {
    moment.locale(currentLocale.value);
    refresh();
});

const columns = [
    { id: 'time', header: computed(() => t('time', 'Time')), width: '25%' },
    { id: 'system', header: computed(() => t('system', 'System')), width: '20%' },
    { id: 'stats', header: computed(() => t('stats', 'Stats')), width: '25%' },
    { id: 'involved', header: computed(() => t('involved', 'Involved')), width: '30%' },
];

moment.locale(currentLocale.value); // Set locale once

const formatTimeAgo = (date: string | Date): string => {
    moment.locale(currentLocale.value);
    return moment.utc(date).fromNow();
};

const formatDateDisplay = (date: string | Date): string => {
    moment.locale(currentLocale.value);
    return moment.utc(date).format('Do MMMM');
};

const formatYearDisplay = (date: string | Date): string => {
    moment.locale(currentLocale.value);
    return moment.utc(date).format('YYYY');
};

const formatTimeRange = (startTime: string | Date, endTime: string | Date | undefined): string => {
    moment.locale(currentLocale.value);
    const start = moment.utc(startTime).format('HH:mm');
    if (!endTime) return start;
    const end = moment.utc(endTime).format('HH:mm');
    return `${start} to ${end}`;
};

const formatDuration = (durationMs: number | undefined | null): string => {
    if (typeof durationMs !== 'number' || durationMs <= 0) return '-';
    const duration = moment.duration(durationMs);
    const hours = Math.floor(duration.asHours());
    const minutes = duration.minutes();
    let formatted = '';
    if (hours > 0) {
        formatted += `${hours}h`;
    }
    if (minutes > 0) {
        if (formatted) formatted += ' ';
        formatted += `${minutes}m`;
    }
    return formatted || '-';
};

const getInvolvedCounts = (battle: IBattlesDocument): { alliances: number; corps: number; chars: number } => {
    return {
        alliances: battle.alliancesInvolved?.length || 0,
        corps: battle.corporationsInvolved?.length || 0,
        chars: battle.charactersInvolved?.length || 0,
    };
};

const formatNumber = (n: number | undefined | null): string => {
    if (typeof n !== 'number') return '0';
    return n.toLocaleString(undefined, { maximumFractionDigits: 0 });
};

const linkFn = (item: IBattlesDocument) => {
    if (!item || item.battle_id === null || item.battle_id === undefined) {
        console.error('Attempted to create link for battle with missing ID:', item);
        return '/battles'; // Redirect to battles list as fallback
    }
    return `/battle/${item.battle_id}`;
};

const getLocalizedString = (obj: any, localeKey: string): string => {
    if (!obj) return "";
    // If the object itself is a string, return it directly (for non-localized fields)
    if (typeof obj === 'string') return obj;
    // Otherwise, attempt to get the localized string
    return obj[localeKey] || obj.en || "";
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
};

const clearAllFilters = () => {
    searchQuery.value = '';
    filter.value = 'all';
    currentPage.value = 1; // Reset to first page when clearing filters
};

// Add this new helper function to format systems from battles
const getSystemsDisplay = (battle: IBattlesDocument) => {
    if (battle.systems && battle.systems.length > 0) {
        return battle.systems.map(system => {
            const securityDisplay = system.system_security !== undefined && system.system_security !== null
                ? system.system_security.toFixed(1)
                : 'N/A';
            const regionName = getLocalizedString(system.region_name, currentLocale.value);
            return {
                id: system.system_id,
                name: system.system_name,
                security: securityDisplay,
                region: regionName
            };
        });
    } else if (battle.system_id) {
        // Handle legacy format
        const securityDisplay = battle.system_security !== undefined && battle.system_security !== null
            ? battle.system_security.toFixed(1)
            : 'N/A';
        const regionName = getLocalizedString(battle.region_name, currentLocale.value);
        return [{
            id: battle.system_id,
            name: battle.system_name || t('unknownSystem', 'Unknown System'),
            security: securityDisplay,
            region: regionName
        }];
    }
    return [];
};
</script>

<template>
    <div class="space-y-4">
        <h1 class="text-2xl font-bold">{{ t('battles', 'Battles') }}</h1>

        <!-- Search and Filters Section -->
        <div class="bg-background-800 p-4 rounded-lg shadow-lg border border-gray-700/30">
            <!-- Search Input -->
            <div class="mb-4">
                <UInput v-model="searchQuery" placeholder="Search battles..." icon="lucide:search" size="lg" :ui="{
                    icon: {
                        trailing: {
                            pointer: '',
                        },
                    },
                }">
                    <template #trailing>
                        <button v-show="searchQuery !== ''" class="text-gray-400 hover:text-gray-600 p-1 rounded"
                            @click="searchQuery = ''" type="button">
                            <UIcon name="lucide:x" class="w-4 h-4" />
                        </button>
                    </template>
                </UInput>
            </div>

            <!-- Filter Buttons -->
            <div class="flex flex-col sm:flex-row gap-2">
                <div class="flex gap-2 flex-wrap">
                    <UButton :variant="filter === 'all' ? 'solid' : 'outline'"
                        :color="filter === 'all' ? 'primary' : 'gray'" @click="setFilter('all')" size="sm">
                        {{ t('battle.filter.all') }}
                    </UButton>
                    <UButton :variant="filter === 'custom' ? 'solid' : 'outline'"
                        :color="filter === 'custom' ? 'primary' : 'gray'" @click="setFilter('custom')" size="sm">
                        {{ t('battle.filter.custom') }}
                    </UButton>
                </div>

                <!-- Clear Filters Button -->
                <div class="flex justify-end sm:ml-auto">
                    <UButton v-if="hasActiveFilters" variant="outline" color="red" size="sm" icon="lucide:x"
                        @click="clearAllFilters">
                        {{ t('battle.filter.clear') }}
                    </UButton>
                </div>
            </div>

            <!-- Active Filters Display -->
            <div v-if="hasActiveFilters" class="mt-3 pt-3 border-t border-gray-700/30">
                <div class="flex flex-wrap gap-2 items-center">
                    <span class="text-sm text-gray-300">{{ t('active_filters') }}:</span>
                    <UBadge v-if="filter !== 'all'" color="blue" variant="soft" size="sm">
                        {{ t(`battle.filter.${filter}`) }}
                    </UBadge>
                    <UBadge v-if="searchQuery" color="green" variant="soft" size="sm">
                        {{ t('search') }}: "{{ searchQuery }}"
                    </UBadge>
                </div>
            </div>
        </div>

        <UAlert v-if="error" icon="i-heroicons-exclamation-triangle" color="red" variant="soft"
            :title="t('errorFetchingData', 'Error Fetching Data')" :description="error.message" />

        <!-- Show loading spinner when data is initially loading -->
        <div v-if="pending && isInitialLoad" class="flex flex-col items-center justify-center py-12">
            <UIcon name="lucide:loader" class="w-12 h-12 animate-spin text-primary mb-4" />
            <span class="text-xl font-medium">{{ t('loading', 'Loading battles...') }}</span>
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
                        }, `Showing {start}-{end} of {total} battles`) }}
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
                    :disabled="pending" size="sm" />
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

            <Table :key="`battles-table-${pending ? 'loading' : 'data'}`" :columns="columns"
                :items="pending && !battlesList.length ? skeletonRows : battlesList" :loading="pending"
                :skeleton-count="selectedPageSize" :link-fn="linkFn" :bordered="true" :striped="false" :hover="true"
                density="normal" background="transparent" table-class="battles-table"
                :empty-text="t('noBattlesFound', 'No battles found.')" empty-icon="i-heroicons-circle-stack">
                <!-- Custom Cell Rendering -->
                <template #cell-time="{ item }">
                    <div class="text-sm space-y-0.5">
                        <UTooltip :text="moment.utc(item.start_time).format('YYYY-MM-DD HH:mm:ss UTC')">
                            <div>{{ formatTimeAgo(item.start_time) }}</div>
                        </UTooltip>
                        <div>{{ formatDateDisplay(item.start_time) }}, {{ formatYearDisplay(item.start_time) }}</div>
                        <div>{{ formatTimeRange(item.start_time, item.end_time) }}</div>
                        <div>{{ t('duration', 'Duration') }}: {{ formatDuration(item.duration_ms) }}</div>
                    </div>
                </template> <template #cell-system="{ item }">
                    <div class="flex flex-col space-y-1">
                        <template v-for="(system, index) in getSystemsDisplay(item)"
                            :key="`system-${system.id}-${index}`">
                            <div class="flex items-center gap-2 cursor-pointer">
                                <Image :id="system.id" type="system" size="24" class="w-6 h-6 rounded flex-shrink-0" />
                                <div class="text-sm">
                                    <span class="hover:underline">{{ system.name }} </span>
                                    <span class="text-gray-500"> ({{ system.security }})</span>
                                    <span class="text-gray-400"> ({{ system.region }})</span>
                                </div>
                            </div>
                        </template>
                    </div>
                </template>

                <template #cell-stats="{ item }">
                    <div class="text-sm space-y-0.5">
                        <div>
                            <span class="font-semibold">{{ formatIsk(item.iskDestroyed) }}</span> {{
                                t('iskDestroyedShort', 'ISK') }} /
                            <span class="font-semibold">{{ formatNumber(item.killmailsCount) }}</span> {{ t('kmsShort',
                                'KMs') }}
                        </div>
                        <div>
                            <span class="font-semibold">{{ getInvolvedCounts(item).alliances }}</span> {{
                                t('alliancesShort', 'Alliances') }} /
                            <span class="font-semibold">{{ getInvolvedCounts(item).corps }}</span> {{
                                t('corporationsShort', 'Corps') }}
                        </div>
                        <div>
                            <span class="font-semibold">{{ getInvolvedCounts(item).chars }}</span> {{
                                t('charactersShort', 'Characters') }}
                        </div>
                    </div>
                </template>

                <template #cell-involved="{ item }">
                    <div class="space-y-1">
                        <!-- Row 1: Entities (Alliances/Corporations) -->
                        <div class="flex flex-wrap gap-1">
                            <template v-if="item.alliancesInvolved && item.alliancesInvolved.length > 0">
                                <template v-for="alliance in item.top_alliances?.slice(0, 10) || []"
                                    :key="`alliance-${alliance.id}`">
                                    <UTooltip
                                        :text="`${getLocalizedString(alliance.name, currentLocale)} (${alliance.count} pilots)`">
                                        <div class="cursor-pointer">
                                            <Image :id="alliance.id" type="alliance"
                                                :alt="getLocalizedString(alliance.name, currentLocale)" size="32"
                                                class="w-8 h-8" :showCount="true" :count="alliance.count"
                                                countPosition="bottom-right" />
                                        </div>
                                    </UTooltip>
                                </template>
                            </template>
                            <template v-else>
                                <template v-for="corp in item.top_corporations?.slice(0, 10) || []"
                                    :key="`corp-${corp.id}`">
                                    <UTooltip
                                        :text="`${getLocalizedString(corp.name, currentLocale)} (${corp.count} pilots)`">
                                        <div class="cursor-pointer">
                                            <Image :id="corp.id" type="corporation"
                                                :alt="getLocalizedString(corp.name, currentLocale)" size="32"
                                                class="w-8 h-8" :showCount="true" :count="corp.count"
                                                countPosition="bottom-right" />
                                        </div>
                                    </UTooltip>
                                </template>
                            </template>
                        </div>
                        <!-- Row 2: Ships -->
                        <div class="flex flex-wrap gap-1">
                            <template v-for="ship in item.top_ship_types?.slice(0, 10) || []" :key="`ship-${ship.id}`">
                                <UTooltip :text="`${getLocalizedString(ship.name, currentLocale)} (${ship.count})`">
                                    <div class="cursor-pointer">
                                        <Image :id="ship.id" type="item"
                                            :name="getLocalizedString(ship.name, currentLocale)"
                                            :alt="getLocalizedString(ship.name, currentLocale)" size="32"
                                            class="w-8 h-8" :showCount="true" :count="ship.count"
                                            countPosition="bottom-right" />
                                    </div>
                                </UTooltip>
                            </template>
                        </div>
                    </div>
                </template>

                <!-- Custom mobile row template for battles -->
                <template #mobile-row="{ item }">
                    <div class="flex flex-col w-full p-2 gap-2">
                        <!-- Battle ID, Time, and System - Top Row -->
                        <div class="flex items-start justify-between">
                            <!-- Left side: Battle ID & Time -->
                            <div class="flex-1">
                                <div class="flex items-center gap-2">
                                    <span class="text-xs text-gray-500">{{ formatTimeAgo(item.start_time) }}</span>
                                </div>
                                <div class="text-xs text-gray-500">
                                    {{ formatDateDisplay(item.start_time) }} ·
                                    {{ formatTimeRange(item.start_time, item.end_time) }} ·
                                    {{ formatDuration(item.duration_ms) }}
                                </div>
                            </div>

                            <!-- Right side: ISK destroyed - key stat -->
                            <div class="flex-none text-right">
                                <div class="font-semibold text-sm">{{ formatIsk(item.iskDestroyed) }}</div>
                                <div class="text-xs text-gray-500">{{ t('iskDestroyedShort', 'ISK') }}</div>
                            </div>
                        </div>

                        <!-- Systems section -->
                        <div class="flex flex-col space-y-1 text-sm">
                            <template v-for="(system, index) in getSystemsDisplay(item)"
                                :key="`system-${system.id}-${index}`">
                                <div class="flex items-center gap-2 cursor-pointer">
                                    <Image :id="system.id" type="system" size="24"
                                        class="w-5 h-5 rounded flex-shrink-0" />
                                    <div class="text-xs">
                                        <span class="hover:underline">{{ system.name }}</span>
                                        <span class="text-gray-500">({{ system.security }})</span>
                                        <span class="text-gray-400 hidden sm:inline">({{ system.region }})</span>
                                    </div>
                                </div>
                            </template>
                        </div>

                        <!-- Stats (Compact) -->
                        <div class="grid grid-cols-3 gap-2 text-xs bg-background-700 bg-opacity-20 p-1 rounded">
                            <div>
                                <div class="font-semibold">{{ formatNumber(item.killmailsCount) }}</div>
                                <div class="text-gray-500">{{ t('kmsShort', 'KMs') }}</div>
                            </div>
                            <div>
                                <div class="font-semibold">{{ getInvolvedCounts(item).alliances ||
                                    getInvolvedCounts(item).corps }}</div>
                                <div class="text-gray-500">
                                    {{ item.alliancesInvolved && item.alliancesInvolved.length > 0
                                        ? t('alliancesShort', 'Alliances')
                                        : t('corporationsShort', 'Corps') }}
                                </div>
                            </div>
                            <div>
                                <div class="font-semibold">{{ getInvolvedCounts(item).chars }}</div>
                                <div class="text-gray-500">{{ t('charactersShort', 'Characters') }}</div>
                            </div>
                        </div>

                        <!-- Involved entities (compact) -->
                        <div class="flex flex-col space-y-1">
                            <!-- Entities (reduced count for mobile) -->
                            <div class="flex flex-wrap gap-1">
                                <template v-if="item.alliancesInvolved && item.alliancesInvolved.length > 0">
                                    <template v-for="alliance in item.top_alliances?.slice(0, 5) || []"
                                        :key="`m-alliance-${alliance.id}`">
                                        <div class="cursor-pointer">
                                            <Image :id="alliance.id" type="alliance"
                                                :alt="getLocalizedString(alliance.name, currentLocale)" size="32"
                                                class="w-6 h-6" :showCount="true" :count="alliance.count"
                                                countPosition="bottom-right" />
                                        </div>
                                    </template>
                                </template>
                                <template v-else>
                                    <template v-for="corp in item.top_corporations?.slice(0, 5) || []"
                                        :key="`m-corp-${corp.id}`">
                                        <div class="cursor-pointer">
                                            <Image :id="corp.id" type="corporation"
                                                :alt="getLocalizedString(corp.name, currentLocale)" size="32"
                                                class="w-6 h-6" :showCount="true" :count="corp.count"
                                                countPosition="bottom-right" />
                                        </div>
                                    </template>
                                </template>

                                <!-- Ships (reduced count for mobile) -->
                                <template v-for="ship in item.top_ship_types?.slice(0, 5) || []"
                                    :key="`m-ship-${ship.id}`">
                                    <div class="cursor-pointer">
                                        <Image :id="ship.id" type="item"
                                            :name="getLocalizedString(ship.name, currentLocale)"
                                            :alt="getLocalizedString(ship.name, currentLocale)" size="32"
                                            class="w-6 h-6" :showCount="true" :count="ship.count"
                                            countPosition="bottom-right" />
                                    </div>
                                </template>
                            </div>
                        </div>
                    </div>
                </template>

                <template #skeleton>
                    <div class="battles-skeleton-container">
                        <div v-for="i in selectedPageSize" :key="`skeleton-${i}`" class="battles-skeleton-row">
                            <!-- Time Column Skeleton -->
                            <div class="battles-skeleton-cell" :style="{ width: columns[0].width }">
                                <div class="flex flex-col space-y-1">
                                    <div class="battles-skeleton-text" style="width: 60px;"></div> <!-- Battle ID -->
                                    <div class="battles-skeleton-text" style="width: 80px;"></div> <!-- Time ago -->
                                    <div class="battles-skeleton-text" style="width: 100px;"></div> <!-- Date, Year -->
                                    <div class="battles-skeleton-text" style="width: 90px;"></div> <!-- Time Range -->
                                    <div class="battles-skeleton-text" style="width: 70px;"></div> <!-- Duration -->
                                </div>
                            </div>
                            <!-- System Column Skeleton -->
                            <div class="battles-skeleton-cell" :style="{ width: columns[1].width }">
                                <div class="flex flex-col space-y-2">
                                    <div class="flex items-center gap-2">
                                        <div class="battles-skeleton-image" style="width:24px; height:24px;"></div>
                                        <div class="flex flex-col">
                                            <div class="battles-skeleton-title" style="width: 100px;"></div>
                                        </div>
                                    </div>
                                    <div class="flex items-center gap-2">
                                        <div class="battles-skeleton-image" style="width:24px; height:24px;"></div>
                                        <div class="flex flex-col">
                                            <div class="battles-skeleton-title" style="width: 80px;"></div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <!-- Stats Column Skeleton -->
                            <div class="battles-skeleton-cell" :style="{ width: columns[2].width }">
                                <div class="flex flex-col space-y-1">
                                    <div class="battles-skeleton-text" style="width: 120px;"></div> <!-- ISK / KMs -->
                                    <div class="battles-skeleton-text" style="width: 100px;"></div>
                                    <!-- Alliances / Corps -->
                                    <div class="battles-skeleton-text" style="width: 80px;"></div> <!-- Characters -->
                                </div>
                            </div>
                            <!-- Involved Column Skeleton -->
                            <div class="battles-skeleton-cell" :style="{ width: columns[3].width }">
                                <div class="flex flex-col space-y-1 w-full">
                                    <div class="flex flex-wrap gap-1">
                                        <div v-for="s_img in 5" :key="`s_img_ent_${s_img}`"
                                            class="battles-skeleton-image" style="width:24px; height:24px;"></div>
                                    </div>
                                    <div class="flex flex-wrap gap-1">
                                        <div v-for="s_img_ship in 5" :key="`s_img_ship_${s_img_ship}`"
                                            class="battles-skeleton-image" style="width:24px; height:24px;"></div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </template>
            </Table>

            <!-- Bottom Pagination - keep as is for consistency -->
            <div class="w-full flex justify-end mt-4">
                <UPagination v-model:page="currentPage" :total="totalItems" :items-per-page="selectedPageSize"
                    :disabled="pending" size="sm" />
            </div>
        </div>
    </div>
</template>

<style scoped>
@keyframes pulse {

    0%,
    100% {
        opacity: 1;
    }

    50% {
        opacity: .5;
    }
}

.battles-skeleton-container {
    width: 100%;
}

.battles-skeleton-row {
    display: flex;
    width: 100%;
    min-height: 60px;
    /* Adjusted slightly from killlist for potential content difference */
    padding: 8px 12px;
    margin-bottom: 4px;
    border-radius: 6px;
    background-color: light-dark(rgba(255, 255, 255, 0.4), rgba(26, 26, 26, 0.3));
    border-bottom: 1px solid light-dark(rgba(229, 231, 235, 0.3), rgba(75, 85, 99, 0.2));
}

.battles-skeleton-cell {
    display: flex;
    align-items: center;
    flex-shrink: 0;
    flex-grow: 0;
    padding: 0 4px;
    /* Added padding for cell spacing */
}

.battles-skeleton-image {
    width: 32px;
    /* Slightly smaller than killlist */
    height: 32px;
    flex-shrink: 0;
    margin-right: 8px;
    /* Added margin */
    border-radius: 6px;
    background-color: light-dark(#e5e7eb, #374151);
    animation: pulse 1.5s ease-in-out infinite;
}

.battles-skeleton-title {
    height: 14px;
    /* Adjusted */
    width: 80px;
    /* Adjusted */
    border-radius: 4px;
    background-color: light-dark(#e5e7eb, #374151);
    animation: pulse 1.5s ease-in-out infinite;
    margin-bottom: 4px;
    /* Added margin */
}

.battles-skeleton-subtitle {
    height: 10px;
    /* Adjusted */
    width: 60px;
    /* Adjusted */
    border-radius: 4px;
    background-color: light-dark(#e5e7eb, #374151);
    animation: pulse 1.5s ease-in-out infinite;
}

.battles-skeleton-text {
    height: 14px;
    /* Standard text height */
    border-radius: 4px;
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

/* Mobile-specific enhancements for battles list */
@media (max-width: 768px) {
    :deep(.table-row) {
        padding: 0.5rem !important;
    }

    /* Add a subtle divider between mobile battle card sections */
    .battle-card-divider {
        height: 1px;
        background-color: light-dark(rgba(229, 231, 235, 0.3), rgba(75, 85, 99, 0.2));
        margin: 0.35rem 0;
    }
}
</style>
