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
                        <Image type="item" :id="item.type_id" format="webp"
                            :alt="getLocalizedString(item.name, currentLocale)" class="rounded w-16 h-16" size="64"
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
                <!-- Kill list component - now with proper padding -->
                <div class="p-4">
                    <ItemsKillList :item="item" :loading="loading" :key="`kills-${$route.params.id}`" />
                </div>
            </div>
            <div class="flex flex-col space-y-4">
                <!-- Fittings component - now with proper padding -->
                <div class="p-4">
                    <ItemsFittings :item="item" :loading="loading" :key="`fittings-${$route.params.id}`" />
                </div>
                <!-- Price list component - now with proper padding -->
                <div class="p-4">
                    <ItemsPriceList :item="item" :loading="loading" :key="`prices-${$route.params.id}`" />
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
const loading = ref(true);

// Generate a dynamic fetch key that changes with each route ID change
const fetchKey = computed(() => `item-${id}-${Date.now()}`);

// Fetch item data with improved caching strategy
const { data: item, pending } = useFetch(`/api/items/${id}`, {
    initialCache: false, // Don't use initial cache
    key: fetchKey.value, // Use dynamic key to ensure proper cache invalidation
    watch: [() => route.params.id], // Watch for route parameter changes
});

// Set loading state based on pending status
watch(pending, (newPending) => {
    loading.value = newPending;
});

// Watch for route changes to reset state
watch(
    () => route.params.id,
    (newId) => {
        loading.value = true;
    },
);

// Update SEO metadata
useSeoMeta({
    title: computed(() =>
        item.value
            ? `${getLocalizedString(item.value.name, currentLocale)} | EVE-KILL`
            : "Item Details | EVE-KILL",
    ),
    ogTitle: computed(() =>
        item.value
            ? `${getLocalizedString(item.value.name, currentLocale)} | EVE-KILL`
            : "Item Details | EVE-KILL",
    ),
    description: computed(() =>
        item.value
            ? truncateText(stripHtml(getLocalizedString(item.value.description, currentLocale)), 160)
            : "EVE Online item details",
    ),
    ogDescription: computed(() =>
        item.value
            ? truncateText(stripHtml(getLocalizedString(item.value.description, currentLocale)), 160)
            : "EVE Online item details",
    ),
    ogImage: computed(() =>
        item.value ? `https://images.evetech.net/types/${item.value.type_id}/render?size=512` : "",
    ),
    twitterCard: "summary_large_image",
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
