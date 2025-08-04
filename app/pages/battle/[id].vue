<template>
    <div class="p-4 rounded-lg shadow-lg text-black dark:text-white">
        <!-- Loading state - Show when data is being fetched OR processed -->
        <div v-if="pending" class="flex flex-col items-center justify-center py-12">
            <UIcon name="lucide:loader" class="w-12 h-12 animate-spin text-primary mb-4" />
            <span class="text-xl font-medium">{{ t('battle.loading') }}</span>
        </div>

        <!-- Error state -->
        <div v-else-if="error || isInvalidId" class="flex flex-col items-center justify-center py-12">
            <UIcon name="lucide:alert-circle" class="w-12 h-12 text-red-500 mb-4" />
            <span class="text-xl font-medium mb-2">
                {{ isInvalidId ? t('battle.invalid_id') : t('battle.error_loading') }}
            </span>
            <p class="text-gray-400 text-center max-w-md">
                {{ isInvalidId
                    ? t('battle.invalid_id_message', { id: battleId })
                    : (error?.message || t('battle.unknown_error'))
                }}
            </p>
            <div class="flex gap-4 mt-4">
                <UButton to="/battles" icon="lucide:list">
                    {{ t('battle.back_to_battles') }}
                </UButton>
                <UButton v-if="!isInvalidId" icon="lucide:refresh-cw" @click="refreshData">
                    {{ t('refresh') }}
                </UButton>
            </div>
        </div>

        <!-- Battle not found -->
        <div v-else-if="!battle" class="flex flex-col items-center justify-center py-12">
            <UIcon name="lucide:alert-circle" class="w-12 h-12 text-red-500 mb-4" />
            <span class="text-xl font-medium">{{ t('battle.no_battle_found_custom') }}</span>
            <UButton class="mt-4" to="/battles" icon="lucide:list">
                {{ t('battle.back_to_battles') }}
            </UButton>
        </div>

        <!-- Battle content -->
        <div v-else>
            <!-- Top Info Box -->
            <div class="battle-topbox">
                <!-- System Information Header -->
                <div class="battle-header">
                    <div class="system-info">
                        <UIcon name="lucide:map-pin" class="system-icon" />
                        <div class="system-text">
                            <div class="text-xl font-bold">
                                {{ t('battle.in_system') }}:
                                <template v-if="battle.systems && battle.systems.length > 0">
                                    <div class="systems-container">
                                        <template v-for="(system, index) in groupSystemsByRegion()" :key="index">
                                            <div class="system-region-group">
                                                <span class="text-blue-500">{{ system.systems.join(', ') }}</span>
                                                <span class="region-name">
                                                    ({{ getLocalizedString(system.regionName, locale) }})
                                                </span>
                                            </div>
                                        </template>
                                    </div>
                                </template>
                                <template v-else>
                                    <span class="text-blue-500">
                                        {{ battle.system_name || t('battle.unknown_system') }}
                                    </span>
                                    <span class="security-badge">
                                        {{ battle.system_security ? battle.system_security.toFixed(2) : 'N/A' }}
                                    </span>
                                    <span class="region-name">
                                        ({{ getLocalizedString(battle.region_name, locale) }})
                                    </span>
                                </template>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Battle Stats Grid -->
                <div class="battle-stats-grid">
                    <!-- Time Information -->
                    <div class="stat-group">
                        <h3 class="stat-group-title">{{ t('battle.time') }}</h3>
                        <div class="stat-item">
                            <div class="stat-label">
                                <UIcon name="lucide:clock" class="stat-icon" />
                                {{ t('battle.start_time') }}:
                            </div>
                            <div class="stat-value">{{ formatDate(battle.start_time) }}</div>
                        </div>
                        <div class="stat-item">
                            <div class="stat-label">
                                <UIcon name="lucide:clock" class="stat-icon" />
                                {{ t('battle.end_time') }}:
                            </div>
                            <div class="stat-value">{{ formatDate(battle.end_time) }}</div>
                        </div>
                        <div class="stat-item">
                            <div class="stat-label">
                                <UIcon name="lucide:timer" class="stat-icon" />
                                {{ t('battle.duration') }}:
                            </div>
                            <div class="stat-value">{{ formatDuration(battle.start_time, battle.end_time) }}</div>
                        </div>
                    </div>

                    <!-- Battle Metrics -->
                    <div class="stat-group">
                        <h3 class="stat-group-title">{{ t('stats') }}</h3>
                        <div class="stat-item">
                            <div class="stat-label">
                                <UIcon name="lucide:coins" class="stat-icon text-yellow-500" />
                                {{ t('battle.isk_lost') }}:
                            </div>
                            <div class="stat-value">{{ formatIsk(battle.battleSummary.totalIskLost) }} ISK</div>
                        </div>
                        <div class="stat-item">
                            <div class="stat-label">
                                <UIcon name="lucide:ship" class="stat-icon" />
                                {{ t('battle.ships_lost') }}:
                            </div>
                            <div class="stat-value">{{ battle.battleSummary.totalShipsLost }}</div>
                        </div>
                        <div class="stat-item">
                            <div class="stat-label">
                                <UIcon name="lucide:flame" class="stat-icon text-red-500" />
                                {{ t('battle.damage_inflicted') }}:
                            </div>
                            <div class="stat-value">{{ formatNumber(battle.battleSummary.totalDamageInflicted) }}</div>
                        </div>
                    </div>

                    <!-- Participants Information -->
                    <div class="stat-group">
                        <h3 class="stat-group-title">{{ t('involved') }}</h3>
                        <div class="stat-item">
                            <div class="stat-label">
                                <UIcon name="lucide:users" class="stat-icon text-blue-500" />
                                {{ t('characters') }}:
                            </div>
                            <div class="stat-value">
                                {{ battle.involved_characters_count || battle.charactersInvolved?.length || 0 }}
                            </div>
                        </div>
                        <div class="stat-item">
                            <div class="stat-label">
                                <UIcon name="lucide:building" class="stat-icon text-purple-500" />
                                {{ t('corporations') }}:
                            </div>
                            <div class="stat-value">
                                {{ battle.involved_corporations_count || battle.corporationsInvolved?.length || 0 }}
                            </div>
                        </div>
                        <div class="stat-item">
                            <div class="stat-label">
                                <UIcon name="lucide:flag" class="stat-icon text-indigo-500" />
                                {{ t('alliances') }}:
                            </div>
                            <div class="stat-value">
                                {{ battle.involved_alliances_count || battle.alliancesInvolved?.length || 0 }}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Teams Table -->
            <BattleTeams :previewData="battle" :teamStats="battle.teamData.stats"
                :teamAlliances="battle.teamData.alliances" :teamCorporations="battle.teamData.corporations"
                :teamCharacters="battle.teamData.characters" />

            <!-- Tabs -->
            <div class="mb-4">
                <Tabs v-model="activeTabId" :items="tabItems" :ui="tabsUi" color="neutral"
                    mobile-display-mode="icon-only">
                    <template #overview>
                        <BattleOverview v-if="battle" :battle="battle" />
                    </template>
                    <template #kills>
                        <BattleKills :teamKills="battle.teamData.kills" :sideIds="battle.side_ids" />
                    </template>
                    <template #alliances>
                        <BattleAlliances :teamAlliances="battle.teamData.alliances" :sideIds="battle.side_ids" />
                    </template>
                    <template #corporations>
                        <BattleCorporations :teamCorporations="battle.teamData.corporations"
                            :sideIds="battle.side_ids" />
                    </template>
                    <template #characters>
                        <BattleCharacters :teamCharacters="battle.teamData.characters" :sideIds="battle.side_ids" />
                    </template>
                    <template #timeline>
                        <BattleTimeline v-if="battle" :killmails="battle.killmails" :battle="battle" />
                    </template>
                </Tabs>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import { useRoute, useRouter } from 'vue-router';

// Composables and basic setup
const { locale, t } = useI18n();
const route = useRoute();
const router = useRouter();
const { generateBattleDatasetStructuredData, addStructuredDataToHead } = useStructuredData();

// State management
const activeTabId = ref('');
const isInvalidId = ref(false);

// Determine what we're fetching - battle ID or killmail
const isKillmailMode = computed(() => Boolean(route.query.killmail));
const battleId = computed(() => {
    // First, check for invalid params
    const paramId = isKillmailMode.value
        ? route.query.killmail
        : route.params.id;

    if (
        !paramId ||
        paramId === 'null' ||
        paramId === 'undefined'
    ) {
        isInvalidId.value = true;
        return null;
    }

    return String(paramId);
});

// Create API URL based on mode - always include killmails to avoid tab navigation issues
const apiUrl = computed(() => {
    if (!battleId.value) return null;

    // Always include killmails to ensure they're available for all tabs
    const includeKillmailsParam = '?includeKillmails=true';

    return isKillmailMode.value
        ? `/api/battles/killmail/${battleId.value}${includeKillmailsParam}`
        : `/api/battles/${battleId.value}${includeKillmailsParam}`;
});

// Fetch battle data with killmails for all tabs
const { data: battle, pending, error, refresh } = await useFetch(() => apiUrl.value, {
    key: computed(() => battleId.value
        ? `battle-${isKillmailMode.value ? 'killmail-' : ''}${battleId.value}`
        : null),
    enabled: computed(() => !!battleId.value && !isInvalidId.value),
});

// Function to refresh data
const refreshData = async () => {
    await refresh();
};

// Watch for battle data changes and generate structured data
watch(battle, (newBattle) => {
    if (newBattle) {
        try {
            const battleWithUrl = {
                ...newBattle,
                url: `https://eve-kill.com/battle/${newBattle.battle_id}`
            };

            const datasetStructuredData = generateBattleDatasetStructuredData(battleWithUrl);
            addStructuredDataToHead(datasetStructuredData);
        } catch (error) {
            console.error("Error generating battle structured data:", error);
        }
    }
}, { immediate: true });

// Set up tab navigation with icons
const tabItems = computed(() => [
    { id: 'overview', label: t('battleGenerator.tabs.overview'), icon: 'lucide:info', slot: 'overview' },
    { id: 'kills', label: t('battleGenerator.tabs.kills'), icon: 'lucide:target', slot: 'kills' },
    { id: 'alliances', label: t('battleGenerator.tabs.alliances'), icon: 'lucide:flag', slot: 'alliances' },
    { id: 'corporations', label: t('battleGenerator.tabs.corporations'), icon: 'lucide:building', slot: 'corporations' },
    { id: 'characters', label: t('battleGenerator.tabs.characters'), icon: 'lucide:users', slot: 'characters' },
    { id: 'timeline', label: t('battleGenerator.tabs.timeline'), icon: 'lucide:clock', slot: 'timeline' }
]);

const tabsUi = {
    list: "mb-0",
    tab: "p-2 text-sm font-semibold text-white rounded-lg bg-background-700 hover:bg-background-600 ml-2"
};

// Handle tab navigation and URL hash synchronization while preserving query parameters
onMounted(() => {
    if (tabItems.value.length > 0) {
        const hash = route.hash.substring(1);
        const validTab = tabItems.value.find(item => item.id === hash);
        if (validTab) {
            activeTabId.value = hash;
        } else {
            activeTabId.value = tabItems.value[0].id;
        }
    }
});

watch(() => route.hash, (newHash) => {
    const tabIdFromHash = newHash.substring(1);
    if (tabItems.value.some(item => item.id === tabIdFromHash)) {
        activeTabId.value = tabIdFromHash;
    } else if (!tabIdFromHash && tabItems.value.length > 0) {
        activeTabId.value = tabItems.value[0].id;
    }
});

watch(activeTabId, (newId, oldId) => {
    if (oldId && newId !== oldId && route.hash !== `#${newId}`) {
        // Preserve all query parameters when changing tabs
        router.push({
            hash: `#${newId}`,
            query: route.query // Keep all query parameters including killmail
        });
    }
});

// Primary system data computed properties
const primarySystem = computed(() => {
    if (battle.value?.systems && battle.value.systems.length > 0) {
        return battle.value.systems[0];
    }
    return null;
});

const primarySystemRegionName = computed(() => {
    return primarySystem.value?.region_name || { en: t('battle.unknown_region') };
});

// SEO metadata
const seoData = computed(() => {
    if (!battle.value) return null;

    let systemName = '';
    if (battle.value.systems && battle.value.systems.length > 0) {
        systemName = battle.value.systems.length === 1
            ? battle.value.systems[0].system_name
            : `${battle.value.systems[0].system_name} +${battle.value.systems.length - 1}`;
    } else {
        systemName = battle.value.system_name || t('battle.unknown_system');
    }

    const regionName = getLocalizedString(primarySystemRegionName.value, locale.value);
    const start = battle.value.start_time ? formatDate(battle.value.start_time) : '';
    const end = battle.value.end_time ? formatDate(battle.value.end_time) : '';
    const isk = formatIsk(battle.value.battleSummary?.totalIskLost || 0);
    const ships = battle.value.battleSummary?.totalShipsLost || 0;

    const title = t('battle.seo.titlePattern', { systemName, regionName, start, end });
    const description = t('battle.seo.descriptionPattern', { systemName, regionName, start, end, isk, ships });

    return { title, description };
});

useSeoMeta({
    title: () => seoData.value?.title || t('battle.seo.defaultTitle'),
    ogTitle: () => seoData.value?.title || t('battle.seo.defaultTitle'),
    twitterTitle: () => seoData.value?.title || t('battle.seo.defaultTitle'),
    description: () => seoData.value?.description || t('battle.seo.defaultDescription'),
    ogDescription: () => seoData.value?.description || t('battle.seo.defaultDescription'),
    twitterDescription: () => seoData.value?.description || t('battle.seo.defaultDescription'),
    ogType: "website",
    ogSiteName: "EVE-KILL",
    ogUrl: () => {
        if (!battle.value || !route.fullPath) return "https://eve-kill.com/battles";
        return `https://eve-kill.com${route.fullPath}`;
    },
    ogLocale: "en_US",
    twitterCard: "summary_large_image",
    twitterSite: "@eve_kill",
    twitterImageAlt: () => {
        if (battle.value?.systems && battle.value.systems.length > 0) {
            return battle.value.systems[0].system_name;
        }
        return battle.value?.system_name || t('battle.seo.twitterImageAlt.default');
    },
    twitterCreator: "@eve_kill",
});

// Utility functions
function formatNumber(n) {
    if (typeof n !== 'number') return '0';
    return n.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

function formatDate(dateInput) {
    if (dateInput instanceof Date) {
        return dateInput.toLocaleString();
    }
    if (typeof dateInput === 'string') {
        return new Date(dateInput).toLocaleString();
    }
    return new Date(dateInput * 1000).toLocaleString();
}

function formatIsk(isk) {
    if (!isk) return "0";
    if (isk >= 1000000000000) return `${(isk / 1000000000000).toFixed(2)}T`;
    if (isk >= 1000000000) return `${(isk / 1000000000).toFixed(2)}B`;
    if (isk >= 1000000) return `${(isk / 1000000).toFixed(2)}M`;
    if (isk >= 1000) return `${(isk / 1000).toFixed(2)}K`;
    return isk.toFixed(2);
}

function formatDuration(start, end) {
    let startMs, endMs;

    if (start instanceof Date) {
        startMs = start.getTime();
    } else if (typeof start === 'string') {
        startMs = new Date(start).getTime();
    } else {
        startMs = start * 1000;
    }

    if (end instanceof Date) {
        endMs = end.getTime();
    } else if (typeof end === 'string') {
        endMs = new Date(end).getTime();
    } else {
        endMs = end * 1000;
    }

    const dSeconds = Math.floor((endMs - startMs) / 1000);
    const m = Math.floor(dSeconds / 60);
    const s = dSeconds % 60;
    return `${m}m ${s}s`;
}

function getLocalizedString(obj, localeKey) {
    if (!obj) return "";
    const lang = localeKey.split('-')[0];
    return obj[lang] || obj.en || (typeof obj === 'string' ? obj : "");
}

function groupSystemsByRegion() {
    if (!battle.value?.systems || battle.value.systems.length === 0) {
        return [{
            regionName: { en: t('battle.unknown_region') },
            systems: [t('battle.unknown_system')]
        }];
    }

    const regionMap = new Map();

    for (const system of battle.value.systems) {
        const regionId = system.region_id;
        const regionKey = regionId || 'unknown';

        if (!regionMap.has(regionKey)) {
            regionMap.set(regionKey, {
                regionName: system.region_name || { en: t('battle.unknown_region') },
                systems: []
            });
        }

        regionMap.get(regionKey).systems.push(system.system_name);
    }

    return Array.from(regionMap.values());
}
</script>

<style scoped>
/* Top section improvements */
.bg-background-800 {
    background-color: var(--color-background-800);
}

.border-background-700 {
    border-color: var(--color-background-700);
}

.text-blue-500 {
    color: #3b82f6;
}

.text-yellow-500 {
    color: #eab308;
}

.text-red-500 {
    color: #ef4444;
}

.text-purple-500 {
    color: #8b5cf6;
}

.text-indigo-500 {
    color: #6366f1;
}

.rounded-lg {
    border-radius: 0.5rem;
}

/* Redesigned battle-topbox */
.battle-topbox {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    background-color: var(--color-background-800);
    border-radius: 0.75rem;
    border: 1.5px solid var(--color-background-700, #282828);
    box-shadow: 0 4px 12px 0 rgba(0, 0, 0, 0.1);
    padding: 1.5rem;
}

/* System header styling */
.battle-header {
    padding-bottom: 1rem;
    border-bottom: 1px solid rgba(75, 85, 99, 0.2);
}

.system-info {
    display: flex;
    align-items: center;
    gap: 0.75rem;
}

.system-icon {
    width: 2rem;
    height: 2rem;
    color: #3b82f6;
}

.system-text {
    flex: 1;
    color: light-dark(#111827, #f9fafb);
}

.security-badge {
    margin-left: 0.5rem;
    padding: 0.25rem 0.5rem;
    border-radius: 0.25rem;
    background-color: var(--color-background-700);
    color: var(--color-background-100);
    font-size: 0.75rem;
    vertical-align: middle;
}

.region-name {
    margin-left: 0.5rem;
    color: light-dark(#6b7280, #9ca3af);
}

.systems-container {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
}

.system-region-group {
    display: flex;
    flex-direction: row;
    gap: 0.5rem;
    align-items: center;
}

/* Stats grid styling */
.battle-stats-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: 1rem;
}

.stat-group {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    background-color: light-dark(rgba(245, 245, 245, 0.1), rgba(26, 26, 26, 0.4));
    border-radius: 0.5rem;
    padding: 1rem;
}

.stat-group-title {
    font-size: 0.9rem;
    font-weight: 600;
    color: light-dark(#4b5563, #9ca3af);
    text-transform: uppercase;
    letter-spacing: 0.05em;
    margin-bottom: 0.25rem;
    border-bottom: 1px solid light-dark(rgba(229, 231, 235, 0.3), rgba(75, 85, 99, 0.2));
    padding-bottom: 0.5rem;
}

.stat-item {
    display: flex;
    flex-direction: row;
    /* Changed from column to row */
    align-items: center;
    /* Center items vertically */
    justify-content: space-between;
    /* Push label and value to opposite ends */
    gap: 0.5rem;
    /* Space between label and value */
}

.stat-label {
    display: flex;
    align-items: center;
    gap: 0.375rem;
    font-size: 0.875rem;
    color: light-dark(#6b7280, #9ca3af);
    font-weight: 500;
    flex-shrink: 0;
    /* Prevent label from shrinking */
}

.stat-icon {
    width: 1rem;
    height: 1rem;
    flex-shrink: 0;
    /* Prevent icon from shrinking */
}

.stat-value {
    font-size: 1rem;
    font-weight: 600;
    color: light-dark(#111827, #f9fafb);
    text-align: right;
    /* Align text to the right */
}

/* Responsive adjustments */
@media (max-width: 640px) {
    .battle-stats-grid {
        grid-template-columns: 1fr;
    }

    /* Ensure labels and values stay on one line on mobile */
    .stat-item {
        flex-wrap: nowrap;
        overflow: hidden;
    }

    .stat-label {
        flex-shrink: 0;
        min-width: auto;
    }

    .stat-value {
        flex-shrink: 1;
        overflow: hidden;
        text-overflow: ellipsis;
    }
}

@media (min-width: 768px) and (max-width: 1023px) {
    .battle-stats-grid {
        grid-template-columns: repeat(2, 1fr);
    }
}
</style>
