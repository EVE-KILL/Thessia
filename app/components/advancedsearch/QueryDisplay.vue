<template>
    <div class="bg-zinc-900 border border-zinc-700 rounded-lg p-6 mt-6">
        <div class="flex items-center justify-between mb-4">
            <h3 class="text-lg font-semibold text-zinc-100">MongoDB Query</h3>
            <div class="flex gap-2">
                <button @click="copyQuery"
                    class="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors">
                    Copy
                </button>
                <button @click="toggleExpanded"
                    class="px-3 py-1 text-sm bg-zinc-700 text-zinc-300 rounded hover:bg-zinc-600 transition-colors">
                    {{ isExpanded ? 'Collapse' : 'Expand' }}
                </button>
            </div>
        </div>

        <div class="relative">
            <pre :class="[
                'bg-zinc-800 border border-zinc-600 rounded-lg p-4 text-sm text-zinc-200 font-mono overflow-x-auto',
                isExpanded ? 'max-h-none' : 'max-h-48'
            ]"><code>{{ formattedQuery }}</code></pre>

            <!-- Copy success indicator -->
            <div v-if="showCopySuccess"
                class="absolute top-2 right-2 bg-green-600 text-white text-xs px-2 py-1 rounded">
                Copied!
            </div>
        </div>

        <!-- Query stats -->
        <div class="mt-4 flex items-center gap-6 text-sm text-zinc-400">
            <span>Size: {{ querySize }} bytes</span>
            <span>Conditions: {{ conditionCount }}</span>
            <span v-if="estimatedResults">Est. Results: {{ estimatedResults }}</span>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

// Props
interface Props {
    query: QueryAPIRequest | null
}

const props = defineProps<Props>()

// Reactive data
const isExpanded = ref(false)
const showCopySuccess = ref(false)

// Computed properties
const formattedQuery = computed(() => {
    if (!props.query) {
        return 'No query generated'
    }

    try {
        return JSON.stringify(props.query, null, 2)
    } catch (error) {
        return 'Error formatting query'
    }
})

const querySize = computed(() => {
    if (!props.query) return 0
    return new TextEncoder().encode(JSON.stringify(props.query)).length
})

const conditionCount = computed(() => {
    if (!props.query || !props.query.filter) return 0

    // Count conditions recursively
    const countConditions = (filter: any): number => {
        if (!filter || typeof filter !== 'object') return 0

        let count = 0

        if (filter.$and && Array.isArray(filter.$and)) {
            count += filter.$and.reduce((sum: number, condition: any) => sum + countConditions(condition), 0)
        } else if (filter.$or && Array.isArray(filter.$or)) {
            count += filter.$or.reduce((sum: number, condition: any) => sum + countConditions(condition), 0)
        } else {
            // Count leaf conditions
            count += Object.keys(filter).filter(key => !key.startsWith('$')).length
        }

        return count
    }

    return countConditions(props.query.filter)
})

const estimatedResults = computed(() => {
    // This could be enhanced to provide actual estimates based on the query
    // For now, just return null to hide the estimate
    return null
})

// Methods
const toggleExpanded = () => {
    isExpanded.value = !isExpanded.value
}

const copyQuery = async () => {
    if (!props.query) return

    try {
        await navigator.clipboard.writeText(JSON.stringify(props.query, null, 2))
        showCopySuccess.value = true
        setTimeout(() => {
            showCopySuccess.value = false
        }, 2000)
    } catch (error) {
        console.error('Failed to copy query:', error)
    }
}
</script>
