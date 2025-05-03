Pr<template>
    <div class="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
        <!-- Blue Team Losses -->
        <div>
            <div class="mb-2 text-lg font-bold">Blue Team Losses</div>
            <div class="overflow-x-auto" role="table">
                <table class="table-auto min-w-full bg-background-800 rounded-lg shadow-lg">
                    <thead>
                        <tr class="bg-background-900 text-white uppercase text-xs leading-normal">
                            <th class="px-2 py-1 w-[64px]"></th>
                            <th class="px-2 py-1">Ship</th>
                            <th class="px-2 py-1 w-[64px]"></th>
                            <th class="px-2 py-1">Victim</th>
                            <th class="px-2 py-1">Final Blow</th>
                        </tr>
                    </thead>
                    <tbody class="text-background-300 text-sm">
                        <template v-if="blueTeamKills && blueTeamKills.length">
                            <tr v-for="kill in blueTeamKills" :key="kill.killmail_id"
                                class="border-b border-background-700 hover:bg-background-600 transition-colors duration-300 cursor-pointer"
                                @click="goToKill(kill.killmail_id)">
                                <td class="px-2 py-1">
                                    <img :src="`https://images.eve-kill.com/types/${kill.victim.ship_id}/render?size=64`"
                                        :alt="`Ship: ${getLocalizedString(kill.victim.ship_name)}`"
                                        class="w-10 rounded" />
                                </td>
                                <td class="px-2 py-1">
                                    {{ truncateString(getLocalizedString(kill.victim.ship_name), 20) }}<br />
                                    <span v-if="kill.total_value > 50" class="text-background-400">{{
                                        formatNumber(kill.total_value) }} ISK</span>
                                </td>
                                <td class="px-2 py-1">
                                    <img :src="`https://images.eve-kill.com/characters/${kill.victim.character_id}/portrait?size=64`"
                                        :alt="`Character: ${kill.victim.character_name}`" class="w-10 rounded" />
                                </td>
                                <td class="px-2 py-1">
                                    {{ kill.victim.character_name }}<br />
                                    <span class="text-background-400">{{ truncateString(kill.victim.corporation_name,
                                        22) }}</span>
                                </td>
                                <td class="px-2 py-1">
                                    <template v-if="Array.isArray(kill.attackers)">
                                        <template v-for="attacker in kill.attackers"
                                            :key="attacker.character_id || attacker.faction_id">
                                            <template v-if="attacker.final_blow">
                                                <template v-if="kill.is_npc">
                                                    {{ attacker.faction_name }}<br />
                                                    <span class="text-background-400">{{
                                                        truncateString(attacker.ship_group_name, 22) }}</span>
                                                </template>
                                                <template v-else>
                                                    {{ attacker.character_name }}<br />
                                                    <span class="text-background-400">{{
                                                        truncateString(attacker.corporation_name, 22) }}</span>
                                                </template>
                                            </template>
                                        </template>
                                    </template>
                                </td>
                            </tr>
                        </template>
                        <template v-else>
                            <tr>
                                <td class="px-2 py-2 text-center text-background-400" colspan="5">No kills found</td>
                            </tr>
                        </template>
                    </tbody>
                </table>
            </div>
        </div>
        <!-- Red Team Losses -->
        <div>
            <div class="mb-2 text-lg font-bold">Red Team Losses</div>
            <div class="overflow-x-auto" role="table">
                <table class="table-auto min-w-full bg-background-800 rounded-lg shadow-lg">
                    <thead>
                        <tr class="bg-background-900 text-white uppercase text-xs leading-normal">
                            <th class="px-2 py-1 w-[64px]"></th>
                            <th class="px-2 py-1">Ship</th>
                            <th class="px-2 py-1 w-[64px]"></th>
                            <th class="px-2 py-1">Victim</th>
                            <th class="px-2 py-1">Final Blow</th>
                        </tr>
                    </thead>
                    <tbody class="text-background-300 text-sm">
                        <template v-if="redTeamKills && redTeamKills.length">
                            <tr v-for="kill in redTeamKills" :key="kill.killmail_id"
                                class="border-b border-background-700 hover:bg-background-600 transition-colors duration-300 cursor-pointer"
                                @click="goToKill(kill.killmail_id)">
                                <td class="px-2 py-1">
                                    <img :src="kill.victim.ship_image_url ? `${kill.victim.ship_image_url}?size=64` : `https://images.eve-kill.com/types/${kill.victim.ship_id}/render?size=64`"
                                        :alt="`Ship: ${kill.victim.ship_name}`" class="w-10 rounded" />
                                </td>
                                <td class="px-2 py-1">
                                    {{ truncateString(kill.victim, 20) }}<br />
                                    <span v-if="kill.total_value > 50" class="text-background-400">{{
                                        formatNumber(kill.total_value)
                                        }} ISK</span>
                                </td>
                                <td class="px-2 py-1">
                                    <img :src="kill.victim.character_image_url ? `${kill.victim.character_image_url}?size=64` : `https://images.eve-kill.com/characters/${kill.victim.character_id}/portrait?size=64`"
                                        :alt="`Character: ${kill.victim.character_name}`" class="w-10 rounded" />
                                </td>
                                <td class="px-2 py-1">
                                    {{ kill.victim.character_name }}<br />
                                    <span class="text-background-400">{{ truncateString(kill.victim, 22)
                                        }}</span>
                                </td>
                                <td class="px-2 py-1">
                                    <template v-if="Array.isArray(kill.attackers)">
                                        <template v-for="attacker in kill.attackers"
                                            :key="attacker.character_id || attacker.faction_id">
                                            <template v-if="attacker.final_blow">
                                                <template v-if="kill.is_npc">
                                                    {{ attacker.faction_name }}<br />
                                                    <span class="text-background-400">{{
                                                        truncateString(attacker.ship_group_name, 22) }}</span>
                                                </template>
                                                <template v-else>
                                                    {{ attacker.character_name }}<br />
                                                    <span class="text-background-400">{{
                                                        truncateString(attacker.corporation_name, 22) }}</span>
                                                </template>
                                            </template>
                                        </template>
                                    </template>
                                </td>
                            </tr>
                        </template>
                        <template v-else>
                            <tr>
                                <td class="px-2 py-2 text-center text-background-400" colspan="5">No kills found</td>
                            </tr>
                        </template>
                    </tbody>
                </table>
            </div>
        </div>
    </div>
</template>
<script setup lang="ts">
defineProps<{
    blueTeamKills: any[],
    redTeamKills: any[]
}>()
import formatIsk from '~/src/core/utils/formatIsk'
const { locale } = useI18n()

const getLocalizedString = (obj: any, localeKey: string): string => {
    if (!obj) return "";
    return obj[localeKey] || obj.en || "";
};

function truncateString(str: any, num: number) {
    if (str === null || str === undefined) return ''
    if (typeof str !== 'string') str = String(str)
    return str.length <= num ? str : str.slice(0, num) + '...'
}
function formatNumber(n: number) {
    if (typeof n !== 'number') return '0'
    return n.toLocaleString(undefined, { maximumFractionDigits: 2 })
}
function goToKill(killmail_id: number | string) {
    window.location.href = `/kill/${killmail_id}`
}
</script>
