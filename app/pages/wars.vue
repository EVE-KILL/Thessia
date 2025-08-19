<template>
    <div class="container mx-auto p-4">
        <!-- Page Header -->
        <div
            class="mb-6 bg-red-50 dark:bg-red-900/20 p-4 rounded-lg shadow-lg border border-red-200 dark:border-red-700/30">
            <div class="flex justify-between items-center">
                <div>
                    <h1 class="text-3xl font-bold text-gray-900 dark:text-white">{{ t('wars.title') }}</h1>
                    <p class="text-gray-600 dark:text-gray-300 mt-2">{{ t('wars.description') }}</p>
                </div>
            </div>

            <!-- Search Section -->
            <div class="mt-5 pt-4 border-t border-red-200 dark:border-red-700/30">
                <div class="max-w-xl">
                    <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        {{ t('wars.searchPlaceholder') }}
                    </label>
                    <Search v-model="searchQuery" :placeholder="t('wars.searchPlaceholder')"
                        :api-url="(query) => `/api/search/${encodeURIComponent(query)}`"
                        :transform-response="(data) => data?.hits?.filter(hit => hit.type === 'corporation' || hit.type === 'alliance') || []"
                        :result-name="(result) => formatSearchResultDisplayName(result)" :min-length="2"
                        :show-clear-button="true"
                        input-class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:text-white"
                        dropdown-class="absolute z-50 mt-1 w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md shadow-lg max-h-48 overflow-y-auto"
                        @select="selectSearchResult" @clear="clearSearch">

                        <template #results="{ results, selectResult }">
                            <a v-for="result in results" :key="result.id" @click="selectResult(result)"
                                class="flex items-center px-4 py-2 text-sm cursor-pointer text-gray-900 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700 border-b border-gray-200 dark:border-gray-600 last:border-b-0">
                                <div class="flex-shrink-0 mr-3">
                                    <Image :type="result.type" :id="result.id" :size="24" />
                                </div>
                                <div class="flex-1 min-w-0">
                                    <div class="font-medium truncate">{{ formatSearchResultDisplayName(result) }}</div>
                                </div>
                            </a>
                        </template>

                        <template #loading>
                            <div class="px-4 py-2 text-sm text-gray-500 dark:text-gray-400">
                                {{ t('search.searching') }}...
                            </div>
                        </template>

                        <template #no-results>
                            <div class="px-4 py-2 text-sm text-gray-500 dark:text-gray-400">
                                {{ t('search.noResults') }}
                            </div>
                        </template>
                    </Search>

                    <!-- Selected Entity Display -->
                    <div v-if="selectedEntity" class="mt-2">
                        <UBadge color="primary" class="flex items-center gap-1 py-1 px-2">
                            <Image :type="selectedEntity.type" :id="selectedEntity.id" :size="16" class="rounded" />
                            {{ selectedEntity.name }}
                            <UButton color="white" variant="ghost" icon="lucide:x" size="xs" class="p-0"
                                @click="clearSelectedEntity" />
                        </UBadge>
                    </div>
                </div>
            </div>
        </div>

        <!-- Tabs -->
        <Tabs v-model="activeTab" :items="tabItems">
            <template #all>
                <!-- All Wars Tab -->
                <div v-if="pending" class="space-y-4">
                    <USkeleton class="h-20 w-full" v-for="i in 10" :key="i" />
                </div>

                <div v-else-if="error" class="text-center py-8 text-red-600 dark:text-red-400">
                    {{ t('wars.error.loadFailed') }}
                </div>

                <div v-else>
                    <!-- Top Pagination -->
                    <div v-if="totalPages > 1" class="mb-6">
                        <div class="flex flex-col sm:flex-row justify-between items-center gap-4">
                            <!-- Page size selector -->
                            <div class="flex items-center space-x-2">
                                <span class="text-sm text-gray-700 dark:text-gray-300">{{ t('itemsPerPage') }}</span>
                                <select v-model="selectedPageSize" @change="currentPage = 1"
                                    class="px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white">
                                    <option v-for="item in pageSizeItems" :key="item.value" :value="item.value">
                                        {{ item.label }}
                                    </option>
                                </select>
                            </div>

                            <!-- Pagination -->
                            <UPagination v-model:page="currentPage" :total="totalItems"
                                :items-per-page="selectedPageSize" :disabled="pending" size="sm" />
                        </div>
                    </div>

                    <!-- Wars Table -->
                    <Table :key="`wars-table-${pending ? 'loading' : 'data'}`" :columns="warColumns" :items="warsList"
                        :loading="pending" density="normal" background="transparent" table-class="wars-table"
                        class="mb-6">
                        <template #cell-war_id="{ item }">
                            <NuxtLink :to="`/war/${item.war_id}`"
                                class="text-blue-600 dark:text-blue-400 hover:underline font-medium">
                                #{{ item.war_id }}
                            </NuxtLink>
                        </template>

                        <template #cell-aggressor="{ item }">
                            <div class="flex items-center space-x-2 min-w-0">
                                <Image v-if="item.aggressor.alliance" :type="'alliance'"
                                    :id="item.aggressor.alliance_id" :size="32" :alt="item.aggressor.alliance.name"
                                    class="w-6 h-6 rounded flex-shrink-0" />
                                <Image v-else-if="item.aggressor.corporation" :type="'corporation'"
                                    :id="item.aggressor.corporation_id" :size="32"
                                    :alt="item.aggressor.corporation.name" class="w-6 h-6 rounded flex-shrink-0" />
                                <div class="min-w-0 flex-1">
                                    <div v-if="item.aggressor.alliance"
                                        class="font-medium text-gray-900 dark:text-white truncate"
                                        :title="item.aggressor.alliance.name">
                                        {{ item.aggressor.alliance.name }}
                                    </div>
                                    <div v-else-if="item.aggressor.corporation"
                                        class="font-medium text-gray-900 dark:text-white truncate"
                                        :title="item.aggressor.corporation.name">
                                        {{ item.aggressor.corporation.name }}
                                    </div>
                                    <div v-if="item.aggressor.alliance && item.aggressor.corporation"
                                        class="text-sm text-gray-500 dark:text-gray-400 truncate"
                                        :title="item.aggressor.corporation.name">
                                        {{ item.aggressor.corporation.name }}
                                    </div>
                                </div>
                            </div>
                        </template>

                        <template #cell-defender="{ item }">
                            <div class="flex items-center space-x-2 min-w-0">
                                <Image v-if="item.defender.alliance" :type="'alliance'" :id="item.defender.alliance_id"
                                    :size="32" :alt="item.defender.alliance.name"
                                    class="w-6 h-6 rounded flex-shrink-0" />
                                <Image v-else-if="item.defender.corporation" :type="'corporation'"
                                    :id="item.defender.corporation_id" :size="32" :alt="item.defender.corporation.name"
                                    class="w-6 h-6 rounded flex-shrink-0" />
                                <div class="min-w-0 flex-1">
                                    <div v-if="item.defender.alliance"
                                        class="font-medium text-gray-900 dark:text-white truncate"
                                        :title="item.defender.alliance.name">
                                        {{ item.defender.alliance.name }}
                                    </div>
                                    <div v-else-if="item.defender.corporation"
                                        class="font-medium text-gray-900 dark:text-white truncate"
                                        :title="item.defender.corporation.name">
                                        {{ item.defender.corporation.name }}
                                    </div>
                                    <div v-if="item.defender.alliance && item.defender.corporation"
                                        class="text-sm text-gray-500 dark:text-gray-400 truncate"
                                        :title="item.defender.corporation.name">
                                        {{ item.defender.corporation.name }}
                                    </div>
                                </div>
                            </div>
                        </template>

                        <template #cell-started="{ item }">
                            <div class="text-sm">
                                <div class="text-gray-900 dark:text-white">{{ formatDateDisplay(item.started) }}</div>
                                <div class="text-gray-500 dark:text-gray-400">{{ formatTimeAgo(item.started) }}</div>
                            </div>
                        </template>

                        <template #cell-status="{ item }">
                            <UBadge v-if="item.finished" color="error" variant="soft" size="sm">
                                <UIcon name="lucide:x" class="w-3 h-3 mr-1" />
                                {{ t('wars.status.finished') }}
                            </UBadge>
                            <UBadge v-else color="success" variant="soft" size="sm">
                                <UIcon name="lucide:check" class="w-3 h-3 mr-1" />
                                {{ t('wars.status.ongoing') }}
                            </UBadge>

                            <!-- Additional status indicators for ongoing wars -->
                            <div v-if="!item.finished && (item.mutual || item.open_for_allies)" class="mt-1 flex gap-1">
                                <UBadge v-if="item.mutual" color="warning" variant="soft" size="xs">
                                    {{ t('wars.status.mutual') }}
                                </UBadge>
                                <UBadge v-if="item.open_for_allies" color="info" variant="soft" size="xs">
                                    {{ t('wars.status.openToAllies') }}
                                </UBadge>
                            </div>
                        </template>

                        <template #cell-efficiency="{ item }">
                            <div class="text-sm">
                                <div v-if="item.aggressor.isk_destroyed > 0 || item.defender.isk_destroyed > 0"
                                    class="text-gray-900 dark:text-white">
                                    {{ formatIsk(item.aggressor.isk_destroyed) }} vs {{
                                        formatIsk(item.defender.isk_destroyed) }}
                                </div>
                                <div v-else class="text-gray-500 dark:text-gray-400 italic">
                                    {{ t('wars.noActivity') }}
                                </div>

                                <div v-if="item.aggressor.ships_killed > 0 || item.defender.ships_killed > 0"
                                    class="text-gray-500 dark:text-gray-400">
                                    {{ item.aggressor.ships_killed }} vs {{ item.defender.ships_killed }} ships
                                </div>
                            </div>
                        </template>
                    </Table>

                    <!-- Pagination -->
                    <div v-if="totalPages > 1" class="mt-6">
                        <div class="flex flex-col sm:flex-row justify-between items-center gap-4">
                            <!-- Page size selector -->
                            <div class="flex items-center space-x-2">
                                <span class="text-sm text-gray-700 dark:text-gray-300">{{ t('itemsPerPage') }}</span>
                                <select v-model="selectedPageSize" @change="currentPage = 1"
                                    class="px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white">
                                    <option v-for="item in pageSizeItems" :key="item.value" :value="item.value">
                                        {{ item.label }}
                                    </option>
                                </select>
                            </div>

                            <!-- Pagination -->
                            <UPagination v-model:page="currentPage" :total="totalItems"
                                :items-per-page="selectedPageSize" :disabled="pending" size="sm" />
                        </div>
                    </div>
                </div>
            </template>

            <template #recent>
                <!-- Recent Wars Tab with Four Tables -->
                <div v-if="recentPending" class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <USkeleton class="h-64 w-full" v-for="i in 4" :key="i" />
                </div>

                <div v-else-if="recentError" class="text-center py-8 text-red-600 dark:text-red-400">
                    {{ t('wars.error.loadRecentFailed') }}
                </div>

                <div v-else class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <!-- Recent Wars Open to Allies -->
                    <div
                        class="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700">
                        <div class="p-4 border-b border-gray-200 dark:border-gray-700">
                            <h3 class="text-lg font-medium text-gray-900 dark:text-white">
                                {{ t('wars.recent.openToAllies') }}
                            </h3>
                            <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                {{ t('wars.recent.openToAlliesDesc') }}
                            </p>
                        </div>
                        <RecentWarTable :wars="recentData?.recentOpenToAllies || []" />
                    </div>

                    <!-- Recent Mutual Wars -->
                    <div
                        class="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700">
                        <div class="p-4 border-b border-gray-200 dark:border-gray-700">
                            <h3 class="text-lg font-medium text-gray-900 dark:text-white">
                                {{ t('wars.recent.mutual') }}
                            </h3>
                            <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                {{ t('wars.recent.mutualDesc') }}
                            </p>
                        </div>
                        <RecentWarTable :wars="recentData?.recentMutual || []" />
                    </div>

                    <!-- Recent Other Wars -->
                    <div
                        class="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700">
                        <div class="p-4 border-b border-gray-200 dark:border-gray-700">
                            <h3 class="text-lg font-medium text-gray-900 dark:text-white">
                                {{ t('wars.recent.other') }}
                            </h3>
                            <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                {{ t('wars.recent.otherDesc') }}
                            </p>
                        </div>
                        <RecentWarTable :wars="recentData?.recentOther || []" />
                    </div>

                    <!-- Recently Finished Wars -->
                    <div
                        class="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700">
                        <div class="p-4 border-b border-gray-200 dark:border-gray-700">
                            <h3 class="text-lg font-medium text-gray-900 dark:text-white">
                                {{ t('wars.recent.finished') }}
                            </h3>
                            <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                {{ t('wars.recent.finishedDesc') }}
                            </p>
                        </div>
                        <RecentWarTable :wars="recentData?.recentFinished || []" :show-finished-date="true" />
                    </div>
                </div>
            </template>
        </Tabs>
    </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';

const { t, locale } = useI18n();

// Use the centralized date formatting composable
const {
    formatTimeAgo,
    formatDateDisplay,
    formatDateTime,
} = useDateFormatting();

// SEO setup
useSeoMeta({
    title: () => t('seo.wars.title'),
    description: () => t('seo.wars.description'),
    ogTitle: () => t('seo.wars.title'),
    ogDescription: () => t('seo.wars.description'),
    ogType: 'website',
    twitterCard: 'summary_large_image',
    twitterTitle: () => t('seo.wars.title'),
    twitterDescription: () => t('seo.wars.description')
});

// Tab management
const activeTab = ref('all');
const tabItems = [
    {
        id: 'all',
        label: t('wars.tabs.all'),
        slot: 'all',
        icon: 'lucide:list'
    },
    {
        id: 'recent',
        label: t('wars.tabs.recent'),
        slot: 'recent',
        icon: 'lucide:activity'
    }
];

// Search functionality
const searchQuery = ref('');
const selectedEntity = ref<{ id: number, name: string, type: string } | null>(null);

// Helper function to format search result display name
const formatSearchResultDisplayName = (result: any) => {
    let displayName = result.name;

    // Add ticker for alliances and corporations
    if (result.ticker && (result.type === 'alliance' || result.type === 'corporation')) {
        displayName = `${result.name} [${result.ticker}]`;
    }

    // Add founded date for context
    if (result.date_founded && (result.type === 'alliance' || result.type === 'corporation')) {
        const foundedDate = new Date(result.date_founded);
        const year = foundedDate.getFullYear();
        displayName += ` (${year})`;
    }

    return displayName;
};

const selectSearchResult = (result: any) => {
    selectedEntity.value = {
        id: result.id,
        name: formatSearchResultDisplayName(result),
        type: result.type
    };
    searchQuery.value = '';
    currentPage.value = 1;
};

const clearSelectedEntity = () => {
    selectedEntity.value = null;
    currentPage.value = 1;
};

const clearSearch = () => {
    searchQuery.value = '';
    selectedEntity.value = null;
    currentPage.value = 1;
};

// Pagination
const currentPage = ref(1);
const pageSizeItems = [
    { label: "10", value: 10 },
    { label: "25", value: 25 },
    { label: "50", value: 50 },
    { label: "100", value: 100 },
];
const selectedPageSize = ref(pageSizeItems[1].value); // Default to 25

// All Wars Tab Data
const queryParams = computed(() => ({
    page: currentPage.value,
    limit: selectedPageSize.value,
    entityId: selectedEntity.value?.id || undefined,
    entityType: selectedEntity.value?.type || undefined,
    tab: activeTab.value
}));

interface WarsApiResponse {
    wars: any[];
    totalItems: number;
    totalPages: number;
    currentPage: number;
    itemsPerPage: number;
}

const initialData = ref<WarsApiResponse>({
    wars: [],
    totalItems: 0,
    totalPages: 0,
    currentPage: 1,
    itemsPerPage: selectedPageSize.value
});

const { data, pending, error, refresh } = useFetch<WarsApiResponse>('/api/wars', {
    query: queryParams,
    key: 'wars-list',
    server: true,
    default: () => initialData.value,
});

const warsList = computed(() => data?.value?.wars || initialData.value.wars);
const totalItems = computed(() => data?.value?.totalItems || initialData.value.totalItems);
const totalPages = computed(() => data?.value?.totalPages || initialData.value.totalPages);

// Recent Wars Tab Data
const { data: recentData, pending: recentPending, error: recentError } = useFetch('/api/wars/recent', {
    key: '-recent',
    server: false, // Only fetch when tab is active
    default: () => ({
        recentOpenToAllies: [],
        recentMutual: [],
        recentOther: [],
        recentFinished: []
    }),
});

// Table columns for all wars
const warColumns = [
    { id: 'war_id', header: computed(() => t('wars.table.warId')), width: '10%' },
    { id: 'aggressor', header: computed(() => t('wars.table.aggressor')), width: '25%' },
    { id: 'defender', header: computed(() => t('wars.table.defender')), width: '25%' },
    { id: 'started', header: computed(() => t('wars.table.started')), width: '15%' },
    { id: 'status', header: computed(() => t('wars.table.status')), width: '10%' },
    { id: 'efficiency', header: computed(() => t('wars.table.efficiency')), width: '15%' }
];

// Watch for tab changes to refresh data when needed
watch(activeTab, (newTab) => {
    if (newTab === 'recent' && !recentData.value) {
        // Force refresh of recent data when switching to recent tab
        refresh();
    }
});

// Reset page when selected entity changes
watch(selectedEntity, () => {
    currentPage.value = 1;
});
</script>

<style scoped>
.container {
    max-width: 1400px;
}

:deep(.wars-table) {
    table-layout: fixed;
}

:deep(.wars-table td) {
    overflow: hidden;
}

:deep(.wars-table .truncate) {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}
</style>
