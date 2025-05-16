<script setup lang="ts">
import moment from "moment";
import { computed } from 'vue'; // Ensure computed is imported
import type { IAttacker } from "~/server/interfaces/IAttacker";
import type { IKillList } from "~/server/interfaces/IKillList";
import type { IKillmail } from "~/server/interfaces/IKillmail";
import { useWebSocket } from "~/src/theme/modern/composables/useWebsocket";

const { t, locale } = useI18n();
const currentLocale = computed(() => locale.value);

// Define props with defaults
const props = defineProps({
    combinedKillsAndLosses: { type: Boolean, default: false },
    combinedVictimType: { type: String, default: "character" },
    combinedVictimId: { type: Number, default: null },
    killlistType: { type: String, default: "latest" },
    wsFilter: { type: String, default: "all" },
    wsDisabled: { type: Boolean, default: false },
    externalKilllistData: { type: Array as PropType<IKillList[]>, default: null },
    enablePagination: { type: Boolean, default: true },
    limit: { type: Number, default: 100 },
    apiEndpoint: { type: String, default: "/api/killlist" },
});

// Pagination and display settings
const pagination = ref({
    pageIndex: 0,
    pageSize: 10,
});

const pageSizeItems = [
    { label: "10", id: 10 },
    { label: "50", id: 50 },
    { label: "100", id: 100 },
    { label: "250", id: 250 },
    { label: "500", id: 500 },
    { label: "1000", id: 1000 },
];
// Use the limit prop as the default page size
const selectedPageSize = ref(props.limit);
const currentPage = computed(() => pagination.value.pageIndex + 1);

// Create query params for API
const queryParams = computed(() => ({
    type: props.killlistType,
    page: currentPage.value,
    limit: selectedPageSize.value,
}));

const fetchKey = computed(() => {
    // Ensure all reactive parts that define a unique request are included
    // props.apiEndpoint is crucial.
    // queryParams.value.page and queryParams.value.limit are also important for pagination.
    // Add any other props or reactive values that alter the fetch request.
    return `killlist-${props.apiEndpoint}-${queryParams.value.page}-${queryParams.value.limit}`;
});

// Determine if we should use external data
const useExternalData = computed(() => props.externalKilllistData !== null);

// Local reactive container for kill list data
const localKilllistData = ref<IKillList[]>([]);

// Fetch kill list data only if not using external data
const {
    data: fetchedData,
    pending,
    error,
    refresh,
} = !useExternalData.value
        ? useFetch<IKillList[]>(props.apiEndpoint, {
            key: fetchKey.value,
            query: queryParams,
            watch: [queryParams],
        })
        : { data: ref(null), pending: ref(false), error: ref(null), refresh: () => Promise.resolve() };

// Combined kill list data - either from props or fetched
const killlistData = computed(() => {
    return useExternalData.value ? props.externalKilllistData : fetchedData.value || [];
});

// Update local data when external data changes
watch(
    () => props.externalKilllistData,
    (newData) => {
        if (newData && useExternalData.value) {
            localKilllistData.value = [...newData];
        }
    },
    { immediate: true },
);

// Update local data when fetched data changes
watch(
    fetchedData,
    (newData) => {
        if (newData && !useExternalData.value) {
            localKilllistData.value = [...newData];
        }
    },
    { immediate: true },
);

// Update pagination when page size changes
watch(selectedPageSize, async (newSize) => {
    pagination.value.pageSize = newSize;
    pagination.value.pageIndex = 0;

    // Only attempt to refresh if using fetched data
    if (!useExternalData.value) {
        try {
            await refresh();
        } catch (err) {
            console.error("Error refreshing data after page size change:", err);
        }
    }
});

// WebSocket state
const wsNewKillCount = ref(0);
const pendingMessages = ref<IKillmail[]>([]);
const manuallyPaused = ref(false);
const mouseMoveTimer = ref<NodeJS.Timeout | null>(null);

// Function to handle processing of pending messages, typically on WebSocket (re)connection
const handleWebSocketReconnect = () => {
    if (
        props.wsDisabled ||
        useExternalData.value ||
        pagination.value.pageIndex > 0 || // Only on page 1
        manuallyPaused.value // Not if manually paused
    ) {
        return;
    }

    // Process any pending messages
    if (pendingMessages.value.length > 0) {
        // Sort by kill time to maintain chronological order
        pendingMessages.value.sort(
            (a, b) => new Date(b.kill_time).getTime() - new Date(a.kill_time).getTime(),
        );

        pendingMessages.value.forEach((killmail) => {
            processKillmail(killmail);
        });

        pendingMessages.value = []; // Clear pending messages after processing
    }
};

// Initialize WebSocket using the composable - with debug disabled
const {
    isConnected: wsConnected,
    connectionAttempts: wsReconnectAttempts,
    isPaused: isWebSocketPaused,
    pause: pauseWs,
    resume: resumeWs,
    sendMessage: wsSendMessage,
} = useWebSocket({
    url: "wss://eve-kill.com/killmails",
    initialMessage: props.wsFilter === "latest" ? "all" : props.wsFilter,
    autoConnect: !props.wsDisabled && !useExternalData.value,
    handleBfCache: true,
    useGlobalInstance: true,
    globalRefKey: "killList",
    debug: false, // Disable debug logging
    onMessage: handleWebSocketMessage,
    onConnected: handleWebSocketReconnect, // Process pending messages on connection/reconnection
});

// Pause WebSocket processing with reason
const pauseWebSocket = (reason = "hover") => {
    if (props.wsDisabled || useExternalData.value) return;

    pauseWs(); // Call the composable's pause function

    if (reason === "manual") {
        manuallyPaused.value = true;
    }
    // For other reasons like "hover", "pagination", "component_deactivated",
    // we pause the WebSocket but don't mark it as manually paused.
};

// Resume WebSocket processing
const resumeWebSocket = () => {
    if (props.wsDisabled || useExternalData.value) return;

    // Don't resume if we're not on page 1 (pageIndex 0) or manually paused
    if (pagination.value.pageIndex > 0 || manuallyPaused.value) {
        return;
    }

    resumeWs(); // This will trigger onConnected -> handleWebSocketReconnect if connection is successful
};

// Watch page changes to control WebSocket pausing
watch(
    () => pagination.value.pageIndex,
    (newPageIndex) => {
        if (newPageIndex > 0) {
            // Automatically pause on pages > 1
            pauseWebSocket("pagination");
        } else if (!manuallyPaused.value) {
            // Resume on page 1 (unless manually paused)
            resumeWebSocket();
        }
    },
);

// Toggle WebSocket mode (manually pause/resume)
const toggleWebSocketMode = () => {
    if (props.wsDisabled || useExternalData.value) return;

    if (isWebSocketPaused.value) {
        // Only allow toggling on page 1
        if (pagination.value.pageIndex === 0) {
            manuallyPaused.value = false;
            resumeWebSocket();
        }
    } else {
        pauseWebSocket("manual");
    }
};

// Mouse event handlers
const handleMouseEnter = () => {
    if (
        pagination.value.pageIndex === 0 &&
        !manuallyPaused.value &&
        !props.wsDisabled &&
        !useExternalData.value
    ) {
        pauseWebSocket("hover");
        clearMouseMoveTimer();
    }
};

const handleMouseLeave = () => {
    if (
        pagination.value.pageIndex === 0 &&
        !manuallyPaused.value &&
        !props.wsDisabled &&
        !useExternalData.value
    ) {
        resumeWebSocket();
        clearMouseMoveTimer();
    }
};

const handleMouseMove = (e: MouseEvent) => {
    mouseX.value = e.clientX;
    mouseY.value = e.clientY;

    if (
        isWebSocketPaused.value &&
        pagination.value.pageIndex === 0 &&
        !manuallyPaused.value &&
        !props.wsDisabled &&
        !useExternalData.value
    ) {
        clearMouseMoveTimer();
        mouseMoveTimer.value = setTimeout(() => {
            resumeWebSocket();
        }, 10000); // 10 seconds
    }
};

const clearMouseMoveTimer = () => {
    if (mouseMoveTimer.value) {
        clearTimeout(mouseMoveTimer.value);
        mouseMoveTimer.value = null;
    }
};

// Handle WebSocket messages
function handleWebSocketMessage(data) {
    try {
        if (data.type !== "killmail") return;

        const killmail: IKillmail = data.data;

        // Process or queue killmail only if it's newer than current newest
        if (!isNewerThanLatestKill(killmail)) {
            return;
        }

        // Either queue or process the killmail
        if (isWebSocketPaused.value) {
            pendingMessages.value.push(killmail);
        } else {
            processKillmail(killmail);
        }
    } catch (err) {
        console.error("❌ KillList: Error processing WebSocket message:", err);
    }
}

// Function to process a killmail
const processKillmail = (killmail: IKillmail) => {
    const formattedKill = formatKillmail(killmail);

    // If no data or empty killlist
    if (!killlistData.value || killlistData.value.length === 0) {
        if (useExternalData.value) {
            return;
        }
        if (fetchedData.value) {
            fetchedData.value = [formattedKill, ...(fetchedData.value || [])];
            wsNewKillCount.value++;
            ensureKillListLimit();
        }
        return;
    }

    // If we have data, add the new killmail if it's newer
    const newKillTime = new Date(formattedKill.kill_time).getTime();
    const latestKillTime = new Date(killlistData.value[0].kill_time).getTime();

    if (newKillTime > latestKillTime) {
        if (useExternalData.value) {
            return;
        }
        if (fetchedData.value) {
            fetchedData.value = [formattedKill, ...(fetchedData.value || [])];
            wsNewKillCount.value++;
            ensureKillListLimit();
        }
    }
};

// Format killmail object to KillList format
const formatKillmail = (killmail: IKillmail): IKillList => {
    const finalBlowAttacker: IAttacker | undefined = killmail.attackers.find(
        (attacker) => attacker.final_blow,
    );

    return {
        killmail_id: killmail.killmail_id,
        total_value: killmail.total_value,
        system_id: killmail.system_id,
        system_name: killmail.system_name,
        system_security: killmail.system_security,
        region_id: killmail.region_id,
        region_name: killmail.region_name,
        kill_time: killmail.kill_time,
        attackerCount: killmail.attackers.length,
        commentCount: 0,
        is_npc: killmail.is_npc,
        is_solo: killmail.is_solo,
        victim: {
            ship_id: killmail.victim.ship_id,
            ship_name: killmail.victim.ship_name,
            ship_group_name: killmail.victim.ship_group_name || {},
            character_id: killmail.victim.character_id,
            character_name: killmail.victim.character_name,
            corporation_id: killmail.victim.corporation_id,
            corporation_name: killmail.victim.corporation_name,
            corporation_ticker: killmail.victim.corporation_ticker || "",
            alliance_id: killmail.victim.alliance_id || 0,
            alliance_name: killmail.victim.alliance_name || "",
            alliance_ticker: killmail.victim.alliance_ticker || "",
            faction_id: killmail.victim.faction_id || 0,
            faction_name: killmail.victim.faction_name || "",
        },
        finalblow: {
            character_id: finalBlowAttacker?.character_id || 0,
            character_name: finalBlowAttacker?.character_name || "",
            corporation_id: finalBlowAttacker?.corporation_id || 0,
            corporation_name: finalBlowAttacker?.corporation_name || "",
            corporation_ticker: finalBlowAttacker?.corporation_ticker || "",
            alliance_id: finalBlowAttacker?.alliance_id || 0,
            alliance_name: finalBlowAttacker?.alliance_name || "",
            alliance_ticker: finalBlowAttacker?.alliance_ticker || "",
            faction_id: finalBlowAttacker?.faction_id || 0,
            faction_name: finalBlowAttacker?.faction_name || "",
        },
    };
};

// Ensure kill list doesn't exceed selected page size
const ensureKillListLimit = () => {
    if (fetchedData.value && fetchedData.value.length > selectedPageSize.value) {
        fetchedData.value = fetchedData.value.slice(0, selectedPageSize.value);
    }
};

// Function to check if a killmail is newer than our current newest
const isNewerThanLatestKill = (killmail: IKillmail): boolean => {
    if (!killlistData.value || killlistData.value.length === 0) return true;

    const killmailTime = new Date(killmail.kill_time).getTime();
    const latestKillTime = new Date(killlistData.value[0].kill_time).getTime();

    return killmailTime > latestKillTime;
};

// Reset new kill counter
const resetNewKillCount = () => {
    wsNewKillCount.value = 0;
};

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

const isCombinedLoss = (kill: any): boolean => {
    if (!kill || !props.combinedKillsAndLosses) return false;

    const victimIdProp = `${props.combinedVictimType}_id`;
    const victimId = kill.victim[victimIdProp];

    return victimId === props.combinedVictimId;
};

// Get row class based on whether it's a combined loss
const getRowClass = (item: IKillList) => {
    return isCombinedLoss(item) ? "combined-loss-row bg-darkred" : "";
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

// Navigation handler
const openInNewTab = (url: string) => {
    window.open(url, "_blank", "noopener");
};

// Update pagination structure to work with UPagination
const currentPageIndex = ref(1); // Start at 1 for UPagination display

// Calculate dynamic total based on current page
const dynamicTotal = computed(() => {
    return 100 + currentPageIndex.value * 10;
});

// Helper function to convert between 1-based and 0-based indexing
const pageToPageIndex = (page: number): number => page - 1;
const pageIndexToPage = (pageIndex: number): number => pageIndex + 1;

// Watch currentPageIndex changes to update pagination.pageIndex
watch(currentPageIndex, (newPage) => {
    // Convert 1-based page to 0-based pageIndex
    const newPageIndex = pageToPageIndex(newPage);
    pagination.value.pageIndex = newPageIndex;

    // Handle WebSocket state based on page
    if (newPageIndex > 0) {
        pauseWebSocket("pagination");
    } else if (!manuallyPaused.value) {
        resumeWebSocket();
    }
});

// Watch pagination.pageIndex changes to keep currentPageIndex in sync
watch(
    () => pagination.value.pageIndex,
    (newPageIndex) => {
        // Convert 0-based pageIndex to 1-based page
        const newPage = pageIndexToPage(newPageIndex);
        if (currentPageIndex.value !== newPage) {
            currentPageIndex.value = newPage;
        }
    },
);

// Reset WebSocket state when returning to page 1
const resetWebSocketState = () => {
    // Only reset on page 1
    if (currentPageIndex.value === 1) {
        manuallyPaused.value = false;
        resumeWebSocket();
    }
};

// Define table columns for the EkTable component
const tableColumns = [
    {
        id: "ship",
        header: computed(() => t("ship")),
        width: "22%",
    },
    {
        id: "victim",
        header: computed(() => t("victim")),
        width: "27%",
    },
    {
        id: "finalBlow",
        header: computed(() => t("finalBlow")),
        width: "27%",
    },
    {
        id: "location",
        header: computed(() => t("location")),
        width: "15%",
    },
    {
        id: "details",
        headerClass: "text-right",
        width: "9%",
    },
];

// WebSocket status message
const wsStatusMessage = computed(() => {
    if (!wsConnected.value) {
        return wsReconnectAttempts.value > 0 ? t("reconnecting") : t("disconnected");
    }
    return isWebSocketPaused.value ? t("paused") : t("connected");
});

// Generate kill link
const generateKillLink = (item: IKillList): string | null => {
    if (!item || !item.killmail_id) return null;
    return `/kill/${item.killmail_id}`;
};

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

// Consolidated Lifecycle Hooks
onMounted(() => {
    nextTick(() => {
        updateAllFades();
        window.addEventListener('resize', updateAllFades);
    });

    // Set up mouse handlers for the table container
    if (!props.wsDisabled && !useExternalData.value) {
        const tableContainer = document.querySelector(".kill-list-container");
        if (tableContainer) {
            tableContainer.addEventListener("mouseenter", handleMouseEnter);
            tableContainer.addEventListener("mouseleave", handleMouseLeave);
            tableContainer.addEventListener("mousemove", handleMouseMove);
        }
    }
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

    clearMouseMoveTimer();

    // Remove mouse event listeners from table container
    if (!props.wsDisabled && !useExternalData.value) {
        const tableContainer = document.querySelector(".kill-list-container");
        if (tableContainer) {
            tableContainer.removeEventListener("mouseenter", handleMouseEnter);
            tableContainer.removeEventListener("mouseleave", handleMouseLeave);
            tableContainer.removeEventListener("mousemove", handleMouseMove);
        }
    }
});

onActivated(() => {
    resumeWebSocket();
    handleWebSocketReconnect();
});

onDeactivated(() => {
    pauseWebSocket("component_deactivated");
});

onUpdated(() => {
    nextTick(updateAllFades);
});
</script>

<template>
    <div class="w-full kill-list-container" @mousemove="handleMouseMove">
        <!-- Top navigation bar with responsive layout -->
        <div class="flex flex-col sm:flex-row justify-between items-center mb-3">
            <!-- Left side: Limit selector and WebSocket status -->
            <div class="flex items-center w-full sm:w-auto mb-3 sm:mb-0">
                <!-- Limit selector -->
                <USelect v-model="selectedPageSize" value-key="id" :items="pageSizeItems" size="sm" class="w-24" />

                <!-- WebSocket status indicator with clearer state indication -->
                <div v-if="!wsDisabled && !useExternalData" class="flex items-center ml-4">
                    <div :class="[
                        'w-3 h-3 rounded-full mr-1 cursor-pointer',
                        !wsConnected ? (wsReconnectAttempts > 0 ? 'bg-orange-500' : 'bg-red-500') :
                            (isWebSocketPaused ? 'bg-yellow-500' : 'bg-green-500')
                    ]" :title="wsStatusMessage" @click="toggleWebSocketMode"></div>

                    <span v-if="wsNewKillCount > 0"
                        class="ml-1 px-1.5 py-0 bg-primary-500 text-black dark:text-white text-2xs rounded-full cursor-pointer kill-count-badge"
                        @click="resetNewKillCount">
                        +{{ wsNewKillCount }}
                    </span>

                    <span v-if="isWebSocketPaused && pendingMessages.length > 0" class="ml-1 text-xs text-yellow-400">
                        {{ pendingMessages.length }}
                    </span>

                    <!-- Show reconnection status if applicable -->
                    <span v-if="!wsConnected && wsReconnectAttempts > 0" class="ml-1 text-xs text-orange-400">
                        ({{ t('killList.retrying', { attempt: wsReconnectAttempts }) }})
                    </span>
                </div>
            </div>

            <!-- Right side: UPagination component with correct disabled state -->
            <UPagination v-if="props.enablePagination" v-model:page="currentPageIndex" :total="dynamicTotal"
                :page-size="1" :ui="{
                    wrapper: 'flex items-center',
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
                    disabled: currentPageIndex === 1  // Disable prev when on page 1
                }" :next-button="{
                    icon: 'i-lucide-chevron-right',
                    label: ''
                }" @change="resetWebSocketState">
                <template #default>
                    <span class="mx-2">{{ $t('common.page') }} {{ currentPageIndex }}</span>
                </template>
            </UPagination>
        </div>

        <!-- Use our enhanced EkTable component with specialized headers -->
        <Table :columns="tableColumns" :items="killlistData" :loading="pending" :skeleton-count="selectedPageSize"
            :empty-text="t('noKills')" :row-class="getRowClass" :special-header="true" :bordered="true"
            :link-fn="generateKillLink" background="transparent">
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
                            {{ item.victim.character_name }}
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
                                {{ item.finalblow.faction_name || item.finalblow.character_name }}
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
                        <span class="text-xs text-gray-600 dark:text-gray-400">{{ item.commentCount || 0 }}</span>
                        <NuxtImg src="/images/comment.gif" format="webp" quality="80" width="16" height="16"
                            alt="Comments" class="h-4" />
                    </div>
                </div>
            </template>

            <!-- Mobile view -->
            <template #mobile-row="{ item }">
                <div class="mobile-container">
                    <!-- Ship Image -->
                    <Image type="type-render" :id="item.victim.ship_id" format="webp"
                        :alt="`Ship: ${getLocalizedString(item.victim.ship_name, currentLocale)}`"
                        class="rounded w-16 h-16" size="64" />

                    <!-- Victim Info -->
                    <div class="mobile-content">
                        <!-- Top Line: Victim Name + ISK Value -->
                        <div class="mobile-header">
                            <span class="victim-name truncate">{{ item.victim.character_name }}</span>
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
                                {{ item.is_npc ? item.finalblow.faction_name : item.finalblow.character_name }}
                            </span>
                            <div class="system-info flex whitespace-nowrap">
                                <span>{{ item.system_name }}</span>
                                <span> (</span>
                                <span :class="getSecurityColor(item.system_security)">{{ item.system_security.toFixed(1)
                                }}</span>
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
                                <span class="text-xs text-gray-600 dark:text-gray-400">{{ item.attackerCount }}</span>
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
                    <div v-for="i in selectedPageSize" :key="`skeleton-${i}`" class="killlist-skeleton-row">
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
                                    <div class="killlist-skeleton-count"></div>
                                    <div class="killlist-skeleton-icon"></div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </template>
        </Table>

        <!-- Bottom pagination - ensure same behavior as top pagination -->
        <div class="flex justify-end items-center mt-3">
            <UPagination v-if="props.enablePagination" v-model:page="currentPageIndex" :total="dynamicTotal"
                :page-size="1" :ui="{
                    wrapper: 'flex items-center',
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
                    disabled: currentPageIndex === 1  // Disable prev when on page 1
                }" :next-button="{
                    icon: 'i-lucide-chevron-right',
                    label: ''
                }" @change="resetWebSocketState">
                <template #default>
                    <span class="mx-2">{{ $t('common.page') }} {{ currentPageIndex }}</span>
                </template>
            </UPagination>
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
/* Additional mobile-specific styles for slots */
.victim-name {
    font-weight: 500;
    font-size: 0.875rem;
    /* Ensure consistent medium size */
    color: light-dark(#111827, white);
    max-width: 70%;
}

.isk-value {
    font-size: 0.75rem;
    /* Small font for ISK */
    white-space: nowrap;
}

.mobile-corporation {
    margin-bottom: 0.25rem;
    font-size: 0.75rem;
    /* Ensure XS size */
}

.mobile-meta {
    margin-bottom: 0.25rem;
    font-size: 0.75rem;
    /* Ensure XS size */
}

.mobile-footer {
    margin-top: 0.25rem;
    font-size: 0.75rem;
    /* Ensure XS size */
}

/* Enhanced Custom color class for combined losses */
.bg-darkred {
    background-color: rgba(139, 0, 0, 0.4) !important;
    /* Darker red with more opacity */
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

/* Override pagination text size */
:deep(.u-pagination) {
    font-size: 0.875rem;
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

/* Add text-2xs class for very small text */
.text-2xs {
    font-size: 0.65rem;
    line-height: 0.85rem;
}

/* Make the kill count badge smaller and more compact */
.kill-count-badge {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 16px;
    height: 16px;
    font-weight: 600;
    padding-left: 4px;
    padding-right: 4px;
}

/* Consistent animation timing for all skeleton elements */
@keyframes pulse {

    0%,
    100% {
        opacity: 1;
    }

    50% {
        opacity: 0.5;
    }
}

.animate-pulse {
    animation: pulse 1.5s ease-in-out infinite;
}

/* Ensure our skeleton row maintains the proper layout */
.skeleton-row {
    display: flex;
    width: 100%;
    background-color: light-dark(rgba(255, 255, 255, 0.4), rgba(26, 26, 26, 0.3));
    border-radius: 0.375rem;
    margin-bottom: 0.25rem;
    padding: 0.35rem 0.75rem;
    border-bottom: 1px solid light-dark(rgba(229, 231, 235, 0.3), rgba(75, 85, 99, 0.2));
}

/* Make sure skeleton cells have the right dimensions */
.skeleton-row .body-cell {
    flex-shrink: 0;
    flex-grow: 0;
    display: flex;
    align-items: center;
}

/* Make the skeleton images look right */
.rounded-lg {
    border-radius: 0.375rem;
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

/* Enhanced pulse animation */
@keyframes pulse {

    0%,
    100% {
        opacity: 0.7;
    }

    50% {
        opacity: 0.4;
    }
}

/* Direct targeting of the table row elements with more muted red */
.bg-darkred,
.combined-loss-row,
:deep(a.table-row.bg-darkred),
:deep(a.table-row.combined-loss-row) {
    background-color: rgba(80, 0, 0, 0.6) !important;
    border-left: 3px solid rgba(139, 46, 46, 0.8) !important;
}

/* Target hover states with a slightly darker but still muted red */
:deep(a.table-row.bg-darkred:hover),
:deep(a.table-row.combined-loss-row:hover) {
    background-color: rgba(90, 0, 0, 0.65) !important;
}

/* Target mobile view as well */
:deep(.mobile-container.bg-darkred),
:deep(.mobile-container.combined-loss-row) {
    background-color: rgba(80, 0, 0, 0.6) !important;
    border-left: 3px solid rgba(139, 46, 46, 0.8) !important;
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

/* Remove the old hover tooltip behavior */
.fade-text:hover {
    overflow: visible;
    position: relative;
    z-index: 5;
    mask-image: linear-gradient(to right, black 85%, transparent);
    -webkit-mask-image: linear-gradient(to right, black 85%, transparent);
}

/* Remove old tooltip */
.fade-text:hover::before {
    content: none;
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
    /* Allow interacting with elements below */
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

/* Fix responsive image sizes */
@media (max-width: 640px) {
    .w-16 {
        width: 48px !important;
    }

    .h-16 {
        height: 48px !important;
    }
}

/* Override the skeleton size for consistency */
.killlist-skeleton-image {
    width: 64px;
    height: 64px;
    margin: 0 8px;
}
</style>
