<script setup lang="ts">
import { computed, ref, watch } from "vue";

interface IMostValuableItem {
    killmail_id: number;
    total_value: number;
    victim: {
        ship_id: number;
        ship_name: string | Record<string, string>;
        [key: string]: any;
    };
    [key: string]: any;
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
}));

const cachedData = ref<Record<string, IMostValuableItem[]>>({});
const isLoading = ref(false);
const fetchError = ref<Error | null>(null);

const currentTabItems = computed(() => {
    return cachedData.value[activeTabId.value] || [];
});

watch(activeTabId, async (newTabId) => {
    if (cachedData.value[newTabId]) {
        // Data already cached, currentTabItems will update automatically
        fetchError.value = null; // Clear previous errors
        isLoading.value = false; // Ensure loading is false if data is cached
        return;
    }

    isLoading.value = true;
    fetchError.value = null;
    try {
        // Use $fetch for manual data fetching
        const data = await $fetch<IMostValuableItem[]>("/api/stats", {
            query: { ...queryParams.value, type: newTabId }, // Ensure query uses the newTabId
        });
        cachedData.value[newTabId] = data || [];
    } catch (err) {
        console.error(`Failed to fetch data for tab ${newTabId}:`, err);
        fetchError.value = err as Error;
        cachedData.value[newTabId] = []; // Store empty array on error or handle differently
    } finally {
        isLoading.value = false;
    }
}, { immediate: true }); // immediate: true to load data for the initial tab

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

// Prioritize images in the viewport
const isPriorityImage = (index: number): boolean => {
    return index < 3; // First 3 images are prioritized for immediate loading
};
</script>

<template>
    <div class="flex flex-col min-w-full rounded-lg overflow-hidden min-h-[350px] bg-white dark:bg-background-900">
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
                        class="rounded w-24 h-24 md:w-32 md:h-32 object-contain mb-2" size="256"
                        :loading="index < 7 ? 'eager' : 'lazy'" :priority="isPriorityImage(index)" />
                    <div class="text-center text-sm mt-1 max-w-full truncate text-gray-900 dark:text-white">
                        {{ getShipName(item) }}
                    </div>
                    <div class="text-center text-xs mt-1 text-gray-500 dark:text-background-300">
                        {{ formatIsk(item.total_value) }} ISK
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

/* Match text sizes with other components */
:deep(.text-sm) {
    font-size: 0.9rem;
    line-height: 1rem;
}

:deep(.text-xs) {
    font-size: 0.8rem;
    line-height: 1rem;
}

/* Responsive adjustments */
@media (max-width: 768px) {
    :deep(.text-sm) {
        font-size: 0.85rem;
    }

    :deep(.text-xs) {
        font-size: 0.75rem;
    }
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
