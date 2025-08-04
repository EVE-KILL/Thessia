<template>
    <div class="bg-zinc-900 border border-zinc-700 rounded-lg p-6 mb-6">
        <h2 class="text-lg font-semibold text-zinc-100 mb-4">Advanced Search</h2>

        <!-- Search Input -->
        <div class="relative mb-4">
            <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg class="h-5 w-5 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
            </div>
            <input v-model="searchTerm" type="text"
                placeholder="Search for pilots, corporations, alliances, or ships..."
                class="w-full pl-10 pr-4 py-3 bg-zinc-800 border border-zinc-600 rounded-lg text-zinc-100 placeholder-zinc-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                @input="onSearchInput" @keydown.enter="onSearchEnter" />
            <!-- Loading indicator -->
            <div v-if="isSearching" class="absolute inset-y-0 right-0 pr-3 flex items-center">
                <div class="animate-spin h-5 w-5 border-2 border-blue-500 border-t-transparent"></div>
            </div>
        </div>

        <!-- Search Results Dropdown -->
        <div v-if="searchResults.length > 0"
            class="absolute z-50 w-full mt-1 bg-zinc-800 border border-zinc-600 rounded-lg shadow-lg max-h-80 overflow-y-auto">
            <div v-for="result in searchResults" :key="`${result.type}-${result.id}`"
                class="px-4 py-3 hover:bg-zinc-700 cursor-pointer border-b border-zinc-600 last:border-b-0"
                @click="selectSearchResult(result)">
                <div class="flex items-center justify-between">
                    <div>
                        <div class="text-zinc-100 font-medium">{{ result.name }}</div>
                        <div class="text-zinc-400 text-sm capitalize">{{ result.type }}</div>
                    </div>
                    <div class="text-zinc-500 text-sm">{{ formatResultType(result.type) }}</div>
                </div>
            </div>
        </div>

        <!-- Selected Facets Display -->
        <div v-if="selectedFacets.length > 0" class="flex flex-wrap gap-2 mt-4">
            <div v-for="(facet, index) in selectedFacets" :key="index"
                class="inline-flex items-center bg-blue-600 text-white text-sm px-3 py-1">
                <span>{{ formatFacetDisplay(facet) }}</span>
                <button @click="removeFacet(index)" class="ml-2 hover:bg-blue-700 p-1">
                    <svg class="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                            d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'

interface SearchResult {
    id: number
    name: string
    type: 'character' | 'corporation' | 'alliance' | 'ship'
}

// Props
interface Props {
    modelValue: SearchFacet[]
}

// Emits
interface Emits {
    (e: 'update:modelValue', value: SearchFacet[]): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

// Reactive data
const searchTerm = ref('')
const isSearching = ref(false)
const searchResults = ref<SearchResult[]>([])
const selectedFacets = ref<SearchFacet[]>(props.modelValue)

// Watch for external changes to modelValue
watch(() => props.modelValue, (newValue) => {
    selectedFacets.value = newValue
})

// Watch for changes to selectedFacets and emit updates
watch(selectedFacets, (newValue) => {
    emit('update:modelValue', newValue)
}, { deep: true })

// Search functionality
let searchTimeout: NodeJS.Timeout | null = null

const onSearchInput = () => {
    if (searchTimeout) {
        clearTimeout(searchTimeout)
    }

    searchTimeout = setTimeout(() => {
        performSearch()
    }, 300) // 300ms debounce
}

const performSearch = async () => {
    if (!searchTerm.value.trim() || searchTerm.value.length < 2) {
        searchResults.value = []
        return
    }

    isSearching.value = true

    try {
        const response = await $fetch(`/api/search/${encodeURIComponent(searchTerm.value.trim())}`)
        searchResults.value = response || []
    } catch (error) {
        console.error('Search error:', error)
        searchResults.value = []
    } finally {
        isSearching.value = false
    }
}

const onSearchEnter = () => {
    if (searchResults.value.length > 0) {
        selectSearchResult(searchResults.value[0]!)
    }
}

const selectSearchResult = (result: SearchResult) => {
    const facet: SearchFacet = {
        field: getFieldForType(result.type, result.id),
        operator: '$eq',
        value: result.id,
        label: result.name,
        type: result.type
    }

    // Check if this facet already exists
    const existingIndex = selectedFacets.value.findIndex(f =>
        f.field === facet.field && f.value === facet.value
    )

    if (existingIndex === -1) {
        selectedFacets.value.push(facet)
    }

    // Clear search
    searchTerm.value = ''
    searchResults.value = []
}

const getFieldForType = (type: string, id: number): string => {
    switch (type) {
        case 'character':
            return 'victim.character_id' // Could be extended to include attackers
        case 'corporation':
            return 'victim.corporation_id'
        case 'alliance':
            return 'victim.alliance_id'
        case 'ship':
            return 'victim.ship_id'
        default:
            return 'victim.character_id'
    }
}

const formatResultType = (type: string): string => {
    switch (type) {
        case 'character':
            return 'Pilot'
        case 'corporation':
            return 'Corp'
        case 'alliance':
            return 'Alliance'
        case 'ship':
            return 'Ship'
        default:
            return type
    }
}

const formatFacetDisplay = (facet: SearchFacet): string => {
    const operatorText = facet.operator === '$eq' ? '' : ` ${facet.operator}`
    return `${facet.label || facet.value}${operatorText}`
}

const removeFacet = (index: number) => {
    selectedFacets.value.splice(index, 1)
}
</script>
