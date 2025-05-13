<script setup lang="ts">
import { ref, watch } from "vue";

// i18n setup
const { t } = useI18n();

// Use the auth composable instead of direct API call
const { isAuthenticated, currentUser, login } = useAuth();

// SEO
useSeoMeta({
    title: "Campaign Creator - EVE Kill",
    description: "Create new campaigns by defining scope and details.",
});

// Campaign Specific Fields
const campaignName = ref("");
const campaignDescription = ref("");
const campaignStartTime = ref(""); // ISO string format from datetime-local
const campaignEndTime = ref("");   // ISO string format from datetime-local

// --- Query Builder Logic ---
const MAX_FACETS = 10; // Simplified limit for campaign scope
const MAX_IN_VALUES = 10; // Maximum entity limit for multiple selections

const BOOLEAN_OPTIONS = [
    { value: true, label: t("true") },
    { value: false, label: t("false") },
];

const FIELD_OPTIONS = [
    { value: "region_id", label: "Region" },
    { value: "system_id", label: "System" },
    { value: "constellation_id", label: "Constellation" },
    { value: "victim.character_id", label: "Victim Character" },
    { value: "victim.corporation_id", label: "Victim Corporation" },
    { value: "victim.alliance_id", label: "Victim Alliance" },
    { value: "victim.faction_id", label: "Victim Faction" },
    { value: "attackers.character_id", label: "Attacker Character" },
    { value: "attackers.corporation_id", label: "Attacker Corporation" },
    { value: "attackers.alliance_id", label: "Attacker Alliance" },
    { value: "attackers.faction_id", label: "Attacker Faction" },
];

function supportsSearch(fieldId: string): boolean {
    return [
        "region_id", "system_id", "victim.character_id",
        "victim.corporation_id", "victim.alliance_id", "victim.faction_id",
        "attackers.character_id", "attackers.corporation_id",
        "attackers.alliance_id", "attackers.faction_id", "items.type_id",
    ].includes(fieldId);
}

function getEntityTypeForField(fieldId: string): string {
    if (fieldId.includes("character_id")) return "character";
    if (fieldId.includes("corporation_id")) return "corporation";
    if (fieldId.includes("alliance_id")) return "alliance";
    if (fieldId.includes("faction_id")) return "faction";
    if (fieldId.includes("items.type_id")) return "item"; // ship_id and weapon_type_id removed from FIELD_OPTIONS context
    if (fieldId === "system_id") return "system";
    if (fieldId === "region_id") return "region";
    return "";
}

// Updated facets type to remove explicit operator
const facets = ref<
    Array<{
        id: string;
        field: string;
        value: any;
        multipleValues: any[]; // Array for multiple values
        searchTerm?: string;
        searchResults?: any[];
        entityType?: string;
        valueLabel?: string;
    }>
>([]);

const campaignQuery = ref<Record<string, any> | null>(null);
const generatedQueryString = ref<string>(""); // For display if needed

// Dropdown states - only need field dropdown now
const fieldDropdownOpen = ref<Record<string, boolean>>({});

const toggleFieldDropdown = (facetId?: string) => {
    const closeAll = () => {
        Object.keys(fieldDropdownOpen.value).forEach(key => fieldDropdownOpen.value[key] = false);
    };

    if (facetId) {
        const currentState = fieldDropdownOpen.value[facetId];
        closeAll();
        fieldDropdownOpen.value[facetId] = !currentState;
    }
};

const addFacet = () => {
    if (facets.value.length >= MAX_FACETS) return;
    const id = `facet-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
    facets.value.push({
        id,
        field: "region_id",
        value: "",
        multipleValues: [],
        searchTerm: "",
        searchResults: [],
        entityType: getEntityTypeForField("region_id"),
    });
    fieldDropdownOpen.value[id] = false;
};

const removeFacet = (id: string) => {
    facets.value = facets.value.filter((f) => f.id !== id);
    delete fieldDropdownOpen.value[id];
};

const handleFieldChange = (facetId: string, newField: string) => {
    const facet = facets.value.find((f) => f.id === facetId);
    if (!facet) return;

    facet.field = newField;
    facet.value = ""; // Reset value
    facet.multipleValues = []; // Reset multiple values
    facet.searchTerm = "";
    facet.searchResults = [];
    facet.entityType = getEntityTypeForField(newField);

    if (newField === "is_npc" || newField === "is_solo") {
        facet.value = true;
    }

    fieldDropdownOpen.value[facetId] = false;
};

// Add error message for too many entities
const selectionError = ref<Record<string, string>>({});

// Updated selectSearchResult to handle single/multiple values automatically
const selectSearchResult = (facetId: string, result: any) => {
    const facet = facets.value.find(f => f.id === facetId);
    if (!facet) return;

    const displayName = result.ticker ? `${result.name} (${result.ticker})` : result.name;

    // Check if this is already in multipleValues
    if (facet.multipleValues.some(item => item.id === result.id)) {
        return; // Skip if already added
    }

    // Check if we've reached the limit
    if (facet.multipleValues.length >= MAX_IN_VALUES) {
        selectionError[facetId] = `Maximum of ${MAX_IN_VALUES} entities allowed`;
        return;
    }

    // Clear any previous error
    selectionError[facetId] = '';

    // Add to multipleValues array
    facet.multipleValues.push({
        id: result.id,
        name: displayName
    });

    // If it's the first value, also set it as single value
    if (facet.multipleValues.length === 1) {
        facet.value = result.id;
        facet.valueLabel = displayName;
    } else {
        // If we already have a value and add a second, clear single value
        facet.value = "";
        facet.valueLabel = "";
    }

    // Clear search term and close dropdown by clearing search results
    facet.searchTerm = '';
    facet.searchResults = [];
};

// Function to remove a selected entity
const removeSelectedEntity = (facetId: string, entityId: number) => {
    const facet = facets.value.find(f => f.id === facetId);
    if (!facet) return;

    // Remove from multipleValues array
    facet.multipleValues = facet.multipleValues.filter(item => item.id !== entityId);

    // Update single value if needed
    if (facet.multipleValues.length === 1) {
        // If only one value remains, set it as the single value
        facet.value = facet.multipleValues[0].id;
        facet.valueLabel = facet.multipleValues[0].name;
    } else if (facet.multipleValues.length === 0) {
        // If no values remain, clear single value
        facet.value = "";
        facet.valueLabel = "";
    }

    // Clear error if we're now below the limit
    if (facet.multipleValues.length < MAX_IN_VALUES) {
        selectionError[facetId] = '';
    }
};

// Updated buildCampaignQueryObject to remove filter wrapper
const buildCampaignQueryObject = (): Record<string, any> | null => {
    // Create a map to collect conditions by field name
    const fieldConditions: Record<string, any> = {};

    // Process facets
    const validFacets = facets.value.filter(
        (f) => f.field && (f.value !== undefined && f.value !== "" || f.multipleValues.length > 0)
    );

    // Process each facet and group by field name
    validFacets.forEach((f) => {
        // Determine operator based on number of values
        if (f.multipleValues.length > 1) {
            // Multiple values - use $in operator
            const processedIds = f.multipleValues.map(item => item.id);
            fieldConditions[f.field] = { $in: processedIds };
        } else if (f.multipleValues.length === 1) {
            // Single value - use direct equality
            fieldConditions[f.field] = f.multipleValues[0].id;
        } else if (f.value !== "" && f.value !== undefined) {
            // Direct value (for non-search fields like booleans)
            let processedValue = f.value;

            if (typeof f.value === 'string' && (f.field.includes("_id") || f.field.includes("security"))) {
                const numVal = parseFloat(f.value);
                if (!isNaN(numVal)) {
                    processedValue = numVal;
                }
            }

            fieldConditions[f.field] = processedValue;
        }
    });

    // Add time range conditions if set
    if (campaignStartTime.value || campaignEndTime.value) {
        if (!fieldConditions['kill_time']) {
            fieldConditions['kill_time'] = {};
        }

        if (campaignStartTime.value) {
            fieldConditions['kill_time']['$gte'] = new Date(campaignStartTime.value).toISOString();
        }

        if (campaignEndTime.value) {
            fieldConditions['kill_time']['$lte'] = new Date(campaignEndTime.value).toISOString();
        }
    }

    // If no conditions, return null
    if (Object.keys(fieldConditions).length === 0) {
        return null;
    }

    // Return field conditions directly instead of wrapping in createQuery
    return fieldConditions;
};

// Create a function to update the query on demand
const updateQuery = () => {
    campaignQuery.value = buildCampaignQueryObject();
    generatedQueryString.value = campaignQuery.value ? JSON.stringify(campaignQuery.value, null, 2) : "No valid query defined.";
};

// Watch for changes to facets and update the query
watch(facets, updateQuery, { deep: true });

// Also watch for changes to campaign start and end time to update the query
watch([campaignStartTime, campaignEndTime], updateQuery);

if (facets.value.length === 0) {
    addFacet();
}

// Update handleCreateCampaign to check for empty query correctly
const handleCreateCampaign = async () => {
    if (!isAuthenticated) {
        alert("You must be logged in to create campaigns.");
        return;
    }

    if (!campaignName.value.trim()) {
        alert("Campaign Name is required.");
        return;
    }
    if (!campaignStartTime.value) {
        alert("Start Time is required.");
        return;
    }
    if (!campaignQuery.value || Object.keys(campaignQuery.value).length === 0) {
        alert("Campaign Scope must be defined with at least one filter.");
        return;
    }

    const campaignData = {
        name: campaignName.value,
        description: campaignDescription.value,
        startTime: campaignStartTime.value,
        endTime: campaignEndTime.value || null,
        query: campaignQuery.value,
        creatorInfo: currentUser ? {
            characterId: currentUser.characterId,
            characterName: currentUser.characterName
        } : null
    };

    try {
        const { data, error } = await useFetch('/api/campaign', {
            method: 'POST',
            body: campaignData
        });

        if (error.value) {
            alert(`Error creating campaign: ${error.value.message}`);
            return;
        }

        if (data.value && data.value.success) {
            alert('Campaign created successfully!');
            // Optionally redirect to view the campaign
            if (data.value.campaign && data.value.campaign.id) {
                // Redirect to campaign view page when available
                // window.location.href = `/campaign/${data.value.campaign.id}`;
            }
        }
    } catch (err) {
        console.error('Error creating campaign:', err);
        alert('Failed to create campaign. Please try again.');
    }
};

// Add a loginToCreateCampaign function
const loginToCreateCampaign = () => {
    login();
};

// Add these missing refs and functions to restore search functionality
const selectedResultIndex = ref<Record<string, number>>({});
const lastSearchTerms = ref<Record<string, string>>({});

// Handle keyboard navigation for search dropdowns
const handleKeyDown = (facetId: string, e: KeyboardEvent) => {
    const facet = facets.value.find(f => f.id === facetId);
    if (!facet || !facet.searchResults || facet.searchResults.length === 0) return;

    if (selectedResultIndex.value[facetId] === undefined) {
        selectedResultIndex.value[facetId] = -1;
    }

    switch (e.key) {
        case 'ArrowDown':
            e.preventDefault();
            selectedResultIndex.value[facetId] = Math.min(
                (selectedResultIndex.value[facetId] + 1),
                facet.searchResults.length - 1
            );
            break;
        case 'ArrowUp':
            e.preventDefault();
            selectedResultIndex.value[facetId] = Math.max(
                (selectedResultIndex.value[facetId] - 1),
                0
            );
            break;
        case 'Enter':
            e.preventDefault();
            if (selectedResultIndex.value[facetId] >= 0) {
                selectSearchResult(facetId, facet.searchResults[selectedResultIndex.value[facetId]]);
            }
            break;
        case 'Escape':
            facet.searchResults = [];
            selectedResultIndex.value[facetId] = -1;
            break;
    }
};

// Reset the selected index when search term changes
watch(facets, (newFacets) => {
    for (const facet of newFacets) {
        if (facet.searchTerm !== lastSearchTerms.value[facet.id]) {
            selectedResultIndex.value[facet.id] = -1;
        }
    }
}, { deep: true });

// Search entities function
const searchEntities = async (facetId: string, searchTerm: string) => {
    if (!searchTerm || searchTerm.length < 2) {
        const facet = facets.value.find(f => f.id === facetId);
        if (facet) facet.searchResults = [];
        return;
    }

    const facet = facets.value.find((f) => f.id === facetId);
    if (!facet || !facet.entityType) return;

    if (lastSearchTerms.value[facetId] === searchTerm) return;

    lastSearchTerms.value[facetId] = searchTerm;

    try {
        const encoded = encodeURIComponent(searchTerm);
        const { data } = await useFetch(`/api/search/${encoded}`);

        if (data.value && data.value.hits) {
            facet.searchResults = data.value.hits
                .filter((hit) => hit.type === facet.entityType)
                .slice(0, 10);
        } else {
            console.log(`Searching for ${facet.entityType}: ${searchTerm}`);
            const mockResults = [
                { id: 1, name: `${facet.entityType} Result 1 for ${searchTerm}` },
                { id: 2, name: `${facet.entityType} Result 2 for ${searchTerm}` },
            ];
            facet.searchResults = mockResults;
        }
    } catch (error) {
        console.error("Search error:", error);
        facet.searchResults = [];
    }
};

// Create the debounced search function
const debouncedSearch = useDebounceFn(searchEntities, 300);
</script>

<template>
    <div class="space-y-6 p-4 md:p-6">
        <h1 class="text-3xl font-bold text-gray-900 dark:text-white">{{ $t('createCampaign') }}</h1>

        <!-- Authentication notice - correctly use isAuthenticated -->
        <UAlert v-if="!isAuthenticated" color="amber" icon="i-lucide-alert-triangle" class="mb-4">
            <template #title>{{ $t('authenticationRequired') }}</template>
            <template #description>
                {{ $t('loginToCreateCampaigns') }}
                <UButton variant="link" class="p-0" @click="loginToCreateCampaign">{{ $t('loginHere') }}</UButton>
            </template>
        </UAlert>

        <!-- Campaign Details -->
        <UCard class="bg-yellow-50 dark:bg-yellow-900/20 border-0">
            <template #header>
                <h2 class="text-xl font-semibold text-gray-800 dark:text-gray-100">{{ $t('campaignDetails') }}</h2>
            </template>
            <div class="space-y-4">
                <div>
                    <label for="campaignName" class="block text-sm font-medium text-gray-700 dark:text-gray-300">{{
                        $t('campaignName') }} *</label>
                    <input type="text" id="campaignName" class="custom-input" v-model="campaignName"
                        :placeholder="$t('enterCampaignName')" required>
                </div>
                <div>
                    <label for="campaignDescription"
                        class="block text-sm font-medium text-gray-700 dark:text-gray-300">{{
                            $t('campaignDescription') }}</label>
                    <textarea id="campaignDescription" class="custom-input" v-model="campaignDescription"
                        :placeholder="$t('enterCampaignDescription')" rows="3"></textarea>
                </div>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label for="campaignStartTime"
                            class="block text-sm font-medium text-gray-700 dark:text-gray-300">{{
                                $t('startTime') }} *</label>
                        <input type="datetime-local" id="campaignStartTime" class="custom-input"
                            v-model="campaignStartTime" required>
                    </div>
                    <div>
                        <label for="campaignEndTime"
                            class="block text-sm font-medium text-gray-700 dark:text-gray-300">{{
                                $t('endTime') }}</label>
                        <input type="datetime-local" id="campaignEndTime" class="custom-input"
                            v-model="campaignEndTime">
                    </div>
                </div>
            </div>
        </UCard>

        <!-- Campaign Scope Definition (Query Builder) -->
        <UCard class="bg-blue-50 dark:bg-blue-900/20 border-0">
            <template #header>
                <div class="flex justify-between items-center">
                    <h2 class="text-xl font-semibold text-gray-800 dark:text-gray-100">{{ $t('campaignScopeDefinition')
                        }}</h2>
                    <div class="flex items-center gap-2">
                        <UButton v-if="facets.length < MAX_FACETS" icon="i-lucide-plus-circle" @click="addFacet">
                            {{ $t('addFilter') }}
                        </UButton>
                    </div>
                </div>
            </template>

            <div v-if="facets.length > 0" class="space-y-4">
                <div v-for="facet in facets" :key="facet.id"
                    class="p-4 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800/30">
                    <div class="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
                        <!-- Field Selector -->
                        <div class="md:col-span-5">
                            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{{
                                $t('field')
                                }}</label>
                            <div class="relative">
                                <button @click.stop="toggleFieldDropdown(facet.id)"
                                    class="custom-input w-full text-left flex items-center justify-between">
                                    <span>{{FIELD_OPTIONS.find(f => f.value === facet.field)?.label ||
                                        facet.field}}</span>
                                    <UIcon name="i-lucide-chevron-down" class="h-4 w-4" />
                                </button>
                                <div v-if="fieldDropdownOpen[facet.id]"
                                    class="absolute z-10 mt-1 w-full rounded-md shadow-lg max-h-60 overflow-y-auto dropdown-menu">
                                    <a v-for="option in FIELD_OPTIONS" :key="option.value"
                                        @click="handleFieldChange(facet.id, option.value)"
                                        class="dropdown-item block px-4 py-2 text-sm cursor-pointer"
                                        :class="{ 'search-result-selected': facet.field === option.value }">
                                        {{ option.label }}
                                    </a>
                                </div>
                            </div>
                        </div>

                        <!-- Value Input (expanded to take space from removed operator) -->
                        <div class="md:col-span-6">
                            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{{
                                $t('value')
                                }}</label>
                            <template v-if="facet.field === 'is_npc' || facet.field === 'is_solo'">
                                <URadioGroup v-model="facet.value" :options="BOOLEAN_OPTIONS" legend="Select value" />
                            </template>

                            <!-- Search-based fields with multi-select support -->
                            <template v-else-if="supportsSearch(facet.field)">
                                <div class="space-y-2">
                                    <!-- Search input -->
                                    <div class="relative">
                                        <input type="text" class="custom-input w-full" v-model="facet.searchTerm"
                                            :placeholder="$t('searchToAddEntities')"
                                            @input="debouncedSearch(facet.id, facet.searchTerm || '')"
                                            @keydown="(e) => handleKeyDown(facet.id, e)" />

                                        <!-- Search results dropdown -->
                                        <div v-if="facet.searchResults && facet.searchResults.length > 0"
                                            class="absolute z-10 mt-1 w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md shadow-lg max-h-48 overflow-y-auto system-search-dropdown">
                                            <a v-for="(result, index) in facet.searchResults" :key="result.id"
                                                @click="selectSearchResult(facet.id, result)"
                                                class="search-result-item block px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer"
                                                :class="{ 'search-result-selected': index === selectedResultIndex[facet.id] }">
                                                {{ result.ticker ? `${result.name} (${result.ticker})` : result.name }}
                                            </a>
                                        </div>
                                    </div>

                                    <!-- Error message -->
                                    <div v-if="selectionError[facet.id]" class="text-red-500 text-xs">
                                        {{ selectionError[facet.id] }}
                                    </div>

                                    <!-- Show helper text based on selection count -->
                                    <div v-if="facet.multipleValues.length > 1"
                                        class="text-xs text-blue-600 dark:text-blue-400">
                                        {{ $t('multipleValuesSelected', { count: facet.multipleValues.length }) }}
                                    </div>
                                    <div v-else-if="facet.multipleValues.length === 1"
                                        class="text-xs text-blue-600 dark:text-blue-400">
                                        {{ $t('singleValueSelected') }}
                                    </div>

                                    <!-- Display selected entities as badges -->
                                    <div v-if="facet.multipleValues.length > 0" class="flex flex-wrap gap-2 mt-2">
                                        <UBadge v-for="entity in facet.multipleValues" :key="entity.id" color="primary"
                                            class="flex items-center gap-1 py-1 px-2">
                                            {{ entity.name }}
                                            <UButton color="white" variant="ghost" icon="i-lucide-x" size="xs"
                                                class="p-0" @click="removeSelectedEntity(facet.id, entity.id)" />
                                        </UBadge>
                                    </div>
                                </div>
                            </template>

                            <!-- Default input for non-search fields -->
                            <template v-else>
                                <input type="text" class="custom-input w-full" v-model="facet.value"
                                    :placeholder="$t('enterValue')">
                            </template>
                        </div>

                        <!-- Remove Facet Button -->
                        <div class="md:col-span-1 flex items-center justify-end">
                            <UButton icon="i-lucide-trash-2" color="error" variant="ghost"
                                @click="removeFacet(facet.id)" />
                        </div>
                    </div>
                </div>
            </div>
            <div v-else class="text-center py-4 text-gray-500 dark:text-gray-400">
                {{ $t('noFiltersAddedClickToAdd') }}
            </div>

            <!-- Generated Query Preview (Optional) -->
            <div v-if="generatedQueryString && facets.length > 0" class="mt-6">
                <h3 class="text-sm font-medium text-gray-600 dark:text-gray-400">{{ $t('generatedCampaignQuery') }}:
                </h3>
                <pre
                    class="mt-1 p-3 bg-gray-100 dark:bg-gray-800 rounded-md text-xs text-gray-700 dark:text-gray-300 overflow-x-auto">
            {{ generatedQueryString }}</pre>
            </div>
        </UCard>

        <!-- Action Buttons - use isAuthenticated directly -->
        <div class="flex justify-end mt-6 gap-4">
            <UButton @click="handleCreateCampaign" color="primary" size="lg" :disabled="!isAuthenticated"
                :tooltip="!isAuthenticated ? $t('loginToCreateCampaigns') : ''">
                {{ $t('createCampaign') }}
            </UButton>
        </div>
    </div>
</template>

<style scoped>
.space-y-6>*+* {
    margin-top: 1.5rem;
}

.space-y-4>*+* {
    margin-top: 1rem;
}

.relative .absolute {
    z-index: 50;
    background-color: #ffffff !important;
    border: 2px solid #ccc;
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
}

.dark .relative .absolute {
    background-color: #1f2937 !important;
    border-color: #4b5563;
}

.bg-gray-100 {
    background-color: #f3f4f6;
}

.dark .bg-gray-700 {
    background-color: #374151;
}

:deep(.form-radio-group legend) {
    display: none;
}

:deep(.form-radio-group .form-radio) {
    margin-right: 1rem;
}

.custom-input {
    display: block;
    width: 100%;
    height: 38px;
    padding: 0.5rem 0.75rem;
    font-size: 0.875rem;
    font-family: inherit;
    color: #111827;
    background-color: white;
    border: 1px solid #d1d5db;
    border-radius: 0.375rem;
    box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
    outline: none;
    transition: border-color 0.15s ease-in-out, box-shadow 0.15s ease-in-out;
}

.custom-input:focus {
    border-color: #3b82f6;
    box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.3);
}

.custom-input:disabled {
    background-color: #f3f4f6;
    opacity: 0.7;
    cursor: not-allowed;
}

textarea.custom-input {
    height: auto;
    min-height: 80px;
    resize: vertical;
}

input[type="datetime-local"].custom-input {
    font-family: inherit;
    font-size: inherit;
    height: 38px;
    padding: 0.5rem 0.75rem;
    box-sizing: border-box;
}

.dark .custom-input {
    color: #f9fafb;
    background-color: #1f2937;
    border-color: #4b5563;
}

.dark .custom-input:focus {
    border-color: #60a5fa;
    box-shadow: 0 0 0 2px rgba(96, 165, 250, 0.3);
}

.dark .custom-input:disabled {
    background-color: #374151;
}

.system-search-dropdown {
    border: 2px solid #ccc;
    background-color: #ffffff !important;
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
}

.dark .system-search-dropdown {
    border-color: #4b5563;
    background-color: #1f2937 !important;
}

.search-result-item {
    color: #111827;
}

.search-result-item:hover {
    background-color: #f3f4f6 !important;
}

.dark .search-result-item {
    color: #f9fafb;
}

.dark .search-result-item:hover {
    background-color: #374151 !important;
}

.search-result-selected {
    background-color: #e0f2fe !important;
    color: #0369a1 !important;
}

.dark .search-result-selected {
    background-color: #0c4a6e !important;
    color: #7dd3fc !important;
}

/* Add styling for dropdown menus */
.dropdown-menu {
    background-color: #ffffff !important;
    /* Force solid background */
    border: 2px solid #ccc;
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
}

.dark .dropdown-menu {
    background-color: #1f2937 !important;
    /* Force solid background */
    border-color: #4b5563;
}

.dropdown-item {
    color: #111827;
}

.dropdown-item:hover {
    background-color: #f3f4f6 !important;
    /* Force hover color */
}

.dark .dropdown-item {
    color: #f9fafb;
}

.dark .dropdown-item:hover {
    background-color: #374151 !important;
    /* Force hover color */
}
</style>
