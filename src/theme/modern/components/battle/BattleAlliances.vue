<template>
    <div class="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
        <!-- Blue Team Alliances -->
        <div>
            <div class="mb-2 text-lg font-bold">Blue Team Alliances</div>
            <div class="overflow-x-auto" role="table">
                <table class="table-auto min-w-full bg-background-800 rounded-lg shadow-lg">
                    <thead>
                        <tr class="bg-background-900 text-white uppercase text-xs leading-normal">
                            <th class="px-2 py-1">Alliance</th>
                            <th class="px-2 py-1">Kills</th>
                            <th class="px-2 py-1">Total Value</th>
                        </tr>
                    </thead>
                    <tbody class="text-background-300 text-sm">
                        <tr v-for="alliance in blueTeamAlliances" :key="alliance.id"
                            class="border-b border-background-700 hover:bg-background-600 transition-colors duration-300">
                            <td class="px-2 py-1">{{ alliance.name }}</td>
                            <td class="px-2 py-1">{{ alliance.kills }}</td>
                            <td class="px-2 py-1">{{ formatBillions(alliance.totalValue) }} ISK</td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
        <!-- Red Team Alliances -->
        <div>
            <div class="mb-2 text-lg font-bold">Red Team Alliances</div>
            <div class="overflow-x-auto" role="table">
                <table class="table-auto min-w-full bg-background-800 rounded-lg shadow-lg">
                    <thead>
                        <tr class="bg-background-900 text-white uppercase text-xs leading-normal">
                            <th class="px-2 py-1">Alliance</th>
                            <th class="px-2 py-1">Kills</th>
                            <th class="px-2 py-1">Total Value</th>
                        </tr>
                    </thead>
                    <tbody class="text-background-300 text-sm">
                        <tr v-for="alliance in redTeamAlliances" :key="alliance.id"
                            class="border-b border-background-700 hover:bg-background-600 transition-colors duration-300">
                            <td class="px-2 py-1">{{ alliance.name }}</td>
                            <td class="px-2 py-1">{{ alliance.kills }}</td>
                            <td class="px-2 py-1">{{ formatBillions(alliance.totalValue) }} ISK</td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    </div>
</template>
<script setup lang="ts">
defineProps<{
    blueTeamAlliances: any[],
    redTeamAlliances: any[]
}>()
function formatBillions(n: number) {
    if (typeof n !== 'number') return '0'
    if (n >= 1e9) return (n / 1e9).toLocaleString(undefined, { maximumFractionDigits: 2 }) + 'B'
    if (n >= 1e6) return (n / 1e6).toLocaleString(undefined, { maximumFractionDigits: 2 }) + 'M'
    return n.toLocaleString(undefined, { maximumFractionDigits: 2 })
}
</script>
