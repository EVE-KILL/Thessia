<template>
    <div class="p-4 bg-background-900 rounded-lg shadow-lg text-black dark:text-white">
        <div v-if="battle && battle.blue_team && battle.red_team">
            <!-- Top Info -->
            <div class="battle-topbox mb-6">
                <div class="flex items-center gap-2 text-2xl font-extrabold text-black dark:text-white mb-1">
                    <UIcon name="lucide:map-pin" class="w-7 h-7 text-blue-400" />
                    <span>
                        {{ t('battle.in_system') }}:
                        <span class="text-blue-500">{{ battle.system_name || t('battle.unknown_system') }}</span>
                        <span class="ml-2 text-xs px-2 py-1 rounded bg-background-700 text-background-100 align-middle">
                            {{ battle.system_security ? battle.system_security.toFixed(2) : 'N/A' }}
                        </span>
                        <span class="ml-2 text-background-400">
                            ({{ getLocalizedString(battle.region_name, locale) }})
                        </span>
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
                        <span class="font-semibold">{{ formatIsk(blueTeamStats.iskLost + redTeamStats.iskLost) }}
                            ISK</span>
                    </div>
                    <div class="flex items-center gap-1">
                        <UIcon name="lucide:ship" class="w-5 h-5 text-background-400" />
                        <span>{{ t('battle.ships_lost') }}:</span>
                        <span class="font-semibold">{{ blueTeamStats.shipsLost + redTeamStats.shipsLost }}</span>
                    </div>
                    <div class="flex items-center gap-1">
                        <UIcon name="lucide:flame" class="w-5 h-5 text-red-500" />
                        <span>{{ t('battle.damage_inflicted') }}:</span>
                        <span class="font-semibold">{{ formatNumber(blueTeamStats.damageInflicted +
                            redTeamStats.damageInflicted) }}</span>
                    </div>
                </div>
            </div>

            <!-- Teams Table -->
            <BattleTeams :blueTeamStats="blueTeamStats" :redTeamStats="redTeamStats"
                :blueTeamAlliances="blueTeamAlliances" :redTeamAlliances="redTeamAlliances"
                :blueTeamCorporations="blueTeamCorporations" :redTeamCorporations="redTeamCorporations" />

            <!-- Tabs -->
            <div class="mb-4">
                <UTabs :items="tabs" :ui="tabsUi" color="neutral">
                    <template #overview>
                        <BattleOverview v-if="battleData" :battle="battleData" />
                    </template>
                    <template #kills>
                        <BattleKills :blueTeamKills="blueTeamKills" :redTeamKills="redTeamKills" />
                    </template>
                    <template #alliances>
                        <BattleAlliances :blueTeamAlliances="blueTeamAlliances" :redTeamAlliances="redTeamAlliances" />
                    </template>
                    <template #corporations>
                        <BattleCorporations :blueTeamCorporations="blueTeamCorporations"
                            :redTeamCorporations="redTeamCorporations" />
                    </template>
                    <template #characters>
                        <BattleCharacters :blueTeamCharacters="blueTeamCharacters"
                            :redTeamCharacters="redTeamCharacters" />
                    </template>
                    <template #timeline>
                        <BattleTimeline v-if="battleData" :killmails="killmails" :battle="battleData" />
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

const route = useRoute()
const id = computed(() => route.params.id)

const { data: battleData } = useFetch(() => id.value ? `/api/battles/${id.value}` : null)
const battle = ref<any>(null)
const killmails = ref<any[]>([])

const blueTeamKills = ref<any[]>([])
const redTeamKills = ref<any[]>([])
const blueTeamStats = ref({ iskLost: 0, shipsLost: 0, damageInflicted: 0 })
const redTeamStats = ref({ iskLost: 0, shipsLost: 0, damageInflicted: 0 })
const blueTeamAlliances = ref<any[]>([])
const redTeamAlliances = ref<any[]>([])
const blueTeamCorporations = ref<any[]>([])
const redTeamCorporations = ref<any[]>([])
const blueTeamCharacters = ref<any[]>([])
const redTeamCharacters = ref<any[]>([])

const tabs = [
    { label: 'Overview', slot: 'overview' },
    { label: 'Kills', slot: 'kills' },
    { label: 'Alliances', slot: 'alliances' },
    { label: 'Corporations', slot: 'corporations' },
    { label: 'Characters', slot: 'characters' },
    { label: 'Timeline', slot: 'timeline' }
]

const tabsUi = {
    list: "mb-0", // Removed border-b border-background-700
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
    // Maintain backward compatibility with Unix timestamps
    return new Date(dateInput * 1000).toLocaleString();
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

        const allKillmailIds = [
            ...(battleData.value?.killmail_ids || []),
            ...(battleData.value?.blue_team_kill_ids || []),
            ...(battleData.value?.red_team_kill_ids || []),
        ];

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
                killmails.value = (battleData.value?.killmail_ids || [])
                    .map((id: number) => killmailMap.get(id))
                    .filter((km: any) => km !== undefined) // Filter out any potential undefineds
                    .sort((a: any, b: any) => new Date(a.kill_time).getTime() - new Date(b.kill_time).getTime());

                // Populate team kills (sorted by value)
                blueTeamKills.value = (battleData.value?.blue_team_kill_ids || [])
                    .map((id: number) => killmailMap.get(id))
                    .filter((km: any) => km !== undefined)
                    .sort((a: any, b: any) => (b.total_value || 0) - (a.total_value || 0));

                redTeamKills.value = (battleData.value?.red_team_kill_ids || [])
                    .map((id: number) => killmailMap.get(id))
                    .filter((km: any) => km !== undefined)
                    .sort((a: any, b: any) => (b.total_value || 0) - (a.total_value || 0));

                // Populate stats and entity lists directly from battleData (already computed on backend)
                blueTeamStats.value = battleData.value?.blue_team_stats || { iskLost: 0, shipsLost: 0, damageInflicted: 0 };
                redTeamStats.value = battleData.value?.red_team_stats || { iskLost: 0, shipsLost: 0, damageInflicted: 0 };
                blueTeamAlliances.value = battleData.value?.blue_team_alliances_stats || [];
                redTeamAlliances.value = battleData.value?.red_team_alliances_stats || [];
                blueTeamCorporations.value = battleData.value?.blue_team_corporations_stats || [];
                redTeamCorporations.value = battleData.value?.red_team_corporations_stats || [];
                blueTeamCharacters.value = battleData.value?.blue_team_characters_stats || [];
                redTeamCharacters.value = battleData.value?.red_team_characters_stats || [];

            } catch (error) {
                console.error('Error fetching killmails in batch:', error);
                // Handle error, maybe set killmails/teamKills to empty arrays or show an error message
                killmails.value = [];
                blueTeamKills.value = [];
                redTeamKills.value = [];
            }
        } else {
            // No killmail IDs found in battle data
            killmails.value = [];
            blueTeamKills.value = [];
            redTeamKills.value = [];
            blueTeamStats.value = battleData.value?.blue_team_stats || { iskLost: 0, shipsLost: 0, damageInflicted: 0 };
            redTeamStats.value = battleData.value?.red_team_stats || { iskLost: 0, shipsLost: 0, damageInflicted: 0 };
            blueTeamAlliances.value = battleData.value?.blue_team_alliances_stats || [];
            redTeamAlliances.value = battleData.value?.red_team_alliances_stats || [];
            blueTeamCorporations.value = battleData.value?.blue_team_corporations_stats || [];
            redTeamCorporations.value = battleData.value?.red_team_corporations_stats || [];
            blueTeamCharacters.value = battleData.value?.blue_team_characters_stats || [];
            redTeamCharacters.value = battleData.value?.red_team_characters_stats || [];
        }
    }
});

const seoData = computed(() => {
    if (!battle.value) return null;
    const systemName = battle.value.system_name || t('battle.unknown_system');
    const regionName = getLocalizedString(battle.value.region_name, locale) || '';
    const start = battle.value.start_time ? formatDate(battle.value.start_time) : '';
    const end = battle.value.end_time ? formatDate(battle.value.end_time) : '';
    const totalIsk = formatIsk(blueTeamStats.value.iskLost + redTeamStats.value.iskLost);
    const totalShips = blueTeamStats.value.shipsLost + redTeamStats.value.shipsLost;
    const title = `Battle in ${systemName} (${regionName}) | ${start} - ${end}`;
    const description = `Battle in ${systemName} (${regionName}) from ${start} to ${end}. ISK Lost: ${totalIsk}, Ships Lost: ${totalShips}.`;
    return {
        title,
        description,
    };
});

useSeoMeta({
    title: () => seoData.value?.title || "Battle | EVE-KILL",
    ogTitle: () => seoData.value?.title || "Battle | EVE-KILL",
    twitterTitle: () => seoData.value?.title || "Battle | EVE-KILL",
    description: () => seoData.value?.description || "EVE Online battle details",
    ogDescription: () => seoData.value?.description || "EVE Online battle details",
    twitterDescription: () => seoData.value?.description || "EVE Online battle details",
    ogType: "website",
    ogSiteName: "EVE-KILL",
    ogUrl: () =>
        battle.value ? `https://eve-kill.com/battle/${route.params.id}` : "",
    ogLocale: "en_US",
    twitterCard: "summary_large_image",
    twitterSite: "@eve_kill",
    twitterImageAlt: () => battle.value?.system_name || "EVE System",
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
