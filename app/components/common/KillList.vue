<script setup lang="ts">
import { computed, getCurrentInstance, nextTick, onBeforeUnmount } from 'vue';

const { t, locale } = useI18n();
const currentLocale = computed(() => locale.value);

// Use the centralized date formatting composable
const { formatTimeAgo } = useDateFormatting();

// Use responsive detection composable
const { isMobile } = useResponsive();

// Define emits
const emit = defineEmits(['update:page', 'update:limit']);

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
    currentPage: { type: Number, default: 1 },
    totalPages: { type: Number, default: 1 },
});

// Pagination and display settings
const pagination = ref({
    pageIndex: 0,
    pageSize: 10,
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
    selectedPageSize.value = newSize;
};

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
    return `killlist-${props.apiEndpoint}-${props.killlistType}-${queryParams.value.page}-${queryParams.value.limit}`;
});

// Determine if we should use external data
const useExternalData = computed(() => props.externalKilllistData !== null);

// Local reactive container for kill list data
const localKilllistData = ref<IKillList[]>([]);

// Fetch kill list data only if not using external data
const shouldFetch = computed(() => !useExternalData.value);

const {
    data: fetchedData,
    pending,
    error,
    refresh,
} = await useFetch<IKillList[]>(
    () => shouldFetch.value ? props.apiEndpoint : null,
    {
        key: fetchKey,
        query: queryParams,
        server: true,
        lazy: false,
        default: () => []
    }
);

// Combined kill list data - either from props or fetched
const killlistData = computed(() => {
    return useExternalData.value ? props.externalKilllistData : fetchedData.value || [];
});

// Track if we have a fetch error and empty data (potential timeout scenario)
const hasFetchError = computed(() => {
    return !useExternalData.value && error.value && (!fetchedData.value || fetchedData.value.length === 0);
});

// Retry function for failed fetches
const retryFetch = async () => {
    try {
        await refresh();
    } catch (err) {
        console.error("Error retrying killlist fetch:", err);
    }
};

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

    // If using external data, emit limit change to parent
    if (useExternalData.value) {
        emit('update:limit', newSize);
        emit('update:page', 1); // Reset to first page
    } else {
        // Only attempt to refresh if using fetched data
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
    url: "wss://ws.eve-kill.com/killmails",
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

    // Use silent pause to keep connection alive for automatic pauses (hover, pagination),
    // but regular pause for manual/component deactivation
    const useSilentPause = reason !== "manual" && reason !== "component_deactivated";
    pauseWs(useSilentPause);

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

    // Since silent pause keeps the connection alive, we need to manually process pending messages
    // when resuming from a paused state
    nextTick(() => {
        handleWebSocketReconnect();
    });
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

// Touch event handling for mobile cycling
const touchStartMap = ref<Map<number, { x: number; y: number; time: number }>>(new Map());

const handleTouchStart = (event: TouchEvent, killmailId: number) => {
    const touch = event.touches[0];
    touchStartMap.value.set(killmailId, {
        x: touch.clientX,
        y: touch.clientY,
        time: Date.now()
    });
};

const handleTouchMove = (event: TouchEvent, killmailId: number) => {
    // Prevent scroll when moving horizontally (for swiping)
    const touch = event.touches[0];
    const start = touchStartMap.value.get(killmailId);
    if (!start) return;

    const deltaX = Math.abs(touch.clientX - start.x);
    const deltaY = Math.abs(touch.clientY - start.y);

    // If horizontal movement is greater than vertical, prevent scroll
    if (deltaX > deltaY && deltaX > 10) {
        event.preventDefault();
    }
};

const handleTouchEnd = (event: TouchEvent, killmailId: number) => {
    const start = touchStartMap.value.get(killmailId);
    if (!start) return;

    const touch = event.changedTouches[0];
    const deltaX = touch.clientX - start.x;
    const deltaY = touch.clientY - start.y;
    const deltaTime = Date.now() - start.time;

    const absX = Math.abs(deltaX);
    const absY = Math.abs(deltaY);

    // Clean up
    touchStartMap.value.delete(killmailId);

    // Check if this was a swipe (horizontal movement > vertical, sufficient distance, fast enough)
    if (absX > absY && absX > 30 && deltaTime < 300) {
        // Prevent the row click
        event.preventDefault();
        event.stopPropagation();

        // Swipe left = next, swipe right = previous
        if (deltaX > 0) {
            cycleMobileContent(killmailId, 'prev');
        } else {
            cycleMobileContent(killmailId, 'next');
        }
        return;
    }

    // If it was a tap (small movement, quick), allow the row click to proceed
    // by not preventing default
};

// Handle WebSocket messages
function handleWebSocketMessage(data) {
    try {
        // Handle ping/pong for connection health
        if (data.type === "ping") {
            // Respond to server ping with pong
            wsSendMessage(JSON.stringify({
                type: "pong",
                timestamp: data.timestamp
            }));
            return;
        }

        if (data.type !== "killmail") return;

        // The structure is: {"type":"killmail","data":{"killmail":{...}}}
        const killmail: IKillmail = data.data.killmail;

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

const truncateString = (str: any, num: number): string => {
    const stringifiedStr = String(str || "");
    return stringifiedStr.length <= num ? stringifiedStr : `${stringifiedStr.slice(0, num)}...`;
};

const isCombinedLoss = (kill: any): boolean => {
    if (!kill || !props.combinedKillsAndLosses || !props.combinedVictimId) return false;

    const victimIdProp = `${props.combinedVictimType}_id`;
    const victimId = kill.victim?.[victimIdProp];

    if (!victimId) return false;

    // Ensure both values are numbers for comparison
    const victimIdNum = Number(victimId);
    const combinedVictimIdNum = Number(props.combinedVictimId);

    return victimIdNum === combinedVictimIdNum;
};

// Get row class based on whether it's a combined loss and row index
const getRowClass = (item: IKillList, index: number) => {
    const combinedLossClass = isCombinedLoss(item) ? "combined-loss-row bg-darkred" : "";
    const alternatingClass = index % 2 === 1 ? "alternate-row" : "regular-row";
    return [combinedLossClass, alternatingClass].filter(Boolean).join(" ");
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

// Calculate dynamic total based on external pagination or default behavior
const dynamicTotal = computed(() => {
    if (useExternalData.value && props.totalPages > 0) {
        // Use external pagination data
        return props.totalPages * selectedPageSize.value;
    }
    // Default behavior for internal pagination
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

    // If using external data, emit page change to parent
    if (useExternalData.value) {
        emit('update:page', newPage);
    }

    // Handle WebSocket state based on page
    if (newPageIndex > 0) {
        pauseWebSocket("pagination");
    } else if (!manuallyPaused.value) {
        resumeWebSocket();
    }
});

// Watch external currentPage prop to sync internal pagination
watch(() => props.currentPage, (newPage) => {
    if (useExternalData.value && currentPageIndex.value !== newPage) {
        currentPageIndex.value = newPage;
    }
}, { immediate: true });

// Watch external limit prop to sync internal page size
watch(() => props.limit, (newLimit) => {
    if (selectedPageSize.value !== newLimit) {
        selectedPageSize.value = newLimit;
    }
}, { immediate: true });

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

// Track when component is mounted to prevent hydration mismatches
const isMounted = ref(false);

const tableColumns = computed(() => {
    // Allow mobile layout to render on server side for proper SSR
    const shouldUseMobileLayout = isMobile.value;

    if (shouldUseMobileLayout) {
        // Mobile layout: Images column + Cycling content column
        // Need ~200px for 3×64px images + gaps, so use 55%/45% split
        return [
            {
                id: "mobile-images",
                header: "",
                width: "55%",
                class: "min-w-0 max-w-[55%]",
            },
            {
                id: "mobile-content",
                header: "",
                width: "45%",
                class: "min-w-0 max-w-[45%]",
            },
        ];
    }

    // Desktop layout
    return [
        {
            id: "ship",
            header: t("ship"),
            width: "22%",
            class: "min-w-0 max-w-[22%]",
        },
        {
            id: "victim",
            header: t("victim"),
            width: "28%",
            class: "min-w-0 max-w-[28%]",
        },
        {
            id: "finalBlow",
            header: t("finalBlow"),
            width: "27%",
            class: "min-w-0 max-w-[27%] hidden sm:table-cell",
        },
        {
            id: "location",
            header: t("location"),
            width: "13%",
            class: "min-w-0 max-w-[13%] hidden md:table-cell",
        },
        {
            id: "details",
            headerClass: "text-right",
            width: "10%",
            class: "text-right min-w-0 max-w-[10%]",
        },
    ];
});// WebSocket status message
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

// Mobile cycling content state management  
const mobileContentStates = ['ship', 'victim', 'attacker', 'location', 'time'] as const;
type MobileContentState = typeof mobileContentStates[number];

// Create a reactive map to track cycling state for each killmail
const cyclingStateMap = ref<Map<number, {
    currentStateIndex: number;
    isPaused: boolean;
    pauseTimeout: number | null;
    cycleInterval: number | null;
}>>(new Map());

// Initialize cycling state for a killmail
const initializeCyclingState = (killmailId: number) => {
    if (!cyclingStateMap.value.has(killmailId)) {
        cyclingStateMap.value.set(killmailId, {
            currentStateIndex: 0,
            isPaused: false,
            pauseTimeout: null,
            cycleInterval: null,
        });
        startCycling(killmailId);
    }
};

// Start auto-cycling for a killmail
const startCycling = (killmailId: number) => {
    // Only run cycling on client side where window is available
    if (typeof window === 'undefined') return;

    const state = cyclingStateMap.value.get(killmailId);
    if (!state || state.isPaused) return;

    state.cycleInterval = window.setInterval(() => {
        const currentState = cyclingStateMap.value.get(killmailId);
        if (currentState && !currentState.isPaused) {
            currentState.currentStateIndex = (currentState.currentStateIndex + 1) % mobileContentStates.length;
        }
    }, 3500); // 3.5 seconds
};

// Stop cycling for a killmail
const stopCycling = (killmailId: number) => {
    // Only run on client side where clearInterval is available
    if (typeof window === 'undefined') return;

    const state = cyclingStateMap.value.get(killmailId);
    if (state?.cycleInterval) {
        clearInterval(state.cycleInterval);
        state.cycleInterval = null;
    }
};

// Pause cycling after user interaction
const pauseCycling = (killmailId: number) => {
    // Only run on client side where setTimeout is available
    if (typeof window === 'undefined') return;

    const state = cyclingStateMap.value.get(killmailId);
    if (!state) return;

    state.isPaused = true;
    stopCycling(killmailId);

    // Clear existing pause timeout
    if (state.pauseTimeout) {
        clearTimeout(state.pauseTimeout);
    }

    // Resume after 10 seconds - only on client side
    state.pauseTimeout = window.setTimeout(() => {
        const currentState = cyclingStateMap.value.get(killmailId);
        if (currentState) {
            currentState.isPaused = false;
            startCycling(killmailId);
        }
    }, 10000);
};

// Manual content cycling (for swipe/tap)
const cycleMobileContent = (killmailId: number, direction: 'next' | 'prev' | number) => {
    const state = cyclingStateMap.value.get(killmailId);
    if (!state) return;

    if (typeof direction === 'number') {
        state.currentStateIndex = direction;
    } else {
        const change = direction === 'next' ? 1 : -1;
        state.currentStateIndex = (state.currentStateIndex + change + mobileContentStates.length) % mobileContentStates.length;
    }

    pauseCycling(killmailId);
};

// Get current mobile content state for a killmail
const getMobileContentState = (killmailId: number): MobileContentState => {
    const state = cyclingStateMap.value.get(killmailId);
    return mobileContentStates[state?.currentStateIndex || 0];
};

// Cleanup cycling timers
onBeforeUnmount(() => {
    cyclingStateMap.value.forEach((state, killmailId) => {
        stopCycling(killmailId);
        if (state.pauseTimeout) {
            clearTimeout(state.pauseTimeout);
        }
    });
});

// Initialize cycling for visible items when data changes
watch([killlistData, isMobile], ([newData, mobile]) => {
    // Only initialize cycling on client side
    if (typeof window !== 'undefined' && mobile && newData?.length) {
        nextTick(() => {
            newData.forEach(item => {
                if (item.killmail_id) {
                    initializeCyclingState(item.killmail_id);
                }
            });
        });
    }
}, { immediate: true });

// Also initialize cycling on mount for any existing data
onMounted(() => {
    // Set mounted flag for any remaining client-only logic
    isMounted.value = true;

    // Wait for next tick to ensure proper initialization
    nextTick(() => {
        // Initialize cycling for mobile if data is already available and we're on mobile
        if (isMobile.value && killlistData.value?.length) {
            killlistData.value.forEach((item: any) => {
                if (item.killmail_id) {
                    initializeCyclingState(item.killmail_id);
                }
            });
        }

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
/**
* Updates fade effect on elements that over low
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
* Update all text fade eff cts
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
* Set reference for an element by killmai  ID
*/
const setElementRef = (el: HTMLElement | null, id: number, refMap: Map<number, HTMLElement>) => {
    if (el) {
        refMap.set(id, el);
    }
};

onBeforeUnmount(() => {
    // Check if we're actually in a Vue component context
    if (!getCurrentInstance()) return;

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
                <div class="relative w-24">
                    <select :value="selectedPageSize" @change="handlePageSizeChange" :aria-label="t('itemsPerPage')"
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

                <!-- WebSocket status indicator -->
                <div v-if="!wsDisabled && !useExternalData" class="flex items-center ml-4">
                    <div :class="[
                        'w-3 h-3 mr-1 cursor-pointer',
                        !wsConnected ? (wsReconnectAttempts > 0 ? 'bg-orange-500' : 'bg-red-500') :
                            (isWebSocketPaused ? 'bg-yellow-500' : 'bg-green-500')
                    ]" :title="wsStatusMessage" @click="toggleWebSocketMode"></div>

                    <span v-if="wsNewKillCount > 0"
                        class="ml-1 px-1.5 py-0 bg-primary-500 text-white text-2xs cursor-pointer kill-count-badge"
                        @click="resetNewKillCount">
                        +{{ wsNewKillCount }}
                    </span>

                    <!-- Show reconnection status if applicable -->
                    <span v-if="!wsConnected && wsReconnectAttempts > 0" class="ml-1 text-xs text-orange-400">
                        ({{ t('retrying', { attempt: wsReconnectAttempts }) }})
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

        <!-- Error state with retry option -->
        <div v-if="hasFetchError" class="text-center py-8">
            <div class="text-red-500 dark:text-red-400 mb-4">
                <Icon name="i-lucide-alert-circle" class="w-8 h-8 mx-auto mb-2" />
                <p class="text-lg font-medium">{{ t('errorLoadingKills') }}</p>
                <p class="text-sm text-gray-600 dark:text-gray-400 mt-1">{{ t('databaseTimeout') }}</p>
            </div>
            <button @click="retryFetch"
                class="px-4 py-2 bg-primary-500 text-white rounded-md hover:bg-primary-600 transition-colors">
                <Icon name="i-lucide-refresh-cw" class="w-4 h-4 inline mr-2" />
                {{ t('errors.whatToDo.tryAgain') }}
            </button>
        </div>

        <!-- Use our enhanced EkTable component with specialized headers -->
        <Table v-else :columns="tableColumns" :items="killlistData" :loading="pending"
            :skeleton-count="selectedPageSize" :empty-text="t('noKills')" :row-class="getRowClass"
            :special-header="true" :bordered="true" :link-fn="generateKillLink" :hover="true" background="transparent"
            :force-desktop="true" :row-id="(item) => `killmail-row-${item.killmail_id}`">
            <!-- Ship column -->
            <template #cell-ship="{ item }">
                <div class="flex items-center py-1 min-w-0 max-w-full overflow-hidden">
                    <Image type="type-overlay-render" :id="item.victim.ship_id"
                        :alt="`Ship: ${getLocalizedString(item.victim.ship_name, currentLocale)}`"
                        class="rounded w-16 h-16 xs:w-12 xs:h-12 mx-2 xs:mx-1 flex-shrink-0" size="64" />
                    <div class="flex flex-col items-start min-w-0 flex-1 overflow-hidden">
                        <span class="text-sm xs:text-xs text-black dark:text-white truncate w-full"
                            :ref="(el) => setElementRef(el, item.killmail_id, shipNameRefs)">
                            {{ getLocalizedString(item.victim.ship_name, currentLocale) }}
                        </span>
                        <span class="text-xs text-gray-500 dark:text-gray-400 truncate w-full hidden sm:block">
                            {{ getLocalizedString(item.victim.ship_group_name || {}, currentLocale) }}
                        </span>
                        <!-- Hide ISK value on mobile screens -->
                        <span v-if="item.total_value > 50"
                            class="text-xs text-gray-600 dark:text-gray-400 hidden sm:block truncate w-full">
                            {{ formatIsk(item.total_value) }} ISK
                        </span>
                    </div>
                </div>
            </template>

            <!-- Victim column -->
            <template #cell-victim="{ item }">
                <div class="flex items-center py-1 min-w-0 max-w-full overflow-hidden">
                    <!-- Hide victim image on mobile screens -->
                    <template v-if="item.victim.character_id > 0">
                        <Image type="character" :id="item.victim.character_id"
                            :alt="`Character: ${item.victim.character_name}`"
                            class="w-16 h-16 mx-2 flex-shrink-0 hidden sm:block" size="64" />
                    </template>
                    <Image v-else type="character" :id="1" alt="Placeholder"
                        class="w-16 h-16 mx-2 flex-shrink-0 hidden sm:block" size="64" />
                    <div class="flex flex-col items-start min-w-0 flex-1 overflow-hidden">
                        <!-- Character Name -->
                        <span class="text-sm xs:text-xs text-black dark:text-white truncate w-full"
                            :ref="(el) => setElementRef(el, item.killmail_id, characterNameRefs)">
                            {{ item.victim.character_name }}
                        </span>
                        <!-- Corporation Name (without ticker) -->
                        <span class="text-xs text-gray-600 dark:text-gray-400 truncate w-full"
                            :ref="(el) => setElementRef(el, item.killmail_id, corporationNameRefs)">
                            {{ item.victim.corporation_name }}
                        </span>
                        <!-- Alliance Name (without ticker) - hide on small screens -->
                        <span v-if="item.victim.alliance_name"
                            class="text-xs text-gray-500 dark:text-gray-500 truncate w-full xs:hidden"
                            :ref="(el) => setElementRef(el, item.killmail_id, allianceNameRefs)">
                            {{ item.victim.alliance_name }}
                        </span>
                        <!-- Faction Name (when no alliance) - hide on small screens -->
                        <span v-else-if="item.victim.faction_name"
                            class="text-xs text-gray-500 dark:text-gray-500 truncate w-full xs:hidden">
                            {{ item.victim.faction_name }}
                        </span>
                    </div>
                </div>
            </template>

            <!-- Final Blow column -->
            <template #cell-finalBlow="{ item }">
                <div class="flex items-center py-1 min-w-0">
                    <!-- Character or placeholder when finalblow.character_id missing -->
                    <template v-if="item.finalblow.character_id > 0">
                        <Image type="character" :id="item.finalblow.character_id"
                            :alt="`Character: ${item.finalblow.character_name}`"
                            class="w-16 h-16 mx-2 flex-shrink-0 hidden sm:block" size="64" />
                        <div class="flex flex-col items-start min-w-0 flex-1">
                            <!-- Character Name -->
                            <span class="text-sm xs:text-xs text-black dark:text-white truncate w-full"
                                :ref="(el) => setElementRef(el, `fb-${item.killmail_id}`, finalBlowNameRefs)">
                                {{ item.finalblow.character_name }}
                            </span>
                            <!-- Corporation Name (without ticker) -->
                            <span class="text-xs text-gray-600 dark:text-gray-400 truncate w-full"
                                :ref="(el) => setElementRef(el, `fb-${item.killmail_id}`, finalBlowCorpRefs)">
                                {{ item.finalblow.corporation_name }}
                            </span>
                            <!-- Alliance Name (without ticker) - hide on very small screens -->
                            <span v-if="item.finalblow.alliance_name"
                                class="text-xs text-gray-500 dark:text-gray-500 truncate w-full xs:hidden"
                                :ref="(el) => setElementRef(el, `fb-${item.killmail_id}`, finalBlowAllianceRefs)">
                                {{ item.finalblow.alliance_name }}
                            </span>
                            <!-- Faction Name (when no alliance) - hide on very small screens -->
                            <span v-else-if="item.finalblow.faction_name"
                                class="text-xs text-gray-500 dark:text-gray-500 truncate w-full xs:hidden">
                                {{ item.finalblow.faction_name }}
                            </span>
                        </div>
                    </template>
                    <template v-else>
                        <Image type="character" :id="1" size="64" alt="NPC/Structure"
                            class="w-16 h-16 mx-2 flex-shrink-0 hidden sm:block" />
                        <div class="flex flex-col items-start min-w-0 flex-1">
                            <span class="text-sm xs:text-xs text-black dark:text-white truncate w-full">
                                {{ item.finalblow.faction_name || item.finalblow.character_name }}
                            </span>
                            <span v-if="item.finalblow.corporation_name"
                                class="text-xs text-gray-600 dark:text-gray-400 truncate w-full">
                                {{ item.finalblow.corporation_name }}
                            </span>
                            <span v-if="item.finalblow.ship_group_name"
                                class="text-xs text-gray-500 dark:text-gray-500 truncate w-full xs:hidden">
                                {{ getLocalizedString(item.finalblow.ship_group_name, currentLocale) }}
                            </span>
                        </div>
                    </template>
                </div>
            </template>

            <!-- Location column -->
            <template #cell-location="{ item }">
                <div class="flex flex-col items-start py-1 text-sm px-2 min-w-0">
                    <span class="text-sm text-black dark:text-white truncate w-full">
                        {{ getLocalizedString(item.region_name, currentLocale) }}
                    </span>
                    <div class="text-xs text-gray-600 dark:text-gray-400 truncate w-full">
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
                <div class="flex flex-col items-end w-full min-w-0 px-2">
                    <div class="text-sm xs:text-xs text-black dark:text-white">
                        <ClientOnly>
                            {{ formatTimeAgo(item.kill_time) }}
                            <template #fallback>
                                <span class="text-gray-400">Loading...</span>
                            </template>
                        </ClientOnly>
                    </div>
                    <div class="flex gap-1 items-center">
                        <span class="text-xs text-gray-600 dark:text-gray-400">{{ item.attackerCount }}</span>
                        <UIcon name="lucide:users" class="h-4 w-4 xs:h-3 xs:w-3 text-gray-600 dark:text-gray-400"
                            :aria-label="`${item.attackerCount} Involved`" />
                        <!-- Show comment count, but only if there are comments -->
                        <template v-if="item.commentCount && item.commentCount > 0">
                            <span class="text-xs text-gray-600 dark:text-gray-400">{{ item.commentCount }}</span>
                            <UIcon name="lucide:message-circle"
                                class="h-4 w-4 xs:h-3 xs:w-3 text-gray-600 dark:text-gray-400" aria-label="Comments" />
                        </template>
                    </div>
                </div>
            </template>

            <!-- Mobile Images Column -->
            <template #cell-mobile-images="{ item }">
                <div class="relative flex items-center gap-0.5 py-1 min-w-[192px] mobile-images-container">
                    <!-- Ship Image -->
                    <Image type="type-overlay-render" :id="item.victim.ship_id"
                        :alt="`Ship: ${getLocalizedString(item.victim.ship_name, currentLocale)}`"
                        class="rounded w-16 h-16 flex-shrink-0" size="64" />

                    <!-- Victim Character Image -->
                    <template v-if="item.victim.character_id > 0">
                        <Image type="character" :id="item.victim.character_id"
                            :alt="`Character: ${item.victim.character_name}`" class="w-16 h-16 flex-shrink-0"
                            size="64" />
                    </template>
                    <Image v-else type="character" :id="1" alt="Placeholder" class="w-16 h-16 flex-shrink-0"
                        size="64" />

                    <!-- Final Blow Character Image -->
                    <template v-if="item.finalblow.character_id > 0">
                        <Image type="character" :id="item.finalblow.character_id"
                            :alt="`Character: ${item.finalblow.character_name}`" class="w-16 h-16 flex-shrink-0"
                            size="64" />
                    </template>
                    <Image v-else type="character" :id="1" size="64" alt="NPC/Structure"
                        class="w-16 h-16 flex-shrink-0" />

                    <!-- Status Dots and Label - Always render on mobile, separate positioning -->
                    <div v-if="isMobile" class="absolute bottom-0 right-1 flex items-end gap-2 z-10">
                        <!-- Current State Label - Position up and right from container bottom-right -->
                        <span
                            class="text-xs font-medium text-gray-600 dark:text-gray-400 bg-white dark:bg-gray-800 px-2 py-0.5 rounded shadow-sm border border-gray-200 dark:border-gray-700 capitalize translate-y-[-55px] translate-x-[230px] z-50">
                            {{ mobileContentStates[cyclingStateMap.get(item.killmail_id)?.currentStateIndex || 0] }}
                        </span>

                        <!-- Status Dots - Position down 5px from bottom -->
                        <div class="flex gap-1 translate-y-[10px] translate-x-[55px]">
                            <button v-for="(state, index) in mobileContentStates" :key="state"
                                @click="cycleMobileContent(item.killmail_id, index)" :class="[
                                    'w-2.5 h-2.5 rounded-full transition-all duration-200 shadow-md',
                                    (cyclingStateMap.get(item.killmail_id)?.currentStateIndex || 0) === index
                                        ? 'bg-primary-500 scale-110 shadow-primary-500/50'
                                        : 'bg-gray-400 dark:bg-gray-600 hover:bg-gray-500 dark:hover:bg-gray-500'
                                ]" :aria-label="`View ${state} information`"
                                :title="state.charAt(0).toUpperCase() + state.slice(1)" />
                        </div>
                    </div>
                </div>
            </template>

            <!-- Mobile Cycling Content Column -->
            <template #cell-mobile-content="{ item }">
                <div class="relative py-1 px-2 min-h-[80px] mobile-cycling-content w-full max-w-full"
                    @touchstart="handleTouchStart($event, item.killmail_id)"
                    @touchmove="handleTouchMove($event, item.killmail_id)"
                    @touchend="handleTouchEnd($event, item.killmail_id)">

                    <!-- Sliding Content Container -->
                    <div class="relative h-full w-full max-w-full overflow-hidden">
                        <div class="flex transition-transform duration-300 ease-in-out h-full w-[500%]"
                            :style="{ transform: `translateX(-${(cyclingStateMap.get(item.killmail_id)?.currentStateIndex || 0) * 20}%)` }">

                            <!-- Ship Content -->
                            <div class="w-1/5 flex-shrink-0 space-y-1 pr-8">
                                <div class="text-sm text-black dark:text-white truncate mt-2">{{
                                    getLocalizedString(item.victim.ship_name, currentLocale) }}</div>
                                <div class="text-xs text-gray-600 dark:text-gray-400 truncate">{{
                                    getLocalizedString(item.victim.ship_group_name || {}, currentLocale) }}</div>
                                <div v-if="item.total_value > 50" class="text-xs text-gray-600 dark:text-gray-400">{{
                                    formatIsk(item.total_value) }} ISK</div>
                            </div>

                            <!-- Victim Content -->
                            <div class="w-1/5 flex-shrink-0 space-y-1 pr-8">
                                <div class="text-sm text-black dark:text-white truncate mt-2">{{
                                    item.victim.character_name }}</div>
                                <div class="text-xs text-gray-600 dark:text-gray-400 truncate">{{
                                    item.victim.corporation_name }}</div>
                                <div v-if="item.victim.alliance_name"
                                    class="text-xs text-gray-500 dark:text-gray-500 truncate">{{
                                        item.victim.alliance_name }}</div>
                            </div>

                            <!-- Attacker Content -->
                            <div class="w-1/5 flex-shrink-0 space-y-1 pr-8">
                                <div class="text-sm text-black dark:text-white truncate mt-2">{{
                                    item.finalblow.character_name || item.finalblow.faction_name }}</div>
                                <div v-if="item.finalblow.corporation_name"
                                    class="text-xs text-gray-600 dark:text-gray-400 truncate">{{
                                        item.finalblow.corporation_name }}</div>
                                <div v-if="item.finalblow.alliance_name"
                                    class="text-xs text-gray-500 dark:text-gray-500 truncate">{{
                                        item.finalblow.alliance_name }}</div>
                            </div>

                            <!-- Location Content -->
                            <div class="w-1/5 flex-shrink-0 space-y-1 pr-8">
                                <div class="text-sm text-black dark:text-white truncate mt-2">{{
                                    getLocalizedString(item.region_name, currentLocale) }}</div>
                                <div class="text-xs text-gray-600 dark:text-gray-400 truncate">{{ item.system_name }}
                                </div>
                                <div class="text-xs">
                                    <span>Security: </span>
                                    <span :class="getSecurityColor(item.system_security)">{{
                                        item.system_security.toFixed(1) }}</span>
                                </div>
                            </div>

                            <!-- Time Content -->
                            <div class="w-1/5 flex-shrink-0 space-y-1 pr-8">
                                <div class="text-sm text-black dark:text-white mt-2">
                                    <ClientOnly>
                                        {{ formatTimeAgo(item.kill_time) }}
                                        <template #fallback>
                                            <span class="text-gray-400">Loading...</span>
                                        </template>
                                    </ClientOnly>
                                </div>
                                <div class="text-xs text-gray-600 dark:text-gray-400">{{ item.attackerCount }} attackers
                                </div>
                            </div>

                        </div>
                    </div>
                </div>
            </template>

            <!-- Loading skeleton customization -->
            <template #loading="{ mobile }">
            </template>

            <!-- Desktop column-specific loading templates -->
            <template #loading-ship>
                <div class="flex items-center py-1">
                    <div class="rounded w-16 h-16 bg-gray-200 dark:bg-gray-700 animate-pulse mx-2"></div>
                    <div class="flex flex-col items-start space-y-1">
                        <div class="h-4 bg-gray-200 dark:bg-gray-700 rounded w-[150px] animate-pulse"></div>
                        <div class="h-3 bg-gray-200 dark:bg-gray-700 rounded w-[120px] animate-pulse"></div>
                        <div class="h-3 bg-gray-200 dark:bg-gray-700 rounded w-[80px] animate-pulse"></div>
                    </div>
                </div>
            </template>

            <template #loading-victim>
                <div class="flex items-center py-1">
                    <div class="w-16 h-16 bg-gray-200 dark:bg-gray-700 animate-pulse mx-2"></div>
                    <div class="flex flex-col items-start space-y-1 min-w-0 flex-1">
                        <div class="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full max-w-[150px] animate-pulse"></div>
                        <div class="h-3 bg-gray-200 dark:bg-gray-700 rounded w-full max-w-[130px] animate-pulse"></div>
                        <div class="h-3 bg-gray-200 dark:bg-gray-700 rounded w-full max-w-[100px] animate-pulse"></div>
                    </div>
                    <div class="flex flex-col items-start space-y-1">
                        <div class="h-4 bg-gray-200 dark:bg-gray-700 rounded w-[150px] animate-pulse"></div>
                        <div class="h-3 bg-gray-200 dark:bg-gray-700 rounded w-[120px] animate-pulse"></div>
                        <div class="h-3 bg-gray-200 dark:bg-gray-700 rounded w-[80px] animate-pulse"></div>
                    </div>
                </div>
            </template>

            <template #loading-finalBlow>
                <div class="flex items-center py-1">
                    <div class="w-16 h-16 bg-gray-200 dark:bg-gray-700 animate-pulse mx-2"></div>
                    <div class="flex flex-col items-start space-y-1 min-w-0 flex-1">
                        <div class="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full max-w-[150px] animate-pulse"></div>
                        <div class="h-3 bg-gray-200 dark:bg-gray-700 rounded w-full max-w-[130px] animate-pulse"></div>
                        <div class="h-3 bg-gray-200 dark:bg-gray-700 rounded w-full max-w-[100px] animate-pulse"></div>
                    </div>
                    <div class="flex flex-col items-start space-y-1">
                        <div class="h-4 bg-gray-200 dark:bg-gray-700 rounded w-[150px] animate-pulse"></div>
                        <div class="h-3 bg-gray-200 dark:bg-gray-700 rounded w-[120px] animate-pulse"></div>
                        <div class="h-3 bg-gray-200 dark:bg-gray-700 rounded w-[80px] animate-pulse"></div>
                    </div>
                </div>
            </template>

            <template #loading-location>
                <div class="flex flex-col items-start py-1 text-sm px-2">
                    <div class="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full max-w-[100px] animate-pulse"></div>
                    <div class="h-3 bg-gray-200 dark:bg-gray-700 rounded w-full max-w-[80px] animate-pulse mt-1"></div>
                </div>
                <div class="flex flex-col items-start space-y-1">
                    <div class="h-4 bg-gray-200 dark:bg-gray-700 rounded w-[150px] animate-pulse"></div>
                    <div class="h-3 bg-gray-200 dark:bg-gray-700 rounded w-[120px] animate-pulse"></div>
                </div>
            </template>

            <template #loading-details>
                <div class="flex flex-col items-end w-full">
                    <div class="h-4 bg-gray-200 dark:bg-gray-700 rounded w-[60px] animate-pulse"></div>
                    <div class="flex gap-1 items-center mt-1">
                        <div class="h-3 w-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                        <div class="h-4 w-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                        <div class="h-3 w-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                        <div class="h-4 w-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
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
/* Additional styles for slots */
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

/* Combined Loss Row Styling - Single source of truth */
.combined-loss-row,
.bg-darkred,
:deep(.combined-loss-row),
:deep(.bg-darkred) {
    background-color: rgba(220, 38, 38, 0.15) !important;
    border-left: 3px solid rgb(220, 38, 38) !important;
}

/* Alternating row colors for better visual separation */
.alternate-row,
:deep(.alternate-row) {
    background-color: rgba(59, 130, 246, 0.08) !important;
}

:global(.dark) .alternate-row,
:global(.dark) :deep(.alternate-row) {
    background-color: rgba(59, 130, 246, 0.12) !important;
}

/* Regular rows (even rows) - light background for better separation */
.regular-row,
:deep(.regular-row) {
    background-color: rgba(0, 0, 0, 0.04) !important;
}

:global(.dark) .regular-row,
:global(.dark) :deep(.regular-row) {
    background-color: rgba(255, 255, 255, 0.04) !important;
}

/* Table rows (div elements) */
:deep(div.combined-loss-row),
:deep(div.bg-darkred),
:deep(.table-row.combined-loss-row),
:deep(.table-row.bg-darkred) {
    background-color: rgba(220, 38, 38, 0.15) !important;
    border-left: 3px solid rgb(220, 38, 38) !important;
}

:deep(div.alternate-row),
:deep(.table-row.alternate-row) {
    background-color: rgba(59, 130, 246, 0.08) !important;
}

:global(.dark) :deep(div.alternate-row),
:global(.dark) :deep(.table-row.alternate-row) {
    background-color: rgba(59, 130, 246, 0.12) !important;
}

:deep(div.regular-row),
:deep(.table-row.regular-row) {
    background-color: rgba(0, 0, 0, 0.04) !important;
}

:global(.dark) :deep(div.regular-row),
:global(.dark) :deep(.table-row.regular-row) {
    background-color: rgba(255, 255, 255, 0.04) !important;
}

/* Hover states */
:deep(div.combined-loss-row:hover),
:deep(div.bg-darkred:hover),
:deep(.table-row.combined-loss-row:hover),
:deep(.table-row.bg-darkred:hover) {
    background-color: rgba(220, 38, 38, 0.25) !important;
}

:deep(div.alternate-row:hover),
:deep(.table-row.alternate-row:hover) {
    background-color: rgba(255, 255, 255, 0.15) !important;
}

:global(.dark) :deep(div.alternate-row:hover),
:global(.dark) :deep(.table-row.alternate-row:hover) {
    background-color: rgba(255, 255, 255, 0.15) !important;
}

:deep(div.regular-row:hover),
:deep(.table-row.regular-row:hover) {
    background-color: rgba(255, 255, 255, 0.15) !important;
}

:global(.dark) :deep(div.regular-row:hover),
:global(.dark) :deep(.table-row.regular-row:hover) {
    background-color: rgba(255, 255, 255, 0.15) !important;
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

/* Responsive table improvements */
.kill-list-container {
    overflow-x: auto;
    max-width: 100%;
}

/* Ensure table columns don't break on narrow screens */
.kill-list-container table {
    min-width: 100%;
    table-layout: fixed;
    width: 100%;
}

/* Base column widths - rebalanced for better distribution */
.kill-list-container .Table th:first-child,
.kill-list-container .Table td:first-child {
    width: 22%;
    max-width: 22%;
    overflow: hidden;
}

.kill-list-container .Table th:nth-child(2),
.kill-list-container .Table td:nth-child(2) {
    width: 28%;
    max-width: 28%;
    overflow: hidden;
}

.kill-list-container .Table th:nth-child(3),
.kill-list-container .Table td:nth-child(3) {
    width: 27%;
    max-width: 27%;
    overflow: hidden;
}

.kill-list-container .Table th:nth-child(4),
.kill-list-container .Table td:nth-child(4) {
    width: 13%;
    max-width: 13%;
    overflow: hidden;
}

.kill-list-container .Table th:last-child,
.kill-list-container .Table td:last-child {
    width: 10%;
    max-width: 10%;
    text-align: right;
    overflow: hidden;
}

/* Force table to respect container width */
.kill-list-container .Table {
    max-width: 100%;
}

/* Progressive enhancement for small screens */
@media (max-width: 475px) {

    /* On very small screens, adjust column widths and ensure no overflow */
    .kill-list-container table {
        min-width: 0;
        width: 100%;
    }

    .kill-list-container .Table th:first-child,
    .kill-list-container .Table td:first-child {
        width: 35%;
        max-width: 35%;
    }

    .kill-list-container .Table th:nth-child(2),
    .kill-list-container .Table td:nth-child(2) {
        width: 50%;
        max-width: 50%;
    }

    .kill-list-container .Table th:last-child,
    .kill-list-container .Table td:last-child {
        width: 15%;
        max-width: 15%;
    }
}

@media (max-width: 640px) and (min-width: 476px) {

    /* Adjust for small screens but not tiny */
    .kill-list-container table {
        min-width: 0;
        width: 100%;
    }

    .kill-list-container .Table th:first-child,
    .kill-list-container .Table td:first-child {
        width: 35%;
        max-width: 35%;
    }

    .kill-list-container .Table th:nth-child(2),
    .kill-list-container .Table td:nth-child(2) {
        width: 45%;
        max-width: 45%;
    }

    .kill-list-container .Table th:last-child,
    .kill-list-container .Table td:last-child {
        width: 20%;
        max-width: 20%;
    }
}

/* Mobile cycling content styles */
@media (max-width: 640px) {

    .kill-list-container .Table th,
    .kill-list-container .Table td {
        border: none !important;
        padding: 0.5rem 0.25rem !important;
    }

    /* Hide headers on mobile */
    .kill-list-container .Table thead {
        display: none;
    }

    /* Adjust mobile column widths to accommodate 64px images */
    .kill-list-container .Table th:first-child,
    .kill-list-container .Table td:first-child {
        width: 55% !important;
        max-width: 55% !important;
        min-width: 192px !important;
        /* Ensure space for 3×64px images */
    }

    .kill-list-container .Table th:last-child,
    .kill-list-container .Table td:last-child {
        width: 45% !important;
        max-width: 45% !important;
    }
}

/* Mobile content sliding animations */
.mobile-cycling-content {
    touch-action: pan-y;
    /* Allow vertical scrolling but capture horizontal swipes */
    user-select: none;
    /* Prevent text selection during swipes */
}

/* Ensure sliding content stays within bounds */
.mobile-cycling-content .flex {
    width: 500%;
    /* 5 slides × 100% each */
}

/* Create a new stacking context for status labels */
.mobile-images-container {
    z-index: 999;
    position: relative;
    overflow: visible !important;
    /* Allow status elements to extend outside */
}

/* Ensure parent table cells don't clip the mobile status elements */
:deep(.table-row .body-cell:first-child) {
    overflow: visible !important;
    position: relative;
}

:deep(.table-row) {
    overflow: visible !important;
}

/* Status dots styling */
.mobile-images-container .absolute {
    z-index: 1001;
}

.mobile-images-container button {
    transition: all 0.2s ease-in-out;
    box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.1);
}

.mobile-images-container button:hover {
    box-shadow: 0 2px 4px 0 rgba(0, 0, 0, 0.15);
}

.mobile-images-container button:focus {
    outline: 2px solid #3b82f6;
    outline-offset: 1px;
}

/* Status label styling - ensure it's always visible */
.mobile-images-container span {
    font-size: 0.75rem;
    white-space: nowrap;
    backdrop-filter: blur(4px);
    z-index: 9999;
    position: relative;
}
</style>
