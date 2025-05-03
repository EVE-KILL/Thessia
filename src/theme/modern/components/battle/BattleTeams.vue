<template>
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <!-- Blue Team -->
        <div>
            <div class="bg-background-800 p-4 rounded-lg shadow-lg">
                <div class="mb-2 text-sm text-background-400">
                    ISK Lost: {{ formatIsk(blueTeamStats.iskLost) }} ISK | Ships Lost: {{ blueTeamStats.shipsLost }} |
                    Damage Inflicted: {{ formatNumber(blueTeamStats.damageInflicted) }}
                </div>
                <ul class="list-none">
                    <!-- Alliances and their Corporations -->
                    <li v-for="alliance in blueTeamAlliances" :key="alliance.id" class="mb-2">
                        <details>
                            <summary class="flex items-center cursor-pointer text-xl font-bold">
                                {{ alliance.name }} ({{blueTeamCorporations.filter(corp => corp.alliance_id ===
                                alliance.id).length }})
                            </summary>
                            <ul class="ml-4 mt-1 text-sm list-disc">
                                <li v-for="corp in blueTeamCorporations.filter(corp => corp.alliance_id === alliance.id)"
                                    :key="corp.id">
                                    - {{ corp.name }}
                                </li>
                            </ul>
                        </details>
                    </li>
                    <!-- Space between alliances and standalone corporations -->
                    <li class="my-4"></li>
                    <!-- Standalone Corporations -->
                    <li v-if="blueTeamCorporations.filter(corp => !corp.alliance_id).length > 0" class="mt-4">
                        <details>
                            <summary class="flex items-center cursor-pointer font-bold text-lg">
                                Standalone Corporations ({{blueTeamCorporations.filter(corp =>
                                !corp.alliance_id).length }})
                            </summary>
                            <ul class="ml-4 mt-1 list-disc text-sm">
                                <li v-for="corp in blueTeamCorporations.filter(corp => !corp.alliance_id)"
                                    :key="corp.id">
                                    - {{ corp.name }}
                                </li>
                            </ul>
                        </details>
                    </li>
                </ul>
            </div>
        </div>
        <!-- Red Team -->
        <div>
            <div class="bg-background-800 p-4 rounded-lg shadow-lg">
                <div class="mb-2 text-sm text-background-400">
                    ISK Lost: {{ formatIsk(redTeamStats.iskLost) }} ISK | Ships Lost: {{ redTeamStats.shipsLost }} |
                    Damage Inflicted: {{ formatNumber(redTeamStats.damageInflicted) }}
                </div>
                <ul class="list-none">
                    <!-- Alliances and their Corporations -->
                    <li v-for="alliance in redTeamAlliances" :key="alliance.id" class="mb-2">
                        <details>
                            <summary class="flex items-center cursor-pointer text-xl font-bold">
                                {{ alliance.name }} ({{redTeamCorporations.filter(corp => corp.alliance_id ===
                                alliance.id).length }})
                            </summary>
                            <ul class="ml-4 mt-1 text-sm list-disc">
                                <li v-for="corp in redTeamCorporations.filter(corp => corp.alliance_id === alliance.id)"
                                    :key="corp.id">
                                    - {{ corp.name }}
                                </li>
                            </ul>
                        </details>
                    </li>
                    <!-- Space between alliances and standalone corporations -->
                    <li class="my-4"></li>
                    <!-- Standalone Corporations -->
                    <li v-if="redTeamCorporations.filter(corp => !corp.alliance_id).length > 0" class="mt-4">
                        <details>
                            <summary class="flex items-center cursor-pointer font-bold text-lg">
                                Standalone Corporations ({{redTeamCorporations.filter(corp => !corp.alliance_id).length
                                }})
                            </summary>
                            <ul class="ml-4 mt-1 list-disc text-sm">
                                <li v-for="corp in redTeamCorporations.filter(corp => !corp.alliance_id)"
                                    :key="corp.id">
                                    - {{ corp.name }}
                                </li>
                            </ul>
                        </details>
                    </li>
                </ul>
            </div>
        </div>
    </div>
</template>
<script setup lang="ts">
defineProps<{
    blueTeamStats: { iskLost: number, shipsLost: number, damageInflicted: number },
    redTeamStats: { iskLost: number, shipsLost: number, damageInflicted: number },
    blueTeamAlliances: any[],
    redTeamAlliances: any[],
    blueTeamCorporations: any[],
    redTeamCorporations: any[]
}>()
import formatIsk from '~/src/core/utils/formatIsk'
function formatNumber(n: number) {
    if (typeof n !== 'number') return '0'
    return n.toLocaleString(undefined, { maximumFractionDigits: 2 })
}
</script>
