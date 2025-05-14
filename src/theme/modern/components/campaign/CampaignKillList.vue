<script setup lang="ts">
import moment from "moment";
import type { IKillList } from "~/server/interfaces/IKillList";

const { t, locale } = useI18n();
const currentLocale = computed(() => locale.value);

// Define props with campaign-specific defaults
const props = defineProps({
    campaignId: { type: String, required: true },
    limit: { type: Number, default: 25 },
    campaignQuery: { type: Object, default: () => ({}) }
});

// Create a separate page ref for direct v-model binding
const page = ref(1);
const pageSize = ref(props.limit);

// Pagination settings - keep for data structure organization
const pagination = ref({
    page: 1,
    pageSize: props.limit,
    hasMore: true,
    total: 0
});

const pageSizeItems = [
    { label: "10", id: 10 },
    { label: "25", id: 25 },
    { label: "50", id: 50 },
    { label: "100", id: 100 }
];

// For tracking loading state when loading more
const loadingMore = ref(false);

// Create query params for API
const queryParams = computed(() => ({
    page: page.value, // Use the separate page ref
    limit: pageSize.value // Use the separate pageSize ref
}));

// Fetch kill list data from campaign-specific endpoint
const {
    data: fetchedData,
    pending,
    error,
    refresh
} = useFetch<{ killmails: IKillList[], pagination: { page: number, limit: number, hasMore: boolean, total: number } }>(
    () => `/api/campaign/${props.campaignId}/killmails`,
    {
        key: `campaign-killmails-${props.campaignId}-${page.value}-${pageSize.value}`,
        query: queryParams
    }
);

// Extracted killmail data
const killmails = ref<IKillList[]>([]);

// Track if we have more data to load
const hasMoreData = computed(() => {
    if (!fetchedData.value) return false;
    return fetchedData.value.pagination.hasMore;
});

// Calculate total pages for pagination
const totalPages = computed(() => {
    if (!fetchedData.value?.pagination.total) return 1;
    return Math.ceil(fetchedData.value.pagination.total / pageSize.value);
});

// Determine if a kill is a loss for the attacker side (similar to isCombinedLoss in original KillList)
const isAttackerLoss = (kill: IKillList): boolean => {
    if (!kill || !props.campaignQuery) return false;

    // Check if victim matches any attacker filters in the campaign query
    const attackerFilters = {
        character: props.campaignQuery['attackers.character_id'],
        corporation: props.campaignQuery['attackers.corporation_id'],
        alliance: props.campaignQuery['attackers.alliance_id'],
        faction: props.campaignQuery['attackers.faction_id']
    };

    // Logic to check if victim is on attacker side
    for (const [entityType, filterValue] of Object.entries(attackerFilters)) {
        if (!filterValue) continue;

        const victimEntityId = kill.victim[`${entityType}_id`];
        if (!victimEntityId) continue;

        // Check if filter is an $in query
        if (typeof filterValue === 'object' && filterValue.$in) {
            if (filterValue.$in.includes(victimEntityId)) {
                return true;
            }
        }
        // Direct value match
        else if (filterValue === victimEntityId) {
            return true;
        }
    }

    return false;
};

// Get row class based on whether it's a loss for the attacker side
const getRowClass = (item) => {
    return isAttackerLoss(item) ? "combined-loss-row bg-darkred" : "";
};

// Update killmails when data changes
watch(
    fetchedData,
    (newData) => {
        if (newData?.killmails) {
            killmails.value = [...newData.killmails];
            pagination.value.total = newData.pagination.total || 0;
            pagination.value.hasMore = newData.pagination.hasMore;

            // Ensure our separate refs stay in sync
            page.value = newData.pagination.page;
            pageSize.value = newData.pagination.limit;
        }

        // Reset loading more flag
        loadingMore.value = false;
    },
    { immediate: true }
);

// Watch the dedicated page ref for changes
watch(page, async (newPage) => {
    if (pending.value) return;

    pagination.value.page = newPage; // Keep our pagination object in sync
    window.scrollTo({ top: 0, behavior: 'smooth' });

    try {
        await refresh();
    } catch (err) {
        console.error("Error changing page:", err);
    }
});

// Watch pageSize for changes
watch(pageSize, async (newSize) => {
    page.value = 1; // Reset to first page
    pagination.value.pageSize = newSize; // Keep our pagination object in sync

    try {
        await refresh();
    } catch (err) {
        console.error("Error refreshing data after page size change:", err);
    }
});

// Helper functions for data formatting
const getLocalizedString = (obj: any, locale: string): string => {
    if (!obj) return "";
    return obj[locale] || obj.en || "";
};

const formatIsk = (value: number): string => {
    if (value >= 1000000000) return `${(value / 1000000000).toFixed(2)}B`;
    if (value >= 1000000) return `${(value / 1000000).toFixed(2)}M`;
    if (value >= 1000) return `${(value / 1000).toFixed(2)}K`;
    return value.toString();
};

const formatDate = (date: string): string => {
    moment.locale(currentLocale.value);
    return moment.utc(date).fromNow();
};

const truncateString = (str: any, num: number): string => {
    const stringifiedStr = String(str || "");
    return stringifiedStr.length <= num ? stringifiedStr : `${stringifiedStr.slice(0, num)}...`;
};

const getSecurityColor = (security: number): string => {
    if (security >= 0.9) return "dark:text-yellow-400 text-yellow-600";
    if (security >= 0.8) return "dark:text-green-400 text-green-600";
    if (security >= 0.7) return "dark:text-green-500 text-green-700";
    if (security >= 0.6) return "dark:text-lime-400 text-lime-600";
    if (security >= 0.5) return "dark:text-yellow-300 text-yellow-500";
    if (security >= 0.4) return "dark:text-amber-400 text-amber-600";
    if (security >= 0.3) return "dark:text-orange-400 text-orange-600";
    if (security >= 0.2) return "dark:text-orange-500 text-orange-700";
    if (security >= 0.1) return "dark:text-red-400 text-red-600";
    return "dark:text-red-500 text-red-700";
};

// Generate kill link
const generateKillLink = (item: any): string | null => {
    if (!item || !item.killmail_id) return null;
    return `/kill/${item.killmail_id}`;
};

// Define table columns
const tableColumns = [
    {
        id: "ship",
        header: computed(() => t("ship")),
        width: "20%",
    },
    {
        id: "victim",
        header: computed(() => t("victim")),
        width: "25%",
    },
    {
        id: "finalBlow",
        header: computed(() => t("finalBlow")),
        width: "25%",
    },
    {
        id: "location",
        header: computed(() => t("location")),
        width: "15%",
    },
    {
        id: "details",
        headerClass: "text-right",
        width: "15%",
    },
];
</script>

<template>
    <div class="campaign-killlist w-full">
        <!-- Header -->
        <div class="mb-4">
            <!-- Top controls - right aligned: dropdown + pagination -->
            <div class="flex justify-end items-center gap-4 mb-3">
                <!-- Page size selector -->
                <USelect v-model="pageSize" value-key="id" :items="pageSizeItems" size="sm" class="w-24" />

                <!-- Top pagination - Fixed to use v-model:page -->
                <UPagination v-if="pagination.total > pagination.pageSize" v-model:page="page" :page-count="totalPages"
                    :total="pagination.total" :ui="{
                        wrapper: 'flex items-center justify-center',
                        rounded: 'rounded-full min-w-8 min-h-8 flex items-center justify-center',
                        container: 'flex items-center gap-1'
                    }" />
            </div>
        </div>

        <!-- Loading state -->
        <div v-if="pending && !killmails.length" class="flex flex-col items-center justify-center py-12">
            <UIcon name="lucide:loader" class="w-12 h-12 animate-spin text-primary mb-4" />
            <span class="text-xl font-medium">{{ t('campaign.loading_killmails') }}</span>
        </div>

        <!-- Error state -->
        <div v-else-if="error" class="bg-red-50 dark:bg-red-900/20 rounded-lg text-center">
            <UIcon name="lucide:alert-circle" class="w-12 h-12 text-red-500 mb-4 mx-auto" />
            <p class="text-red-600 dark:text-red-400">{{ error.message || t('common.errorLoadingData') }}</p>
            <UButton class="mt-4" icon="i-lucide-refresh-cw" @click="refresh">{{ t('retry') }}</UButton>
        </div>

        <!-- No data state -->
        <div v-else-if="!killmails.length" class="bg-gray-50 dark:bg-gray-800 rounded-lg text-center">
            <UIcon name="lucide:search" class="w-12 h-12 text-gray-400 mb-4 mx-auto" />
            <p class="text-gray-600 dark:text-gray-400">{{ t('campaign.no_killmails_found') }}</p>
        </div>

        <!-- Killlist table -->
        <Table v-else :columns="tableColumns" :items="killmails" :loading="pending && !killmails.length"
            :skeleton-count="pagination.pageSize" :empty-text="t('campaign.no_killmails_found')" :special-header="true"
            :bordered="true" :link-fn="generateKillLink" background="transparent" :row-class="getRowClass">
            <!-- Ship column -->
            <template #cell-ship="{ item }">
                <div class="flex items-center py-1">
                    <Image type="type-render" :id="item.victim.ship_id" format="webp"
                        :alt="`Ship: ${getLocalizedString(item.victim.ship_name, currentLocale)}`"
                        class="rounded w-10 mx-2" size="64" />
                    <div class="flex flex-col items-start">
                        <span class="text-sm text-black dark:text-white">
                            {{ truncateString(getLocalizedString(item.victim.ship_name, currentLocale), 20) }}
                        </span>
                        <span v-if="item.total_value > 50" class="text-xs text-gray-600 dark:text-gray-400">
                            {{ formatIsk(item.total_value) }} ISK
                        </span>
                    </div>
                </div>
            </template>

            <!-- Victim column -->
            <template #cell-victim="{ item }">
                <div class="flex items-center py-1">
                    <template v-if="item.victim.character_id > 0">
                        <Image type="character" :id="item.victim.character_id" format="webp"
                            :alt="`Character: ${item.victim.character_name}`" class="rounded w-10 mx-2" size="44" />
                    </template>
                    <Image v-else type="character" :id="1" alt="Placeholder" class="rounded w-10 mx-2" size="44" />
                    <div class="flex flex-col items-start">
                        <span class="text-sm text-black dark:text-white">
                            {{ item.victim.character_name || t('campaign.unknown_pilot') }}
                        </span>
                        <span class="text-xs text-gray-600 dark:text-gray-400 whitespace-nowrap">
                            {{ truncateString(item.victim.corporation_name, 22) }}
                        </span>
                    </div>
                </div>
            </template>

            <!-- Final Blow column -->
            <template #cell-finalBlow="{ item }">
                <div class="flex items-center py-1 whitespace-nowrap">
                    <!-- Character or placeholder when finalblow.character_id missing -->
                    <template v-if="item.finalblow.character_id > 0">
                        <Image type="character" :id="item.finalblow.character_id" format="webp"
                            :alt="`Character: ${item.finalblow.character_name}`" class="rounded w-10 mx-2" size="44" />
                        <div class="flex flex-col items-start">
                            <span class="text-sm text-black dark:text-white">
                                {{ item.finalblow.character_name }}
                            </span>
                            <span class="text-xs text-gray-600 dark:text-gray-400">
                                {{ truncateString(
                                    getLocalizedString(item.finalblow.ship_group_name, currentLocale)
                                    , 22) }}
                            </span>
                        </div>
                    </template>
                    <template v-else>
                        <Image type="character" :id="1" size="44" alt="NPC/Structure" class="rounded w-10 mx-2" />
                        <div class="flex flex-col items-start">
                            <span class="text-sm text-black dark:text-white">{{ item.finalblow.faction_name ||
                                item.finalblow.character_name || t('campaign.unknown_pilot') }}</span>
                            <span class="text-xs text-gray-600 dark:text-gray-400">
                                {{ truncateString(
                                    getLocalizedString(item.finalblow.ship_group_name, currentLocale)
                                    , 22) }}
                            </span>
                        </div>
                    </template>
                </div>
            </template>

            <!-- Location column -->
            <template #cell-location="{ item }">
                <div class="flex flex-col items-start py-1 text-sm px-2">
                    <span class="text-sm text-black dark:text-white whitespace-nowrap">
                        {{ getLocalizedString(item.region_name, currentLocale) }}
                    </span>
                    <div class="text-xs text-gray-600 dark:text-gray-400 whitespace-nowrap">
                        <span>{{ item.system_name }}</span>
                        <span> (</span>
                        <span :class="getSecurityColor(item.system_security)">
                            {{ item.system_security.toFixed(1) }}
                        </span>
                        <span>)</span>
                    </div>
                </div>
            </template>

            <!-- Details column -->
            <template #cell-details="{ item }">
                <div class="flex flex-col items-end w-full">
                    <ClientOnly>
                        <div class="text-sm text-black dark:text-white">{{ formatDate(item.kill_time) }}</div>
                        <template #fallback>
                            <div class="text-black dark:text-white">—</div>
                        </template>
                    </ClientOnly>
                    <div class="flex gap-1 items-center">
                        <span class="text-xs text-gray-600 dark:text-gray-400">{{ item.attackerCount }}</span>
                        <NuxtImg src="/images/involved.png" format="webp" quality="80" width="16" height="16"
                            :alt="`${item.attackerCount} Involved`" class="h-4" />
                    </div>
                </div>
            </template>

            <!-- Mobile view -->
            <template #mobile-row="{ item }">
                <div class="mobile-container" :class="getRowClass(item)">
                    <!-- Ship Image -->
                    <Image type="type-render" :id="item.victim.ship_id" format="webp"
                        :alt="`Ship: ${getLocalizedString(item.victim.ship_name, currentLocale)}`"
                        class="rounded w-16 h-16" size="64" />

                    <!-- Victim Info -->
                    <div class="mobile-content">
                        <!-- Top Line: Victim Name + ISK Value -->
                        <div class="mobile-header">
                            <span class="victim-name truncate">{{ item.victim.character_name ||
                                t('campaign.unknown_pilot') }}</span>
                            <span v-if="item.total_value > 50"
                                class="isk-value text-xs text-gray-600 dark:text-gray-400">
                                {{ formatIsk(item.total_value) }} ISK
                            </span>
                        </div>

                        <!-- Corporation -->
                        <div class="mobile-corporation truncate text-xs text-gray-600 dark:text-gray-400">
                            {{ item.victim.corporation_name }}
                        </div>

                        <!-- Final Blow + Location -->
                        <div class="mobile-meta flex justify-between text-xs text-gray-600 dark:text-gray-400">
                            <span class="final-blow truncate max-w-[50%]">
                                {{ item.is_npc ?
                                    item.finalblow.faction_name :
                                    (item.finalblow.character_name || t('campaign.unknown_pilot')) }}
                            </span>
                            <div class="system-info flex whitespace-nowrap">
                                <span>{{ item.system_name }}</span>
                                <span> (</span>
                                <span :class="getSecurityColor(item.system_security)">
                                    {{ item.system_security.toFixed(1) }}
                                </span>
                                <span>)</span>
                            </div>
                        </div>

                        <!-- Time + Attacker Count -->
                        <div class="mobile-footer flex justify-between items-center mt-1">
                            <ClientOnly>
                                <span class="kill-time text-xs text-gray-600 dark:text-gray-400">{{
                                    formatDate(item.kill_time) }}</span>
                                <template #fallback>
                                    <span class="kill-time text-xs text-gray-600 dark:text-gray-400">—</span>
                                </template>
                            </ClientOnly>
                            <div class="attacker-count flex items-center gap-1">
                                <span class="text-xs text-gray-600 dark:text-gray-400">{{ item.attackerCount
                                    }}</span>
                                <NuxtImg src="/images/involved.png" format="webp" quality="80" width="16" height="16"
                                    :alt="`${item.attackerCount} Involved`" class="h-3" />
                            </div>
                        </div>
                    </div>
                </div>
            </template>

            <!-- Loading skeleton customization -->
            <template #loading="{ mobile }">
                <template v-if="mobile">
                    <!-- Mobile loading skeleton -->
                    <div class="mobile-container">
                        <div class="rounded-md w-16 h-16 bg-gray-200 dark:bg-gray-700 animate-pulse"></div>
                        <div class="flex-1 space-y-2">
                            <div class="flex justify-between">
                                <div class="h-4 bg-gray-200 dark:bg-gray-700 rounded w-32 animate-pulse"></div>
                                <div class="h-3 bg-gray-200 dark:bg-gray-700 rounded w-16 animate-pulse"></div>
                            </div>
                            <div class="h-3 bg-gray-200 dark:bg-gray-700 rounded w-40 animate-pulse"></div>
                            <div class="flex justify-between">
                                <div class="h-3 bg-gray-200 dark:bg-gray-700 rounded w-24 animate-pulse"></div>
                                <div class="h-3 bg-gray-200 dark:bg-gray-700 rounded w-20 animate-pulse"></div>
                            </div>
                            <div class="h-3 bg-gray-200 dark:bg-gray-700 rounded w-16 animate-pulse"></div>
                        </div>
                    </div>
                </template>
            </template>
        </Table>

        <!-- Bottom controls - right aligned stats, pagination -->
        <div class="flex justify-end items-center gap-4 mt-4">
            <!-- Result count -->
            <div class="text-xs text-gray-500">
                {{ t('resultCount', { count: pagination.total }) }}
            </div>

            <!-- Bottom pagination - Fixed to use v-model:page -->
            <UPagination v-if="pagination.total > pagination.pageSize" v-model:page="page" :page-count="totalPages"
                :total="pagination.total" :ui="{
                    wrapper: 'flex items-center justify-center',
                    rounded: 'rounded-full min-w-8 min-h-8 flex items-center justify-center',
                    container: 'flex items-center gap-1'
                }" />
        </div>

        <!-- No more killmails notification if there are killmails but no more pages -->
        <div v-if="killmails.length > 0 && !hasMoreData && pagination.total <= pagination.pageSize"
            class="mt-4 text-center text-gray-500">
            {{ t('campaign.no_more_killmails') }}
        </div>
    </div>
</template>

<style scoped>
/* Add new styles for the killlist header and container */
.campaign-killlist {
    background-color: var(--background-800);
    box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
}

/* Additional mobile-specific styles */
.victim-name {
    font-weight: 500;
    font-size: 0.875rem;
    color: light-dark(#111827, white);
    max-width: 70%;
}

.isk-value {
    font-size: 0.75rem;
    white-space: nowrap;
}

.mobile-corporation {
    margin-bottom: 0.25rem;
    font-size: 0.75rem;
}

.mobile-meta {
    margin-bottom: 0.25rem;
    font-size: 0.75rem;
}

.mobile-footer {
    margin-top: 0.25rem;
    font-size: 0.75rem;
}

/* Add these styles to match the original header styling */
:deep(.table-header) {
    background-color: light-dark(rgba(245, 245, 245, 0.05), rgba(26, 26, 26, 0.5)) !important;
    padding: 0.5rem 1rem !important;
    font-weight: 600;
}

:deep(.header-cell) {
    font-size: 0.75rem;
    color: light-dark(#4b5563, #9ca3af) !important;
}

/* Animation for loading indicator */
@keyframes pulse {

    0%,
    100% {
        opacity: 0.7;
    }

    50% {
        opacity: 0.4;
    }
}

.animate-pulse {
    animation: pulse 1.5s ease-in-out infinite;
}

/* Enhanced Custom color class for combined losses */
.bg-darkred {
    background-color: rgba(139, 0, 0, 0.4) !important;
}

/* Add an additional class to ensure it gets applied with higher specificity */
.combined-loss-row {
    background-color: rgba(139, 0, 0, 0.4) !important;
    border-left: 3px solid rgb(220, 38, 38) !important;
    /* Add a left border for extra visibility */
}

/* Make sure our class overrides table row styles */
:deep(tr.combined-loss-row),
:deep(tr.combined-loss-row td),
:deep(tr.combined-loss-row:hover) {
    background-color: rgba(139, 0, 0, 0.4) !important;
}

/* For mobile view */
:deep(.mobile-container.combined-loss-row) {
    background-color: rgba(139, 0, 0, 0.4) !important;
    border-left: 3px solid rgb(220, 38, 38) !important;
}

/* Target any other nested elements to ensure the background is visible */
:deep(.table-row.bg-darkred *),
:deep(.table-row.combined-loss-row *) {
    position: relative;
    z-index: 1;
}

/* Target the specific layout of table rows with more muted pseudo-element background */
:deep(a.table-row.bg-darkred),
:deep(a.table-row.combined-loss-row) {
    position: relative;
}

:deep(a.table-row.bg-darkred)::before,
:deep(a.table-row.combined-loss-row)::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: rgba(139, 0, 0, 0.4);
    pointer-events: none;
    z-index: 0;
}
</style>
