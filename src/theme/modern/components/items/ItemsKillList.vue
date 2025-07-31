<template>
    <div class="rounded bg-background-800 bg-opacity-75">
        <h2 class="text-xl font-bold">{{ $t('latestKills') }}</h2>

        <Table :columns="tableColumns" :items="killmails" :loading="isLoading" :skeleton-count="5"
            :empty-text="$t('noKills')" :link-fn="generateKillLink" :bordered="true" :striped="false" :hover="true"
            background="transparent" :error="error" :error-text="$t('common.errorLoading')">
            <!-- Ship column -->
            <template #cell-ship="{ item }">
                <div class="flex items-center">
                    <Image type="type-render" :id="item.victim.ship_id"
                        :alt="`Ship: ${getLocalizedString(item.victim.ship_name, currentLocale)}`"
                        class="rounded w-16 h-16 m-1" size="64" />
                </div>
            </template>

            <!-- Victim column -->
            <template #cell-victim="{ item }">
                <div class="flex items-center">
                    <!-- Character image -->
                    <div class="flex-shrink-0">
                        <Image type="character" :id="item.victim.character_id"
                            :alt="`Character: ${item.victim.character_name}`" class="rounded w-16 h-16 m-1" size="64" />
                    </div>

                    <!-- Corp/Alliance images stacked -->
                    <div class="flex flex-col mr-2">
                        <!-- Corporation -->
                        <Image type="corporation" :id="item.victim.corporation_id"
                            :alt="`Corporation: ${item.victim.corporation_name}`" class="rounded w-10 h-10 mb-1"
                            size="64" />

                        <!-- Alliance (if available) -->
                        <Image v-if="item.victim.alliance_id && item.victim.alliance_id > 0" type="alliance"
                            :id="item.victim.alliance_id" :alt="`Alliance: ${item.victim.alliance_name}`"
                            class="rounded w-10 h-10" size="64" />
                    </div>

                    <!-- Text information -->
                    <div class="flex flex-col">
                        <span class="text-primary-400">
                            <NuxtLink :to="`/character/${item.victim.character_id}`" @click.stop>
                                {{ item.victim.character_name }}
                            </NuxtLink>
                        </span>

                        <span class="text-primary-400">
                            <NuxtLink :to="`/corporation/${item.victim.corporation_id}`" @click.stop>
                                {{ item.victim.corporation_name }}
                            </NuxtLink>
                        </span>

                        <span v-if="item.victim.alliance_id && item.victim.alliance_id > 0" class="text-primary-400">
                            <NuxtLink :to="`/alliance/${item.victim.alliance_id}`" @click.stop>
                                {{ item.victim.alliance_name }}
                            </NuxtLink>
                        </span>
                    </div>
                </div>
            </template>

            <!-- Custom mobile row template -->
            <template #mobile-row="{ item }">
                <div class="flex items-center gap-3 w-full p-2">
                    <!-- Ship image -->
                    <Image type="type-render" :id="item.victim.ship_id"
                        :alt="`Ship: ${getLocalizedString(item.victim.ship_name, currentLocale)}`"
                        class="rounded w-14 h-14" size="64" />

                    <!-- Kill details -->
                    <div class="flex-grow">
                        <div class="font-medium truncate">
                            {{ item.victim.character_name || $t('unknown') }}
                        </div>
                        <div class="text-sm text-gray-400 truncate">
                            {{ item.victim.corporation_name || $t('unknown') }}
                        </div>
                        <div class="text-xs text-gray-500 truncate"
                            v-if="item.victim.alliance_id && item.victim.alliance_id > 0">
                            {{ item.victim.alliance_name }}
                        </div>
                    </div>

                    <!-- Date and system info -->
                    <div class="text-right text-xs">
                        <div>{{ formatDate(item.killmail_time) }}</div>
                        <div class="mt-1 flex items-center justify-end">
                            <span class="px-1.5 py-0.5 bg-background-600 rounded text-xs">
                                {{ (item.solar_system_name && getLocalizedString(item.solar_system_name, currentLocale))
                                    || '???' }}
                            </span>
                        </div>
                    </div>
                </div>
            </template>
        </Table>
    </div>
</template>

<script setup lang="ts">
import moment from "moment";
import { computed, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import { useRoute } from "vue-router";

const { t, locale } = useI18n();
const currentLocale = computed(() => locale.value);
const route = useRoute();

const props = defineProps({
    item: {
        type: Object,
        default: null,
    },
    loading: {
        type: Boolean,
        default: false,
    },
});

// State
const killmails = ref([]);
const isLoading = ref(true);
const error = ref(null);

// Fetch key based on item id to ensure proper cache invalidation
const fetchKey = computed(() => `item-killmails-${props.item?.type_id || "none"}-${Date.now()}`);

// Table configuration
const tableColumns = [
    {
        id: "ship",
        header: computed(() => t("ship")),
    },
    {
        id: "victim",
        header: computed(() => t("victim")),
    },
];

// Update the fetch and data handling
const {
    data,
    pending,
    error: fetchError,
    refresh
} = useAsyncData(
    fetchKey.value,
    async () => {
        if (!props.item?.type_id) {
            console.log('No type_id available for fetching killmails');
            return [];
        }

        try {
            const response = await $fetch(`/api/items/${props.item.type_id}/killmails?limit=20`);
            return response;
        } catch (err) {
            console.error("Error fetching killmail data:", err);
            error.value = err;
            return [];
        }
    },
    {
        watch: false, // Don't automatically watch
        server: false,
        immediate: false, // Changed to false, will trigger manually
    },
);

// Set error from fetch error
watch(fetchError, (newError) => {
    if (newError) {
        console.error("Fetch error in killmails:", newError);
        error.value = newError;
    }
});

// Update loading state whenever props.loading or pending changes
watch(
    [() => props.loading, pending],
    ([propsLoading, asyncPending]) => {
        isLoading.value = propsLoading || asyncPending;
    },
    { immediate: true },
);

// Watch for item changes and trigger the fetch
watch(
    () => props.item?.type_id,
    (newTypeId) => {
        if (newTypeId) {
            refresh();
        }
    },
    { immediate: true }
);

// Update kill list when data changes
watch(
    data,
    (newData) => {
        if (newData) {
            console.log(`Updating killmails with ${newData.length} items`);
            killmails.value = newData;
        }
    },
    { immediate: true },
);

// Handle route changes and ensure data refreshes
watch(
    () => route.params.id,
    () => {
        isLoading.value = true;
    },
    { immediate: true },
);

/**
 * Gets localized string from an object containing translations
 */
function getLocalizedString(obj: any, locale: string): string {
    if (!obj) return "";
    return obj[locale] || obj.en || "";
}

/**
 * Format date for display in mobile view
 */
function formatDate(dateString: string): string {
    const date = moment(dateString);
    return date.format('MM/DD HH:mm');
}

/**
 * Generate killmail link
 */
function generateKillLink(item: any): string {
    return `/kill/${item.killmail_id}`;
}
</script>

<style scoped>
:deep(.table-header) {
    background-color: light-dark(rgba(245, 245, 245, 0.05), rgba(26, 26, 26, 0.5)) !important;
    padding: 0.5rem 1rem !important;
}

:deep(.header-cell) {
    font-size: 0.75rem;
    color: light-dark(#4b5563, #9ca3af) !important;
}

/* Ensure there's room for the stacked corp/alliance images */
:deep(.body-cell) {
    height: auto;
    min-height: 4.5rem;
}

/* Fix nested links */
:deep(.text-primary-400 a) {
    position: relative;
    z-index: 2;
}
</style>
