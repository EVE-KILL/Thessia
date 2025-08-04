<template>
    <div class="bg-zinc-800 border border-zinc-600 rounded-lg p-4">
        <h3 class="text-sm font-semibold text-zinc-300 mb-3">Active Filters</h3>

        <div v-if="activeFilters.total === 0" class="text-zinc-500 text-sm">
            No filters applied
        </div>

        <div v-else class="space-y-2">
            <div v-if="activeFilters.location > 0" class="flex items-center text-sm">
                <div class="w-2 h-2 bg-blue-500 mr-2"></div>
                <span class="text-zinc-300">Location</span>
                <span class="ml-auto text-zinc-400">{{ activeFilters.location }}</span>
            </div>

            <div v-if="activeFilters.security > 0" class="flex items-center text-sm">
                <div class="w-2 h-2 bg-green-500 mr-2"></div>
                <span class="text-zinc-300">Security</span>
                <span class="ml-auto text-zinc-400">{{ activeFilters.security }}</span>
            </div>

            <div v-if="activeFilters.killType > 0" class="flex items-center text-sm">
                <div class="w-2 h-2 bg-yellow-500 mr-2"></div>
                <span class="text-zinc-300">Kill Type</span>
                <span class="ml-auto text-zinc-400">{{ activeFilters.killType }}</span>
            </div>

            <div v-if="activeFilters.iskValue > 0" class="flex items-center text-sm">
                <div class="w-2 h-2 bg-purple-500 mr-2"></div>
                <span class="text-zinc-300">ISK Value</span>
                <span class="ml-auto text-zinc-400">{{ activeFilters.iskValue }}</span>
            </div>

            <div v-if="activeFilters.shipCategory > 0" class="flex items-center text-sm">
                <div class="w-2 h-2 bg-red-500 mr-2"></div>
                <span class="text-zinc-300">Ship Category</span>
                <span class="ml-auto text-zinc-400">{{ activeFilters.shipCategory }}</span>
            </div>

            <div v-if="activeFilters.facets > 0" class="flex items-center text-sm">
                <div class="w-2 h-2 bg-orange-500 mr-2"></div>
                <span class="text-zinc-300">Search Terms</span>
                <span class="ml-auto text-zinc-400">{{ activeFilters.facets }}</span>
            </div>

            <div class="border-t border-zinc-600 pt-2 mt-3">
                <div class="flex items-center text-sm font-medium">
                    <span class="text-zinc-200">Total</span>
                    <span class="ml-auto text-blue-400">{{ activeFilters.total }}</span>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
// Props
interface Props {
    activeFilters: {
        location: number
        security: number
        killType: number
        iskValue: number
        shipCategory: number
        facets: number
        total: number
    }
}

defineProps<Props>()
</script>
