<template>
    <div class="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
        <!-- Blue Team Characters -->
        <div>
            <div class="mb-2 text-lg font-bold">Blue Team Characters</div>
            <div class="overflow-x-auto" role="table">
                <table class="table-auto min-w-full bg-background-800 rounded-lg shadow-lg">
                    <thead>
                        <tr class="bg-background-900 text-white uppercase text-xs leading-normal">
                            <th class="px-2 py-1">Portrait</th>
                            <th class="px-2 py-1">Name</th>
                            <th class="px-2 py-1">Kills</th>
                            <th class="px-2 py-1">Total Value</th>
                        </tr>
                    </thead>
                    <tbody class="text-background-300 text-sm">
                        <tr v-for="char in blueTeamCharacters" :key="char.id"
                            class="border-b border-background-700 hover:bg-background-600 transition-colors duration-300">
                            <td class="px-2 py-1">
                                <img :src="`https://images.eve-kill.com/characters/${char.id}/portrait?size=64`"
                                    :alt="`Character: ${char.name}`" class="w-8 h-8 rounded-full" />
                            </td>
                            <td class="px-2 py-1">{{ char.name }}</td>
                            <td class="px-2 py-1">{{ char.kills }}</td>
                            <td class="px-2 py-1">{{ formatBillions(char.totalValue) }} ISK</td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
        <!-- Red Team Characters -->
        <div>
            <div class="mb-2 text-lg font-bold">Red Team Characters</div>
            <div class="overflow-x-auto" role="table">
                <table class="table-auto min-w-full bg-background-800 rounded-lg shadow-lg">
                    <thead>
                        <tr class="bg-background-900 text-white uppercase text-xs leading-normal">
                            <th class="px-2 py-1">Portrait</th>
                            <th class="px-2 py-1">Name</th>
                            <th class="px-2 py-1">Kills</th>
                            <th class="px-2 py-1">Total Value</th>
                        </tr>
                    </thead>
                    <tbody class="text-background-300 text-sm">
                        <tr v-for="char in redTeamCharacters" :key="char.id"
                            class="border-b border-background-700 hover:bg-background-600 transition-colors duration-300">
                            <td class="px-2 py-1">
                                <img :src="`https://images.eve-kill.com/characters/${char.id}/portrait?size=64`"
                                    :alt="`Character: ${char.name}`" class="w-8 h-8 rounded-full" />
                            </td>
                            <td class="px-2 py-1">{{ char.name }}</td>
                            <td class="px-2 py-1">{{ char.kills }}</td>
                            <td class="px-2 py-1">{{ formatBillions(char.totalValue) }} ISK</td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    </div>
</template>
<script setup lang="ts">
defineProps<{
    blueTeamCharacters: any[],
    redTeamCharacters: any[]
}>()
function formatBillions(n: number) {
    if (typeof n !== 'number') return '0'
    if (n >= 1e9) return (n / 1e9).toLocaleString(undefined, { maximumFractionDigits: 2 }) + 'B'
    if (n >= 1e6) return (n / 1e6).toLocaleString(undefined, { maximumFractionDigits: 2 }) + 'M'
    return n.toLocaleString(undefined, { maximumFractionDigits: 2 })
}
</script>
