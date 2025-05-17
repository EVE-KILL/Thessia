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

// Define page size options
const pageSizeItems = [
    { label: "10", id: 10 },
    { label: "25", id: 25 },
    { label: "50", id: 50 },
    { label: "100", id: 100 }
];

// Format the page size items for a standard HTML select
const pageSizeItemsFormatted = computed(() => {
    return pageSizeItems.map(item => ({
        value: item.id,
        label: item.label
    }));
});

// Handle manual change in the select element
const handlePageSizeChange = (event) => {
    const newSize = parseInt(event.target.value, 10);
    pageSize.value = newSize;
};

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

    pagination.value.page = newPage;

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

// Add refs for detecting text overflow
const shipNameRefs = ref<Map<number, HTMLElement>>(new Map());
const characterNameRefs = ref<Map<number, HTMLElement>>(new Map());
const corporationNameRefs = ref<Map<number, HTMLElement>>(new Map());
const allianceNameRefs = ref<Map<number, HTMLElement>>(new Map());
const finalBlowNameRefs = ref<Map<number, HTMLElement>>(new Map());
const finalBlowCorpRefs = ref<Map<number, HTMLElement>>(new Map());
const finalBlowAllianceRefs = ref<Map<number, HTMLElement>>(new Map());

// Add mouse position tracking
const mouseX = ref(0);
const mouseY = ref(0);
const tooltipText = ref('');
const showTooltip = ref(false);

/**
 * Updates fade effect on elements that overflow
 */
const updateTextFade = (refMap: Map<number, HTMLElement>) => {
    refMap.forEach((el) => {
        if (el && el.scrollWidth > el.clientWidth) {
            el.classList.add('fade-text');
            // Store the full text in a data attribute for the hover effect
            el.setAttribute('data-full-text', el.textContent || '');

            // Add event listeners for custom tooltip
            el.addEventListener('mouseenter', (e) => {
                tooltipText.value = el.textContent || '';
                mouseX.value = e.clientX;
                mouseY.value = e.clientY;
                showTooltip.value = true;
            });

            el.addEventListener('mouseleave', () => {
                showTooltip.value = false;
            });

        } else if (el) {
            el.classList.remove('fade-text');
            el.removeAttribute('data-full-text');

            // Remove event listeners
            el.removeEventListener('mouseenter', () => { });
            el.removeEventListener('mouseleave', () => { });
        }
    });
};

/**
 * Update all text fade effects
 */
const updateAllFades = () => {
    updateTextFade(shipNameRefs.value);
    updateTextFade(characterNameRefs.value);
    updateTextFade(corporationNameRefs.value);
    updateTextFade(allianceNameRefs.value);
    updateTextFade(finalBlowNameRefs.value);
    updateTextFade(finalBlowCorpRefs.value);
    updateTextFade(finalBlowAllianceRefs.value);
};

/**
 * Set reference for an element by killmail ID
 */
const setElementRef = (el: HTMLElement | null, id: number, refMap: Map<number, HTMLElement>) => {
    if (el) {
        refMap.set(id, el);
    }
};

// Lifecycle hooks
onMounted(() => {
    nextTick(() => {
        updateAllFades();
        window.addEventListener('resize', updateAllFades);
    });
});

onBeforeUnmount(() => {
    window.removeEventListener('resize', updateAllFades);

    // Clean up tooltip event listeners
    [
        ...shipNameRefs.value.values(),
        ...characterNameRefs.value.values(),
        ...corporationNameRefs.value.values(),
        ...allianceNameRefs.value.values(),
        ...finalBlowNameRefs.value.values(),
        ...finalBlowCorpRefs.value.values(),
        ...finalBlowAllianceRefs.value.values()
    ].forEach(el => {
        if (el) {
            el.removeEventListener('mouseenter', () => { });
            el.removeEventListener('mouseleave', () => { });
        }
    });
});

onUpdated(() => {
    nextTick(updateAllFades);
});
</script>

<template>
    <div class="campaign-killlist w-full" @mousemove="(e) => { mouseX = e.clientX; mouseY = e.clientY; }">
        <!-- Header -->
        <div class="mb-4">
            <!-- Top controls - right aligned: dropdown + pagination -->
            <div class="flex justify-between items-center gap-4 mb-3">
                <!-- Left side: Limit selector -->
                <div class="flex items-center w-full sm:w-auto">
                    <!-- Limit selector -->
                    <div class="relative w-24">
                        <select :value="pageSize" @change="handlePageSizeChange"
                            class="custom-select w-full appearance-none rounded-md border border-gray-300 dark:border-gray-700 pl-3 pr-8 py-1.5 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm font-medium shadow-sm">
                            <option v-for="item in pageSizeItemsFormatted" :key="item.value" :value="item.value">
                                {{ item.label }}
                            </option>
                        </select>
                        <div
                            class="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700 dark:text-gray-300">
                            <svg class="h-4 w-4 fill-current" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                                <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
                            </svg>
                        </div>
                    </div>
                </div>

                <!-- Right side: UPagination -->
                <UPagination v-if="pagination.total > pagination.pageSize" v-model:page="page" :page-count="totalPages"
                    :total="pagination.total" :ui="{
                        wrapper: 'flex items-center justify-center',
                        rounded: 'rounded-md',
                        default: {
                            base: 'text-sm border-y border-r first:border-l border-gray-200 dark:border-gray-800 focus:z-10 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500',
                            inactive: 'bg-background-800 hover:bg-background-700',
                            padding: 'px-3 py-2',
                            disabled: 'opacity-50 cursor-not-allowed'
                        }
                    }" :prev-button="{
                        icon: 'i-lucide-chevron-left',
                        label: '',
                        disabled: page === 1
                    }" :next-button="{
                        icon: 'i-lucide-chevron-right',
                        label: ''
                    }">
                    <template #default>
                        <span class="mx-2">{{ $t('common.page') }} {{ page }}</span>
                    </template>
                </UPagination>
            </div>
        </div>

        <!-- Loading state -->
        <div v-if="pending && !killmails.length" class="flex flex-col items-center justify-center py-12">
            <UIcon name="lucide:loader" class="w-12 h-12 animate-spin text-primary mb-4" />
            <span class="text-xl font-medium">{{ t('campaign.loading_killmails') }}</span>
        </div>

        <!-- Error state -->
        <div v-else-if="error" class="bg-red-50 dark:bg-red-900/20 rounded-lg text-center p-6">
            <UIcon name="lucide:alert-circle" class="w-12 h-12 text-red-500 mb-4 mx-auto" />
            <p class="text-red-600 dark:text-red-400">{{ error.message || t('common.errorLoadingData') }}</p>
            <UButton class="mt-4" icon="i-lucide-refresh-cw" @click="refresh">{{ t('retry') }}</UButton>
        </div>

        <!-- No data state -->
        <div v-else-if="!killmails.length" class="bg-gray-50 dark:bg-gray-800 rounded-lg text-center p-6">
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
                        class="rounded w-16 h-16 mx-2" size="64" />
                    <div class="flex flex-col items-start">
                        <span class="text-sm text-black dark:text-white truncate max-w-[150px]"
                            :ref="(el) => setElementRef(el, item.killmail_id, shipNameRefs)">
                            {{ getLocalizedString(item.victim.ship_name, currentLocale) }}
                        </span>
                        <span class="text-xs text-gray-500 dark:text-gray-400 truncate max-w-[150px]">
                            {{ getLocalizedString(item.victim.ship_group_name || {}, currentLocale) }}
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
                            :alt="`Character: ${item.victim.character_name}`" class="rounded-full w-16 h-16 mx-2"
                            size="64" />
                    </template>
                    <Image v-else type="character" :id="1" alt="Placeholder" class="rounded-full w-16 h-16 mx-2"
                        size="64" />
                    <div class="flex flex-col items-start min-w-0 flex-1">
                        <!-- Character Name -->
                        <span class="text-sm text-black dark:text-white truncate max-w-full"
                            :ref="(el) => setElementRef(el, item.killmail_id, characterNameRefs)">
                            {{ item.victim.character_name || t('campaign.unknown_pilot') }}
                        </span>
                        <!-- Corporation Name (without ticker) -->
                        <span class="text-xs text-gray-600 dark:text-gray-400 truncate max-w-full"
                            :ref="(el) => setElementRef(el, item.killmail_id, corporationNameRefs)">
                            {{ item.victim.corporation_name }}
                        </span>
                        <!-- Alliance Name (without ticker) -->
                        <span v-if="item.victim.alliance_name"
                            class="text-xs text-gray-500 dark:text-gray-500 truncate max-w-full"
                            :ref="(el) => setElementRef(el, item.killmail_id, allianceNameRefs)">
                            {{ item.victim.alliance_name }}
                        </span>
                    </div>
                </div>
            </template>

            <!-- Final Blow column -->
            <template #cell-finalBlow="{ item }">
                <div class="flex items-center py-1">
                    <!-- Character or placeholder when finalblow.character_id missing -->
                    <template v-if="item.finalblow.character_id > 0">
                        <Image type="character" :id="item.finalblow.character_id" format="webp"
                            :alt="`Character: ${item.finalblow.character_name}`" class="rounded-full w-16 h-16 mx-2"
                            size="64" />
                        <div class="flex flex-col items-start min-w-0 flex-1">
                            <!-- Character Name -->
                            <span class="text-sm text-black dark:text-white truncate max-w-full"
                                :ref="(el) => setElementRef(el, `fb-${item.killmail_id}`, finalBlowNameRefs)">
                                {{ item.finalblow.character_name }}
                            </span>
                            <!-- Corporation Name (without ticker) -->
                            <span class="text-xs text-gray-600 dark:text-gray-400 truncate max-w-full"
                                :ref="(el) => setElementRef(el, `fb-${item.killmail_id}`, finalBlowCorpRefs)">
                                {{ item.finalblow.corporation_name }}
                            </span>
                            <!-- Alliance Name (without ticker) -->
                            <span v-if="item.finalblow.alliance_name"
                                class="text-xs text-gray-500 dark:text-gray-500 truncate max-w-full"
                                :ref="(el) => setElementRef(el, `fb-${item.killmail_id}`, finalBlowAllianceRefs)">
                                {{ item.finalblow.alliance_name }}
                            </span>
                        </div>
                    </template>
                    <template v-else>
                        <Image type="character" :id="1" size="64" alt="NPC/Structure"
                            class="rounded-full w-16 h-16 mx-2" />
                        <div class="flex flex-col items-start min-w-0 flex-1">
                            <span class="text-sm text-black dark:text-white truncate max-w-full">
                                {{ item.finalblow.faction_name || item.finalblow.character_name ||
                                    t('campaign.unknown_pilot') }}
                            </span>
                            <span v-if="item.finalblow.corporation_name"
                                class="text-xs text-gray-600 dark:text-gray-400 truncate max-w-full">
                                {{ item.finalblow.corporation_name }}
                            </span>
                            <span v-if="item.finalblow.ship_group_name"
                                class="text-xs text-gray-500 dark:text-gray-500 truncate max-w-full">
                                {{ getLocalizedString(item.finalblow.ship_group_name, currentLocale) }}
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

            <!-- Custom skeleton rendering for consistent layout -->
            <template #skeleton>
                <div class="skeleton-container">
                    <div v-for="i in pagination.pageSize" :key="`skeleton-${i}`" class="killlist-skeleton-row">
                        <!-- Ship column -->
                        <div class="killlist-skeleton-cell" style="width: 20%">
                            <div class="flex items-center">
                                <div class="killlist-skeleton-image"></div>
                                <div class="flex flex-col">
                                    <div class="killlist-skeleton-title"></div>
                                    <div class="killlist-skeleton-subtitle"></div>
                                </div>
                            </div>
                        </div>

                        <!-- Victim column -->
                        <div class="killlist-skeleton-cell" style="width: 25%">
                            <div class="flex items-center">
                                <div class="killlist-skeleton-image"></div>
                                <div class="flex flex-col">
                                    <div class="killlist-skeleton-title"></div>
                                    <div class="killlist-skeleton-subtitle"></div>
                                </div>
                            </div>
                        </div>

                        <!-- Final blow column -->
                        <div class="killlist-skeleton-cell" style="width: 25%">
                            <div class="flex items-center">
                                <div class="killlist-skeleton-image"></div>
                                <div class="flex flex-col">
                                    <div class="killlist-skeleton-title"></div>
                                    <div class="killlist-skeleton-subtitle"></div>
                                </div>
                            </div>
                        </div>

                        <!-- Location column -->
                        <div class="killlist-skeleton-cell" style="width: 15%">
                            <div class="flex flex-col px-2">
                                <div class="killlist-skeleton-title"></div>
                                <div class="flex items-center gap-1 mt-1">
                                    <div class="killlist-skeleton-system"></div>
                                    <div class="killlist-skeleton-security"></div>
                                </div>
                            </div>
                        </div>

                        <!-- Details column -->
                        <div class="killlist-skeleton-cell" style="width: 15%; justify-content: flex-end;">
                            <div class="flex flex-col items-end w-full">
                                <div class="killlist-skeleton-title mb-1" style="width: 60px"></div>
                                <div class="flex items-center gap-1">
                                    <div class="killlist-skeleton-count"></div>
                                    <div class="killlist-skeleton-icon"></div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </template>
        </Table>

        <!-- Bottom controls - right aligned stats, pagination -->
        <div class="flex justify-between items-center gap-4 mt-4">
            <!-- Result count -->
            <div class="text-xs text-gray-500">
                {{ t('resultCount', { count: pagination.total }) }}
            </div>

            <!-- Bottom pagination - Fixed to use v-model:page -->
            <UPagination v-if="pagination.total > pagination.pageSize" v-model:page="page" :page-count="totalPages"
                :total="pagination.total" :ui="{
                    wrapper: 'flex items-center justify-center',
                    rounded: 'rounded-md',
                    default: {
                        base: 'text-sm border-y border-r first:border-l border-gray-200 dark:border-gray-800 focus:z-10 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500',
                        inactive: 'bg-background-800 hover:bg-background-700',
                        padding: 'px-3 py-2',
                        disabled: 'opacity-50 cursor-not-allowed'
                    }
                }" :prev-button="{
                    icon: 'i-lucide-chevron-left',
                    label: '',
                    disabled: page === 1
                }" :next-button="{
                    icon: 'i-lucide-chevron-right',
                    label: ''
                }">
                <template #default>
                    <span class="mx-2">{{ $t('common.page') }} {{ page }}</span>
                </template>
            </UPagination>
        </div>

        <!-- No more killmails notification if there are killmails but no more pages -->
        <div v-if="killmails.length > 0 && !hasMoreData && pagination.total <= pagination.pageSize"
            class="mt-4 text-center text-gray-500">
            {{ t('campaign.no_more_killmails') }}
        </div>

        <!-- Global tooltip that follows mouse cursor -->
        <Teleport to="body">
            <div v-if="showTooltip" class="global-tooltip" :style="{
                left: `${mouseX + 15}px`,
                top: `${mouseY + 10}px`
            }">
                {{ tooltipText }}
            </div>
        </Teleport>
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
    background-color: rgba(80, 0, 0, 0.6);
    opacity: 0.7;
    z-index: 0;
    pointer-events: none;
}

/* Add truncation with fade effect */
.fade-text {
    position: relative;
    mask-image: linear-gradient(to right, black 85%, transparent);
    -webkit-mask-image: linear-gradient(to right, black 85%, transparent);
}

/* Global tooltip that follows cursor */
.global-tooltip {
    position: fixed;
    z-index: 10000;
    background-color: light-dark(rgba(255, 255, 255, 0.98), rgba(30, 30, 30, 0.98));
    padding: 4px 10px;
    border-radius: 4px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
    border: 1px solid light-dark(rgba(229, 231, 235, 0.5), rgba(75, 85, 99, 0.5));
    font-size: 0.875rem;
    max-width: 300px;
    white-space: normal;
    word-break: break-word;
    pointer-events: none;
    animation: tooltip-fade-in 0.15s ease-out;
}

@keyframes tooltip-fade-in {
    from {
        opacity: 0;
        transform: translateY(5px);
    }

    to {
        opacity: 1;
        transform: translateY(0);
    }
}

/* Custom skeleton styles for KillList */
.skeleton-container {
    width: 100%;
}

.killlist-skeleton-row {
    display: flex;
    width: 100%;
    min-height: 60px;
    padding: 8px 12px;
    margin-bottom: 4px;
    border-radius: 6px;
    background-color: light-dark(rgba(255, 255, 255, 0.4), rgba(26, 26, 26, 0.3));
    border-bottom: 1px solid light-dark(rgba(229, 231, 235, 0.3), rgba(75, 85, 99, 0.2));
}

.killlist-skeleton-cell {
    display: flex;
    align-items: center;
    flex-shrink: 0;
    flex-grow: 0;
}

.killlist-skeleton-image {
    width: 64px;
    height: 64px;
    flex-shrink: 0;
    margin: 0 8px;
    border-radius: 6px;
    background-color: light-dark(#e5e7eb, #374151);
    animation: pulse 1.5s ease-in-out infinite;
}

.killlist-skeleton-title {
    height: 16px;
    width: 100px;
    border-radius: 4px;
    background-color: light-dark(#e5e7eb, #374151);
    animation: pulse 1.5s ease-in-out infinite;
}

.killlist-skeleton-subtitle {
    height: 12px;
    width: 80px;
    margin-top: 4px;
    border-radius: 4px;
    background-color: light-dark(#e5e7eb, #374151);
    animation: pulse 1.5s ease-in-out infinite;
}

.killlist-skeleton-system {
    height: 12px;
    width: 70px;
    border-radius: 4px;
    background-color: light-dark(#e5e7eb, #374151);
    animation: pulse 1.5s ease-in-out infinite;
}

.killlist-skeleton-security {
    height: 12px;
    width: 24px;
    border-radius: 4px;
    background-color: light-dark(#e5e7eb, #374151);
    animation: pulse 1.5s ease-in-out infinite;
}

.killlist-skeleton-count {
    height: 12px;
    width: 20px;
    border-radius: 4px;
    background-color: light-dark(#e5e7eb, #374151);
    animation: pulse 1.5s ease-in-out infinite;
}

.killlist-skeleton-icon {
    height: 16px;
    width: 16px;
    border-radius: 4px;
    background-color: light-dark(#e5e7eb, #374151);
    animation: pulse 1.5s ease-in-out infinite;
}

/* Fix responsive image sizes */
@media (max-width: 640px) {
    .w-16 {
        width: 48px !important;
    }

    .h-16 {
        height: 48px !important;
    }
}
</style>
