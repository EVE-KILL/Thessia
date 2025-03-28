<template>
  <div class="container mx-auto px-4 text-black dark:text-white">
    <ClientOnly>
      <!-- Item Header -->
      <div v-if="item" class="p-4 mb-4 rounded bg-background-800 bg-opacity-75">
        <h2 class="text-xl font-bold flex items-center">
          <NuxtLink :to="`/item/${item.type_id}`" class="mr-2">
            <Image
              type="item"
              :id="item.type_id"
              format="webp"
              :alt="getLocalizedString(item.name, currentLocale)"
              class="rounded w-16 h-16"
              size="64"
              :variant="item.name?.en?.includes('Blueprint') ? 'bp' : 'icon'"
            />
          </NuxtLink>
          {{ getLocalizedString(item.name, currentLocale) }}
        </h2>
        <div class="border-b border-background-600 mb-4">
          <ul class="flex space-x-4">
            <li class="text-primary-300">{{ $t('items.description') }}</li>
          </ul>
        </div>
        <div v-html="convertEveHtml(getLocalizedString(item.description, currentLocale))"></div>
      </div>

      <!-- Loading State -->
      <div v-else class="p-4 mb-4 rounded bg-background-800 bg-opacity-75">
        <div class="flex items-center">
          <USkeleton class="w-16 h-16 rounded mr-2" />
          <USkeleton class="h-8 w-64" />
        </div>
        <div class="border-b border-background-600 my-4">
          <USkeleton class="h-6 w-32 mb-4" />
        </div>
        <div class="space-y-2">
          <USkeleton class="h-4 w-full" />
          <USkeleton class="h-4 w-full" />
          <USkeleton class="h-4 w-3/4" />
        </div>
      </div>

      <!-- Content Sections -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div class="flex flex-col space-y-4">
          <!-- Key component with unique key based on route ID -->
          <ItemsKillList :item="item" :loading="loading" :key="`kills-${$route.params.id}`" />
        </div>
        <div class="flex flex-col space-y-4">
          <!-- Key component with unique key based on route ID -->
          <ItemsFittings :item="item" :loading="loading" :key="`fittings-${$route.params.id}`" />
          <!-- Key component with unique key based on route ID -->
          <ItemsPriceList :item="item" :loading="loading" :key="`prices-${$route.params.id}`" />
        </div>
      </div>

      <!-- Fallback for ClientOnly -->
      <template #fallback>
        <div class="p-4 mb-4 rounded bg-background-800 bg-opacity-75">
          <div class="flex items-center">
            <USkeleton class="w-16 h-16 rounded mr-2" />
            <USkeleton class="h-8 w-64" />
          </div>
          <div class="border-b border-background-600 my-4">
            <USkeleton class="h-6 w-32 mb-4" />
          </div>
          <div class="space-y-2">
            <USkeleton class="h-4 w-full" />
            <USkeleton class="h-4 w-full" />
            <USkeleton class="h-4 w-3/4" />
          </div>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div class="flex flex-col space-y-4">
            <div class="w-full p-4 rounded bg-background-800 bg-opacity-75">
              <h2 class="text-xl font-bold mb-4">{{ $t('items.latestKills') }}</h2>
              <div class="overflow-x-auto">
                <div class="w-full">
                  <div v-for="i in 5" :key="i" class="flex w-full p-2 mb-1">
                    <USkeleton class="h-16 w-full rounded" />
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div class="flex flex-col space-y-4">
            <div class="w-full p-4 rounded bg-background-800 bg-opacity-75">
              <h2 class="text-xl font-bold mb-4">{{ $t('items.topFittings') }}</h2>
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div v-for="i in 4" :key="i" class="border border-background-700 p-4 rounded-md">
                  <USkeleton class="w-full h-60" />
                </div>
              </div>
            </div>

            <div class="w-full p-4 rounded bg-background-800 bg-opacity-75">
              <h2 class="text-xl font-bold mb-4">{{ $t('items.marketPrices', { region: 'The Forge' }) }}</h2>
              <div class="overflow-x-auto">
                <div class="w-full">
                  <USkeleton class="h-8 w-full mb-2" />
                  <div v-for="i in 10" :key="i" class="mb-1">
                    <USkeleton class="h-6 w-full" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </template>
    </ClientOnly>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n';

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
watch(() => route.params.id, (newId) => {
  loading.value = true;
});

// Update SEO metadata
useSeoMeta({
  title: computed(() => item.value ?
    `${getLocalizedString(item.value.name, currentLocale)} | EVE-KILL` :
    'Item Details | EVE-KILL'),
  ogTitle: computed(() => item.value ?
    `${getLocalizedString(item.value.name, currentLocale)} | EVE-KILL` :
    'Item Details | EVE-KILL'),
  description: computed(() => item.value ?
    truncateText(stripHtml(getLocalizedString(item.value.description, currentLocale)), 160) :
    'EVE Online item details'),
  ogDescription: computed(() => item.value ?
    truncateText(stripHtml(getLocalizedString(item.value.description, currentLocale)), 160) :
    'EVE Online item details'),
  ogImage: computed(() => item.value ?
    `https://images.evetech.net/types/${item.value.type_id}/render?size=512` :
    ''),
  twitterCard: 'summary_large_image',
});

/**
 * Gets localized string from an object containing translations
 */
function getLocalizedString(obj: any, locale: string): string {
  if (!obj) return '';
  return obj[locale] || obj['en'] || '';
}

/**
 * Converts EVE HTML to properly rendered HTML
 */
function convertEveHtml(text: string): string {
  if (!text) return '';

  // Replace showinfo links with appropriate NuxtLinks
  return text.replace(/<a href=showinfo:(\d+)(?:\/\/(\d+))?>(.*?)<\/a>/g, (match, typeId, itemId, text) => {
    if (itemId) {
      return `<a href="/item/${itemId}" class="text-primary-400 hover:text-primary-300">${text}</a>`;
    } else {
      return `<a href="/item/${typeId}" class="text-primary-400 hover:text-primary-300">${text}</a>`;
    }
  });
}

/**
 * Strips HTML tags from text
 */
function stripHtml(html: string): string {
  if (!html) return '';
  return html.replace(/<\/?[^>]+(>|$)/g, '');
}

/**
 * Truncates text to specified length
 */
function truncateText(text: string, length: number): string {
  if (!text) return '';
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
</style>
