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

            <!-- Mobile Killmail Cards -->
            <template #mobile-content="{ item }">
                <NuxtLink :to="generateKillLink(item)" class="killmail-mobile-card">
                    <!-- Header Section -->
                    <div class="killmail-header">
                        <div class="killmail-ship-section">
                            <div class="killmail-ship-image">
                                <Image type="type-overlay-render" :id="item.victim.ship_id"
                                    :alt="`Ship: ${getLocalizedString(item.victim.ship_name, currentLocale)}`"
                                    class="rounded w-12 h-12" size="64" />
                            </div>
                            <div class="killmail-ship-info">
                                <div class="killmail-ship-name">{{ getLocalizedString(item.victim.ship_name,
                                    currentLocale) }}</div>
                                <div class="killmail-ship-group">{{ getLocalizedString(item.victim.ship_group_name ||
                                    {}, currentLocale) }}</div>
                            </div>
                        </div>
                        <div class="killmail-value-section">
                            <div v-if="item.total_value && item.total_value > 50000" class="killmail-value-amount">
                                {{ formatIsk(item.total_value) }}
                            </div>
                            <div class="killmail-value-label">{{ t('value', 'Value') }}</div>
                        </div>
                    </div>

                    <!-- VS Section -->
                    <div class="killmail-vs-section">
                        <!-- Victim -->
                        <div class="killmail-victim">
                            <div class="killmail-victim-header">{{ t('victim', 'Victim') }}</div>
                            <div class="killmail-entity-content">
                                <div class="killmail-entity-info">
                                    <div class="killmail-entity-name">{{ item.victim.character_name }}</div>
                                    <div class="killmail-entity-corp">{{ item.victim.corporation_name }}</div>
                                    <div v-if="item.victim.alliance_id && item.victim.alliance_id > 0"
                                        class="killmail-entity-alliance">
                                        {{ item.victim.alliance_name }}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- VS Divider -->
                        <div class="killmail-vs-divider">
                            <div class="killmail-vs-circle">
                                <span class="killmail-vs-text">VS</span>
                            </div>
                        </div>

                        <!-- Final Blow -->
                        <div class="killmail-attacker">
                            <div class="killmail-attacker-header">{{ t('finalBlow', 'Final Blow') }}</div>
                            <div class="killmail-entity-content">
                                <div class="killmail-entity-info">
                                    <div class="killmail-entity-name">{{ item.finalblow?.character_name ||
                                        item.finalblow?.faction_name || 'Unknown' }}</div>
                                    <div v-if="item.finalblow?.corporation_name" class="killmail-entity-corp">
                                        {{ item.finalblow.corporation_name }}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Footer Section -->
                    <div class="killmail-footer">
                        <div class="killmail-location">
                            <UIcon name="lucide:map-pin" class="w-4 h-4 text-blue-400" />
                            <span>{{ item.system_name }} ({{ getLocalizedString(item.region_name, currentLocale)
                                }})</span>
                        </div>
                        <div class="killmail-time">
                            <UIcon name="lucide:clock" class="w-4 h-4 text-gray-400" />
                            <span>{{ formatTimeAgo(item.kill_time) }}</span>
                        </div>
                    </div>
                </NuxtLink>
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
/* Killmail Mobile Cards */
.killmail-mobile-card {
    display: block;
    background: linear-gradient(135deg, rgba(31, 31, 31, 0.6), rgba(45, 45, 45, 0.4));
    border: 1px solid rgba(75, 85, 99, 0.2);
    border-radius: 0.75rem;
    padding: 1rem;
    cursor: pointer;
    transition: all 0.3s ease;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    margin-bottom: 0.75rem;
    text-decoration: none;
    color: inherit;
}

.killmail-mobile-card:hover {
    border-color: rgba(59, 130, 246, 0.4);
    box-shadow: 0 8px 25px rgba(59, 130, 246, 0.15);
    transform: translateY(-2px);
    text-decoration: none;
    color: inherit;
}

/* Header Section */
.killmail-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 1rem;
    padding-bottom: 0.75rem;
    border-bottom: 1px solid rgba(75, 85, 99, 0.2);
}

.killmail-ship-section {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    flex: 1;
}

.killmail-ship-info {
    flex: 1;
    min-width: 0;
}

.killmail-ship-name {
    font-weight: 600;
    color: #e5e7eb;
    font-size: 0.95rem;
    margin-bottom: 0.25rem;
    word-break: break-word;
}

.killmail-ship-group {
    font-size: 0.8rem;
    color: #9ca3af;
}

.killmail-value-section {
    text-align: right;
    flex-shrink: 0;
}

.killmail-value-amount {
    font-weight: 700;
    font-size: 1rem;
    color: #fbbf24;
    margin-bottom: 0.25rem;
}

.killmail-value-label {
    font-size: 0.75rem;
    color: #6b7280;
    font-weight: 500;
}

/* VS Section */
.killmail-vs-section {
    display: grid;
    grid-template-columns: 1fr auto 1fr;
    gap: 1rem;
    align-items: center;
    margin-bottom: 1rem;
}

.killmail-victim,
.killmail-attacker {
    display: flex;
    flex-direction: column;
}

.killmail-victim-header,
.killmail-attacker-header {
    font-size: 0.7rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: #6b7280;
    margin-bottom: 0.5rem;
    text-align: center;
}

.killmail-victim-header {
    color: #ef4444;
}

.killmail-attacker-header {
    color: #10b981;
}

.killmail-entity-content {
    display: flex;
    align-items: center;
    justify-content: center;
}

.killmail-victim .killmail-entity-content {
    justify-content: flex-start;
}

.killmail-attacker .killmail-entity-content {
    justify-content: flex-end;
}

.killmail-entity-info {
    flex: 1;
    min-width: 0;
}

.killmail-victim .killmail-entity-info {
    text-align: left;
}

.killmail-attacker .killmail-entity-info {
    text-align: right;
}

.killmail-entity-name {
    font-weight: 600;
    font-size: 0.85rem;
    color: #e5e7eb;
    margin-bottom: 0.125rem;
    word-break: break-word;
    line-height: 1.2;
}

.killmail-entity-corp {
    font-size: 0.75rem;
    color: #9ca3af;
    margin-bottom: 0.125rem;
    word-break: break-word;
}

.killmail-entity-alliance {
    font-size: 0.7rem;
    color: #6b7280;
    word-break: break-word;
}

/* VS Divider */
.killmail-vs-divider {
    display: flex;
    justify-content: center;
    align-items: center;
}

.killmail-vs-circle {
    width: 32px;
    height: 32px;
    background: linear-gradient(135deg, #ef4444, #dc2626);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    border: 1px solid rgba(239, 68, 68, 0.2);
    box-shadow: 0 0 8px rgba(239, 68, 68, 0.2);
}

.killmail-vs-text {
    font-size: 0.7rem;
    font-weight: 800;
    color: white;
    letter-spacing: 0.1em;
}

/* Footer Section */
.killmail-footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 1rem;
    background: rgba(31, 31, 31, 0.2);
    border-radius: 0.5rem;
    padding: 0.5rem 0.75rem;
    font-size: 0.8rem;
}

.killmail-location,
.killmail-time {
    display: flex;
    align-items: center;
    gap: 0.375rem;
    color: #9ca3af;
}

.killmail-location {
    flex: 1;
    min-width: 0;
}

.killmail-location span {
    word-break: break-word;
}

.killmail-time {
    flex-shrink: 0;
}

/* Responsive adjustments */
@media (max-width: 400px) {
    .killmail-mobile-card {
        padding: 0.75rem;
    }

    .killmail-vs-section {
        gap: 0.75rem;
    }

    .killmail-vs-circle {
        width: 28px;
        height: 28px;
    }

    .killmail-vs-text {
        font-size: 0.65rem;
    }

    .killmail-footer {
        flex-direction: column;
        gap: 0.5rem;
        align-items: flex-start;
    }

    .killmail-time {
        align-self: flex-end;
    }
}

/* Existing styles */
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
