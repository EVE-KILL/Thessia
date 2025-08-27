<template>
    <div class="rounded bg-background-800 bg-opacity-75 p-6">
        <h2 class="text-xl font-bold mb-4">{{ $t('latestKills') }}</h2>

        <Table :columns="tableColumns" :items="killmails" :loading="loading" :skeleton-count="5"
            :empty-text="$t('noKills')" :link-fn="generateKillLink" :bordered="true" :striped="false" :hover="true"
            background="transparent">
            <!-- Ship column -->
            <template #cell-ship="{ item }">
                <div class="flex items-center py-2">
                    <Image type="type-overlay-render" :id="item.victim.ship_id"
                        :alt="`Ship: ${getLocalizedString(item.victim.ship_name, currentLocale)}`"
                        class="rounded w-12 h-12 mr-3" size="64" />
                    <div class="flex flex-col min-w-0 flex-1">
                        <span class="text-sm font-medium text-black dark:text-white truncate">
                            {{ getLocalizedString(item.victim.ship_name, currentLocale) }}
                        </span>
                        <span class="text-xs text-gray-500 dark:text-gray-400 truncate">
                            {{ getLocalizedString(item.victim.ship_group_name || {}, currentLocale) }}
                        </span>
                        <span v-if="item.total_value && item.total_value > 50000"
                            class="text-xs font-semibold text-yellow-400">
                            {{ formatIsk(item.total_value) }}
                        </span>
                    </div>
                </div>
            </template>

            <!-- Victim column -->
            <template #cell-victim="{ item }">
                <div class="flex items-center py-2">
                    <!-- Character image -->
                    <div class="flex-shrink-0">
                        <Image type="character" :id="item.victim.character_id || 1"
                            :alt="`Character: ${item.victim.character_name}`" class="rounded w-10 h-10 mr-2"
                            size="64" />
                    </div>

                    <!-- Text information -->
                    <div class="flex flex-col min-w-0 flex-1">
                        <span class="text-sm font-medium text-primary-400 truncate">
                            <NuxtLink :to="`/character/${item.victim.character_id}`" @click.stop>
                                {{ item.victim.character_name }}
                            </NuxtLink>
                        </span>

                        <span class="text-xs text-gray-600 dark:text-gray-400 truncate">
                            <NuxtLink :to="`/corporation/${item.victim.corporation_id}`" @click.stop>
                                {{ item.victim.corporation_name }}
                            </NuxtLink>
                        </span>

                        <span v-if="item.victim.alliance_id && item.victim.alliance_id > 0"
                            class="text-xs text-gray-500 dark:text-gray-500 truncate">
                            <NuxtLink :to="`/alliance/${item.victim.alliance_id}`" @click.stop>
                                {{ item.victim.alliance_name }}
                            </NuxtLink>
                        </span>
                        <span v-else-if="item.victim.faction_name"
                            class="text-xs text-gray-500 dark:text-gray-500 truncate">
                            {{ item.victim.faction_name }}
                        </span>
                    </div>
                </div>
            </template>

            <!-- Final Blow column -->
            <template #cell-finalBlow="{ item }">
                <div class="flex items-center py-2">
                    <Image :type="item.finalblow?.character_id > 0 ? 'character' : 'character'"
                        :id="item.finalblow?.character_id || 1"
                        :alt="`Final Blow: ${item.finalblow?.character_name || 'NPC/Structure'}`"
                        class="rounded w-8 h-8 mr-2" size="64" />
                    <div class="flex flex-col min-w-0 flex-1">
                        <span class="text-sm font-medium text-red-400 truncate">
                            {{ item.finalblow?.character_name || item.finalblow?.faction_name || 'Unknown' }}
                        </span>
                        <span v-if="item.finalblow?.corporation_name"
                            class="text-xs text-gray-600 dark:text-gray-400 truncate">
                            {{ item.finalblow.corporation_name }}
                        </span>
                    </div>
                </div>
            </template>

            <!-- Location & Time column -->
            <template #cell-details="{ item }">
                <div class="flex flex-col items-end py-2 min-w-0">
                    <!-- System name -->
                    <span class="text-sm font-medium text-blue-400 truncate max-w-full">
                        <NuxtLink :to="`/system/${item.system_id}`" @click.stop>
                            {{ item.system_name }}
                        </NuxtLink>
                    </span>
                    <!-- Region name -->
                    <span class="text-xs text-gray-500 dark:text-gray-400 truncate max-w-full">
                        {{ getLocalizedString(item.region_name, currentLocale) }}
                    </span>
                    <!-- Time ago -->
                    <span class="text-xs text-gray-600 dark:text-gray-400">
                        {{ formatTimeAgo(item.kill_time) }}
                    </span>
                </div>
            </template>
        </Table>
    </div>
</template>

<script setup lang="ts">
import { useI18n } from "vue-i18n";

const { t, locale } = useI18n();
const currentLocale = computed(() => locale.value);

// Use the centralized date formatting composable
const { formatTimeAgo } = useDateFormatting();

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

// Enhanced table configuration optimized for limited space
const tableColumns = [
    {
        id: "ship",
        header: () => t("ship"),
        width: "30%", // Reduced from 35% to give more space
    },
    {
        id: "victim",
        header: () => t("victim"),
        width: "30%", // Keep the same
    },
    {
        id: "finalBlow",
        header: () => t("finalBlow"),
        width: "25%", // Increased from 20%
    },
    {
        id: "details",
        header: () => t("location"),
        headerClass: "text-right",
        width: "15%", // Keep the same
    },
];/**
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
    font-weight: 600;
}

:deep(.header-cell) {
    font-size: 0.75rem;
    color: light-dark(#4b5563, #9ca3af) !important;
}

/* Compact row height for dense information */
:deep(.body-cell) {
    height: auto;
    min-height: 3.5rem;
    vertical-align: middle;
}

/* Alternating row colors for better visual separation */
:deep(.table-row:nth-child(odd)),
:deep(div.table-row:nth-child(odd)) {
    background-color: rgba(59, 130, 246, 0.08) !important;
}

:global(.dark) :deep(.table-row:nth-child(odd)),
:global(.dark) :deep(div.table-row:nth-child(odd)) {
    background-color: rgba(59, 130, 246, 0.12) !important;
}

/* Regular rows (even rows) - light background for better separation */
:deep(.table-row:nth-child(even)),
:deep(div.table-row:nth-child(even)) {
    background-color: rgba(0, 0, 0, 0.04) !important;
}

:global(.dark) :deep(.table-row:nth-child(even)),
:global(.dark) :deep(div.table-row:nth-child(even)) {
    background-color: rgba(255, 255, 255, 0.04) !important;
}

/* Hover states for alternating rows */
:deep(.table-row:nth-child(odd):hover),
:deep(div.table-row:nth-child(odd):hover) {
    background-color: rgba(255, 255, 255, 0.15) !important;
}

:global(.dark) :deep(.table-row:nth-child(odd):hover),
:global(.dark) :deep(div.table-row:nth-child(odd):hover) {
    background-color: rgba(255, 255, 255, 0.15) !important;
}

/* Hover states for regular rows */
:deep(.table-row:nth-child(even):hover),
:deep(div.table-row:nth-child(even):hover) {
    background-color: rgba(255, 255, 255, 0.15) !important;
}

:global(.dark) :deep(.table-row:nth-child(even):hover),
:global(.dark) :deep(div.table-row:nth-child(even):hover) {
    background-color: rgba(255, 255, 255, 0.15) !important;
}

/* Fix nested links */
:deep(.text-primary-400 a),
:deep(.text-red-400 a),
:deep(.text-blue-400 a) {
    position: relative;
    z-index: 2;
    text-decoration: none;
}

:deep(.text-primary-400 a:hover),
:deep(.text-red-400 a:hover),
:deep(.text-blue-400 a:hover) {
    text-decoration: underline;
}

/* Ensure proper text truncation */
.truncate {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

/* Make sure images don't interfere with text layout */
.flex-shrink-0 {
    flex-shrink: 0;
}

.min-w-0 {
    min-width: 0;
}

/* Better spacing for compact design */
.py-2 {
    padding-top: 0.5rem;
    padding-bottom: 0.5rem;
}
</style>
