<template>
    <div class="container mx-auto px-4 py-8">
        <div class="max-w-7xl mx-auto">
            <!-- Header -->
            <div class="mb-8">
                <h1 class="text-3xl font-bold text-zinc-100 mb-2">Advanced Search</h1>
                <p class="text-zinc-400">Build complex queries to find specific killmails</p>
            </div>

            <!-- Basic Search Input -->
            <div class="bg-zinc-900 border border-zinc-700 rounded-lg p-6 mb-6">
                <div class="mb-4">
                    <Search v-model="searchTerm" :api-url="(query) => `/api/search/${encodeURIComponent(query)}`"
                        :api-params="{ limit: 10 }" :transform-response="(response) => response?.hits || []"
                        :result-key="(result) => `${result.type}-${result.id}`"
                        placeholder="Search for pilots, corporations, alliances, or ships..."
                        loading-text="Searching..." no-results-text="No results found" :close-on-select="false"
                        wrapper-class="relative"
                        dropdown-class="bg-zinc-800 border border-zinc-600 rounded-lg shadow-lg max-h-64 overflow-y-auto w-full"
                        @select="handleSearchSelect">

                        <!-- Custom input slot -->
                        <template #input="{ modelValue, updateQuery }">
                            <input :value="modelValue" @input="updateQuery" @focus="() => { }" type="text"
                                placeholder="Search for pilots, corporations, alliances, or ships..."
                                class="w-full px-4 py-3 bg-zinc-800 border border-zinc-600 rounded-lg text-zinc-100 placeholder-zinc-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none" />
                        </template>

                        <!-- Custom loading slot -->
                        <template #loading>
                            <div class="p-3 text-center text-zinc-400">
                                <Icon name="lucide:loader-2" class="w-4 h-4 animate-spin inline mr-2" />
                                Searching...
                            </div>
                        </template>

                        <!-- Custom no results slot -->
                        <template #no-results>
                            <div class="p-3 text-center text-zinc-400">
                                <Icon name="lucide:search" class="w-4 h-4 inline mr-2" />
                                No results found
                            </div>
                        </template>

                        <!-- Custom results slot -->
                        <template #results="{ results }">
                            <div v-for="result in results" :key="`${result.type}-${result.id}`"
                                class="border-b border-zinc-700 last:border-b-0">
                                <div class="p-3 hover:bg-zinc-700"
                                    :class="{ 'cursor-pointer': !isEntityType(result.type) && !isItemType(result.type) }"
                                    @click="!isEntityType(result.type) && !isItemType(result.type) ? selectSearchResult(result) : null">
                                    <div class="flex items-center justify-between mb-2">
                                        <div class="flex items-center gap-3">
                                            <!-- Image for different types -->
                                            <div class="flex-shrink-0">
                                                <Image v-if="result.type === 'character'" type="character"
                                                    :id="result.id" :alt="result.name" size="32" class="w-8 h-8"
                                                    :rounded="true" />
                                                <Image v-else-if="result.type === 'corporation'" type="corporation"
                                                    :id="result.id" :alt="result.name" size="32" class="w-8 h-8"
                                                    :rounded="true" />
                                                <Image v-else-if="result.type === 'alliance'" type="alliance"
                                                    :id="result.id" :alt="result.name" size="32" class="w-8 h-8"
                                                    :rounded="true" />
                                                <Image v-else-if="result.type === 'ship'" type="type-icon"
                                                    :id="result.id" :alt="result.name" size="32" class="w-8 h-8"
                                                    :rounded="true" />
                                                <Image v-else-if="result.type === 'item'" type="item" :id="result.id"
                                                    :name="result.name" :alt="result.name" size="32" class="w-8 h-8"
                                                    :rounded="true" />
                                                <div v-else
                                                    class="w-8 h-8 bg-zinc-600 rounded flex items-center justify-center">
                                                    <Icon name="lucide:map-pin" class="w-4 h-4 text-zinc-400" />
                                                </div>
                                            </div>
                                            <div>
                                                <div class="text-zinc-100 font-medium">{{ result.name }}</div>
                                                <div class="text-zinc-400 text-sm flex items-center gap-2">
                                                    <span class="capitalize">{{ result.type }}</span>
                                                    <!-- Show ticker for corporations and alliances -->
                                                    <span
                                                        v-if="(result.type === 'corporation' || result.type === 'alliance') && result.ticker"
                                                        class="text-zinc-500 text-xs font-mono bg-zinc-800 px-1 rounded">
                                                        [{{ result.ticker }}]
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                        <div class="text-zinc-500 text-xs">
                                            {{ result.type === 'character' ? 'Pilot' :
                                                result.type === 'corporation' ? 'Corp' :
                                                    result.type === 'alliance' ? 'Alliance' :
                                                        result.type === 'system' ? 'System' :
                                                            result.type === 'region' ? 'Region' :
                                                                result.type === 'constellation' ? 'Constellation' :
                                                                    result.type === 'ship' ? 'Ship' :
                                                                        'Item' }}
                                        </div>
                                    </div>

                                    <!-- Role assignment buttons for entities (not locations or items) -->
                                    <div v-if="isEntityType(result.type)" class="flex gap-1" @click.stop>
                                        <button @click="addEntityToFilter(result, 'victim')"
                                            class="flex-1 px-2 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700 transition-colors">
                                            Victim
                                        </button>
                                        <button @click="addEntityToFilter(result, 'both')"
                                            class="flex-1 px-2 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700 transition-colors">
                                            Both
                                        </button>
                                        <button @click="addEntityToFilter(result, 'attacker')"
                                            class="flex-1 px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors">
                                            Attacker
                                        </button>
                                    </div>

                                    <!-- For items, add as item filter -->
                                    <div v-else-if="isItemType(result.type)" @click.stop="addItemToFilter(result)"
                                        class="cursor-pointer px-2 py-1 text-xs bg-purple-600 text-white rounded hover:bg-purple-700 transition-colors text-center">
                                        Add as Item Filter
                                    </div>
                                </div>
                            </div>
                        </template>
                    </Search>
                </div>

                <!-- Selected Facets Display -->
                <div v-if="facets.length > 0" class="flex flex-wrap gap-2">
                    <div v-for="(facet, index) in facets" :key="index"
                        class="inline-flex items-center bg-blue-600 text-white text-sm px-3 py-1 rounded-full">
                        <span>{{ facet.displayValue || `${facet.field}: ${facet.value}` }}</span>
                        <button @click="removeFacet(index)" class="ml-2 hover:bg-blue-700 rounded-full p-1">
                            <svg class="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                    d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                </div>
            </div>

            <!-- Quick Filters -->
            <div class="bg-zinc-900 border border-zinc-700 rounded-lg p-6 mb-6">
                <h3 class="text-lg font-semibold text-zinc-100 mb-4">Quick Filters</h3>
                <div class="flex flex-wrap gap-2">
                    <button v-for="quickFilter in quickFilters" :key="quickFilter.key"
                        @click="applyQuickFilter(quickFilter.key)"
                        class="px-3 py-2 text-sm bg-zinc-800 text-zinc-300 border border-zinc-600 rounded-lg hover:bg-zinc-700 hover:border-zinc-500 transition-colors">
                        {{ quickFilter.label }}
                    </button>
                </div>
            </div>

            <!-- Filter Controls -->
            <div class="bg-zinc-900 border border-zinc-700 rounded-lg p-6 mb-6">
                <div class="grid grid-cols-1 lg:grid-cols-4 gap-6">
                    <!-- Generated Query Display -->
                    <div class="lg:col-span-1">
                        <h4 class="text-sm font-semibold text-zinc-300 mb-3">Active Filters</h4>
                        <div class="bg-zinc-800 border border-zinc-600 rounded-lg p-3 max-h-72 overflow-y-auto">
                            <pre class="text-xs text-zinc-200 font-mono whitespace-pre-wrap">{{ formattedQueryWithoutProjection }}
                </pre>
                        </div>
                    </div>

                    <!-- Filter Boxes -->
                    <div class="lg:col-span-3 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                        <!-- Location Box -->
                        <div class="bg-zinc-800 border border-zinc-600 rounded-lg p-4">
                            <h4 class="text-sm font-semibold text-zinc-300 mb-3">Location</h4>
                            <!-- Show specific location if selected -->
                            <div v-if="filters.location.type && filters.location.value" class="mb-2">
                                <div
                                    class="inline-flex items-center bg-green-600 text-white text-sm px-3 py-1 rounded-full">
                                    <span>{{ filters.location.type.charAt(0).toUpperCase() +
                                        filters.location.type.slice(1) }}: {{
                                            filters.location.value }}</span>
                                    <button @click="clearLocationFilter"
                                        class="ml-2 hover:bg-green-700 rounded-full p-1">
                                        <Icon name="lucide:x" class="h-3 w-3" />
                                    </button>
                                </div>
                            </div>
                            <!-- Security type buttons -->
                            <div v-if="!filters.location.type || !filters.location.value" class="flex flex-wrap gap-1">
                                <button v-for="option in securityOptions" :key="option.value"
                                    @click="toggleSecurityFilter(option.value)"
                                    :class="getFilterButtonClass(filters.location.securityTypes.includes(option.value))"
                                    class="text-xs px-2 py-1">
                                    {{ option.label }}
                                </button>
                            </div>
                        </div>

                        <!-- Attacker Count Box -->
                        <div class="bg-zinc-800 border border-zinc-600 rounded-lg p-4">
                            <h4 class="text-sm font-semibold text-zinc-300 mb-3">Attacker Count</h4>
                            <div class="flex flex-wrap gap-1">
                                <button v-for="option in attackerCountOptions" :key="option.value"
                                    @click="setSingleFilter('attackerCount', option.value)"
                                    :class="getFilterButtonClass(filters.attackerCount === option.value)"
                                    class="text-xs px-2 py-1">
                                    {{ option.label }}
                                </button>
                            </div>
                        </div>

                        <!-- Attacker Type Box -->
                        <div class="bg-zinc-800 border border-zinc-600 rounded-lg p-4">
                            <h4 class="text-sm font-semibold text-zinc-300 mb-3">Attacker Type</h4>
                            <div class="flex flex-wrap gap-1">
                                <button v-for="option in attackerTypeOptions" :key="option.value"
                                    @click="setSingleFilter('attackerType', option.value)"
                                    :class="getFilterButtonClass(filters.attackerType === option.value)"
                                    class="text-xs px-2 py-1">
                                    {{ option.label }}
                                </button>
                            </div>
                        </div>

                        <!-- ISK Value Box -->
                        <div class="bg-zinc-800 border border-zinc-600 rounded-lg p-4">
                            <h4 class="text-sm font-semibold text-zinc-300 mb-3">ISK Value</h4>
                            <div class="flex flex-wrap gap-1">
                                <button v-for="option in iskValueOptions" :key="option.value"
                                    @click="setSingleFilter('iskValue', option.value)"
                                    :class="getFilterButtonClass(filters.iskValue === option.value)"
                                    class="text-xs px-2 py-1">
                                    {{ option.label }}
                                </button>
                            </div>
                        </div>

                        <!-- Ship Category Box -->
                        <div class="bg-zinc-800 border border-zinc-600 rounded-lg p-4">
                            <h4 class="text-sm font-semibold text-zinc-300 mb-3">Ship Category</h4>
                            <div class="flex flex-wrap gap-1">
                                <button v-for="option in shipCategoryOptions" :key="option.value"
                                    @click="setSingleFilter('shipCategory', option.value)"
                                    :class="getFilterButtonClass(filters.shipCategory === option.value)"
                                    class="text-xs px-2 py-1">
                                    {{ option.label }}
                                </button>
                            </div>
                        </div>

                        <!-- Time Filter Box -->
                        <div class="bg-zinc-800 border border-zinc-600 rounded-lg p-4">
                            <h4 class="text-sm font-semibold text-zinc-300 mb-3">Time Range</h4>

                            <!-- Quick buttons -->
                            <div class="flex flex-wrap gap-1 mb-3">
                                <button v-for="option in timeFilterOptions" :key="option.value"
                                    @click="setSingleFilter('timeFilter', option.value)"
                                    :class="getFilterButtonClass(filters.timeFilter === option.value)"
                                    class="text-xs px-2 py-1">
                                    {{ option.label }}
                                </button>
                            </div>

                            <!-- Custom date range inputs -->
                            <div class="space-y-2">
                                <div>
                                    <label class="block text-xs text-zinc-400 mb-1">From</label>
                                    <input v-model="filters.customTimeRange.from" @input="clearTimeFilterOnCustomInput"
                                        type="datetime-local"
                                        class="w-full px-2 py-1 text-xs bg-zinc-700 border border-zinc-600 rounded text-zinc-100 focus:border-blue-500 focus:outline-none"
                                        placeholder="YYYY-MM-DD HH:mm:ss" />
                                </div>
                                <div>
                                    <label class="block text-xs text-zinc-400 mb-1">To</label>
                                    <input v-model="filters.customTimeRange.to" @input="clearTimeFilterOnCustomInput"
                                        type="datetime-local"
                                        class="w-full px-2 py-1 text-xs bg-zinc-700 border border-zinc-600 rounded text-zinc-100 focus:border-blue-500 focus:outline-none"
                                        placeholder="YYYY-MM-DD HH:mm:ss" />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Entity Filters -->
            <div class="mb-4">
                <EntityFilter ref="entityFilterRef" :filters="filters" @update-filters="updateFilters" />
            </div>

            <!-- Sorting Controls -->
            <div class="bg-zinc-900 border border-zinc-700 rounded-lg p-6 mb-4">
                <h3 class="text-lg font-semibold text-zinc-100 mb-4">Sort Results</h3>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <!-- Sort Field -->
                    <div>
                        <label class="block text-sm font-medium text-zinc-300 mb-2">Sort By</label>
                        <div class="flex flex-wrap gap-2">
                            <button v-for="option in sortFieldOptions" :key="option.value"
                                @click="sortField = option.value as typeof sortField"
                                :class="getFilterButtonClass(sortField === option.value)" class="text-sm px-3 py-2">
                                {{ option.label }}
                            </button>
                        </div>
                    </div>

                    <!-- Sort Direction -->
                    <div>
                        <label class="block text-sm font-medium text-zinc-300 mb-2">Order</label>
                        <div class="flex gap-2">
                            <button @click="sortDirection = 'desc'"
                                :class="getFilterButtonClass(sortDirection === 'desc')" class="text-sm px-3 py-2">
                                Descending
                            </button>
                            <button @click="sortDirection = 'asc'"
                                :class="getFilterButtonClass(sortDirection === 'asc')" class="text-sm px-3 py-2">
                                Ascending
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Item Filters -->
            <div class="mb-4" v-if="filters.items.length > 0">
                <div class="bg-zinc-800 border border-zinc-600 rounded-lg p-4">
                    <h3 class="text-lg font-semibold text-zinc-100 mb-3">Item Filters</h3>
                    <p class="text-sm text-zinc-400 mb-3">Items that must be present on killmails:</p>
                    <div class="flex flex-wrap gap-2">
                        <div v-for="(item, index) in filters.items" :key="item.id"
                            class="bg-purple-600 text-white px-3 py-1 rounded-full text-sm flex items-center gap-2">
                            <span>{{ item.name }}</span>
                            <button @click="removeItem(index)"
                                class="text-purple-200 hover:text-white transition-colors">
                                <Icon name="lucide:x" class="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                    <button @click="clearAllItems"
                        class="mt-3 px-3 py-1 text-xs bg-zinc-700 text-zinc-300 rounded hover:bg-zinc-600 transition-colors">
                        Clear All Items
                    </button>
                </div>
            </div>

            <!-- Action Buttons -->
            <div class="flex justify-between items-center mt-6">
                <div class="flex gap-3">
                    <button @click="clearAllFilters"
                        class="px-4 py-2 bg-zinc-700 text-zinc-300 rounded-lg hover:bg-zinc-600 transition-colors">
                        Clear All
                    </button>
                </div>

                <div class="flex gap-3">
                    <button @click="executeSearch" :disabled="!hasValidQuery || isLoading"
                        class="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-zinc-600 disabled:text-zinc-400 disabled:cursor-not-allowed transition-colors">
                        <span v-if="isLoading">Loading...</span>
                        <span v-else>Preview Filter</span>
                    </button>

                    <button @click="showFilter" :disabled="!hasValidQuery"
                        class="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-zinc-600 disabled:text-zinc-400 disabled:cursor-not-allowed transition-colors">
                        Show Filter
                    </button>
                </div>
            </div>

            <!-- Error Display -->
            <div v-if="error" class="bg-red-900/20 border border-red-700 rounded-lg p-4 mt-6">
                <div class="flex items-center gap-2 text-red-400">
                    <Icon name="lucide:alert-circle" class="w-5 h-5" />
                    <span class="font-medium">Error</span>
                </div>
                <p class="text-red-300 mt-2">{{ error }}</p>
            </div>

            <!-- Results Section -->
            <div v-if="queryResult !== null" class="mt-8">
                <div class="bg-zinc-900 border border-zinc-700 rounded-lg p-6">
                    <div class="flex items-center justify-between mb-4">
                        <h3 class="text-lg font-semibold text-zinc-100">
                            Search Results
                        </h3>
                        <div class="text-sm text-zinc-400">
                            {{ queryResult?.length || 0 }} {{ (queryResult?.length || 0) === 1 ? 'killmail' :
                                'killmails' }} found
                        </div>
                    </div>



                    <!-- Results Container -->
                    <div v-if="queryResult && queryResult.length > 0"
                        class="bg-zinc-800 border border-zinc-600 rounded-lg p-4">
                        <KillList :externalKilllistData="transformedQueryResult || []" :limit="25"
                            :enablePagination="false" wsDisabled />
                    </div>

                    <!-- No results message -->
                    <div v-else-if="queryResult && queryResult.length === 0" class="text-center py-8 text-zinc-400">
                        <Icon name="lucide:search-x" class="w-12 h-12 mx-auto mb-4 opacity-50" />
                        <p class="text-lg font-medium mb-2">No killmails found</p>
                        <p class="text-sm">Try adjusting your search filters or criteria.</p>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import {
    ATTACKER_COUNT_OPTIONS,
    ATTACKER_TYPE_OPTIONS,
    buildAdvancedSearchQuery,
    createDefaultFilters,
    createQuickFilterFacet,
    ISK_VALUE_OPTIONS,
    SECURITY_OPTIONS,
    SHIP_CATEGORY_OPTIONS,
    SORT_FIELD_OPTIONS,
    TIME_FILTER_OPTIONS,
    type AdvancedSearchFilters,
    type SearchFacet
} from '../../server/helpers/AdvancedSearch'

const router = useRouter()

// Reactive data
const filters = ref<AdvancedSearchFilters>(createDefaultFilters())
const facets = ref<SearchFacet[]>([])
const searchTerm = ref('')
const entityFilterRef = ref()

// Query execution and results
const queryResult = ref<any[] | null>(null)
const isLoading = ref(false)
const error = ref<string | null>(null)

// Pagination and sorting
const sortField = ref<'kill_time' | 'total_value' | 'victim.damage_taken'>('kill_time')
const sortDirection = ref<'asc' | 'desc'>('desc')
const limit = ref(100)
const currentPage = ref(1)
const skip = computed(() => (currentPage.value - 1) * limit.value)

// Filter options
const securityOptions = SECURITY_OPTIONS
const attackerCountOptions = ATTACKER_COUNT_OPTIONS
const attackerTypeOptions = ATTACKER_TYPE_OPTIONS
const iskValueOptions = ISK_VALUE_OPTIONS
const shipCategoryOptions = SHIP_CATEGORY_OPTIONS
const timeFilterOptions = TIME_FILTER_OPTIONS
const sortFieldOptions = SORT_FIELD_OPTIONS

// Update filters when facets change
watch(facets, (newFacets) => {
    // Note: The interface doesn't have a facets property, so we'll handle this differently
    // facets are managed separately from the filters object
}, { deep: true })

// Computed properties
const generatedQuery = computed(() => {
    try {
        return buildAdvancedSearchQuery(
            filters.value,
            facets.value,
            sortField.value,
            sortDirection.value,
            limit.value,
            skip.value
        )
    } catch (error) {
        console.error('Error generating query:', error)
        return null
    }
})

const formattedQuery = computed(() => {
    if (!generatedQuery.value) {
        return 'No query generated'
    }

    try {
        return JSON.stringify(generatedQuery.value, null, 2)
    } catch (error) {
        return 'Error formatting query'
    }
})

const formattedQueryWithoutProjection = computed(() => {
    if (!generatedQuery.value) {
        return 'No filters applied'
    }

    try {
        // Extract only the filter part from the query
        const filter = generatedQuery.value.filter || {}

        // If the filter is empty, show a friendly message
        if (Object.keys(filter).length === 0) {
            return 'No filters applied'
        }

        return JSON.stringify(filter, null, 2)
    } catch (error) {
        return 'Error formatting query'
    }
})

const hasValidQuery = computed(() => {
    return generatedQuery.value !== null && (
        filters.value.location.type ||
        filters.value.location.securityTypes.length > 0 ||
        filters.value.timeFilter ||
        filters.value.customTimeRange.from ||
        filters.value.customTimeRange.to ||
        filters.value.attackerCount ||
        filters.value.attackerType ||
        filters.value.iskValue ||
        filters.value.shipCategory ||
        filters.value.entities.victim.length > 0 ||
        filters.value.entities.attacker.length > 0 ||
        filters.value.entities.both.length > 0 ||
        filters.value.items.length > 0 ||
        facets.value.length > 0
    )
})

// Transform query results to match KillList expected format
const transformedQueryResult = computed(() => {
    // Handle null, undefined, or non-array cases
    if (!queryResult.value || !Array.isArray(queryResult.value)) {
        return null
    }

    if (queryResult.value.length === 0) {
        return []
    }

    return queryResult.value.map(kill => {
        // Safely access attackers array with fallback
        const attackers = kill?.attackers || []

        // Find final blow attacker - default to first attacker if none has final_blow=true
        const finalBlowAttacker = attackers.find((a: any) => a?.final_blow) || attackers[0] || {}

        // Format the killmail in the structure that KillList expects
        const transformed = {
            killmail_id: kill?.killmail_id || 0,
            total_value: kill?.total_value || 0,
            system_id: kill?.system_id || 0,
            system_name: kill?.system_name || "",
            system_security: kill?.system_security || 0,
            region_id: kill?.region_id || 0,
            region_name: kill?.region_name || {},
            kill_time: kill?.kill_time || "",
            attackerCount: attackers.length,
            commentCount: 0,
            is_npc: kill?.is_npc || false,
            is_solo: kill?.is_solo || false,

            // Ensure victim object has all required properties
            victim: {
                ship_id: kill?.victim?.ship_id || 0,
                ship_name: kill?.victim?.ship_name || {},
                character_id: kill?.victim?.character_id || 0,
                character_name: kill?.victim?.character_name || "",
                corporation_id: kill?.victim?.corporation_id || 0,
                corporation_name: kill?.victim?.corporation_name || "",
                alliance_id: kill?.victim?.alliance_id || 0,
                alliance_name: kill?.victim?.alliance_name || "",
                faction_id: kill.victim?.faction_id || 0,
                faction_name: kill.victim?.faction_name || ""
            },

            // Create properly structured finalBlow object
            finalblow: {
                character_id: finalBlowAttacker?.character_id || 0,
                character_name: finalBlowAttacker?.character_name || "",
                corporation_id: finalBlowAttacker?.corporation_id || 0,
                corporation_name: finalBlowAttacker?.corporation_name || "",
                alliance_id: finalBlowAttacker?.alliance_id || 0,
                alliance_name: finalBlowAttacker?.alliance_name || "",
                faction_id: finalBlowAttacker?.faction_id || 0,
                faction_name: finalBlowAttacker?.faction_name || "",
                ship_group_name: finalBlowAttacker?.ship_group_name || "",
                is_npc: finalBlowAttacker?.npc || false
            }
        }

        return transformed
    })
})

// UI helper methods
const getFilterButtonClass = (isSelected: boolean) => {
    const baseClasses = 'px-3 py-2 text-sm font-medium rounded-lg transition-colors duration-200 border'

    if (isSelected) {
        return `${baseClasses} bg-blue-600 text-white border-blue-600 hover:bg-blue-700`
    } else {
        return `${baseClasses} bg-zinc-800 text-zinc-300 border-zinc-600 hover:bg-zinc-700 hover:border-zinc-500`
    }
}

const toggleFilter = (filterType: keyof AdvancedSearchFilters, value: string) => {
    // This function is deprecated but kept for compatibility
    // Most filters now use dedicated methods like setSingleFilter or toggleSecurityFilter
    console.warn('toggleFilter is deprecated, use specific filter methods instead')
}

// Update filters method for EntityFilter component
const updateFilters = (newFilters: AdvancedSearchFilters) => {
    filters.value = newFilters
}

// New method for single selection filters
const setSingleFilter = (filterType: 'attackerCount' | 'attackerType' | 'iskValue' | 'shipCategory' | 'timeFilter', value: string) => {
    if (filters.value[filterType] === value) {
        // If clicking the same filter, deselect it
        filters.value[filterType] = null
    } else {
        // Otherwise, select the new filter
        filters.value[filterType] = value

        // If setting a timeFilter, clear custom time range
        if (filterType === 'timeFilter') {
            filters.value.customTimeRange.from = null
            filters.value.customTimeRange.to = null
        }
    }
}

// New method for security filters (single selection only)
const toggleSecurityFilter = (value: string) => {
    const securityTypes = filters.value.location.securityTypes
    if (securityTypes.includes(value)) {
        // If clicking the same filter, deselect it
        filters.value.location.securityTypes = []
    } else {
        // Otherwise, select only this filter (single selection)
        filters.value.location.securityTypes = [value]
    }
}

const clearLocationFilter = () => {
    filters.value.location.type = null
    filters.value.location.value = null
}

const clearTimeFilter = () => {
    filters.value.timeFilter = null
}

const clearTimeFilterOnCustomInput = () => {
    filters.value.timeFilter = null
}

const removeFacet = (index: number) => {
    facets.value.splice(index, 1)
}

// Search functionality
const handleSearchSelect = (result: any) => {
    // Don't clear search for entities or items - they need further action
    if (isEntityType(result.type) || isItemType(result.type)) {
        return
    }

    // For locations, handle directly
    selectSearchResult(result)
}

const selectSearchResult = (result: any) => {
    // Clear the search
    searchTerm.value = ''

    // Create a facet based on the result type
    let facet: any = null

    switch (result.type) {
        case 'character':
            facet = {
                id: `character-${result.id}`,
                field: 'victim.character_id',
                operator: 'eq',
                value: result.id,
                displayValue: result.name
            }
            break
        case 'corporation':
            facet = {
                id: `corporation-${result.id}`,
                field: 'victim.corporation_id',
                operator: 'eq',
                value: result.id,
                displayValue: result.name
            }
            break
        case 'alliance':
            facet = {
                id: `alliance-${result.id}`,
                field: 'victim.alliance_id',
                operator: 'eq',
                value: result.id,
                displayValue: result.name
            }
            break
        case 'system':
            // For locations, clear security filters and set specific location
            filters.value.location.securityTypes = []
            filters.value.location.type = 'system'
            filters.value.location.value = result.id.toString()
            return // Don't add as facet, it's in the main filters
        case 'region':
            filters.value.location.securityTypes = []
            filters.value.location.type = 'region'
            filters.value.location.value = result.id.toString()
            return
        case 'constellation':
            filters.value.location.securityTypes = []
            filters.value.location.type = 'constellation'
            filters.value.location.value = result.id.toString()
            return
        case 'ship':
            facet = {
                id: `ship-${result.id}`,
                field: 'victim.ship_id',
                operator: 'eq',
                value: result.id,
                displayValue: result.name
            }
            break
    }

    if (facet) {
        // Check if this type of facet already exists
        const existingIndex = facets.value.findIndex(f => f.field === facet.field && f.value === facet.value)
        if (existingIndex >= 0) {
            // Replace existing facet
            facets.value[existingIndex] = facet
        } else {
            // Add new facet
            facets.value.push(facet)
        }
    }
}

// Quick filters
const quickFilters = [
    { key: 'today', label: 'Today' },
    { key: 'yesterday', label: 'Yesterday' },
    { key: 'thisWeek', label: 'This Week' },
    { key: 'thisMonth', label: 'This Month' },
    { key: 'solo', label: 'Solo Kills' },
    { key: 'bigKills', label: 'Big Kills (10B+)' },
    { key: 'superCapital', label: 'Super Capitals' },
    { key: 'highsec', label: 'High Sec' },
    { key: 'lowsec', label: 'Low Sec' },
    { key: 'nullsec', label: 'Null Sec' },
    { key: 'wormhole', label: 'Wormhole' }
]

// Methods
// Helper to determine if a search result is an entity (vs location or item)
const isEntityType = (type: string) => {
    return ['character', 'corporation', 'alliance', 'ship'].includes(type)
}

// Helper to determine if a search result is an item
const isItemType = (type: string) => {
    return type === 'item'
}

// Add entity to the appropriate entity filter
const addEntityToFilter = (searchResult: any, role: 'victim' | 'attacker' | 'both') => {
    // Use the EntityFilter's exposed method
    if (entityFilterRef.value) {
        entityFilterRef.value.addSearchResult(searchResult, role)
    } else {
        // Fallback: directly update filters
        const entity = {
            id: searchResult.id.toString(),
            name: searchResult.name,
            role: role
        }

        // Check if entity already exists in the role-based arrays
        const targetArray = filters.value.entities[role]
        const existingIndex = targetArray.findIndex(e => e.id === entity.id)

        if (existingIndex >= 0) {
            // Update existing entity
            targetArray[existingIndex] = entity
        } else {
            // Add new entity to role-based array
            targetArray.push(entity)
        }
    }

    // Clear search
    searchTerm.value = ''
}

// Add item to the items filter (separate from entities)
const addItemToFilter = (searchResult: any) => {
    const item = {
        id: searchResult.id.toString(),
        name: searchResult.name,
        role: 'both' as const // Items don't have a role concept but the type requires it
    }

    // Check if item already exists
    const existingIndex = filters.value.items.findIndex(i => i.id === item.id)

    if (existingIndex < 0) {
        // Add new item
        filters.value.items.push(item)
    }

    // Clear search
    searchTerm.value = ''
}

const clearAllFilters = () => {
    filters.value = createDefaultFilters()
    facets.value = []
}

const removeItem = (index: number) => {
    filters.value.items.splice(index, 1)
}

const clearAllItems = () => {
    filters.value.items = []
}

const showFilter = () => {
    if (!hasValidQuery.value || !generatedQuery.value) return

    // Only send the filter portion - let the advanced view generate the complete query
    const filterOnly = generatedQuery.value.filter || {}
    const encodedFilter = encodeURIComponent(JSON.stringify(filterOnly))

    // Navigate to the advanced view page with the filter
    router.push(`/advancedview?filter=${encodedFilter}`)
}

const executeSearch = async () => {
    if (!hasValidQuery.value || !generatedQuery.value) return

    try {
        isLoading.value = true
        error.value = null

        const response = await $fetch("/api/query", {
            method: "POST",
            body: generatedQuery.value,
        })

        // Handle the response structure - it might be the data directly or wrapped
        if (Array.isArray(response)) {
            queryResult.value = response
        } else if (response?.data && Array.isArray(response.data)) {
            queryResult.value = response.data
        } else {
            console.warn('Unexpected response structure:', response)
            queryResult.value = []
        }

        error.value = null
    } catch (err) {
        console.error("Query execution error:", err)
        error.value = err instanceof Error ? err.message : "Unknown error executing query"
        queryResult.value = null
    } finally {
        isLoading.value = false
    }
}

const applyQuickFilter = (filterKey: string) => {
    const facet = createQuickFilterFacet(filterKey)
    if (facet) {
        // Check if this type of facet already exists
        const existingIndex = facets.value.findIndex(f => f.field === facet.field)
        if (existingIndex >= 0) {
            facets.value[existingIndex] = facet
        } else {
            facets.value.push(facet)
        }
    } else {
        // Handle filter types that modify the main filters
        switch (filterKey) {
            case 'today':
                filters.value.timeFilter = 'today'
                filters.value.customTimeRange.from = null
                filters.value.customTimeRange.to = null
                break
            case 'yesterday':
                filters.value.timeFilter = 'yesterday'
                filters.value.customTimeRange.from = null
                filters.value.customTimeRange.to = null
                break
            case 'thisWeek':
                filters.value.timeFilter = 'thisWeek'
                filters.value.customTimeRange.from = null
                filters.value.customTimeRange.to = null
                break
            case 'thisMonth':
                filters.value.timeFilter = 'thisMonth'
                filters.value.customTimeRange.from = null
                filters.value.customTimeRange.to = null
                break
            case 'solo':
                filters.value.attackerCount = 'solo'
                break
            case 'bigKills':
                filters.value.iskValue = '≥ 10b'
                break
            case 'superCapital':
                filters.value.shipCategory = 'superCapitals'
                break
            case 'highsec':
                filters.value.location.securityTypes = ['highsec']
                break
            case 'lowsec':
                filters.value.location.securityTypes = ['lowsec']
                break
            case 'nullsec':
                filters.value.location.securityTypes = ['nullsec']
                break
            case 'wormhole':
                filters.value.location.securityTypes = ['wspace']
                break
        }
    }
}
</script>
