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

            <!-- Unassigned Kills Info (collapsible, styled like BattleKills) -->
            <div v-if="blueTeamUnassignedKills.length || redTeamUnassignedKills.length" class="mb-6">
                <div v-if="blueTeamUnassignedKills.length" class="mb-2">
                    <div class="flex items-center cursor-pointer select-none mb-1"
                        @click="showBlueUnassigned = !showBlueUnassigned">
                        <UIcon :name="showBlueUnassigned ? 'lucide:chevron-up' : 'lucide:chevron-down'"
                            class="mr-2 text-blue-400" />
                        <span class="text-blue-400 font-semibold">
                            Unassigned Blue Team Kills: {{ blueTeamUnassignedKills.length }}
                        </span>
                    </div>
                    <div v-show="showBlueUnassigned" class="transition-all">
                        <Table :columns="unassignedKillColumns" :items="blueTeamUnassignedKills" :bordered="true"
                            :striped="false" :hover="true" density="normal" background="transparent"
                            table-class="kill-table" :link-fn="item => `/kill/${item.killmail.killmail_id}`">
                            <template #cell-ship="{ item }">
                                <div class="flex items-center gap-3">
                                    <img :src="`https://images.eve-kill.com/types/${item.killmail.victim.ship_id}/render?size=64`"
                                        :alt="`Ship: ${getLocalizedString(item.killmail.victim.ship_name, locale)}`"
                                        class="w-12 h-12 object-cover rounded-md border border-background-700" />
                                    <div>
                                        <div class="font-semibold text-black dark:text-white">
                                            {{ truncateString(getLocalizedString(item.killmail.victim.ship_name,
                                                locale), 20) }}
                                        </div>
                                        <div class="text-xs text-background-400">
                                            {{ formatNumber(item.killmail.total_value) }} ISK
                                        </div>
                                    </div>
                                </div>
                            </template>
                            <template #cell-victim="{ item }">
                                <div class="flex items-center gap-3">
                                    <img :src="`https://images.eve-kill.com/characters/${item.killmail.victim.character_id}/portrait?size=64`"
                                        :alt="`Character: ${item.killmail.victim.character_name}`"
                                        class="w-12 h-12 object-cover rounded-md border border-background-700" />
                                    <div>
                                        <div class="font-semibold text-black dark:text-white">{{
                                            item.killmail.victim.character_name }}</div>
                                        <div class="text-xs text-background-400">{{
                                            item.killmail.victim.corporation_name }}</div>
                                        <div v-if="item.killmail.victim.alliance_name"
                                            class="text-xs text-background-400">
                                            {{ item.killmail.victim.alliance_name }}
                                        </div>
                                    </div>
                                </div>
                            </template>
                            <template #cell-attacker="{ item }">
                                <div v-if="item.killmail.attackers && item.killmail.attackers.length">
                                    <div v-for="attacker in item.killmail.attackers.slice(0, 1)"
                                        :key="attacker.character_id || attacker.corporation_id || attacker.alliance_id"
                                        class="flex items-center gap-3">
                                        <img v-if="attacker.character_id"
                                            :src="`https://images.eve-kill.com/characters/${attacker.character_id}/portrait?size=64`"
                                            :alt="attacker.character_name"
                                            class="w-12 h-12 object-cover rounded-md border border-background-700" />
                                        <img v-else-if="attacker.corporation_id"
                                            :src="`https://images.eve-kill.com/corporations/${attacker.corporation_id}/logo?size=64`"
                                            :alt="attacker.corporation_name"
                                            class="w-12 h-12 object-cover rounded-md border border-background-700" />
                                        <img v-else-if="attacker.alliance_id"
                                            :src="`https://images.eve-kill.com/alliances/${attacker.alliance_id}/logo?size=64`"
                                            :alt="attacker.alliance_name"
                                            class="w-12 h-12 object-cover rounded-md border border-background-700" />
                                        <div>
                                            <div class="font-semibold text-black dark:text-white">
                                                {{ attacker.character_name || 'Unknown' }}
                                            </div>
                                            <div class="text-xs text-background-400">
                                                {{ attacker.corporation_name }}
                                            </div>
                                            <div v-if="attacker.alliance_name" class="text-xs text-background-400">
                                                {{ attacker.alliance_name }}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div v-else class="text-xs text-background-400">No attacker data</div>
                            </template>
                            <template #cell-reason="{ item }">
                                <div class="text-xs text-background-400">{{ item.reason }}</div>
                            </template>
                        </Table>
                    </div>
                </div>
                <div v-if="redTeamUnassignedKills.length">
                    <div class="flex items-center cursor-pointer select-none mb-1"
                        @click="showRedUnassigned = !showRedUnassigned">
                        <UIcon :name="showRedUnassigned ? 'lucide:chevron-up' : 'lucide:chevron-down'"
                            class="mr-2 text-red-400" />
                        <span class="text-red-400 font-semibold">
                            Unassigned Red Team Kills: {{ redTeamUnassignedKills.length }}
                        </span>
                    </div>
                    <div v-show="showRedUnassigned" class="transition-all">
                        <Table :columns="unassignedKillColumns" :items="redTeamUnassignedKills" :bordered="true"
                            :striped="false" :hover="true" density="normal" background="transparent"
                            table-class="kill-table" :link-fn="item => `/kill/${item.killmail.killmail_id}`">
                            <template #cell-ship="{ item }">
                                <div class="flex items-center gap-3">
                                    <img :src="`https://images.eve-kill.com/types/${item.killmail.victim.ship_id}/render?size=64`"
                                        :alt="`Ship: ${getLocalizedString(item.killmail.victim.ship_name, locale)}`"
                                        class="w-12 h-12 object-cover rounded-md border border-background-700" />
                                    <div>
                                        <div class="font-semibold text-black dark:text-white">
                                            {{ truncateString(getLocalizedString(item.killmail.victim.ship_name,
                                                locale), 20) }}
                                        </div>
                                        <div class="text-xs text-background-400">
                                            {{ formatNumber(item.killmail.total_value) }} ISK
                                        </div>
                                    </div>
                                </div>
                            </template>
                            <template #cell-victim="{ item }">
                                <div class="flex items-center gap-3">
                                    <img :src="`https://images.eve-kill.com/characters/${item.killmail.victim.character_id}/portrait?size=64`"
                                        :alt="`Character: ${item.killmail.victim.character_name}`"
                                        class="w-12 h-12 object-cover rounded-md border border-background-700" />
                                    <div>
                                        <div class="font-semibold text-black dark:text-white">{{
                                            item.killmail.victim.character_name }}</div>
                                        <div class="text-xs text-background-400">{{
                                            item.killmail.victim.corporation_name }}</div>
                                        <div v-if="item.killmail.victim.alliance_name"
                                            class="text-xs text-background-400">
                                            {{ item.killmail.victim.alliance_name }}
                                        </div>
                                    </div>
                                </div>
                            </template>
                            <template #cell-attacker="{ item }">
                                <div v-if="item.killmail.attackers && item.killmail.attackers.length">
                                    <div v-for="attacker in item.killmail.attackers.slice(0, 1)"
                                        :key="attacker.character_id || attacker.corporation_id || attacker.alliance_id"
                                        class="flex items-center gap-3">
                                        <img v-if="attacker.character_id"
                                            :src="`https://images.eve-kill.com/characters/${attacker.character_id}/portrait?size=64`"
                                            :alt="attacker.character_name"
                                            class="w-12 h-12 object-cover rounded-md border border-background-700" />
                                        <img v-else-if="attacker.corporation_id"
                                            :src="`https://images.eve-kill.com/corporations/${attacker.corporation_id}/logo?size=64`"
                                            :alt="attacker.corporation_name"
                                            class="w-12 h-12 object-cover rounded-md border border-background-700" />
                                        <img v-else-if="attacker.alliance_id"
                                            :src="`https://images.eve-kill.com/alliances/${attacker.alliance_id}/logo?size=64`"
                                            :alt="attacker.alliance_name"
                                            class="w-12 h-12 object-cover rounded-md border border-background-700" />
                                        <div>
                                            <div class="font-semibold text-black dark:text-white">
                                                {{ attacker.character_name || 'Unknown' }}
                                            </div>
                                            <div class="text-xs text-background-400">
                                                {{ attacker.corporation_name }}
                                            </div>
                                            <div v-if="attacker.alliance_name" class="text-xs text-background-400">
                                                {{ attacker.alliance_name }}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div v-else class="text-xs text-background-400">No attacker data</div>
                            </template>
                            <template #cell-reason="{ item }">
                                <div class="text-xs text-background-400">{{ item.reason }}</div>
                            </template>
                        </Table>
                    </div>
                </div>
            </div>

            <!-- Teams Table -->
            <BattleTeams :blueTeamStats="blueTeamStats" :redTeamStats="redTeamStats"
                :blueTeamAlliances="blueTeamAlliances" :redTeamAlliances="redTeamAlliances"
                :blueTeamCorporations="blueTeamCorporations" :redTeamCorporations="redTeamCorporations" />

            <!-- Kill Steals -->
            <div v-if="blueTeamKillSteals.length || redTeamKillSteals.length" class="mb-8">
                <div v-if="blueTeamKillSteals.length" class="mb-4">
                    <div class="text-lg font-bold text-blue-500 mb-2">Blue Team Kill Steals</div>
                    <ul class="list-disc ml-6">
                        <li v-for="ks in blueTeamKillSteals" :key="ks.killmail.killmail_id" class="mb-1">
                            <NuxtLink :to="`/kill/${ks.killmail.killmail_id}`"
                                class="underline text-blue-400 hover:text-blue-600">
                                {{ ks.stealer.character_name || ks.stealer.corporation_name || ks.stealer.alliance_name
                                    || 'Unknown' }}
                            </NuxtLink>
                            stole the kill on
                            <span class="font-semibold">{{ ks.killmail.victim.character_name }}</span>
                            ({{ ks.killmail.victim.ship_name?.en || ks.killmail.victim.ship_name || 'Unknown Ship' }})
                        </li>
                    </ul>
                </div>
                <div v-if="redTeamKillSteals.length">
                    <div class="text-lg font-bold text-red-500 mb-2">Red Team Kill Steals</div>
                    <ul class="list-disc ml-6">
                        <li v-for="ks in redTeamKillSteals" :key="ks.killmail.killmail_id" class="mb-1">
                            <NuxtLink :to="`/kill/${ks.killmail.killmail_id}`"
                                class="underline text-red-400 hover:text-red-600">
                                {{ ks.stealer.character_name || ks.stealer.corporation_name || ks.stealer.alliance_name
                                    || 'Unknown' }}
                            </NuxtLink>
                            stole the kill on
                            <span class="font-semibold">{{ ks.killmail.victim.character_name }}</span>
                            ({{ ks.killmail.victim.ship_name?.en || ks.killmail.victim.ship_name || 'Unknown Ship' }})
                        </li>
                    </ul>
                </div>
            </div>

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

// Track kill steals for each team
const blueTeamKillSteals = ref<any[]>([]);
const redTeamKillSteals = ref<any[]>([]);

// Track unassigned kills for each side
const blueTeamUnassignedKills = ref<any[]>([]);
const redTeamUnassignedKills = ref<any[]>([]);

const showBlueUnassigned = ref(false)
const showRedUnassigned = ref(false)

const unassignedKillColumns = [
    { id: 'ship', header: 'Ship', width: '25%' },
    { id: 'victim', header: 'Victim', width: '25%' },
    { id: 'attacker', header: 'Attacker', width: '25%' },
    { id: 'reason', header: 'Reason', width: '25%' },
];

// For possible entities from unassigned kills
const possibleBlueAlliances = ref<any[]>([]);
const possibleBlueCorporations = ref<any[]>([]);
const possibleBlueCharacters = ref<any[]>([]);
const possibleRedAlliances = ref<any[]>([]);
const possibleRedCorporations = ref<any[]>([]);
const possibleRedCharacters = ref<any[]>([]);

function collectPossibleEntities(unassignedKills: any[], team: 'blue' | 'red') {
    const alliancesMap = new Map();
    const corporationsMap = new Map();
    const charactersMap = new Map();

    unassignedKills.forEach(({ killmail }) => {
        // Collect all attackers (not just top damage/final blow)
        for (const attacker of killmail.attackers || []) {
            // Only add if not already in the main team list
            if (team === 'blue') {
                if (attacker.alliance_id && !blueTeamAlliances.value.some(a => a.id === attacker.alliance_id)) {
                    alliancesMap.set(attacker.alliance_id, {
                        id: attacker.alliance_id,
                        name: attacker.alliance_name || 'Unknown',
                        kills: 0,
                        losses: 0,
                        valueInflicted: 0,
                        valueSuffered: 0,
                    });
                }
                if (attacker.corporation_id && !blueTeamCorporations.value.some(c => c.id === attacker.corporation_id)) {
                    corporationsMap.set(attacker.corporation_id, {
                        id: attacker.corporation_id,
                        name: attacker.corporation_name || 'Unknown',
                        kills: 0,
                        losses: 0,
                        valueInflicted: 0,
                        valueSuffered: 0,
                    });
                }
                if (attacker.character_id && !blueTeamCharacters.value.some(c => c.id === attacker.character_id)) {
                    charactersMap.set(attacker.character_id, {
                        id: attacker.character_id,
                        name: attacker.character_name || 'Unknown',
                        kills: 0,
                        losses: 0,
                        valueInflicted: 0,
                        valueSuffered: 0,
                    });
                }
            } else {
                if (attacker.alliance_id && !redTeamAlliances.value.some(a => a.id === attacker.alliance_id)) {
                    alliancesMap.set(attacker.alliance_id, {
                        id: attacker.alliance_id,
                        name: attacker.alliance_name || 'Unknown',
                        kills: 0,
                        losses: 0,
                        valueInflicted: 0,
                        valueSuffered: 0,
                    });
                }
                if (attacker.corporation_id && !redTeamCorporations.value.some(c => c.id === attacker.corporation_id)) {
                    corporationsMap.set(attacker.corporation_id, {
                        id: attacker.corporation_id,
                        name: attacker.corporation_name || 'Unknown',
                        kills: 0,
                        losses: 0,
                        valueInflicted: 0,
                        valueSuffered: 0,
                    });
                }
                if (attacker.character_id && !redTeamCharacters.value.some(c => c.id === attacker.character_id)) {
                    charactersMap.set(attacker.character_id, {
                        id: attacker.character_id,
                        name: attacker.character_name || 'Unknown',
                        kills: 0,
                        losses: 0,
                        valueInflicted: 0,
                        valueSuffered: 0,
                    });
                }
            }
        }
    });

    return {
        alliances: Array.from(alliancesMap.values()),
        corporations: Array.from(corporationsMap.values()),
        characters: Array.from(charactersMap.values()),
    };
}

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

function truncateString(str: any, num: number) {
    if (str === null || str === undefined) return '';
    if (typeof str !== 'string') str = String(str);
    return str.length <= num ? str : str.slice(0, num) + '...';
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

/**
 * Find the top damage attacker from a given team.
 * @param attackers - array of attackers
 * @param allianceSet - Set of alliance IDs for the team
 * @param corpSet - Set of corporation IDs for the team
 * @returns attacker object or null
 */
function getTopDamageAttackerFromTeam(
    attackers: any[],
    allianceSet: Set<number>,
    corpSet: Set<number>
): any | null {
    // Sort attackers by damage_done descending
    const sorted = [...attackers].sort((a, b) => (b.damage_done || 0) - (a.damage_done || 0));
    for (const attacker of sorted) {
        if (
            (attacker.alliance_id && allianceSet.has(attacker.alliance_id)) ||
            (attacker.corporation_id && corpSet.has(attacker.corporation_id))
        ) {
            return attacker;
        }
        // If damage_done is 0, stop searching
        if ((attacker.damage_done || 0) <= 0) break;
    }
    return null;
}

/**
 * Find the top damage attacker from a given team.
 * If no attacker from the correct team is found, but the final blow is from the correct team, use final blow.
 * @param attackers - array of attackers
 * @param allianceSet - Set of alliance IDs for the team
 * @param corpSet - Set of corporation IDs for the team
 * @returns attacker object or null
 */
function getTopDamageOrFinalBlowFromTeam(
    attackers: any[],
    allianceSet: Set<number>,
    corpSet: Set<number>
): any | null {
    // Sort attackers by damage_done descending
    const sorted = [...attackers].sort((a, b) => (b.damage_done || 0) - (a.damage_done || 0));
    for (const attacker of sorted) {
        if (
            (attacker.alliance_id && allianceSet.has(attacker.alliance_id)) ||
            (attacker.corporation_id && corpSet.has(attacker.corporation_id))
        ) {
            return attacker;
        }
        if ((attacker.damage_done || 0) <= 0) break;
    }
    // Fallback: use final blow if from correct team
    const fb = attackers.find(a =>
        a.final_blow &&
        ((a.alliance_id && allianceSet.has(a.alliance_id)) ||
            (a.corporation_id && corpSet.has(a.corporation_id)))
    );
    return fb || null;
}

/**
 * Find the top damage attacker from a given team.
 * @returns { attacker, isKillSteal }
 */
function getTopDamageOrFinalBlowFromTeamWithSteal(
    attackers: any[],
    allianceSet: Set<number>,
    corpSet: Set<number>
): { attacker: any | null, isKillSteal: boolean } {
    // Sort attackers by damage_done descending
    const sorted = [...attackers].sort((a, b) => (b.damage_done || 0) - (a.damage_done || 0));
    for (const attacker of sorted) {
        if (
            (attacker.alliance_id && allianceSet.has(attacker.alliance_id)) ||
            (attacker.corporation_id && corpSet.has(attacker.corporation_id))
        ) {
            return { attacker, isKillSteal: false };
        }
        if ((attacker.damage_done || 0) <= 0) break;
    }
    // Fallback: use final blow if from correct team
    const fb = attackers.find(a =>
        a.final_blow &&
        ((a.alliance_id && allianceSet.has(a.alliance_id)) ||
            (a.corporation_id && corpSet.has(a.corporation_id)))
    );
    if (fb) {
        return { attacker: fb, isKillSteal: true };
    }
    return { attacker: null, isKillSteal: false };
}

function splitKillmailsToSides(killmails: any[], battle: any) {
    const blueAlliancesMap = new Map()
    const blueCorporationsMap = new Map()
    const blueCharactersMap = new Map()
    const redAlliancesMap = new Map()
    const redCorporationsMap = new Map()
    const redCharactersMap = new Map()

    const blueAlliances = new Set(battle.blue_team.alliances.map((a: any) => a.id).filter((id: any) => !!id));
    const blueCorporations = new Set(battle.blue_team.corporations.map((c: any) => c.id));
    const redAlliances = new Set(battle.red_team.alliances.map((a: any) => a.id).filter((id: any) => !!id));
    const redCorporations = new Set(battle.red_team.corporations.map((c: any) => c.id));

    blueTeamKills.value = []
    redTeamKills.value = []
    blueTeamStats.value = { iskLost: 0, shipsLost: 0, damageInflicted: 0 }
    redTeamStats.value = { iskLost: 0, shipsLost: 0, damageInflicted: 0 }
    blueTeamKillSteals.value = [];
    redTeamKillSteals.value = [];
    blueTeamUnassignedKills.value = [];
    redTeamUnassignedKills.value = [];

    killmails.forEach((killmail: any) => {
        let isBlueVictim = false
        let isRedVictim = false

        // Check alliance/corp assignment for victim
        if (killmail.victim.alliance_id && blueAlliances.has(killmail.victim.alliance_id)) {
            isBlueVictim = true
        } else if (killmail.victim.alliance_id && redAlliances.has(killmail.victim.alliance_id)) {
            isRedVictim = true
        } else if (killmail.victim.corporation_id && blueCorporations.has(killmail.victim.corporation_id)) {
            isBlueVictim = true
        } else if (killmail.victim.corporation_id && redCorporations.has(killmail.victim.corporation_id)) {
            isRedVictim = true
        }

        // If victim is not assigned to either side, treat as red by default (to avoid unassigned kills)
        if (!isBlueVictim && !isRedVictim) {
            isRedVictim = true;
        }

        if (isBlueVictim) {
            blueTeamKills.value.push(killmail)
            blueTeamStats.value.iskLost += killmail.total_value
            blueTeamStats.value.shipsLost += 1
            blueTeamStats.value.damageInflicted += killmail.victim.damage_taken
            trackVictimStats(blueAlliancesMap, killmail.victim.alliance_id, killmail.victim.alliance_name, killmail.total_value);
            trackVictimStats(blueCorporationsMap, killmail.victim.corporation_id, killmail.victim.corporation_name, killmail.total_value, killmail.victim.alliance_id, killmail.victim.alliance_name);
            trackVictimStats(blueCharactersMap, killmail.victim.character_id, killmail.victim.character_name, killmail.total_value);
        } else if (isRedVictim) {
            redTeamKills.value.push(killmail)
            redTeamStats.value.iskLost += killmail.total_value
            redTeamStats.value.shipsLost += 1
            redTeamStats.value.damageInflicted += killmail.victim.damage_taken
            trackVictimStats(redAlliancesMap, killmail.victim.alliance_id, killmail.victim.alliance_name, killmail.total_value);
            trackVictimStats(redCorporationsMap, killmail.victim.corporation_id, killmail.victim.corporation_name, killmail.total_value, killmail.victim.alliance_id, killmail.victim.alliance_name);
            trackVictimStats(redCharactersMap, killmail.victim.character_id, killmail.victim.character_name, killmail.total_value);
        }

        // --- Attribution logic: prefer top damage from correct team, fallback to final blow if needed ---
        if (isRedVictim) {
            const { attacker: topBlue, isKillSteal } = getTopDamageOrFinalBlowFromTeamWithSteal(killmail.attackers, blueAlliances, blueCorporations);
            if (topBlue) {
                trackFinalBlowStats(blueAlliancesMap, topBlue.alliance_id, topBlue.alliance_name, killmail.total_value);
                trackFinalBlowStats(blueCorporationsMap, topBlue.corporation_id, topBlue.corporation_name, killmail.total_value, topBlue.alliance_id, topBlue.alliance_name);
                trackFinalBlowStats(blueCharactersMap, topBlue.character_id, topBlue.character_name, killmail.total_value);
                if (isKillSteal) {
                    blueTeamKillSteals.value.push({
                        killmail,
                        stealer: topBlue
                    });
                }
            } else {
                // No attacker from blue team found, unassigned
                blueTeamUnassignedKills.value.push({
                    killmail,
                    reason: "Possible friendly fire / Unassignable to blue team (top damage and final blow not from Blue Team)"
                });
            }
        } else if (isBlueVictim) {
            const { attacker: topRed, isKillSteal } = getTopDamageOrFinalBlowFromTeamWithSteal(killmail.attackers, redAlliances, redCorporations);
            if (topRed) {
                trackFinalBlowStats(redAlliancesMap, topRed.alliance_id, topRed.alliance_name, killmail.total_value);
                trackFinalBlowStats(redCorporationsMap, topRed.corporation_id, topRed.corporation_name, killmail.total_value, topRed.alliance_id, topRed.alliance_name);
                trackFinalBlowStats(redCharactersMap, topRed.character_id, topRed.character_name, killmail.total_value);
                if (isKillSteal) {
                    redTeamKillSteals.value.push({
                        killmail,
                        stealer: topRed
                    });
                }
            } else {
                // No attacker from red team found, unassigned
                redTeamUnassignedKills.value.push({
                    killmail,
                    reason: "Possible friendly fire / Unassignable to red team (top damage and final blow not from Red Team)"
                });
            }
        }
    });

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

watchEffect(() => {
    // Collect possible entities for both teams
    const blue = collectPossibleEntities(blueTeamUnassignedKills.value, 'blue');
    possibleBlueAlliances.value = blue.alliances;
    possibleBlueCorporations.value = blue.corporations;
    possibleBlueCharacters.value = blue.characters;

    const red = collectPossibleEntities(redTeamUnassignedKills.value, 'red');
    possibleRedAlliances.value = red.alliances;
    possibleRedCorporations.value = red.corporations;
    possibleRedCharacters.value = red.characters;
});

const seoData = computed(() => {
    if (!battle.value) return null;
    const systemName = battle.value.system_name || t('battle.unknown_system');
    const regionName = getLocalizedString(battle.value.region_name) || '';
    const start = battle.value.start_time ? formatDate(battle.value.start_time) : '';
    const end = battle.value.end_time ? formatDate(battle.value.end_time) : '';
    const totalIsk = formatIsk(blueTeamStats.value.iskLost + redTeamStats.value.iskLost);
    const totalShips = blueTeamStats.value.shipsLost + redTeamStats.value.shipsLost;
    const title = `Battle in ${systemName} (${regionName}) | ${start} - ${end}`;
    const description = `Battle in ${systemName} (${regionName}) from ${start} to ${end}. ISK Lost: ${totalIsk}, Ships Lost: ${totalShips}.`;
    return {
        title,
        ogImage: '', // Optionally add a system or battle image if available
        description,
    };
});

useSeoMeta({
    title: computed(() => seoData.value?.title || "Battle | EVE-KILL"),
    ogTitle: computed(() => seoData.value?.title || "Battle | EVE-KILL"),
    twitterTitle: computed(() => seoData.value?.title || "Battle | EVE-KILL"),
    description: computed(() => seoData.value?.description || "EVE Online battle details"),
    ogDescription: computed(() => seoData.value?.description || "EVE Online battle details"),
    twitterDescription: computed(() => seoData.value?.description || "EVE Online battle details"),
    ogImage: computed(() => seoData.value?.ogImage || ""),
    twitterImage: computed(() => seoData.value?.ogImage || ""),
    ogType: "website",
    ogSiteName: "EVE-KILL",
    ogUrl: computed(() =>
        battle.value ? `https://eve-kill.com/battle/${route.params.id}` : ""
    ),
    ogLocale: "en_US",
    twitterCard: "summary_large_image",
    twitterSite: "@eve_kill",
    twitterImageAlt: computed(() => battle.value?.system_name || "EVE System"),
    twitterImageWidth: "512",
    twitterImageHeight: "512",
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
