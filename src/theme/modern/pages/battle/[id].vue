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
                            {{ battle.system_security.toFixed(2) }}
                        </span>
                        <span class="ml-2 text-background-400">
                            ({{ getLocalizedString(battle.region_name) }})
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
                        <BattleTimeline :killmails="killmails" :battle="battle" />
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
import { useFetch } from '#app'
import { computed, ref, watchEffect } from 'vue'
import { useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

const route = useRoute()
const id = computed(() => route.params.id)

const { data: battleData } = useFetch(() => id.value ? `/api/battles/killmail/${id.value}` : null)
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
    { label: 'Kills', slot: 'kills' },
    { label: 'Alliances', slot: 'alliances' },
    { label: 'Corporations', slot: 'corporations' },
    { label: 'Characters', slot: 'characters' },
    { label: 'Timeline', slot: 'timeline' }
]

const tabsUi = {
    list: {
        base: "mb-0 border-b border-background-700",
        background: "bg-gray-200 dark:bg-gray-900",
    },
    tab: {
        base: "p-2 text-sm font-semibold text-white rounded-lg bg-background-700 hover:bg-background-600 ml-2",
        active: "bg-background-600"
    }
}

const getLocalizedString = (obj: any, localeKey: string): string => {
    if (!obj) return "";
    return obj[localeKey] || obj.en || "";
};

function formatNumber(n: number) {
    if (typeof n !== 'number') return '0'
    return n.toLocaleString(undefined, { maximumFractionDigits: 2 })
}
function formatDate(unix: number) {
    return new Date(unix * 1000).toLocaleString()
}
function duration(start: number, end: number) {
    const d = end - start
    const m = Math.floor(d / 60)
    const s = d % 60
    return `${m}m ${s}s`
}

// Helper to initialize stats for an entity
function initializeEntityStats(map: Map<any, any>, id: any, name: any, allianceId?: any, allianceName?: any) {
    if (!map.has(id)) {
        map.set(id, {
            id,
            name,
            alliance_id: allianceId,
            alliance_name: allianceName,
            kills: 0,
            losses: 0,
            valueInflicted: 0,
            valueSuffered: 0,
        });
    }
    return map.get(id);
}

// Track stats when an entity is the victim
function trackVictimStats(map: Map<any, any>, id: any, name: any, valueSuffered: number, allianceId?: any, allianceName?: any) {
    if (!id || !name) return;
    const stats = initializeEntityStats(map, id, name, allianceId, allianceName);
    stats.losses += 1;
    stats.valueSuffered += valueSuffered;
}

// Track stats when an entity gets the final blow
function trackFinalBlowStats(map: Map<any, any>, id: any, name: any, valueInflicted: number, allianceId?: any, allianceName?: any) {
    if (!id || !name) return;
    const stats = initializeEntityStats(map, id, name, allianceId, allianceName);
    stats.kills += 1;
    stats.valueInflicted += valueInflicted;
}

function splitKillmailsToSides(killmails: any[], battle: any) {
    const blueAlliancesMap = new Map()
    const blueCorporationsMap = new Map()
    const blueCharactersMap = new Map()
    const redAlliancesMap = new Map()
    const redCorporationsMap = new Map()
    const redCharactersMap = new Map()

    const blueAlliances = new Set(battle.blue_team.alliances.map((a: any) => a.id))
    const blueCorporations = new Set(battle.blue_team.corporations.map((c: any) => c.id))
    const redAlliances = new Set(battle.red_team.alliances.map((a: any) => a.id))
    const redCorporations = new Set(battle.red_team.corporations.map((c: any) => c.id))

    blueTeamKills.value = []
    redTeamKills.value = []
    blueTeamStats.value = { iskLost: 0, shipsLost: 0, damageInflicted: 0 }
    redTeamStats.value = { iskLost: 0, shipsLost: 0, damageInflicted: 0 }

    killmails.forEach((killmail: any) => {
        let isBlueVictim = false
        let isRedVictim = false

        // Sets to track entities already processed for this specific killmail's attackers
        const processedBlueAttackerAlliances = new Set();
        const processedBlueAttackerCorps = new Set();
        const processedRedAttackerAlliances = new Set();
        const processedRedAttackerCorps = new Set();

        if (killmail.victim.alliance_id && blueAlliances.has(killmail.victim.alliance_id)) {
            isBlueVictim = true
        } else if (killmail.victim.alliance_id && redAlliances.has(killmail.victim.alliance_id)) {
            isRedVictim = true
        } else if (killmail.victim.corporation_id && blueCorporations.has(killmail.victim.corporation_id)) {
            isBlueVictim = true
        } else if (killmail.victim.corporation_id && redCorporations.has(killmail.victim.corporation_id)) {
            isRedVictim = true
        }

        if (isBlueVictim) {
            blueTeamKills.value.push(killmail)
            blueTeamStats.value.iskLost += killmail.total_value
            blueTeamStats.value.shipsLost += 1
            blueTeamStats.value.damageInflicted += killmail.victim.damage_taken
            // Track losses for the blue victim's entities
            trackVictimStats(blueAlliancesMap, killmail.victim.alliance_id, killmail.victim.alliance_name, killmail.total_value);
            trackVictimStats(blueCorporationsMap, killmail.victim.corporation_id, killmail.victim.corporation_name, killmail.total_value, killmail.victim.alliance_id, killmail.victim.alliance_name);
            trackVictimStats(blueCharactersMap, killmail.victim.character_id, killmail.victim.character_name, killmail.total_value);
        } else if (isRedVictim) {
            redTeamKills.value.push(killmail)
            redTeamStats.value.iskLost += killmail.total_value
            redTeamStats.value.shipsLost += 1
            redTeamStats.value.damageInflicted += killmail.victim.damage_taken
            // Track losses for the red victim's entities
            trackVictimStats(redAlliancesMap, killmail.victim.alliance_id, killmail.victim.alliance_name, killmail.total_value);
            trackVictimStats(redCorporationsMap, killmail.victim.corporation_id, killmail.victim.corporation_name, killmail.total_value, killmail.victim.alliance_id, killmail.victim.alliance_name);
            trackVictimStats(redCharactersMap, killmail.victim.character_id, killmail.victim.character_name, killmail.total_value);
        }

        // Process attackers
        // Process attackers
        killmail.attackers.forEach((attacker: any) => {
            const allianceId = attacker.alliance_id;
            const corpId = attacker.corporation_id;
            const charId = attacker.character_id;

            // Only credit the final blow attacker if the victim was on the opposing team
            if (attacker.final_blow === true) {
                // Blue attacker gets final blow on Red victim
                if (isRedVictim && allianceId && blueAlliances.has(allianceId)) {
                    // Track final blow for Blue Alliance (only once per killmail)
                    if (!processedBlueAttackerAlliances.has(allianceId)) {
                        trackFinalBlowStats(blueAlliancesMap, allianceId, attacker.alliance_name, killmail.total_value);
                        processedBlueAttackerAlliances.add(allianceId);
                    }
                    // Track final blow for Blue Corporation (only once per killmail)
                    if (corpId && !processedBlueAttackerCorps.has(corpId)) {
                        trackFinalBlowStats(blueCorporationsMap, corpId, attacker.corporation_name, killmail.total_value, allianceId, attacker.alliance_name);
                        processedBlueAttackerCorps.add(corpId);
                    }
                    // Track final blow for Blue Character
                    trackFinalBlowStats(blueCharactersMap, charId, attacker.character_name, killmail.total_value);
                }
                // Red attacker gets final blow on Blue victim
                else if (isBlueVictim && allianceId && redAlliances.has(allianceId)) {
                    // Track final blow for Red Alliance (only once per killmail)
                    if (!processedRedAttackerAlliances.has(allianceId)) {
                        trackFinalBlowStats(redAlliancesMap, allianceId, attacker.alliance_name, killmail.total_value);
                        processedRedAttackerAlliances.add(allianceId);
                    }
                    // Track final blow for Red Corporation (only once per killmail)
                    if (corpId && !processedRedAttackerCorps.has(corpId)) {
                        trackFinalBlowStats(redCorporationsMap, corpId, attacker.corporation_name, killmail.total_value, allianceId, attacker.alliance_name);
                        processedRedAttackerCorps.add(corpId);
                    }
                    // Track final blow for Red Character
                    trackFinalBlowStats(redCharactersMap, charId, attacker.character_name, killmail.total_value);
                }
                // Note: Final blows on victims not part of the opposing team are ignored for stat tracking.
            }
        })
    })

    blueTeamCharacters.value = Array.from(blueCharactersMap.values()).sort((a: any, b: any) => b.kills - a.kills)
    redTeamCharacters.value = Array.from(redCharactersMap.values()).sort((a: any, b: any) => b.kills - a.kills)
    blueTeamAlliances.value = Array.from(blueAlliancesMap.values()).sort((a: any, b: any) => b.kills - a.kills)
    blueTeamCorporations.value = Array.from(blueCorporationsMap.values()).sort((a: any, b: any) => b.kills - a.kills)
    redTeamAlliances.value = Array.from(redAlliancesMap.values()).sort((a: any, b: any) => b.kills - a.kills)
    redTeamCorporations.value = Array.from(redCorporationsMap.values()).sort((a: any, b: any) => b.kills - a.kills)
    blueTeamKills.value = blueTeamKills.value.sort((a: any, b: any) => b.total_value - a.total_value)
    redTeamKills.value = redTeamKills.value.sort((a: any, b: any) => b.total_value - a.total_value)
}

// Fetch killmails when battle data is loaded
watchEffect(async () => {
    if (battleData.value) {
        battle.value = battleData.value
        const { data: kills } = await useFetch('/api/query', {
            method: 'POST',
            body: {
                type: 'complex',
                filter: {
                    kill_time: {
                        '$gte': battle.value.start_time,
                        '$lte': battle.value.end_time
                    },
                    system_id: {
                        '$in': [battle.value.system_id]
                    }
                },
                options: { limit: 10000 }
            }
        })
        if (kills.value) {
            killmails.value = kills.value
            splitKillmailsToSides(killmails.value, battle.value)
        }
    }
})
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
