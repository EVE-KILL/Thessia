<template>
    <div class="container mx-auto px-4 text-black dark:text-white">
        <!-- Item Header Section -->
        <div v-if="item" class="flex flex-col p-2 pt-4">
            <div
                class="rounded-t-lg overflow-hidden bg-gradient-to-b from-gray-100/90 to-gray-200/50 dark:from-gray-900/30 dark:to-gray-900/50 border border-gray-300 dark:border-gray-800">
                <div class="p-6">
                    <div class="flex flex-col lg:flex-row gap-6">
                        <!-- Left: Large Item Image -->
                        <div class="item-image-container flex-shrink-0">
                            <Image :type="itemStats?.isShip ? 'type-overlay-render' : 'item'" :id="item.type_id"
                                :alt="getLocalizedString(item.name, currentLocale)"
                                class="item-image rounded-lg shadow-lg" :size="itemStats?.isShip ? '256' : '256'"
                                :variant="item.name?.en?.includes('Blueprint') ? 'bp' : 'icon'" />
                        </div>

                        <!-- Center: Item Basic Info -->
                        <div class="flex-grow">
                            <div class="mb-4">
                                <div class="flex flex-wrap items-center gap-2 mb-3">
                                    <h1 class="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">
                                        {{ getLocalizedString(item.name, currentLocale) }}
                                    </h1>

                                    <!-- Item type badges -->
                                    <span v-if="item.meta_group_id"
                                        class="inline-flex items-center px-2 py-1 text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200 rounded-md">
                                        <UIcon name="i-lucide-star" class="w-3 h-3 mr-1" />
                                        {{ getMetaGroupName(item.meta_group_id) }}
                                    </span>
                                    <span v-if="item.published"
                                        class="inline-flex items-center px-2 py-1 text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 rounded-md">
                                        <UIcon name="i-lucide-check-circle" class="w-3 h-3 mr-1" />
                                        {{ $t('published') }}
                                    </span>
                                    <span v-if="item.faction_id"
                                        class="inline-flex items-center px-2 py-1 text-xs font-medium bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200 rounded-md">
                                        <UIcon name="i-lucide-shield" class="w-3 h-3 mr-1" />
                                        {{ $t('faction') }}
                                    </span>
                                    <span
                                        class="inline-flex items-center px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 rounded-md">
                                        <UIcon name="i-lucide-hash" class="w-3 h-3 mr-1" />
                                        ID: {{ item.type_id }}
                                    </span>
                                </div>
                            </div>

                            <!-- Item Description -->
                            <div class="space-y-2 text-sm text-gray-600 dark:text-gray-300">
                                <div class="prose prose-sm max-w-none"
                                    v-html="convertEveHtml(getLocalizedString(item.description, currentLocale))">
                                </div>
                            </div>
                        </div>

                        <!-- Right: Quick Stats -->
                        <div class="stats-container flex flex-col gap-3 min-w-[200px]">
                            <div
                                class="bg-gradient-to-br from-red-500/10 to-red-600/20 dark:from-red-500/20 dark:to-red-600/30 rounded-lg p-4 border border-red-200 dark:border-red-800">
                                <div class="text-center">
                                    <div
                                        class="text-xs text-red-600 dark:text-red-400 uppercase tracking-wider font-medium">
                                        {{ $t('recentKills') }}</div>
                                    <div class="text-2xl font-bold text-red-700 dark:text-red-300">{{
                                        itemStats?.summary?.recentKills || 0
                                    }}</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Stats Dashboard Section -->
            <div
                class="stats-dashboard p-6 bg-gradient-to-b from-gray-200/50 to-gray-100/50 dark:from-gray-900/50 dark:to-black/50 border-l border-r border-b border-gray-300 dark:border-gray-800 rounded-b-lg">
                <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <!-- Item Properties -->
                    <div class="stat-card">
                        <div class="stat-header">
                            <UIcon name="i-lucide-settings" class="stat-icon text-blue-500" />
                            <h3 class="stat-title text-gray-700 dark:text-gray-200">{{ $t('itemProperties') }}</h3>
                        </div>
                        <div class="stat-body">
                            <div v-for="attr in displayAttributes.slice(0, 4)" :key="attr.label" class="stat-row">
                                <div class="stat-label text-gray-600 dark:text-gray-400">{{ attr.label }}:</div>
                                <div class="stat-value" :class="attr.valueClass || 'text-gray-900 dark:text-gray-300'">
                                    {{ attr.value }}</div>
                            </div>
                        </div>
                    </div>

                    <!-- Market Activity -->
                    <div class="stat-card">
                        <div class="stat-header">
                            <UIcon name="i-lucide-trending-up" class="stat-icon text-green-500" />
                            <h3 class="stat-title text-gray-700 dark:text-gray-200">{{ $t('marketActivity') }}</h3>
                        </div>
                        <div class="stat-body">
                            <div class="stat-row">
                                <div class="stat-label text-gray-600 dark:text-gray-400">
                                    <UIcon name="i-lucide-map-pin" class="inline w-4 h-4 mr-1 text-blue-500" />
                                    {{ $t('jitaAvgPrice') }}:
                                </div>
                                <div class="stat-value text-gray-900 dark:text-gray-300">
                                    <span v-if="marketStats?.jitaPrice?.average">{{
                                        formatIsk(marketStats.jitaPrice.average) }}</span>
                                    <span v-else class="text-gray-500">N/A</span>
                                </div>
                            </div>
                            <div class="stat-row">
                                <div class="stat-label text-gray-600 dark:text-gray-400">
                                    <UIcon name="i-lucide-dollar-sign" class="inline w-4 h-4 mr-1 text-green-500" />
                                    {{ $t('cheapestInEve') }}:
                                </div>
                                <div class="stat-value text-gray-900 dark:text-gray-300">
                                    <span v-if="marketStats?.cheapestPrice?.average">
                                        {{ formatIsk(marketStats.cheapestPrice.average) }}
                                        <span v-if="marketStats.cheapestPrice.regionName"
                                            class="text-xs text-gray-500 dark:text-gray-400 ml-1">
                                            ({{ getLocalizedString(marketStats.cheapestPrice.regionName, currentLocale)
                                            }})
                                        </span>
                                    </span>
                                    <span v-else class="text-gray-500">N/A</span>
                                </div>
                            </div>
                            <div class="stat-row">
                                <div class="stat-label text-gray-600 dark:text-gray-400">
                                    <UIcon name="i-lucide-activity" class="inline w-4 h-4 mr-1 text-orange-500" />
                                    {{ $t('recentKills') }}:
                                </div>
                                <div class="stat-value text-gray-900 dark:text-gray-300">
                                    {{ recentKillsCount }} {{ $t('kills') }}
                                </div>
                            </div>
                            <div class="stat-row">
                                <div class="stat-label text-gray-600 dark:text-gray-400">
                                    <UIcon name="i-lucide-calendar" class="inline w-4 h-4 mr-1 text-purple-500" />
                                    {{ $t('allTimeKills') }}:
                                </div>
                                <div class="stat-value text-gray-900 dark:text-gray-300">
                                    {{ enhancedStats?.summary?.allTimeKills?.toLocaleString() || 0 }}
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Technical Details -->
                    <div class="stat-card">
                        <div class="stat-header">
                            <UIcon name="i-lucide-info" class="stat-icon text-purple-500" />
                            <h3 class="stat-title text-gray-700 dark:text-gray-200">{{ $t('technicalDetails') }}</h3>
                        </div>
                        <div class="stat-body">
                            <div class="stat-row">
                                <div class="stat-label text-gray-600 dark:text-gray-400">{{ $t('groupId') }}:</div>
                                <div class="stat-value text-gray-900 dark:text-gray-300">{{ item.group_id }}</div>
                            </div>
                            <div class="stat-row">
                                <div class="stat-label text-gray-600 dark:text-gray-400">{{ $t('categoryId') }}:</div>
                                <div class="stat-value text-gray-900 dark:text-gray-300">{{ item.category_id }}</div>
                            </div>
                            <div v-if="item.market_group_id" class="stat-row">
                                <div class="stat-label text-gray-600 dark:text-gray-400">{{ $t('marketGroup') }}:</div>
                                <div class="stat-value text-gray-900 dark:text-gray-300">{{ item.market_group_id }}
                                </div>
                            </div>
                            <div v-if="item.race_id" class="stat-row">
                                <div class="stat-label text-gray-600 dark:text-gray-400">{{ $t('race') }}:</div>
                                <div class="stat-value text-gray-900 dark:text-gray-300">{{ getRaceName(item.race_id) }}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Loading State -->
        <div v-else class="flex flex-col p-2 pt-4">
            <div
                class="rounded-t-lg overflow-hidden bg-gradient-to-b from-gray-100/90 to-gray-200/50 dark:from-gray-900/30 dark:to-gray-900/50 border border-gray-300 dark:border-gray-800">
                <div class="p-6">
                    <div class="flex flex-col lg:flex-row gap-6">
                        <!-- Left: Image Skeleton -->
                        <div class="item-image-container flex-shrink-0">
                            <USkeleton class="item-image rounded-lg" />
                        </div>

                        <!-- Center: Content Skeleton -->
                        <div class="flex-grow">
                            <div class="mb-4">
                                <div class="flex flex-wrap items-center gap-2 mb-3">
                                    <USkeleton class="h-8 w-64" />
                                    <USkeleton class="h-6 w-16 rounded" />
                                    <USkeleton class="h-6 w-20 rounded" />
                                </div>
                            </div>
                            <div class="space-y-2">
                                <USkeleton class="h-4 w-full" />
                                <USkeleton class="h-4 w-full" />
                                <USkeleton class="h-4 w-3/4" />
                            </div>
                        </div>

                        <!-- Right: Stats Skeleton -->
                        <div class="flex flex-col gap-3 min-w-[200px]">
                            <USkeleton class="h-20 rounded-lg" />
                            <USkeleton class="h-20 rounded-lg" />
                        </div>
                    </div>
                </div>
            </div>

            <!-- Stats Dashboard Skeleton -->
            <div
                class="stats-dashboard p-6 bg-gradient-to-b from-gray-200/50 to-gray-100/50 dark:from-gray-900/50 dark:to-black/50 border-l border-r border-b border-gray-300 dark:border-gray-800 rounded-b-lg">
                <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <USkeleton class="h-32 rounded-lg" />
                    <USkeleton class="h-32 rounded-lg" />
                    <USkeleton class="h-32 rounded-lg" />
                </div>
            </div>
        </div>

        <!-- Content Sections -->
        <div class="grid grid-cols-1 xl:grid-cols-7 gap-6 mt-6">
            <!-- Left Column: Kills and Activity - Reduced to 4/7 (57%) -->
            <div class="xl:col-span-4 flex flex-col space-y-6">
                <!-- Activity Chart -->
                <div v-if="killActivityData.length > 0"
                    class="rounded-lg overflow-hidden bg-gradient-to-b from-gray-100/90 to-gray-200/50 dark:from-gray-900/30 dark:to-gray-900/50 border border-gray-300 dark:border-gray-800 p-6">
                    <SimpleBarChart :data="killActivityData" :title="$t('killActivity')" :loading="loading" />
                </div>

                <!-- Kill list component - now with pre-fetched data -->
                <div
                    class="rounded-lg overflow-hidden bg-gradient-to-b from-gray-100/90 to-gray-200/50 dark:from-gray-900/30 dark:to-gray-900/50 border border-gray-300 dark:border-gray-800">
                    <ItemsKillList :item="item" :loading="loading" :killmails="killmails"
                        :key="`kills-${$route.params.id}`" />
                </div>
            </div>

            <!-- Right Column: Fittings and Prices - Increased to 3/7 (43%) -->
            <div class="xl:col-span-3 flex flex-col space-y-6">
                <!-- Fittings component - now fully async and client-side -->
                <div
                    class="rounded-lg overflow-hidden bg-gradient-to-b from-gray-100/90 to-gray-200/50 dark:from-gray-900/30 dark:to-gray-900/50 border border-gray-300 dark:border-gray-800">
                    <ItemsFittings :item="item" :key="`fittings-${$route.params.id}`" />
                </div>

                <!-- Price list component - now with pre-fetched data -->
                <div
                    class="rounded-lg overflow-hidden bg-gradient-to-b from-gray-100/90 to-gray-200/50 dark:from-gray-900/30 dark:to-gray-900/50 border border-gray-300 dark:border-gray-800">
                    <ItemsPriceList :item="item" :loading="loading" :prices="prices"
                        :key="`prices-${$route.params.id}`" />
                </div>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { useI18n } from "vue-i18n";

const { t, locale } = useI18n();
const currentLocale = computed(() => locale.value);
const route = useRoute();
const { id } = route.params;

// Fetch all item data in a single optimized request
const { data: itemSummary, pending } = await useFetch(
    () => `/api/items/${id}?killmailLimit=20&regionId=10000002&priceDays=30`,
    {
        key: () => `item-summary-${id}`,
        server: false, // Client-side only for user-triggered navigation
        default: () => null,
        watch: [() => route.params.id],
    },
);

// Fetch item statistics for enhanced data
const { data: itemStats, pending: statsPending } = await useFetch(
    () => `/api/stats/item/${id}?days=7`,
    {
        key: () => `item-stats-${id}`,
        server: false,
        default: () => null,
        watch: [() => route.params.id],
    },
);

// Fetch market statistics for the Market Activity section
const { data: marketStats, pending: marketPending } = await useFetch(
    () => `/api/stats/item/${id}/market`,
    {
        key: () => `item-market-stats-${id}`,
        server: false,
        default: () => null,
        watch: [() => route.params.id],
    },
);

// Extract individual data pieces from the summary
const item = computed(() => itemSummary.value?.item || null);
const killmails = computed(() => itemSummary.value?.killmails || []);
const prices = computed(() => itemSummary.value?.prices || []);

// Simplified loading state
const loading = computed(() => pending.value || statsPending.value || marketPending.value);

// Enhanced stats from the new API
const enhancedStats = computed(() => itemStats.value || null);

// Computed properties for enhanced display
const averagePrice = computed(() => {
    if (!prices.value || prices.value.length === 0) return null;
    const total = prices.value.reduce((sum, price) => sum + (price.average || 0), 0);
    return Math.round(total / prices.value.length);
});

// Use enhanced kill count from stats API if available
const recentKillsCount = computed(() => {
    return enhancedStats.value?.summary?.recentKills || killmails.value?.length || 0;
});

// Use enhanced value data
const totalValueDestroyed = computed(() => {
    return enhancedStats.value?.summary?.recentValueDestroyed || 0;
});

const displayAttributes = computed(() => {
    if (!item.value) return [];

    const attributes = [];

    // Mass
    if (item.value.mass) {
        attributes.push({
            label: t('mass'),
            value: `${formatNumber(item.value.mass)} kg`,
            valueClass: 'text-blue-400'
        });
    }

    // Volume
    if (item.value.volume) {
        attributes.push({
            label: t('volume'),
            value: `${formatNumber(item.value.volume)} m³`,
            valueClass: 'text-purple-400'
        });
    }

    // Capacity
    if (item.value.capacity) {
        attributes.push({
            label: t('capacity'),
            value: `${formatNumber(item.value.capacity)} m³`,
            valueClass: 'text-green-400'
        });
    }

    // Base Price
    if (item.value.base_price) {
        attributes.push({
            label: t('basePrice'),
            value: formatIsk(item.value.base_price),
            valueClass: 'text-yellow-400'
        });
    }

    // Packaged Volume
    if (item.value.packaged_volume && item.value.packaged_volume !== item.value.volume) {
        attributes.push({
            label: t('packagedVolume'),
            value: `${formatNumber(item.value.packaged_volume)} m³`,
            valueClass: 'text-cyan-400'
        });
    }

    // Portion Size
    if (item.value.portion_size && item.value.portion_size > 1) {
        attributes.push({
            label: t('portionSize'),
            value: formatNumber(item.value.portion_size),
            valueClass: 'text-orange-400'
        });
    }

    return attributes.slice(0, 6); // Limit to 6 attributes for clean display
});

// Kill activity chart data - use enhanced stats API data
const killActivityData = computed(() => {
    if (!enhancedStats.value?.activity?.daily) return [];

    return enhancedStats.value.activity.daily.map((day: any) => ({
        name: day.displayDate,
        value: day.count
    }));
});

// Check if this is a ship item for render variant
const isShipItem = computed(() => {
    if (!item.value) return false;
    // Ship category IDs in EVE Online
    const shipCategoryIds = [6]; // Ships category
    const shipGroupIds = [
        25, 26, 27, 28, 29, 30, 31, 237, 324, 358, 380, 381, 419, 420,
        463, 485, 513, 540, 541, 543, 547, 659, 830, 831, 832, 833, 834,
        883, 893, 894, 898, 900, 902, 906, 941, 963, 1022, 1201, 1202,
        1283, 1305, 1527, 1534, 1538, 1972, 2001, 4594,
    ];

    return shipCategoryIds.includes(item.value.category_id) ||
        shipGroupIds.includes(item.value.group_id);
});

// Update SEO metadata
useSeoMeta({
    title: computed(() =>
        item.value
            ? t('seo.item.title', { itemName: getLocalizedString(item.value.name, currentLocale.value) })
            : "Item Details | EVE-KILL",
    ),
    ogTitle: computed(() =>
        item.value
            ? t('seo.item.title', { itemName: getLocalizedString(item.value.name, currentLocale.value) })
            : "Item Details | EVE-KILL",
    ),
    description: computed(() =>
        item.value
            ? t('seo.item.description', { itemName: getLocalizedString(item.value.name, currentLocale.value) })
            : "EVE Online item details and market information",
    ),
    ogDescription: computed(() =>
        item.value
            ? t('seo.item.description', { itemName: getLocalizedString(item.value.name, currentLocale.value) })
            : "EVE Online item details and market information",
    ),
    ogImage: computed(() =>
        item.value
            ? `https://images.evetech.net/types/${item.value.type_id}/icon?size=512`
            : "/images/default-og.png",
    ),
    ogType: 'website',
    twitterCard: "summary_large_image",
    twitterTitle: computed(() =>
        item.value
            ? t('seo.item.title', { itemName: getLocalizedString(item.value.name, currentLocale.value) })
            : "Item Details | EVE-KILL",
    ),
    twitterDescription: computed(() =>
        item.value
            ? t('seo.item.description', { itemName: getLocalizedString(item.value.name, currentLocale.value) })
            : "EVE Online item details and market information",
    )
});

/**
 * Gets localized string from an object containing translations
 */
function getLocalizedString(obj: any, locale: string): string {
    if (!obj) return "";
    return obj[locale] || obj.en || "";
}

/**
 * Converts EVE HTML to properly rendered HTML
 */
function convertEveHtml(text: string): string {
    if (!text) return "";

    // Replace showinfo links with appropriate NuxtLinks
    return text.replace(
        /<a href=showinfo:(\d+)(?:\/\/(\d+))?>(.*?)<\/a>/g,
        (match, typeId, itemId, text) => {
            if (itemId) {
                return `<NuxtLink to="/item/${itemId}" class="text-primary-400 hover:text-primary-300">${text}</NuxtLink>`;
            }
            return `<NuxtLink to="/item/${typeId}" class="text-primary-400 hover:text-primary-300">${text}</NuxtLink>`;
        },
    );
}

/**
 * Formats numbers with proper thousands separators
 */
function formatNumber(num: number): string {
    return new Intl.NumberFormat().format(num);
}

/**
 * Gets meta group name from meta group ID
 */
function getMetaGroupName(metaGroupId: number): string {
    const metaGroups: Record<number, string> = {
        1: 'Tech I',
        2: 'Tech II',
        3: 'Storyline',
        4: 'Faction',
        5: 'Officer',
        6: 'Deadspace',
        14: 'Abyssal',
        15: 'Tech III',
        17: 'Structure'
    };
    return metaGroups[metaGroupId] || t('unknown');
}

/**
 * Gets race name from race ID
 */
function getRaceName(raceId: number): string {
    const races: Record<number, string> = {
        1: 'Caldari',
        2: 'Minmatar',
        4: 'Amarr',
        8: 'Gallente',
        16: 'Jove',
        128: 'ORE'
    };
    return races[raceId] || t('unknown');
}

/**
 * Strips HTML tags from text
 */
function stripHtml(html: string): string {
    if (!html) return "";
    return html.replace(/<\/?[^>]+(>|$)/g, "");
}

/**
 * Truncates text to specified length
 */
function truncateText(text: string, length: number): string {
    if (!text) return "";
    return text.length > length ? `${text.slice(0, length)}...` : text;
}
</script>

<style scoped>
/* Item image styling to match system dashboard */
.item-image-container {
    width: 256px;
    /* Max width for ships */
    height: 256px;
    /* Max height for ships */
    display: flex;
    align-items: center;
    justify-content: center;
}

/* Dynamic sizing for item images */
.item-image {
    object-fit: contain;
    /* Size will be controlled by the :size prop dynamically */
}

/* Stat card styles matching SystemDashboard pattern */
.stat-card {
    border-radius: 8px;
    border: 1px solid rgba(209, 213, 219, 0.5);
    padding: 16px;
    background: transparent;
}

@media (prefers-color-scheme: dark) {
    .stat-card {
        border-color: rgba(75, 85, 99, 0.3);
    }
}

.stat-header {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 12px;
    padding-bottom: 8px;
    border-bottom: 1px solid rgba(209, 213, 219, 0.5);
}

@media (prefers-color-scheme: dark) {
    .stat-header {
        border-color: rgba(75, 85, 99, 0.2);
    }
}

.stat-icon {
    width: 20px;
    height: 20px;
}

.stat-title {
    font-weight: 600;
    font-size: 0.95rem;
}

.stat-label {
    font-size: 0.85rem;
}

.stat-value {
    font-weight: 500;
    font-size: 0.95rem;
}

/* Style for stat rows to ensure horizontal alignment */
.stat-body {
    display: flex;
    flex-direction: column;
    gap: 8px;
}

.stat-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.stat-row.justify-center {
    justify-content: center;
}

/* Enhanced prose styling for item descriptions */
.prose {
    color: inherit;
}

.prose :deep(p) {
    margin-bottom: 0.5rem;
    line-height: 1.5;
}

.prose :deep(br) {
    margin-bottom: 0.25rem;
}

.prose :deep(a) {
    text-decoration: none;
}

.prose :deep(a:hover) {
    text-decoration: underline;
}

/* Responsive adjustments */
@media (max-width: 640px) {
    .item-image-container {
        width: 128px;
        /* Smaller on mobile regardless of type */
        height: 128px;
        align-self: center;
    }

    /* Items will be smaller on mobile, ships will scale down */
    .stats-container {
        min-width: unset;
    }

    .stats-container .flex-col {
        flex-direction: row;
    }
}

@media (max-width: 768px) {
    .md\:grid-cols-3 {
        grid-template-columns: 1fr;
    }

    .lg\:flex-row {
        flex-direction: column;
    }
}

@media (max-width: 1024px) {
    .xl\:col-span-2 {
        grid-column: span 1;
    }

    .xl\:col-span-3 {
        grid-column: span 1;
    }

    .xl\:col-span-4 {
        grid-column: span 1;
    }

    .xl\:grid-cols-5 {
        grid-template-columns: 1fr;
    }

    .xl\:grid-cols-7 {
        grid-template-columns: 1fr;
    }
}
</style>
