<template>
    <div class="p-4 bg-background-900 rounded-lg shadow-lg text-black dark:text-white">
        <div v-if="battle && battle.sides">
            <!-- Top Info -->
            <div class="battle-topbox mb-6">
                <div class="flex items-center gap-2 text-2xl font-extrabold text-black dark:text-white mb-1">
                    <UIcon name="lucide:map-pin" class="w-7 h-7 text-blue-400" />
                    <span>
                        {{ t('battle.in_system') }}:
                        <template v-if="battle.systems && battle.systems.length > 0">
                            <span class="text-blue-500">{{ formatSystemNames() }}</span>
                            <span class="ml-2 text-background-400">
                                ({{ getLocalizedString(primarySystemRegionName, locale) }})
                            </span>
                        </template>
                        <template v-else>
                            <span class="text-blue-500">{{ battle.system_name || t('battle.unknown_system') }}</span>
                            <span
                                class="ml-2 text-xs px-2 py-1 rounded bg-background-700 text-background-100 align-middle">
                                {{ battle.system_security ? battle.system_security.toFixed(2) : 'N/A' }}
                            </span>
                            <span class="ml-2 text-background-400">
                                ({{ getLocalizedString(battle.region_name, locale) }})
                            </span>
                        </template>
                    </span>
                </div>
                <div class="flex flex-wrap gap-6 mt-2 text-base font-medium">
                    <div class="flex items-center gap-1">
                        <UIcon name="lucide:clock" class="w-5 h-5 text-background-400" />
                        <span>{{ t('battle.start_time') }}:</span>
                        <span class="font-semibold">{{ formatDate(battle.start_time) }}</span>
                    </div>
                    <div class="flex items-center gap-1">
                        <UIcon name="lucide:clock" class="w-5 h-5 text-background-400" />
                        <span>{{ t('battle.end_time') }}:</span>
                        <span class="font-semibold">{{ formatDate(battle.end_time) }}</span>
                    </div>
                    <div class="flex items-center gap-1">
                        <UIcon name="lucide:timer" class="w-5 h-5 text-background-400" />
                        <span>{{ t('battle.duration') }}:</span>
                        <span class="font-semibold">{{ duration(battle.start_time, battle.end_time) }}</span>
                    </div>
                    <div class="flex items-center gap-1">
                        <UIcon name="lucide:coins" class="w-5 h-5 text-yellow-500" />
                        <span>{{ t('battle.isk_lost') }}:</span>
                        <span class="font-semibold">{{ formatIsk(totalIskLost) }} ISK</span>
                    </div>
                    <div class="flex items-center gap-1">
                        <UIcon name="lucide:ship" class="w-5 h-5 text-background-400" />
                        <span>{{ t('battle.ships_lost') }}:</span>
                        <span class="font-semibold">{{ totalShipsLost }}</span>
                    </div>
                    <div class="flex items-center gap-1">
                        <UIcon name="lucide:flame" class="w-5 h-5 text-red-500" />
                        <span>{{ t('battle.damage_inflicted') }}:</span>
                        <span class="font-semibold">{{ formatNumber(totalDamageInflicted) }}</span>
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
            <div v-if="battleData && Object.keys(battleData).length === 0">
                <span class="text-black dark:text-white">{{ t('battle.no_battle_found') }}</span>
            </div>
            <div v-else>
                <span class="text-black dark:text-white">{{ t('battle.loading') }}</span>
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

const slugParts = computed(() => {
    if (Array.isArray(route.params.slug)) {
        return route.params.slug as string[];
    }
    if (typeof route.params.slug === 'string') {
        return [route.params.slug as string];
    }
    return [];
});

const entityId = computed(() => {
    if (slugParts.value.length === 1 && slugParts.value[0]) {
        return slugParts.value[0];
    }
    return null;
});

const apiUrl = computed(() => {
    if (!entityId.value) return null;
    // Use the custom battles API endpoint
    return `/api/customBattles/${entityId.value}`;
});

const { data: battleData, pending, error } = useFetch(apiUrl, {
    key: `custom-battle-${entityId.value}`,
    lazy: true,
    watch: [entityId]
});

const battle = ref<any>(null);
const killmails = ref<any[]>([]);

// New structure for team-based data with dynamic sides
const teamKills = ref<Record<string, any[]>>({});
const teamStats = ref<Record<string, any>>({});
const teamAlliances = ref<Record<string, any[]>>({});
const teamCorporations = ref<Record<string, any[]>>({});
const teamCharacters = ref<Record<string, any[]>>({});

// Get the primary system info for simplified display
const primarySystem = computed(() => {
    if (battle.value?.systems && battle.value.systems.length > 0) {
        return battle.value.systems[0];
    }
    return null;
});

// Get the primary system region name for display
const primarySystemRegionName = computed(() => {
    return primarySystem.value?.region_name || { en: 'Unknown Region' };
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

const tabs = [
    { label: 'Overview', slot: 'overview' },
    { label: 'Kills', slot: 'kills' },
    { label: 'Alliances', slot: 'alliances' },
    { label: 'Corporations', slot: 'corporations' },
    { label: 'Characters', slot: 'characters' },
    { label: 'Timeline', slot: 'timeline' }
]

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
    if (battleData.value) {
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

    const title = `Custom Battle in ${systemName} (${regionName}) | ${start} - ${end}`;
    const description = `Custom Battle in ${systemName} (${regionName}) from ${start} to ${end}. ISK Lost: ${isk}, Ships Lost: ${ships}.`;

    return {
        title,
        description,
    };
});

useSeoMeta({
    title: () => seoData.value?.title || "Custom Battle | EVE-KILL",
    ogTitle: () => seoData.value?.title || "Custom Battle | EVE-KILL",
    twitterTitle: () => seoData.value?.title || "Custom Battle | EVE-KILL",
    description: () => seoData.value?.description || "EVE Online custom battle details",
    ogDescription: () => seoData.value?.description || "EVE Online custom battle details",
    twitterDescription: () => seoData.value?.description || "EVE Online custom battle details",
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
        return battle.value?.system_name || "EVE System";
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

.rounded-lg {
    border-radius: 0.5rem;
}

.battle-topbox {
    background: light-dark(rgba(245, 245, 245, 0.7), rgba(26, 26, 26, 0.7));
    border-radius: 0.75rem;
    border: 1.5px solid var(--color-background-700, #282828);
    box-shadow: 0 2px 8px 0 rgba(0, 0, 0, 0.07);
    padding: 1.5rem 2rem 1.25rem 2rem;
    margin-bottom: 2rem;
    border-bottom: 3px solid var(--color-background-700, #282828);
}
</style>
