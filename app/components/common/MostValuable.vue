<script setup lang="ts">
import { computed } from "vue";

interface IMostValuableKill {
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

interface IMostValuableShip {
    ship_id: number;
    ship_name: string | Record<string, string>;
    total_value: number;
    count: number;
}

interface IMostValuableStructure {
    structure_id?: number;
    type_id: number;
    type_name: string | Record<string, string>;
    total_value: number;
    count: number;
    system_id?: number;
    system_name?: string;
}

const props = defineProps({
    title: { type: String, default: 'Most Valuable' },
    apiUrl: { type: String, required: true },
    limit: { type: Number, default: 7 },
    days: { type: Number, default: 7 },
});

const { t, locale } = useI18n();
const currentLocale = computed(() => locale.value);

// Tab management with i18n labels
const selectedTab = ref("kills");

// Computed tab items with proper i18n
const tabItems = computed(() => [
    {
        id: "kills",
        label: t("kills") || "Kills", // Fallback to English
        icon: "i-lucide-swords",
        slot: "kills"
    },
    {
        id: "ships",
        label: t("ships") || "Ships", // Fallback to English
        icon: "i-lucide-rocket",
        slot: "ships"
    },
    {
        id: "structures",
        label: t("structures") || "Structures", // Fallback to English
        icon: "i-lucide-building-2",
        slot: "structures"
    }
]);

// Query parameters for each tab
const killsQueryParams = computed(() => ({
    dataType: 'most_valuable_kills',
    limit: props.limit,
    days: props.days,
}));

const shipsQueryParams = computed(() => ({
    dataType: 'most_valuable_ships',
    limit: props.limit,
    days: props.days,
}));

const structuresQueryParams = computed(() => ({
    dataType: 'most_valuable_structures',
    limit: props.limit,
    days: props.days,
}));

// Fetch data for each tab
const {
    data: killsData,
    pending: killsPending,
    error: killsError,
} = useFetch<IMostValuableKill[]>(props.apiUrl, {
    query: killsQueryParams,
    key: `most-valuable-kills-${props.apiUrl}-${props.limit}-${props.days}`,
});

const {
    data: shipsData,
    pending: shipsPending,
    error: shipsError,
} = useFetch<IMostValuableShip[]>(props.apiUrl, {
    query: shipsQueryParams,
    key: `most-valuable-ships-${props.apiUrl}-${props.limit}-${props.days}`,
});

const {
    data: structuresData,
    pending: structuresPending,
    error: structuresError,
} = useFetch<IMostValuableStructure[]>(props.apiUrl, {
    query: structuresQueryParams,
    key: `most-valuable-structures-${props.apiUrl}-${props.limit}-${props.days}`,
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

const getShipName = (item: IMostValuableKill): string => {
    return getLocalizedString(item.victim.ship_name, currentLocale.value);
};

const getShipNameFromShip = (item: IMostValuableShip): string => {
    return getLocalizedString(item.ship_name, currentLocale.value);
};

const getStructureName = (item: IMostValuableStructure): string => {
    return getLocalizedString(item.type_name, currentLocale.value);
};

// Responsive design
const { isMobile } = useResponsive();

// Generate link functions for each tab
const generateKillLink = (item: IMostValuableKill): string | null => {
    if (!item || !item.killmail_id) return null;
    return `/kill/${item.killmail_id}`;
};

const generateShipLink = (item: IMostValuableShip): string | null => {
    if (!item || !item.ship_id) return null;
    return `/item/${item.ship_id}`;
};

const generateStructureLink = (item: IMostValuableStructure): string | null => {
    if (!item || !item.type_id) return null;
    return `/item/${item.type_id}`; // Structures use type_id like ships
};

// Display items limited by props.limit for each tab
const displayKills = computed(() => {
    return (killsData.value || []).slice(0, props.limit);
});

const displayShips = computed(() => {
    return (shipsData.value || []).slice(0, props.limit);
});

const displayStructures = computed(() => {
    return (structuresData.value || []).slice(0, props.limit);
});
//     return (structuresData.value || []).slice(0, props.limit);
// });

// Prioritize images in the viewport
const isPriorityImage = (index: number): boolean => {
    return index < 3; // First 3 images are prioritized for immediate loading
};
</script>

<template>
    <div class="pb-5">
        <!-- Header with title -->
        <div class="table-header topbox-header">
            <div class="title-text">{{ props.title }}</div>
        </div>

        <!-- Tabs Component -->
        <Tabs v-model="selectedTab" :items="tabItems" class="w-full">
            <!-- Kills Tab Content -->
            <template #kills>
                <div class="tab-content">
                    <!-- Display error message if no items and not loading -->
                    <div v-if="!killsPending && displayKills.length === 0"
                        class="p-4 text-center text-gray-500 dark:text-gray-400">
                        {{ t('noData') }}
                    </div>

                    <!-- Use our custom Table component with horizontal layout -->
                    <Table :columns="[]" :items="displayKills" :loading="killsPending" :skeleton-count="props.limit"
                        :empty-text="t('noData')" :empty-icon="'i-lucide-file-text'" horizontal
                        :horizontal-items-per-row="isMobile ? 2 : props.limit" :link-fn="generateKillLink"
                        background="transparent" hover>
                        <!-- Custom horizontal item template for kills -->
                        <template #horizontal-item="{ item, index }">
                            <div class="flex flex-col items-center p-2">
                                <Image type="type-render" :id="item.victim.ship_id" :alt="`Ship: ${getShipName(item)}`"
                                    class="rounded w-20 h-20 md:w-24 md:h-24 object-contain mb-2" size="128"
                                    :loading="index < 7 ? 'eager' : 'lazy'" :priority="isPriorityImage(index)" />
                                <div class="text-center text-xs mt-1 max-w-full truncate text-gray-900 dark:text-white">
                                    {{ getShipName(item) }}
                                </div>
                                <div class="text-center text-xs mt-1 text-gray-500 dark:text-background-300">
                                    {{ formatIsk(item.total_value) }} ISK
                                </div>
                                <!-- Show victim name if available -->
                                <div v-if="item.victim.character_name"
                                    class="text-center text-xs mt-1 text-gray-400 dark:text-background-400 truncate max-w-full">
                                    {{ item.victim.character_name }}
                                </div>
                            </div>
                        </template>

                        <!-- Custom horizontal skeleton for kills -->
                        <template #horizontal-skeleton>
                            <div class="horizontal-grid" :class="[`grid-cols-${isMobile ? 2 : props.limit}`]">
                                <div v-for="i in props.limit" :key="`skeleton-kills-${i}`" class="horizontal-item">
                                    <div class="flex flex-col items-center p-2">
                                        <div
                                            class="rounded w-20 h-20 md:w-24 md:h-24 bg-gray-200 dark:bg-gray-700 animate-pulse mb-2">
                                        </div>
                                        <div class="h-3 w-16 mt-1 bg-gray-200 dark:bg-gray-700 rounded animate-pulse">
                                        </div>
                                        <div class="h-3 w-12 mt-1 bg-gray-200 dark:bg-gray-700 rounded animate-pulse">
                                        </div>
                                        <div class="h-2 w-14 mt-1 bg-gray-200 dark:bg-gray-700 rounded animate-pulse">
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </template>
                    </Table>

                    <div v-if="killsError" class="text-center py-4 text-red-400">
                        {{ t('common.error') }}: {{ killsError.message }}
                    </div>
                </div>
            </template>

            <!-- Ships Tab Content -->
            <template #ships>
                <div class="tab-content">
                    <!-- Display error message if no items and not loading -->
                    <div v-if="!shipsPending && displayShips.length === 0"
                        class="p-4 text-center text-gray-500 dark:text-gray-400">
                        {{ t('noData') }}
                    </div>

                    <!-- Use our custom Table component with horizontal layout -->
                    <Table :columns="[]" :items="displayShips" :loading="shipsPending" :skeleton-count="props.limit"
                        :empty-text="t('noData')" :empty-icon="'i-lucide-rocket'" horizontal
                        :horizontal-items-per-row="isMobile ? 2 : props.limit" :link-fn="generateShipLink"
                        background="transparent" hover>
                        <!-- Custom horizontal item template for ships -->
                        <template #horizontal-item="{ item, index }">
                            <div class="flex flex-col items-center p-2">
                                <Image type="type-render" :id="item.ship_id" :alt="`Ship: ${getShipNameFromShip(item)}`"
                                    class="rounded w-20 h-20 md:w-24 md:h-24 object-contain mb-2" size="128"
                                    :loading="index < 7 ? 'eager' : 'lazy'" :priority="isPriorityImage(index)" />
                                <div class="text-center text-xs mt-1 max-w-full truncate text-gray-900 dark:text-white">
                                    {{ getShipNameFromShip(item) }}
                                </div>
                                <div class="text-center text-xs mt-1 text-gray-500 dark:text-background-300">
                                    {{ formatIsk(item.total_value) }} ISK
                                </div>
                                <div class="text-center text-xs mt-1 text-gray-400 dark:text-background-400">
                                    {{ item.count }} {{ item.count === 1 ? t('kill') : t('kills') }}
                                </div>
                            </div>
                        </template>

                        <!-- Custom horizontal skeleton for ships -->
                        <template #horizontal-skeleton>
                            <div class="horizontal-grid" :class="[`grid-cols-${isMobile ? 2 : props.limit}`]">
                                <div v-for="i in props.limit" :key="`skeleton-ships-${i}`" class="horizontal-item">
                                    <div class="flex flex-col items-center p-2">
                                        <div
                                            class="rounded w-20 h-20 md:w-24 md:h-24 bg-gray-200 dark:bg-gray-700 animate-pulse mb-2">
                                        </div>
                                        <div class="h-3 w-16 mt-1 bg-gray-200 dark:bg-gray-700 rounded animate-pulse">
                                        </div>
                                        <div class="h-3 w-12 mt-1 bg-gray-200 dark:bg-gray-700 rounded animate-pulse">
                                        </div>
                                        <div class="h-2 w-14 mt-1 bg-gray-200 dark:bg-gray-700 rounded animate-pulse">
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </template>
                    </Table>

                    <div v-if="shipsError" class="text-center py-4 text-red-400">
                        {{ t('common.error') }}: {{ shipsError.message }}
                    </div>
                </div>
            </template>

            <!-- Structures Tab Content -->
            <template #structures>
                <div class="tab-content">
                    <!-- Display error message if no items and not loading -->
                    <div v-if="!structuresPending && displayStructures.length === 0"
                        class="p-4 text-center text-gray-500 dark:text-gray-400">
                        {{ t('noData') }}
                    </div>

                    <!-- Use our custom Table component with horizontal layout -->
                    <Table :columns="[]" :items="displayStructures" :loading="structuresPending"
                        :skeleton-count="props.limit" :empty-text="t('noData')" :empty-icon="'i-lucide-building-2'"
                        horizontal :horizontal-items-per-row="isMobile ? 2 : props.limit"
                        :link-fn="generateStructureLink" background="transparent" hover>
                        <!-- Custom horizontal item template for structures -->
                        <template #horizontal-item="{ item, index }">
                            <div class="flex flex-col items-center p-2">
                                <Image type="type-render" :id="item.type_id"
                                    :alt="`Structure: ${getStructureName(item)}`"
                                    class="rounded w-20 h-20 md:w-24 md:h-24 object-contain mb-2" size="128"
                                    :loading="index < 7 ? 'eager' : 'lazy'" :priority="isPriorityImage(index)" />
                                <div class="text-center text-xs mt-1 max-w-full truncate text-gray-900 dark:text-white">
                                    {{ getStructureName(item) }}
                                </div>
                                <div class="text-center text-xs mt-1 text-gray-500 dark:text-background-300">
                                    {{ formatIsk(item.total_value) }} ISK
                                </div>
                                <div class="text-center text-xs mt-1 text-gray-400 dark:text-background-400">
                                    {{ item.count }} {{ item.count === 1 ? t('kill') : t('kills') }}
                                </div>
                                <!-- Show system name if available -->
                                <div v-if="item.system_name"
                                    class="text-center text-xs mt-1 text-gray-400 dark:text-background-400 truncate max-w-full">
                                    {{ item.system_name }}
                                </div>
                            </div>
                        </template>

                        <!-- Custom horizontal skeleton for structures -->
                        <template #horizontal-skeleton>
                            <div class="horizontal-grid" :class="[`grid-cols-${isMobile ? 2 : props.limit}`]">
                                <div v-for="i in props.limit" :key="`skeleton-structures-${i}`" class="horizontal-item">
                                    <div class="flex flex-col items-center p-2">
                                        <div
                                            class="rounded w-20 h-20 md:w-24 md:h-24 bg-gray-200 dark:bg-gray-700 animate-pulse mb-2">
                                        </div>
                                        <div class="h-3 w-16 mt-1 bg-gray-200 dark:bg-gray-700 rounded animate-pulse">
                                        </div>
                                        <div class="h-3 w-12 mt-1 bg-gray-200 dark:bg-gray-700 rounded animate-pulse">
                                        </div>
                                        <div class="h-2 w-14 mt-1 bg-gray-200 dark:bg-gray-700 rounded animate-pulse">
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </template>
                    </Table>

                    <div v-if="structuresError" class="text-center py-4 text-red-400">
                        {{ t('common.error') }}: {{ structuresError.message }}
                    </div>
                </div>
            </template>
        </Tabs>

        <!-- Time period indicator -->
        <div class="text-sm text-center text-background-300 py-1 rounded-br-lg rounded-bl-lg">
            ({{ props.days === 0 ? t('allTime') : t('killsOverLastXDays', { days: props.days }) }})
        </div>
    </div>
</template>

<style scoped>
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

/* Style for table header - match TopBox */
:deep(.topbox-header) {
    background-color: light-dark(rgba(245, 245, 245, 0.05), rgba(26, 26, 26, 0.5)) !important;
    padding: 0.5rem 1rem !important;
    border-bottom: none !important;
}

/* Style the title text itself */
:deep(.title-text) {
    width: 100%;
    text-align: center;
    font-size: 0.75rem;
    font-weight: 600;
    color: light-dark(#111827, white) !important;
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
