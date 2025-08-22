<template>
    <div class="rounded bg-background-800 bg-opacity-75">
        <h2 class="text-xl font-bold">{{ $t('latestKills') }}</h2>

        <Table :columns="tableColumns" :items="killmails" :loading="loading" :skeleton-count="5"
            :empty-text="$t('noKills')" :link-fn="generateKillLink" :bordered="true" :striped="false" :hover="true"
            background="transparent">
            <!-- Ship column -->
            <template #cell-ship="{ item }">
                <div class="flex items-center">
                    <Image type="type-overlay-render" :id="item.victim.ship_id"
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
        </Table>
    </div>
</template>

<script setup lang="ts">
import { useI18n } from "vue-i18n";

const { t, locale } = useI18n();
const currentLocale = computed(() => locale.value);

const props = defineProps({
    killmails: {
        type: Array,
        default: () => [],
    },
    loading: {
        type: Boolean,
        default: false,
    },
});

// Table configuration
const tableColumns = [
    {
        id: "ship",
        header: () => t("ship"),
    },
    {
        id: "victim",
        header: () => t("victim"),
    },
];

/**
 * Gets localized string from an object containing translations
 */
function getLocalizedString(obj: any, locale: string): string {
    if (!obj) return "";
    return obj[locale] || obj.en || "";
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
