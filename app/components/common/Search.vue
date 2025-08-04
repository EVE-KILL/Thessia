<template>
    <div class="search-component" :class="wrapperClass">
        <slot name="input" v-bind="slotProps">
            <!-- Default input implementation -->
            <div class="relative">
                <input :value="modelValue" @input="handleInput" @keydown="handleKeyDown" @focus="handleFocus"
                    @blur="handleBlur" :placeholder="placeholder" :disabled="disabled"
                    :class="inputClass || 'w-full'" />
                <div v-if="showClearButton && modelValue" @click="clearSearch"
                    class="absolute right-2 top-1/2 transform -translate-y-1/2 cursor-pointer text-gray-400 hover:text-gray-600">
                    <UIcon name="lucide:x" class="w-4 h-4" />
                </div>
            </div>
        </slot>

        <!-- Dropdown -->
        <div v-if="showDropdown && (hasResults || isLoading || hasError)" :class="[
            'absolute z-50 mt-1',
            dropdownClass || 'bg-white border border-gray-300 rounded-md shadow-lg'
        ]">

            <!-- Loading State -->
            <slot name="loading" v-bind="slotProps" v-if="isLoading">
                <div class="p-3 text-center">
                    <UIcon name="lucide:loader-2" class="w-4 h-4 animate-spin inline mr-2" />
                    {{ loadingText }}
                </div>
            </slot>

            <!-- Error State -->
            <slot name="error" v-bind="slotProps" v-else-if="hasError">
                <div class="p-3 text-center">
                    <UIcon name="lucide:alert-circle" class="w-4 h-4 inline mr-2" />
                    {{ errorText }}
                </div>
            </slot>

            <!-- No Results -->
            <slot name="no-results" v-bind="slotProps" v-else-if="!hasResults && searchValue">
                <div class="p-3 text-center">
                    <UIcon name="lucide:search" class="w-4 h-4 inline mr-2" />
                    {{ noResultsText }}
                </div>
            </slot>

            <!-- Results -->
            <slot name="results" v-bind="slotProps" v-else-if="hasResults">
                <!-- Default results implementation -->
                <div v-for="(result, index) in results" :key="getResultKey(result, index)" @click="selectResult(result)"
                    @mouseenter="highlightedIndex = index" :class="[
                        'p-3 cursor-pointer flex items-center space-x-3',
                        { 'font-bold': highlightedIndex === index }
                    ]">

                    <!-- Image if available -->
                    <div v-if="getResultImage(result)" class="flex-shrink-0">
                        <img :src="getResultImage(result)" :alt="getResultName(result)"
                            class="w-8 h-8 rounded object-cover"
                            @error="(e) => ((e.target as HTMLImageElement).src = getDefaultImage(result) || '/images/default-avatar.png')" />
                        />
                    </div>

                    <!-- Result content -->
                    <div class="flex-grow min-w-0">
                        <div class="font-medium text-gray-900 dark:text-white truncate">
                            {{ getResultName(result) }}
                        </div>
                        <div v-if="getResultDescription(result)"
                            class="text-sm text-gray-500 dark:text-gray-400 truncate">
                            {{ getResultDescription(result) }}
                        </div>
                    </div>

                    <!-- Badge/Type indicator -->
                    <div v-if="getResultType(result)" class="flex-shrink-0">
                        <span
                            class="inline-flex items-center px-2 py-1 text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200">
                            {{ getResultType(result) }}
                        </span>
                    </div>
                </div>
            </slot>
        </div>
    </div>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'

// Props
interface SearchProps {
    modelValue: string
    placeholder?: string
    disabled?: boolean
    debounceMs?: number
    minLength?: number
    maxResults?: number
    apiUrl?: string | ((query: string) => string)
    apiParams?: Record<string, any> | ((query: string) => Record<string, any>)
    transformResponse?: (response: any) => any[]
    resultKey?: string | ((result: any, index: number) => string)
    resultName?: string | ((result: any) => string)
    resultDescription?: string | ((result: any) => string)
    resultImage?: string | ((result: any) => string)
    resultType?: string | ((result: any) => string)
    defaultImage?: string | ((result: any) => string)
    loadingText?: string
    errorText?: string
    noResultsText?: string
    showClearButton?: boolean
    wrapperClass?: string
    inputClass?: string
    dropdownClass?: string
    autoFocus?: boolean
    closeOnSelect?: boolean
}

const props = withDefaults(defineProps<SearchProps>(), {
    placeholder: 'Search...',
    disabled: false,
    debounceMs: 300,
    minLength: 2,
    maxResults: 10,
    resultKey: 'id',
    resultName: 'name',
    loadingText: 'Searching...',
    errorText: 'Search failed',
    noResultsText: 'No results found',
    showClearButton: true,
    autoFocus: false,
    closeOnSelect: true
})

// Emits
const emit = defineEmits<{
    'update:modelValue': [value: string]
    'search': [query: string]
    'select': [result: any]
    'clear': []
    'focus': []
    'blur': []
    'dropdown-visibility-changed': [visible: boolean]
}>()

// State
const searchValue = ref(props.modelValue)
const results = ref<any[]>([])
const isLoading = ref(false)
const error = ref<any>(null)
const showDropdown = ref(false)
const highlightedIndex = ref(-1)
const debounceTimeout = ref<NodeJS.Timeout>()
const isUserTyping = ref(false)

// Computed
const hasResults = computed(() => results.value.length > 0)
const hasError = computed(() => !!error.value)

// Slot props for maximum flexibility
const slotProps = computed(() => ({
    // Search state
    modelValue: searchValue.value,
    searchValue: searchValue.value,
    results: results.value,
    isLoading: isLoading.value,
    error: error.value,
    hasResults: hasResults.value,
    hasError: hasError.value,

    // UI state
    showDropdown: showDropdown.value,
    highlightedIndex: highlightedIndex.value,

    // Methods
    updateQuery: handleInput,
    selectResult: selectResult,
    clearSearch: clearSearch,
    performSearch: performSearch,

    // Getters
    getResultKey,
    getResultName,
    getResultDescription,
    getResultImage,
    getResultType,
    getDefaultImage
}))

// Watchers
watch(() => props.modelValue, (newValue) => {
    if (searchValue.value !== newValue) {
        isUserTyping.value = false // Reset when value is set programmatically
        searchValue.value = newValue
    }
})

watch(searchValue, (newValue) => {
    emit('update:modelValue', newValue)
    debouncedSearch(newValue)
})

watch(showDropdown, (visible) => {
    emit('dropdown-visibility-changed', visible)
})

// Methods
const handleInput = (event: Event) => {
    const target = event.target as HTMLInputElement
    isUserTyping.value = true
    searchValue.value = target.value
}

const handleKeyDown = (event: KeyboardEvent) => {
    if (!showDropdown.value || !hasResults.value) return

    switch (event.key) {
        case 'ArrowDown':
            event.preventDefault()
            highlightedIndex.value = Math.min(highlightedIndex.value + 1, results.value.length - 1)
            break
        case 'ArrowUp':
            event.preventDefault()
            highlightedIndex.value = Math.max(highlightedIndex.value - 1, -1)
            break
        case 'Enter':
            event.preventDefault()
            if (highlightedIndex.value >= 0 && results.value[highlightedIndex.value]) {
                selectResult(results.value[highlightedIndex.value])
            }
            break
        case 'Escape':
            showDropdown.value = false
            highlightedIndex.value = -1
            break
    }
}

const handleFocus = () => {
    // Don't automatically show dropdown on focus
    // Only show when user starts typing
    emit('focus')
}

const handleBlur = () => {
    // Delay hiding dropdown to allow for click events
    setTimeout(() => {
        showDropdown.value = false
        highlightedIndex.value = -1
    }, 150)
    emit('blur')
}

const debouncedSearch = (query: string) => {
    clearTimeout(debounceTimeout.value)

    if (query.length < props.minLength) {
        results.value = []
        showDropdown.value = false
        return
    }

    debounceTimeout.value = setTimeout(() => {
        performSearch(query)
    }, props.debounceMs)
}

const performSearch = async (query: string = searchValue.value) => {
    if (!query || query.length < props.minLength) {
        results.value = []
        showDropdown.value = false
        return
    }

    try {
        isLoading.value = true
        error.value = null
        emit('search', query)

        // If no API URL provided, just emit the search event
        if (!props.apiUrl) {
            isLoading.value = false
            return
        }

        // Build API URL
        const url = typeof props.apiUrl === 'function'
            ? props.apiUrl(query)
            : props.apiUrl

        // Build API params
        let params: Record<string, any> = {}
        if (props.apiParams) {
            params = typeof props.apiParams === 'function'
                ? props.apiParams(query)
                : { ...props.apiParams }
        }

        // Add query to params if not already present
        if (!params.q && !params.query && !params.search) {
            params.q = query
        }

        // Perform search
        const response = await $fetch(url, { query: params })

        // Transform response if needed
        let searchResults: any[] = []
        if (props.transformResponse) {
            searchResults = props.transformResponse(response)
        } else if ((response as any)?.data && Array.isArray((response as any).data)) {
            searchResults = (response as any).data
        } else if ((response as any)?.results && Array.isArray((response as any).results)) {
            searchResults = (response as any).results
        } else if ((response as any)?.hits && Array.isArray((response as any).hits)) {
            searchResults = (response as any).hits
        } else if (Array.isArray(response)) {
            searchResults = response as any[]
        } else {
            searchResults = []
        }

        // Limit results
        if (props.maxResults && searchResults.length > props.maxResults) {
            searchResults = searchResults.slice(0, props.maxResults)
        }

        results.value = searchResults
        showDropdown.value = searchResults.length > 0 && isUserTyping.value
        highlightedIndex.value = -1

    } catch (err) {
        error.value = err
        results.value = []
        showDropdown.value = true // Show error in dropdown
        console.error('Search error:', err)
    } finally {
        isLoading.value = false
    }
}

const selectResult = (result: any) => {
    isUserTyping.value = false
    emit('select', result)

    if (props.closeOnSelect) {
        showDropdown.value = false
        highlightedIndex.value = -1
    }
}

const clearSearch = () => {
    searchValue.value = ''
    results.value = []
    showDropdown.value = false
    highlightedIndex.value = -1
    emit('clear')
}

// Getter functions
const getResultKey = (result: any, index: number): string => {
    if (typeof props.resultKey === 'function') {
        return props.resultKey(result, index)
    }
    return result[props.resultKey] || index.toString()
}

const getResultName = (result: any): string => {
    if (typeof props.resultName === 'function') {
        return props.resultName(result)
    }
    return result[props.resultName] || result.name || result.title || ''
}

const getResultDescription = (result: any): string => {
    if (typeof props.resultDescription === 'function') {
        return props.resultDescription(result)
    }
    if (!props.resultDescription) return ''
    return result[props.resultDescription] || ''
}

const getResultImage = (result: any): string => {
    if (typeof props.resultImage === 'function') {
        return props.resultImage(result)
    }
    if (!props.resultImage) return ''
    return result[props.resultImage] || ''
}

const getResultType = (result: any): string => {
    if (typeof props.resultType === 'function') {
        return props.resultType(result)
    }
    if (!props.resultType) return ''
    return result[props.resultType] || ''
}

const getDefaultImage = (result: any): string => {
    if (typeof props.defaultImage === 'function') {
        return props.defaultImage(result)
    }
    return props.defaultImage || ''
}

// Auto focus on mount
onMounted(() => {
    if (props.autoFocus) {
        nextTick(() => {
            const input = document.querySelector('.search-component input') as HTMLInputElement
            if (input) {
                input.focus()
            }
        })
    }
})
</script>

<style scoped>
.search-component {
    position: relative;
}
</style>
