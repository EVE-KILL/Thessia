<template>
    <div class="mt-4">
        <div class="overflow-x-auto col-span-2" role="table">
            <table class="table-auto min-w-full bg-background-800 rounded-lg shadow-lg">
                <thead>
                    <tr class="bg-background-900 text-white uppercase text-xs leading-normal">
                        <th class="px-2 py-1 text-right">Blue Team Losses</th>
                        <th class="px-2 py-1 text-center">VS</th>
                        <th class="px-2 py-1 text-left">Red Team Losses</th>
                    </tr>
                </thead>
                <tbody class="text-background-300 text-sm">
                    <tr v-for="kill in sortedKillmails" :key="kill.killmail_id"
                        class="border-b border-background-700 hover:bg-background-600 transition-colors duration-300 cursor-pointer"
                        @click="goToKill(kill.killmail_id)" role="button"
                        :aria-label="`View killmail details for ${kill.victim.character_name} in ${getLocalizedString(kill.victim.ship_name)}`"
                        tabindex="0">
                        <!-- Blue Team Kill -->
                        <template v-if="isBlueTeamKill(kill)">
                            <td class="text-right">
                                <div class="flex justify-between items-center">
                                    <div class="text-center">
                                        <div class="font-bold">{{
                                            truncateString(getLocalizedString(kill.victim.ship_name), 20) }}</div>
                                        <div class="text-xs">{{ kill.victim }}</div>
                                    </div>
                                    <div class="text-center mx-4">
                                        <div class="font-bold">{{ kill.victim.character_name }}</div>
                                        <div class="text-xs">{{ formatNumber(kill.victim.damage_taken) }} damage</div>
                                    </div>
                                    <div class="flex flex-col items-start">
                                        <div class="flex flex-row items-center">
                                            <div class="text-xs mr-4">{{ formatDate(kill.kill_time) }}</div>
                                            <img :src="`https://images.eve-kill.com/types/${kill.victim.ship_id}/icon`"
                                                :alt="kill.victim.ship_type" class="h-12 w-12" />
                                        </div>
                                    </div>
                                </div>
                            </td>
                            <td class="text-center h-full w-px bg-background-600"></td>
                            <td></td>
                        </template>
                        <!-- Red Team Kill -->
                        <template v-else>
                            <td></td>
                            <td class="text-center h-full w-px bg-background-600"></td>
                            <td class="text-left">
                                <div class="flex justify-between items-center">
                                    <div class="flex flex-col items-start mr-4">
                                        <div class="flex flex-row items-center">
                                            <img :src="`https://images.eve-kill.com/types/${kill.victim.ship_id}/icon`"
                                                :alt="kill.victim.ship_type" class="h-12 w-12" />
                                            <div class="text-xs ml-4">{{ formatDate(kill.kill_time) }}</div>
                                        </div>
                                    </div>
                                    <div class="text-center mx-4">
                                        <div class="font-bold">{{ kill.victim.character_name }}</div>
                                        <div class="text-xs">{{ formatNumber(kill.victim.damage_taken) }} damage</div>
                                    </div>
                                    <div class="text-center mx-4">
                                        <div class="font-bold">{{
                                            truncateString(getLocalizedString(kill.victim.ship_name), 20) }}</div>
                                        <div class="text-xs">{{ getLocalizedString(kill.victim.ship_group_name) }}</div>
                                    </div>
                                </div>
                            </td>
                        </template>
                    </tr>
                </tbody>
            </table>
        </div>
    </div>
</template>
<script setup lang="ts">
defineProps<{
    killmails: any[],
    battle: any
}>()
import { computed } from 'vue'
const { locale } = useI18n();

const getLocalizedString = (obj: any, localeKey: string): string => {
    if (!obj) return "";
    return obj[localeKey] || obj.en || "";
};

function formatDate(time: string | number) {
    // Accepts unix timestamp or string
    if (typeof time === 'number') return new Date(time * 1000).toLocaleString()
    return new Date(time).toLocaleString()
}
function formatNumber(n: number) {
    if (typeof n !== 'number') return '0'
    return n.toLocaleString(undefined, { maximumFractionDigits: 2 })
}
function truncateString(str: any, num: number) {
    if (str === null || str === undefined) return ''
    if (typeof str !== 'string') str = String(str)
    return str.length <= num ? str : str.slice(0, num) + '...'
}
function goToKill(killmail_id: number | string) {
    window.location.href = `/kill/${killmail_id}`
}
function isBlueTeamKill(kill: any) {
    if (!__props.battle) return false
    const blueAlliances = (__props.battle.blue_team?.alliances || []).map((a: any) => a.id)
    const blueCorporations = (__props.battle.blue_team?.corporations || []).map((c: any) => c.id)
    return (
        blueAlliances.includes(kill.victim.alliance_id) ||
        blueCorporations.includes(kill.victim.corporation_id)
    )
}
const sortedKillmails = computed(() => {
    if (!Array.isArray(__props.killmails)) return []
    // Accept both unix timestamp and string
    return [...__props.killmails].sort((a, b) => {
        const aTime = typeof a.kill_time === 'number' ? a.kill_time : new Date(a.kill_time).getTime()
        const bTime = typeof b.kill_time === 'number' ? b.kill_time : new Date(b.kill_time).getTime()
        return aTime - bTime
    })
})
</script>
