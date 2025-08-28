<template>
    <div
        class="killmail-card bg-gray-50 dark:bg-gray-700 rounded-lg p-3 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors">
        <div class="flex items-center justify-between">
            <div class="flex items-center space-x-3">
                <!-- Victim Ship Icon -->
                <div class="flex-shrink-0">
                    <img :src="`https://images.evetech.net/types/${killmail.victim?.ship_id}/icon?size=32`"
                        :alt="killmail.victim?.ship_name" class="w-8 h-8" loading="lazy">
                </div>

                <!-- Kill Details -->
                <div>
                    <div class="font-medium text-sm">
                        {{ killmail.victim?.character_name || 'Unknown' }}
                    </div>
                    <div class="text-xs text-gray-600 dark:text-gray-400">
                        {{ killmail.victim?.ship_name }} in {{ killmail.system_name }}
                    </div>
                </div>
            </div>

            <!-- Kill Value & Time -->
            <div class="text-right flex-shrink-0">
                <div class="text-sm font-medium text-green-600 dark:text-green-400">
                    {{ formatISK(killmail.total_value || 0) }}
                </div>
                <div class="text-xs text-gray-500">
                    {{ formatTime(killmail.kill_time) }}
                </div>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
interface Props {
    killmail: any
    compact?: boolean
}

const props = withDefaults(defineProps<Props>(), {
    compact: false
})

function formatISK(value: number): string {
    if (value >= 1e12) return `${(value / 1e12).toFixed(1)}T`
    if (value >= 1e9) return `${(value / 1e9).toFixed(1)}B`
    if (value >= 1e6) return `${(value / 1e6).toFixed(1)}M`
    if (value >= 1e3) return `${(value / 1e3).toFixed(1)}K`
    return value.toFixed(0)
}

function formatTime(time: string | Date): string {
    const date = new Date(time)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / (1000 * 60))
    const diffHours = Math.floor(diffMins / 60)
    const diffDays = Math.floor(diffHours / 24)

    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    return `${diffDays}d ago`
}
</script>
