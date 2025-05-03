<template>
    <div class="p-4 bg-background-900 rounded-lg shadow-lg text-white">
        <div v-if="battle && battle.blue_team && battle.red_team">
            <!-- Top Info -->
            <div class="mb-4">
                <div class="text-lg font-bold">
                    Battle in System: {{ battle.systemInfo?.name }} ({{ battle.systemInfo?.security_status?.toFixed(2)
                    }}) - {{ battle.systemInfo?.region_name }}
                </div>
                <div class="text-sm text-background-400">
                    Start Time: {{ formatDate(battle.start_time) }} | End Time: {{ formatDate(battle.end_time) }}
                </div>
                <div class="text-sm text-background-400">
                    ISK Lost: {{ formatIsk(blueTeamStats.iskLost + redTeamStats.iskLost) }} ISK | Ships Lost: {{
                        blueTeamStats.shipsLost + redTeamStats.shipsLost }} | Damage Inflicted:
                    {{ formatNumber(blueTeamStats.damageInflicted + redTeamStats.damageInflicted) }}
                </div>
                <div class="text-sm text-background-400">
                    Duration: {{ duration(battle.start_time, battle.end_time) }}
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
            <div v-if="battleData && Array.isArray(battleData) && battleData.length === 0">
                No battle found for this killmail.
            </div>
            <div v-else>
                Loading...
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, computed, watchEffect } from 'vue'
import { useRoute } from 'vue-router'
import BattleTeams from '~/components/battle/BattleTeams.vue'
import BattleKills from '~/components/battle/BattleKills.vue'
import BattleAlliances from '~/components/battle/BattleAlliances.vue'
import BattleCorporations from '~/components/battle/BattleCorporations.vue'
import BattleCharacters from '~/components/battle/BattleCharacters.vue'
import BattleTimeline from '~/components/battle/BattleTimeline.vue'
import formatIsk from '~/src/core/utils/formatIsk'
import { useFetch } from '#app'

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

function trackKillStats(map: Map<any, any>, id: any, name: any, totalValue: number, allianceId?: any, allianceName?: any) {
    if (!id || !name) return
    if (!map.has(id)) {
        map.set(id, {
            id,
            name,
            alliance_id: allianceId,
            alliance_name: allianceName,
            kills: 0,
            totalValue: 0
        })
    }
    const stats = map.get(id)
    stats.kills += 1
    stats.totalValue += totalValue
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
            redTeamKills.value.push(killmail)
            blueTeamStats.value.iskLost += killmail.total_value
            blueTeamStats.value.shipsLost += 1
            blueTeamStats.value.damageInflicted += killmail.victim.damage_taken
            trackKillStats(blueAlliancesMap, killmail.victim.alliance_id, killmail.victim.alliance_name, killmail.total_value)
            trackKillStats(blueCorporationsMap, killmail.victim.corporation_id, killmail.victim.corporation_name, killmail.total_value, killmail.victim.alliance_id, killmail.victim.alliance_name)
            trackKillStats(blueCharactersMap, killmail.victim.character_id, killmail.victim.character_name, killmail.total_value)
        } else if (isRedVictim) {
            blueTeamKills.value.push(killmail)
            redTeamStats.value.iskLost += killmail.total_value
            redTeamStats.value.shipsLost += 1
            redTeamStats.value.damageInflicted += killmail.victim.damage_taken
            trackKillStats(redAlliancesMap, killmail.victim.alliance_id, killmail.victim.alliance_name, killmail.total_value)
            trackKillStats(redCorporationsMap, killmail.victim.corporation_id, killmail.victim.corporation_name, killmail.total_value, killmail.victim.alliance_id, killmail.victim.alliance_name)
            trackKillStats(redCharactersMap, killmail.victim.character_id, killmail.victim.character_name, killmail.total_value)
        }

        killmail.attackers.forEach((attacker: any) => {
            if (attacker.alliance_id && blueAlliances.has(attacker.alliance_id)) {
                trackKillStats(blueAlliancesMap, attacker.alliance_id, attacker.alliance_name, killmail.total_value)
                trackKillStats(blueCorporationsMap, attacker.corporation_id, attacker.corporation_name, killmail.total_value, attacker.alliance_id, attacker.alliance_name)
                trackKillStats(blueCharactersMap, attacker.character_id, attacker.character_name, killmail.total_value)
            } else if (attacker.alliance_id && redAlliances.has(attacker.alliance_id)) {
                trackKillStats(redAlliancesMap, attacker.alliance_id, attacker.alliance_name, killmail.total_value)
                trackKillStats(redCorporationsMap, attacker.corporation_id, attacker.corporation_name, killmail.total_value, attacker.alliance_id, attacker.alliance_name)
                trackKillStats(redCharactersMap, attacker.character_id, attacker.character_name, killmail.total_value)
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

<style scoped></style>
