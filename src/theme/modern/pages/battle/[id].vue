<template>
    <div class="p-4 bg-background-900 rounded-lg shadow-lg text-black dark:text-white">
        <!-- Check pending state first to ensure loading indicator is always shown when loading -->
        <div v-if="pending">
            <div class="flex flex-col items-center justify-center py-12">
                <UIcon name="lucide:loader" class="w-12 h-12 animate-spin text-primary mb-4" />
                <span class="text-xl font-medium">{{ t('battle.loading') }}</span>
            </div>
        </div>
        <!-- Then check if we have valid battle data -->
        <div v-else-if="battle">
            <!-- Top Info - Redesigned battle-topbox -->
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
                            <div class="stat-value">{{ duration(battle.start_time, battle.end_time) }}</div>
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
                            <div class="stat-value">{{ formatIsk(totalIskLost) }} ISK</div>
                        </div>
                        <div class="stat-item">
                            <div class="stat-label">
                                <UIcon name="lucide:ship" class="stat-icon" />
                                {{ t('battle.ships_lost') }}:
                            </div>
                            <div class="stat-value">{{ totalShipsLost }}</div>
                        </div>
                        <div class="stat-item">
                            <div class="stat-label">
                                <UIcon name="lucide:flame" class="stat-icon text-red-500" />
                                {{ t('battle.damage_inflicted') }}:
                            </div>
                            <div class="stat-value">{{ formatNumber(totalDamageInflicted) }}</div>
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
            <CustomBattleTeams :previewData="battle" :teamStats="teamStats" :teamAlliances="teamAlliances"
                :teamCorporations="teamCorporations" :teamCharacters="teamCharacters" />

            <!-- Tabs -->
            <div class="mb-4">
                <UTabs :items="tabs" :ui="tabsUi" color="neutral">
                    <template #overview>
                        <CustomBattleOverview v-if="battle" :battle="battle" />
                    </template>
                    <template #kills>
                        <CustomBattleKills :teamKills="teamKills" :sideIds="battle.side_ids" />
                    </template>
                    <template #alliances>
                        <CustomBattleAlliances :teamAlliances="teamAlliances" :sideIds="battle.side_ids" />
                    </template>
                    <template #corporations>
                        <CustomBattleCorporations :teamCorporations="teamCorporations" :sideIds="battle.side_ids" />
                    </template>
                    <template #characters>
                        <CustomBattleCharacters :teamCharacters="teamCharacters" :sideIds="battle.side_ids" />
                    </template>
                    <template #timeline>
                        <CustomBattleTimeline v-if="battle" :killmails="killmails" :battle="battle" />
                    </template>
                </UTabs>
            </div>
        </div>
        <div v-else>
            <div class="flex flex-col items-center justify-center py-12">
                <UIcon name="lucide:alert-circle" class="w-12 h-12 text-red-500 mb-4" />
                <span class="text-xl font-medium">{{ t('battle.no_battle_found_custom') }}</span>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { computed, ref, watchEffect } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute } from 'vue-router';

const { locale, t } = useI18n()

const route = useRoute();

const entityId = computed(() => route.params.id as string || null);

const apiUrl = computed(() => {
    if (!entityId.value) return null;
    return `/api/battles/${entityId.value}`;
});

const { data: battleData, pending, error } = useFetch(apiUrl, {
    key: computed(() => entityId.value ? `battle-${entityId.value}` : null),
    lazy: true,
    watch: [entityId],
    onRequest({ request, options }) {
        // Reset battle value when starting a new request
        battle.value = null;
    },
    onResponseError(context) {
        // Log error details for debugging purposes
        console.error('Battle fetch error:', {
            status: context.response.status,
            statusText: context.response.statusText
        });
    }
});

const battle = ref<any>(null);
const killmails = ref<any[]>([]);

// New structure for team-based data with dynamic sides
const teamKills = ref<Record<string, any[]>>({});
const teamStats = ref<Record<string, any>>({});
const teamAlliances = ref<Record<string, any[]>>({});
const teamCorporations = ref<Record<string, any[]>>({});
const teamCharacters = ref<Record<string, any[]>>({});

// Add debug flag - set to true temporarily for debugging
const showDebug = ref(true);

// Get the primary system info for simplified display
const primarySystem = computed(() => {
    if (battle.value?.systems && battle.value.systems.length > 0) {
        return battle.value.systems[0];
    }
    return null;
});

// Get the primary system region name for display
const primarySystemRegionName = computed(() => {
    return primarySystem.value?.region_name || { en: t('battle.unknown_region') };
});

// Format system names for display (shows first system + count if multiple)
function formatSystemNames(): string {
    if (!battle.value?.systems || battle.value.systems.length === 0) {
        return t('battle.unknown_system');
    }

    if (battle.value.systems.length === 1) {
        return battle.value.systems[0].system_name;
    }

    // Show first system plus count
    return `${battle.value.systems[0].system_name} +${battle.value.systems.length - 1}`;
}

/**
 * Groups all systems by their regions for display
 * @returns An array of objects with regionName and systems array
 */
function groupSystemsByRegion() {
    if (!battle.value?.systems || battle.value.systems.length === 0) {
        return [{
            regionName: { en: t('battle.unknown_region') },
            systems: [t('battle.unknown_system')]
        }];
    }

    // Group systems by region
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

    // Convert map to array for template
    return Array.from(regionMap.values());
}

// Computed properties for totals across all teams
const totalIskLost = computed(() => {
    return Object.values(teamStats.value).reduce((sum, stats) => sum + (stats?.iskLost || 0), 0);
});

const totalShipsLost = computed(() => {
    return Object.values(teamStats.value).reduce((sum, stats) => sum + (stats?.shipsLost || 0), 0);
});

const totalDamageInflicted = computed(() => {
    return Object.values(teamStats.value).reduce((sum, stats) => sum + (stats?.damageInflicted || 0), 0);
});

const tabs = computed(() => [
    { label: t('battleGenerator.tabs.overview'), slot: 'overview' },
    { label: t('battleGenerator.tabs.kills'), slot: 'kills' },
    { label: t('battleGenerator.tabs.alliances'), slot: 'alliances' },
    { label: t('battleGenerator.tabs.corporations'), slot: 'corporations' },
    { label: t('battleGenerator.tabs.characters'), slot: 'characters' },
    { label: t('battleGenerator.tabs.timeline'), slot: 'timeline' }
]);

const tabsUi = {
    list: "mb-0",
    tab: "p-2 text-sm font-semibold text-white rounded-lg bg-background-700 hover:bg-background-600 ml-2"
}

const getLocalizedString = (obj: any, localeKey: string): string => {
    if (!obj) return "";
    return obj[localeKey] || obj.en || "";
};

function formatNumber(n: number) {
    if (typeof n !== 'number') return '0'
    return n.toLocaleString(undefined, { maximumFractionDigits: 2 })
}

function formatDate(dateInput: Date | number | string) {
    if (dateInput instanceof Date) {
        return dateInput.toLocaleString();
    }
    // Handle ISO string dates (from JSON serialization)
    if (typeof dateInput === 'string') {
        return new Date(dateInput).toLocaleString();
    }
    // Handle Unix timestamps
    return new Date(dateInput * 1000).toLocaleString();
}

function formatIsk(isk: number): string {
    if (!isk) return "0";
    if (isk >= 1000000000000) {
        return `${(isk / 1000000000000).toFixed(2)}T`;
    } else if (isk >= 1000000000) {
        return `${(isk / 1000000000).toFixed(2)}B`;
    } else if (isk >= 1000000) {
        return `${(isk / 1000000).toFixed(2)}M`;
    } else if (isk >= 1000) {
        return `${(isk / 1000).toFixed(2)}K`;
    }
    return isk.toFixed(2);
}

function truncateString(str: any, num: number) {
    if (str === null || str === undefined) return '';
    if (typeof str !== 'string') str = String(str);
    return str.length <= num ? str : str.slice(0, num) + '...';
}

function duration(start: Date | number | string, end: Date | number | string) {
    let startMs: number, endMs: number;

    if (start instanceof Date) {
        startMs = start.getTime();
    } else if (typeof start === 'string') {
        // Handle ISO string dates (from JSON serialization)
        startMs = new Date(start).getTime();
    } else {
        startMs = start * 1000; // Convert seconds to milliseconds
    }

    if (end instanceof Date) {
        endMs = end.getTime();
    } else if (typeof end === 'string') {
        // Handle ISO string dates (from JSON serialization)
        endMs = new Date(end).getTime();
    } else {
        endMs = end * 1000; // Convert seconds to milliseconds
    }

    const dSeconds = Math.floor((endMs - startMs) / 1000);
    const m = Math.floor(dSeconds / 60);
    const s = dSeconds % 60;
    return `${m}m ${s}s`;
}

watchEffect(async () => {
    // Only process battle data if we have it and it has content
    if (battleData.value && Object.keys(battleData.value).length > 0) {
        // Explicitly assign the battle data
        battle.value = battleData.value;

        // Reset team data containers
        teamKills.value = {};
        teamStats.value = {};
        teamAlliances.value = {};
        teamCorporations.value = {};
        teamCharacters.value = {};

        // Get all killmail IDs from the battle data
        const allKillmailIds = battle.value?.killmail_ids || [];

        // Get unique IDs
        const uniqueKillmailIds = Array.from(new Set(allKillmailIds));

        if (uniqueKillmailIds.length > 0) {
            try {
                // Fetch full killmail objects using the batch endpoint
                const fetchedKillmails: any[] = await $fetch('/api/killmails/batch', {
                    method: 'POST',
                    body: { ids: uniqueKillmailIds }
                });

                // Create a lookup map for easy access
                const killmailMap = new Map(fetchedKillmails.map(km => [km.killmail_id, km]));

                // Populate killmails for timeline (sorted by time)
                killmails.value = uniqueKillmailIds
                    .map((id: number) => killmailMap.get(id))
                    .filter(km => km !== undefined)
                    .sort((a: any, b: any) => new Date(a.kill_time).getTime() - new Date(b.kill_time).getTime());

                // Process team data directly from sides object
                const sideIds = battle.value?.side_ids || [];

                // Fill data for each side
                for (const sideId of sideIds) {
                    if (battle.value?.sides?.[sideId]) {
                        const side = battle.value.sides[sideId];

                        // Populate team stats and entity lists directly
                        teamStats.value[sideId] = side.stats || { iskLost: 0, shipsLost: 0, damageInflicted: 0 };
                        teamAlliances.value[sideId] = side.alliances_stats || [];
                        teamCorporations.value[sideId] = side.corporations_stats || [];
                        teamCharacters.value[sideId] = side.characters_stats || [];

                        // Populate team kills using kill_ids
                        teamKills.value[sideId] = (side.kill_ids || [])
                            .map((id: number) => killmailMap.get(id))
                            .filter(km => km !== undefined)
                            .sort((a: any, b: any) => (b.total_value || 0) - (a.total_value || 0));
                    }
                }
            } catch (error) {
                console.error('Error fetching killmails in batch:', error);
                killmails.value = [];
            }
        } else {
            // Initialize empty structures if no killmails
            killmails.value = [];

            // Extract data directly from sides
            const sideIds = battle.value?.side_ids || [];
            for (const sideId of sideIds) {
                if (battle.value?.sides?.[sideId]) {
                    const side = battle.value.sides[sideId];
                    teamStats.value[sideId] = side.stats || { iskLost: 0, shipsLost: 0, damageInflicted: 0 };
                    teamAlliances.value[sideId] = side.alliances_stats || [];
                    teamCorporations.value[sideId] = side.corporations_stats || [];
                    teamCharacters.value[sideId] = side.characters_stats || [];
                    teamKills.value[sideId] = [];
                }
            }
        }
    } else {
        // Only clear battle if we're not still loading
        if (!pending.value) {
            battle.value = null;
        }
    }
});

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
    const isk = formatIsk(totalIskLost.value);
    const ships = totalShipsLost.value;

    const title = t('customBattle.seo.titlePattern', { systemName, regionName, start, end });
    const description = t('customBattle.seo.descriptionPattern', { systemName, regionName, start, end, isk, ships });

    return {
        title,
        description,
    };
});

useSeoMeta({
    title: () => seoData.value?.title || t('customBattle.seo.defaultTitle'),
    ogTitle: () => seoData.value?.title || t('customBattle.seo.defaultTitle'),
    twitterTitle: () => seoData.value?.title || t('customBattle.seo.defaultTitle'),
    description: () => seoData.value?.description || t('customBattle.seo.defaultDescription'),
    ogDescription: () => seoData.value?.description || t('customBattle.seo.defaultDescription'),
    twitterDescription: () => seoData.value?.description || t('customBattle.seo.defaultDescription'),
    ogType: "website",
    ogSiteName: "EVE-KILL",
    ogUrl: () => {
        if (!battle.value || !route.fullPath) return "https://eve-kill.com/custombattle";
        return `https://eve-kill.com${route.fullPath}`;
    },
    ogLocale: "en_US",
    twitterCard: "summary_large_image",
    twitterSite: "@eve_kill",
    twitterImageAlt: () => {
        if (battle.value?.systems && battle.value.systems.length > 0) {
            return battle.value.systems[0].system_name;
        }
        return battle.value?.system_name || t('customBattle.seo.twitterImageAlt.default');
    },
    twitterCreator: "@eve_kill",
});
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
    margin-bottom: 2rem;
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
    flex-direction: column;
    gap: 0.25rem;
}

.stat-label {
    display: flex;
    align-items: center;
    gap: 0.375rem;
    font-size: 0.875rem;
    color: light-dark(#6b7280, #9ca3af);
    font-weight: 500;
}

.stat-icon {
    width: 1rem;
    height: 1rem;
}

.stat-value {
    font-size: 1rem;
    font-weight: 600;
    color: light-dark(#111827, #f9fafb);
}

/* Responsive adjustments */
@media (max-width: 640px) {
    .battle-stats-grid {
        grid-template-columns: 1fr;
    }
}

@media (min-width: 768px) and (max-width: 1023px) {
    .battle-stats-grid {
        grid-template-columns: repeat(2, 1fr);
    }
}
</style>
