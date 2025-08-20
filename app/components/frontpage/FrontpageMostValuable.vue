<script setup lang="ts">
import { computed, ref } from "vue";

interface IMostValuableItem {
    killmail_id: number;
    total_value: number;
    victim: {
        ship_id: number;
        ship_name: string | Record<string, string>;
        character_id?: number;
        character_name?: string;
        corporation_id?: number;
        corporation_name?: string;
        alliance_id?: number;
        alliance_name?: string;
    };
    final_blow?: {
        character_id?: number;
        character_name?: string;
        ship_id: number;
        ship_name: string | Record<string, string>;
    };
}

const props = defineProps({
    days: { type: Number, default: 7 },
    limit: { type: Number, default: 7 },
});

const { t, locale } = useI18n();
const currentLocale = computed(() => locale.value);

// Define categories with distinct keys - reordered as requested
const categories = [
    { key: "most_valuable_structures", label: t("structures"), icon: "i-lucide-building" },
    { key: "most_valuable_kills", label: t("kills"), icon: "i-lucide-target" }, // Default
    { key: "most_valuable_ships", label: t("ships"), icon: "i-lucide-ship" },
];

// Initialize activeTabId with the key of the default category
const activeTabId = ref(categories[1].key);

// Create mapped items for Tabs.vue
const tabItemsForTabsComponent = computed(() => {
    return categories.map(category => ({
        id: category.key,
        label: category.label,
        icon: category.icon,
        slot: category.key, // Required by Tabs.vue
    }));
});

// Create fetch query parameters
const queryParams = computed(() => ({
    dataType: activeTabId.value, // Use dataType instead of type
    days: props.days,
    limit: props.limit,
    type: activeTabId.value, // Also include type for API compatibility
}));

// Use useFetch for better SSR and loading state management
const {
    data: fetchedData,
    pending: isLoading,
    error: fetchError,
    refresh
} = await useFetch<IMostValuableItem[]>("/api/stats", {
    key: () => `most-valuable-v3-${activeTabId.value}-${props.days}-${props.limit}`, // Updated cache key again
    query: queryParams,
    server: true,
    lazy: true,  // Progressive loading for tab switching
    default: () => [],
    watch: [activeTabId, () => props.days, () => props.limit]
});

// Current tab items - directly from useFetch data
const currentTabItems = computed(() => {
    return fetchedData.value || [];
});

// Helper functions for data formatting and display
const getLocalizedString = (obj: any, locale: string): string => {
    if (!obj) return "";
    if (typeof obj === "string") return obj;
    return obj[locale] || obj.en || "";
};

// Format ISK similar to KillList
const formatIsk = (value: number): string => {
    if (value >= 1000000000) return `${(value / 1000000000).toFixed(2)}B`;
    if (value >= 1000000) return `${(value / 1000000).toFixed(2)}M`;
    if (value >= 1000) return `${(value / 1000).toFixed(2)}K`;
    return value.toString();
};

const getShipName = (item: IMostValuableItem): string => {
    return getLocalizedString(item.victim.ship_name, currentLocale.value);
};

// Handle item click to navigate to kill details
const handleItemClick = (killmailId: number) => {
    navigateTo(`/kill/${killmailId}`);
};

// Responsive design
const { isMobile } = useResponsive();

// Customized UTab UI configuration
const tabsUi = computed(() => {
    return {
        wrapper: "w-full",
        list: {
            base: "flex items-center justify-between",
            background: "bg-black",
            width: "w-full",
            height: "h-auto",
            divider: {
                base: "hidden",
            },
        },
        item: {
            size: "text-xs",
            font: "font-medium",
            base: "flex items-center justify-center py-2 px-4 text-center",
            active: "text-white font-bold",
            inactive: "text-gray-400 hover:text-gray-300",
        },
    };
});

// Generate link for Table component
const generateKillLink = (item: IMostValuableItem): string | null => {
    if (!item || !item.killmail_id) return null;
    return `/kill/${item.killmail_id}`;
};

// Removed manual priority logic - Image component now handles this automatically with smart LCP detection
</script>

<template>
    <div class="flex flex-col min-w-full rounded-lg overflow-hidden min-h-[350px] bg-transparent">
        <Tabs v-model="activeTabId" :items="tabItemsForTabsComponent" :ui="tabsUi" class="w-full" color="neutral"
            :keepAliveContent="true" />

        <!-- Display error message if fetchError is set -->
        <div v-if="fetchError"
            class="p-4 text-center text-red-500 dark:text-red-400 bg-red-100 dark:bg-red-900 rounded-md m-2">
            {{ t('errorFetchingData') }}: {{ fetchError.message }}
        </div>

        <!-- Use our custom Table component with horizontal layout -->
        <Table :columns="[]" :items="currentTabItems" :loading="isLoading" :skeleton-count="props.limit"
            :empty-text="t('noData')" :empty-icon="'i-lucide-file-text'" horizontal :horizontal-items-per-row="7"
            :link-fn="generateKillLink" background="transparent" hover>
            <!-- Custom horizontal item template -->
            <template #horizontal-item="{ item, index }">
                <div class="flex flex-col items-center">
                    <Image type="type-render" :id="item.victim.ship_id" :alt="`Ship: ${getShipName(item)}`"
                        class="rounded w-24 h-24 md:w-32 md:h-32 object-contain mb-2" size="128"
                        :loading="index < 7 ? 'eager' : 'lazy'" />
                    <div class="text-center text-sm mt-1 max-w-full truncate text-gray-900 dark:text-white">
                        {{ getShipName(item) }}
                    </div>
                    <div class="text-center text-xs mt-1 text-gray-500 dark:text-background-300">
                        {{ formatIsk(item.total_value) }} ISK
                    </div>
                    <!-- Show victim name if available -->
                    <div v-if="item.victim.character_name"
                        class="text-center text-xs mt-1 text-black dark:text-white truncate max-w-full">
                        {{ item.victim.character_name }}
                    </div>
                    <!-- Show corporation name if available -->
                    <div v-if="item.victim.corporation_name"
                        class="text-center text-xs mt-1 text-gray-600 dark:text-gray-400 truncate max-w-full">
                        {{ item.victim.corporation_name }}
                    </div>
                    <!-- Show alliance name if available -->
                    <div v-if="item.victim.alliance_name"
                        class="text-center text-xs mt-1 text-gray-500 dark:text-gray-500 truncate max-w-full">
                        {{ item.victim.alliance_name }}
                    </div>
                </div>
            </template>

            <!-- Custom horizontal skeleton that matches final layout -->
            <template #horizontal-skeleton>
                <div class="horizontal-grid" :class="[`grid-cols-${isMobile ? 2 : props.limit}`]">
                    <div v-for="i in props.limit" :key="`skeleton-${i}`" class="horizontal-item">
                        <div class="flex flex-col items-center">
                            <div
                                class="rounded w-24 h-24 md:w-32 md:h-32 bg-gray-200 dark:bg-gray-700 animate-pulse mb-2">
                            </div>
                            <div class="h-4 w-20 mt-1 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                            <div class="h-3 w-16 mt-1 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                            <div class="h-2 w-14 mt-1 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                            <div class="h-2 w-16 mt-1 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                            <div class="h-2 w-12 mt-1 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                        </div>
                    </div>
                </div>
            </template>
        </Table>

        <div class="text-sm text-center mt-2 text-gray-500 dark:text-background-400 pb-4">
            ({{ t('killsOverLastXDays', { days: props.days }) }})
        </div>
    </div>
</template>

<style scoped>
.bg-semi-transparent {
    background-color: rgba(0, 0, 0, 0.4);
}

/* Table styles */
:deep(tbody tr) {
    border-color: rgb(40, 40, 40) !important;
}

:deep(tbody tr + tr) {
    border-top: 1px solid rgb(40, 40, 40) !important;
}

:deep(tbody tr):hover {
    background: light-dark(#e5e7eb, #1a1a1a);
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

/* Fix grid columns for skeleton */
.horizontal-grid {
    display: grid;
    grid-template-columns: repeat(var(--cols, 7), 1fr);
    gap: 0.75rem;
    padding: 0.5rem;
}

.grid-cols-2 {
    --cols: 2;
}

.grid-cols-3 {
    --cols: 3;
}

.grid-cols-4 {
    --cols: 4;
}

.grid-cols-5 {
    --cols: 5;
}

.grid-cols-6 {
    --cols: 6;
}

.grid-cols-7 {
    --cols: 7;
}
</style>
