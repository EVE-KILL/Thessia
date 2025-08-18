<template>
    <div class="container mx-auto px-4 text-black dark:text-white">
        <!-- Item Header -->
        <div v-if="item" class="p-4 mb-4 rounded bg-background-800 bg-opacity-75">
            <h2 class="text-2xl font-bold">
                {{ getLocalizedString(item.name, currentLocale) }}
            </h2>
            <div class="flex flex-col sm:flex-row">
                <div class="mr-4 flex-shrink-0 sm:mb-0">
                    <NuxtLink :to="`/item/${item.type_id}`">
                        <Image type="item" :id="item.type_id" :alt="getLocalizedString(item.name, currentLocale)"
                            class="rounded w-16 h-16" size="64"
                            :variant="item.name?.en?.includes('Blueprint') ? 'bp' : 'icon'" />
                    </NuxtLink>
                </div>
                <div v-html="convertEveHtml(getLocalizedString(item.description, currentLocale))"></div>
            </div>
        </div>

        <!-- Loading State -->
        <div v-else class="p-4 mb-4 rounded bg-background-800 bg-opacity-75">
            <div class="flex items-center">
                <USkeleton class="h-8 w-64" />
            </div>
            <div class="border-b border-background-600 my-4">
                <USkeleton class="h-6 w-32" />
            </div>
            <div class="flex">
                <USkeleton class="w-16 h-16 rounded mr-4 flex-shrink-0" />
                <div class="space-y-2 flex-grow">
                    <USkeleton class="h-4 w-full" />
                    <USkeleton class="h-4 w-full" />
                    <USkeleton class="h-4 w-3/4" />
                </div>
            </div>
        </div>

        <!-- Content Sections -->
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div class="flex flex-col space-y-4">
                <!-- Kill list component - now with pre-fetched data -->
                <div class="p-4">
                    <ItemsKillList :item="item" :loading="loading" :killmails="killmails"
                        :key="`kills-${$route.params.id}`" />
                </div>
            </div>
            <div class="flex flex-col space-y-4">
                <!-- Fittings component - still uses its own API call since it's complex -->
                <div class="p-4">
                    <ItemsFittings :item="item" :loading="loading" :key="`fittings-${$route.params.id}`" />
                </div>
                <!-- Price list component - now with pre-fetched data -->
                <div class="p-4">
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

// Extract individual data pieces from the summary
const item = computed(() => itemSummary.value?.item || null);
const killmails = computed(() => itemSummary.value?.killmails || []);
const prices = computed(() => itemSummary.value?.prices || []);

// Simplified loading state
const loading = computed(() => pending.value);

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
:deep(a) {
    text-decoration: none;
}

:deep(a:hover) {
    text-decoration: underline;
}

/* Make item description responsive */
.flex-col {
    word-break: break-word;
}

/* Ensure KillList is properly displayed on mobile */
.item-kills-list {
    width: 100%;
}

/* Make sure tables don't overflow on mobile */
:deep(table) {
    width: 100%;
    table-layout: fixed;
}

/* Image responsiveness */
@media (max-width: 640px) {
    .flex-col>.mr-4 {
        margin-right: 0;
        margin-bottom: 1rem;
        display: flex;
        justify-content: center;
    }
}
</style>
