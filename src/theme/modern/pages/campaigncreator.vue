<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import CampaignPreview from '~/src/theme/modern/components/campaign/CampaignPreview.vue';

// i18n setup
const { t } = useI18n();

// Use the auth composable instead of direct API call
const { isAuthenticated, currentUser, login } = useAuth();

// Add the toast composable
const toast = useToast();
const route = useRoute();

// Check if we're in edit mode
const campaignId = computed(() => route.query.campaignId as string | undefined);
const isEditMode = computed(() => !!campaignId.value);

// SEO - Update title based on edit/create mode
useSeoMeta({
    title: () => isEditMode.value ? "Edit Campaign - EVE Kill" : "Campaign Creator - EVE Kill",
    description: "Create or edit campaigns by defining scope and details.",
});

// Campaign Specific Fields
const campaignName = ref("");
const campaignDescription = ref("");
const campaignStartTime = ref(""); // ISO string format from datetime-local
const campaignEndTime = ref("");   // ISO string format from datetime-local

// Add state for edit mode authorization
const isLoading = ref(false);
const isAuthorized = ref(false);
const editCampaignData = ref<any>(null);

// Define the entity limits
const LOCATION_MAX_ENTITIES = 5;
const ENTITY_MAX_ENTITIES = 15;

// Create a structured filter state object with default values
const filterState = ref({
    // Location/Time section
    region: createFilterField('region_id', 'region', LOCATION_MAX_ENTITIES),
    system: createFilterField('system_id', 'system', LOCATION_MAX_ENTITIES),
    constellation: createFilterField('constellation_id', 'constellation', LOCATION_MAX_ENTITIES),

    // Attackers section
    attackerCharacter: createFilterField('attackers.character_id', 'character', ENTITY_MAX_ENTITIES),
    attackerCorporation: createFilterField('attackers.corporation_id', 'corporation', ENTITY_MAX_ENTITIES),
    attackerAlliance: createFilterField('attackers.alliance_id', 'alliance', ENTITY_MAX_ENTITIES),
    attackerFaction: createFilterField('attackers.faction_id', 'faction', ENTITY_MAX_ENTITIES),

    // Victims section
    victimCharacter: createFilterField('victim.character_id', 'character', ENTITY_MAX_ENTITIES),
    victimCorporation: createFilterField('victim.corporation_id', 'corporation', ENTITY_MAX_ENTITIES),
    victimAlliance: createFilterField('victim.alliance_id', 'alliance', ENTITY_MAX_ENTITIES),
    victimFaction: createFilterField('victim.faction_id', 'faction', ENTITY_MAX_ENTITIES)
});

// Helper function to create a filter field with consistent structure
function createFilterField(field: string, entityType: string, maxEntities: number) {
    return {
        field,
        entityType,
        value: "",
        multipleValues: [],
        searchTerm: "",
        searchResults: [],
        valueLabel: "",
        error: "",
        maxEntities
    };
}

// Check if limit is reached for a specific filter
function isLimitReached(filterId: string): boolean {
    const filter = filterState.value[filterId];
    return filter?.multipleValues.length >= filter?.maxEntities;
}

const campaignQuery = ref<Record<string, any> | null>(null);
const generatedQueryString = ref<string>("");

// Additional state management
const selectedResultIndex = ref<Record<string, number>>({});
const lastSearchTerms = ref<Record<string, string>>({});

// Handle selection of a search result
const selectSearchResult = (filterId: string, result: any) => {
    const filter = filterState.value[filterId];
    if (!filter) return;

    const displayName = result.ticker ? `${result.name} (${result.ticker})` : result.name;

    // Check if this is already in multipleValues
    if (filter.multipleValues.some(item => item.id === result.id)) {
        return; // Skip if already added
    }

    // Check if we've reached the limit
    if (filter.multipleValues.length >= filter.maxEntities) {
        filter.error = `Maximum of ${filter.maxEntities} entities allowed`;
        return;
    }

    // Clear any previous error
    filter.error = '';

    // Add to multipleValues array
    filter.multipleValues.push({
        id: result.id,
        name: displayName
    });

    // If it's the first value, also set it as single value
    if (filter.multipleValues.length === 1) {
        filter.value = result.id;
        filter.valueLabel = displayName;
    } else {
        // If we already have a value and add a second, clear single value
        filter.value = "";
        filter.valueLabel = "";
    }

    // Clear search term and results
    filter.searchTerm = '';
    filter.searchResults = [];
};

// Remove a selected entity
const removeSelectedEntity = (filterId: string, entityId: number) => {
    const filter = filterState.value[filterId];
    if (!filter) return;

    // Remove from multipleValues array
    filter.multipleValues = filter.multipleValues.filter(item => item.id !== entityId);

    // Update single value if needed
    if (filter.multipleValues.length === 1) {
        // If only one value remains, set it as the single value
        filter.value = filter.multipleValues[0].id;
        filter.valueLabel = filter.multipleValues[0].name;
    } else if (filter.multipleValues.length === 0) {
        // If no values remain, clear single value
        filter.value = "";
        filter.valueLabel = "";
    }

    // Clear error if we're now below the limit
    if (filter.multipleValues.length < filter.maxEntities) {
        filter.error = '';
    }
};

// Handle keyboard navigation in search dropdowns
const handleKeyDown = (filterId: string, e: KeyboardEvent) => {
    const filter = filterState.value[filterId];
    if (!filter || !filter.searchResults || filter.searchResults.length === 0) return;

    if (selectedResultIndex.value[filterId] === undefined) {
        selectedResultIndex.value[filterId] = -1;
    }

    switch (e.key) {
        case 'ArrowDown':
            e.preventDefault();
            selectedResultIndex.value[filterId] = Math.min(
                (selectedResultIndex.value[filterId] + 1),
                filter.searchResults.length - 1
            );
            break;
        case 'ArrowUp':
            e.preventDefault();
            selectedResultIndex.value[filterId] = Math.max(
                (selectedResultIndex.value[filterId] - 1),
                0
            );
            break;
        case 'Enter':
            e.preventDefault();
            if (selectedResultIndex.value[filterId] >= 0) {
                selectSearchResult(filterId, filter.searchResults[selectedResultIndex.value[filterId]]);
            }
            break;
        case 'Escape':
            filter.searchResults = [];
            selectedResultIndex.value[filterId] = -1;
            break;
    }
};

// Reset index when search term changes
watch(filterState, (newState) => {
    Object.entries(newState).forEach(([filterId, filter]) => {
        if (filter.searchTerm !== lastSearchTerms.value[filterId]) {
            selectedResultIndex.value[filterId] = -1;
        }
    });
}, { deep: true });

// Search entities function
const searchEntities = async (filterId: string, searchTerm: string) => {
    const filter = filterState.value[filterId];
    if (!filter) return;

    // Don't search if we've already reached the limit for this filter
    if (isLimitReached(filterId)) {
        filter.searchResults = [];
        return;
    }

    if (!searchTerm || searchTerm.length < 2) {
        filter.searchResults = [];
        return;
    }

    if (lastSearchTerms.value[filterId] === searchTerm) return;

    lastSearchTerms.value[filterId] = searchTerm;

    try {
        const encoded = encodeURIComponent(searchTerm);
        const { data } = await useFetch(`/api/search/${encoded}`);

        if (data.value && data.value.hits) {
            filter.searchResults = data.value.hits
                .filter((hit) => hit.type === filter.entityType)
                .slice(0, 10);
        } else {
            console.log(`Searching for ${filter.entityType}: ${searchTerm}`);
            const mockResults = [
                { id: 1, name: `${filter.entityType} Result 1 for ${searchTerm}` },
                { id: 2, name: `${filter.entityType} Result 2 for ${searchTerm}` },
            ];
            filter.searchResults = mockResults;
        }
    } catch (error) {
        console.error("Search error:", error);
        filter.searchResults = [];
    }
};

// Create the debounced search function
const debouncedSearch = useDebounceFn(searchEntities, 300);

// Build the campaign query object from filter state
const buildCampaignQueryObject = (): Record<string, any> | null => {
    // Create a map to collect conditions by field name
    const fieldConditions: Record<string, any> = {};

    // Process each filter in the filterState
    Object.values(filterState.value).forEach((filter) => {
        // Skip empty filters
        if (!filter.value && filter.multipleValues.length === 0) return;

        // Determine operator based on number of values
        if (filter.multipleValues.length > 1) {
            // Multiple values - use $in operator
            const processedIds = filter.multipleValues.map(item => item.id);
            fieldConditions[filter.field] = { $in: processedIds };
        } else if (filter.multipleValues.length === 1) {
            // Single value - use direct equality
            fieldConditions[filter.field] = filter.multipleValues[0].id;
        } else if (filter.value !== "") {
            // Direct value (for non-search fields)
            let processedValue = filter.value;

            if (typeof filter.value === 'string' && (filter.field.includes("_id") || filter.field.includes("security"))) {
                const numVal = parseFloat(filter.value);
                if (!isNaN(numVal)) {
                    processedValue = numVal;
                }
            }

            fieldConditions[filter.field] = processedValue;
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

    return fieldConditions;
};

// Check if we have at least one non-time filter
const hasNonTimeFilter = computed(() => {
    if (!campaignQuery.value) return false;

    // Extract all keys from the query
    const queryKeys = Object.keys(campaignQuery.value);

    // Filter out the time-related keys
    const nonTimeKeys = queryKeys.filter(key => key !== 'kill_time');

    // Return true if there's at least one non-time key
    return nonTimeKeys.length > 0;
});

// Update the query when filterState changes
const updateQuery = () => {
    campaignQuery.value = buildCampaignQueryObject();
    generatedQueryString.value = campaignQuery.value
        ? JSON.stringify(campaignQuery.value, null, 2)
        : "No valid query defined.";
};

// Watch for changes to filterState and time fields
watch([filterState, campaignStartTime, campaignEndTime], updateQuery, { deep: true });

// Initialize query on mount
onMounted(() => {
    updateQuery();
});

// Load campaign data if in edit mode
onMounted(async () => {
    if (isEditMode.value) {
        await loadCampaignForEditing();
    }
});

// Function to load campaign data for editing
async function loadCampaignForEditing() {
    if (!campaignId.value) return;

    try {
        isLoading.value = true;

        // Check if user is logged in
        if (!isAuthenticated.value) {
            toast.add({
                title: t('error'),
                description: t('authenticationRequired'),
                color: 'error',
                icon: 'i-lucide-alert-circle',
                timeout: 5000
            });
            return;
        }

        // Fetch campaign data
        const { data } = await useFetch(`/api/campaign/${campaignId.value}`);
        editCampaignData.value = data.value;

        // Check if user is the creator
        if (!editCampaignData.value ||
            !currentUser.value ||
            editCampaignData.value.creator_id !== currentUser.value.characterId) {
            toast.add({
                title: t('error'),
                description: t('campaignCreator.notYourCampaign'),
                color: 'error',
                icon: 'i-lucide-alert-circle',
                timeout: 5000
            });
            return;
        }

        // User is authorized to edit
        isAuthorized.value = true;

        // Populate form fields with campaign data
        populateFormFields(editCampaignData.value);

    } catch (error) {
        console.error('Error loading campaign for editing:', error);
        toast.add({
            title: t('error'),
            description: t('campaignCreator.loadError'),
            color: 'error',
            icon: 'i-lucide-alert-circle',
            timeout: 5000
        });
    } finally {
        isLoading.value = false;
    }
}

// Function to populate form fields from campaign data
function populateFormFields(campaignData) {
    if (!campaignData) return;

    // Basic fields
    campaignName.value = campaignData.name || '';
    campaignDescription.value = campaignData.description || '';

    // Format dates for datetime-local inputs
    if (campaignData.startTime) {
        campaignStartTime.value = new Date(campaignData.startTime)
            .toISOString()
            .slice(0, 16); // Format as YYYY-MM-DDThh:mm
    }

    if (campaignData.endTime) {
        campaignEndTime.value = new Date(campaignData.endTime)
            .toISOString()
            .slice(0, 16);
    }

    // Reset all filter values
    Object.keys(filterState.value).forEach(key => {
        const filter = filterState.value[key];
        filter.value = '';
        filter.multipleValues = [];
        filter.searchTerm = '';
        filter.searchResults = [];
        filter.valueLabel = '';
        filter.error = '';
    });

    // Populate filters from campaign query
    if (campaignData.campaignQuery) {
        populateFilters(campaignData.campaignQuery, campaignData.filterEntities);
    }
}

// Function to populate filters from campaign query
function populateFilters(query, filterEntities) {
    if (!query || !filterEntities) return;

    // Populate region filter
    if (filterEntities.regions && filterEntities.regions.length > 0) {
        filterState.value.region.multipleValues = filterEntities.regions.map(region => ({
            id: region.id,
            name: region.name
        }));
    }

    // Populate constellation filter
    if (filterEntities.constellations && filterEntities.constellations.length > 0) {
        filterState.value.constellation.multipleValues = filterEntities.constellations.map(constellation => ({
            id: constellation.id,
            name: constellation.name
        }));
    }

    // Populate system filter
    if (filterEntities.systems && filterEntities.systems.length > 0) {
        filterState.value.system.multipleValues = filterEntities.systems.map(system => ({
            id: system.id,
            name: system.name
        }));
    }

    // Populate attacker filters
    if (filterEntities.attackerCharacters && filterEntities.attackerCharacters.length > 0) {
        filterState.value.attackerCharacter.multipleValues = filterEntities.attackerCharacters.map(char => ({
            id: char.id,
            name: char.name
        }));
    }

    if (filterEntities.attackerCorporations && filterEntities.attackerCorporations.length > 0) {
        filterState.value.attackerCorporation.multipleValues = filterEntities.attackerCorporations.map(corp => ({
            id: corp.id,
            name: corp.name
        }));
    }

    if (filterEntities.attackerAlliances && filterEntities.attackerAlliances.length > 0) {
        filterState.value.attackerAlliance.multipleValues = filterEntities.attackerAlliances.map(alliance => ({
            id: alliance.id,
            name: alliance.name
        }));
    }

    if (filterEntities.attackerFactions && filterEntities.attackerFactions.length > 0) {
        filterState.value.attackerFaction.multipleValues = filterEntities.attackerFactions.map(faction => ({
            id: faction.id,
            name: faction.name
        }));
    }

    // Populate victim filters
    if (filterEntities.victimCharacters && filterEntities.victimCharacters.length > 0) {
        filterState.value.victimCharacter.multipleValues = filterEntities.victimCharacters.map(char => ({
            id: char.id,
            name: char.name
        }));
    }

    if (filterEntities.victimCorporations && filterEntities.victimCorporations.length > 0) {
        filterState.value.victimCorporation.multipleValues = filterEntities.victimCorporations.map(corp => ({
            id: corp.id,
            name: corp.name
        }));
    }

    if (filterEntities.victimAlliances && filterEntities.victimAlliances.length > 0) {
        filterState.value.victimAlliance.multipleValues = filterEntities.victimAlliances.map(alliance => ({
            id: alliance.id,
            name: alliance.name
        }));
    }

    if (filterEntities.victimFactions && filterEntities.victimFactions.length > 0) {
        filterState.value.victimFaction.multipleValues = filterEntities.victimFactions.map(faction => ({
            id: faction.id,
            name: faction.name
        }));
    }

    // Update query after populating filters
    updateQuery();
}

// Handle campaign creation
const handleCreateCampaign = async () => {
    if (!isAuthenticated.value) {
        toast.add({
            title: t('authenticationRequired'),
            description: t('loginToCreateCampaigns'),
            color: 'info',
            icon: 'i-lucide-alert-triangle',
            timeout: 5000
        });
        return;
    }

    if (!campaignName.value.trim()) {
        toast.add({
            title: t('error'),
            description: t('campaignCreator.nameRequired'),
            color: 'error',
            icon: 'i-lucide-alert-circle',
            timeout: 5000
        });
        return;
    }

    if (!campaignStartTime.value) {
        toast.add({
            title: t('error'),
            description: t('campaignCreator.startTimeRequired'),
            color: 'error',
            icon: 'i-lucide-alert-circle',
            timeout: 5000
        });
        return;
    }

    if (!campaignQuery.value || Object.keys(campaignQuery.value).length === 0) {
        toast.add({
            title: t('error'),
            description: t('campaignCreator.scopeRequired'),
            color: 'error',
            icon: 'i-lucide-alert-circle',
            timeout: 5000
        });
        return;
    }

    if (!hasNonTimeFilter.value) {
        toast.add({
            title: t('error'),
            description: t('campaignCreator.needNonTimeFilter'),
            color: 'error',
            icon: 'i-lucide-alert-circle',
            timeout: 5000
        });
        return;
    }

    const campaignData = {
        name: campaignName.value.trim(),
        description: campaignDescription.value?.trim(),
        startTime: campaignStartTime.value,
        endTime: campaignEndTime.value || null,
        query: campaignQuery.value,
        creatorInfo: currentUser.value ? {
            characterId: currentUser.value.characterId,
            characterName: currentUser.value.characterName
        } : null
    };

    // If in edit mode, add campaign_id to the data
    if (isEditMode.value && isAuthorized.value) {
        campaignData.campaign_id = campaignId.value;
    }

    try {
        const { data, error } = await useFetch('/api/campaign', {
            method: 'POST',
            body: campaignData
        });

        if (error.value) {
            toast.add({
                title: t('error'),
                description: `${t('campaignCreator.creationError')}: ${error.value.message}`,
                color: 'red',
                icon: 'i-lucide-alert-circle',
                timeout: 5000
            });
            return;
        }

        if (data.value && data.value.success) {
            toast.add({
                title: t('success'),
                description: isEditMode.value
                    ? t('campaignCreator.updateSuccess')
                    : t('campaignCreator.creationSuccess'),
                color: 'green',
                icon: 'i-lucide-check-circle',
                timeout: 5000
            });
            // Redirect to view the campaign
            if (data.value.campaign && data.value.campaign.id) {
                // Short timeout to allow the toast to be shown before redirect
                setTimeout(() => {
                    window.location.href = `/campaign/${data.value.campaign.id}`;
                }, 1000);
            }
        }
    } catch (err) {
        console.error('Error creating/updating campaign:', err);
        toast.add({
            title: t('error'),
            description: t('campaignCreator.unexpectedError'),
            color: 'red',
            icon: 'i-lucide-alert-circle',
            timeout: 5000
        });
    }
};

// Login function
const loginToCreateCampaign = () => {
    login();
};

// Add new state for preview
const showPreview = ref(false);
const previewCampaignData = ref(null);

// Function to preview the campaign
const previewCampaign = () => {
    if (!campaignName.value.trim()) {
        toast.add({
            title: t('error'),
            description: t('campaignCreator.nameRequired'),
            color: 'error',
            icon: 'i-lucide-alert-circle',
            timeout: 5000
        });
        return;
    }

    if (!campaignStartTime.value) {
        toast.add({
            title: t('error'),
            description: t('campaignCreator.startTimeRequired'),
            color: 'error',
            icon: 'i-lucide-alert-circle',
            timeout: 5000
        });
        return;
    }

    if (!campaignQuery.value || Object.keys(campaignQuery.value).length === 0) {
        toast.add({
            title: t('error'),
            description: t('campaignCreator.scopeRequired'),
            color: 'error',
            icon: 'i-lucide-alert-circle',
            timeout: 5000
        });
        return;
    }

    if (!hasNonTimeFilter.value) {
        toast.add({
            title: t('error'),
            description: t('campaignCreator.needNonTimeFilter'),
            color: 'error',
            icon: 'i-lucide-alert-circle',
            timeout: 5000
        });
        return;
    }

    previewCampaignData.value = {
        name: campaignName.value,
        description: campaignDescription.value,
        startTime: campaignStartTime.value,
        endTime: campaignEndTime.value || null,
        query: campaignQuery.value
    };

    showPreview.value = true;
};

// Function to close the preview
const closePreview = () => {
    showPreview.value = false;
    previewCampaignData.value = null;
};

// Function to save from the preview
const saveFromPreview = () => {
    handleCreateCampaign();
    closePreview();
};

// Modify the button's text based on edit mode
const submitButtonText = computed(() => {
    return isEditMode.value ? t('campaignCreator.updateCampaign') : t('createCampaign');
});
</script>

<template>
    <div class="space-y-6 p-4 md:p-6">
        <h1 class="text-3xl font-bold text-gray-900 dark:text-white">{{ isEditMode ? $t('editCampaign') :
            $t('createCampaign') }}</h1>

        <!-- Authentication notice -->
        <UAlert v-if="!isAuthenticated" color="amber" icon="i-lucide-alert-triangle" class="mb-4">
            <template #title>{{ $t('authenticationRequired') }}</template>
            <template #description>
                {{ $t('loginToCreateCampaigns') }}
                <UButton variant="link" class="p-0" @click="loginToCreateCampaign">{{ $t('loginHere') }}</UButton>
            </template>
        </UAlert>

        <!-- Campaign Details Section -->
        <UCard class="bg-yellow-50 dark:bg-yellow-900/20 border-0">
            <template #header>
                <h2 class="text-xl font-semibold text-gray-800 dark:text-gray-100">{{ $t('campaignDetails') }}</h2>
            </template>
            <div class="space-y-4">
                <div>
                    <label for="campaignName" class="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        {{ $t('campaignName') }} *
                    </label>
                    <input type="text" id="campaignName" class="custom-input" v-model="campaignName"
                        :placeholder="$t('enterCampaignName')" required>
                </div>
                <div>
                    <label for="campaignDescription" class="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        {{ $t('campaignDescription') }}
                    </label>
                    <textarea id="campaignDescription" class="custom-input" v-model="campaignDescription"
                        :placeholder="$t('enterCampaignDescription')" rows="3"></textarea>
                </div>
            </div>
        </UCard>

        <!-- Campaign Scope Definition - New Structured Layout -->
        <UCard class="bg-blue-50 dark:bg-blue-900/20 border-0">
            <template #header>
                <div class="flex justify-between items-center">
                    <h2 class="text-xl font-semibold text-gray-800 dark:text-gray-100">
                        {{ $t('campaignScopeDefinition') }}
                    </h2>
                </div>
            </template>

            <!-- Region/System/Constellation Section + Time Range -->
            <div class="p-4 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800/30 mb-4">
                <h3 class="font-medium text-gray-800 dark:text-gray-200 mb-3">{{
                    $t('campaignCreator.locationTimeFilters') }}
                </h3>

                <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <!-- Region Filter -->
                    <div>
                        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            {{ $t('region') }}
                            <span class="text-xs text-gray-500 ml-1">
                                ({{ filterState.region.multipleValues.length }}/{{ filterState.region.maxEntities }})
                            </span>
                            <span class="text-xs font-normal text-gray-500 ml-1">
                                ({{ $t('campaignCreator.optional') }})
                            </span>
                        </label>
                        <div class="relative">
                            <input type="text" class="custom-input w-full" v-model="filterState.region.searchTerm"
                                placeholder="Search for a region..."
                                @input="debouncedSearch('region', filterState.region.searchTerm)"
                                @keydown="(e) => handleKeyDown('region', e)" :disabled="isLimitReached('region')" />

                            <!-- Search results dropdown -->
                            <div v-if="filterState.region.searchResults && filterState.region.searchResults.length > 0"
                                class="absolute z-10 mt-1 w-full system-search-dropdown rounded-md shadow-lg max-h-48 overflow-y-auto">
                                <a v-for="(result, index) in filterState.region.searchResults" :key="result.id"
                                    @click="selectSearchResult('region', result)"
                                    class="search-result-item block px-4 py-2 text-sm cursor-pointer"
                                    :class="{ 'search-result-selected': index === selectedResultIndex['region'] }">
                                    {{ result.name }}
                                </a>
                            </div>
                        </div>

                        <!-- Selected values -->
                        <div v-if="filterState.region.multipleValues.length > 0" class="flex flex-wrap gap-2 mt-2">
                            <UBadge v-for="entity in filterState.region.multipleValues" :key="entity.id" color="primary"
                                class="flex items-center gap-1 py-1 px-2">
                                {{ entity.name }}
                                <UButton color="white" variant="ghost" icon="i-lucide-x" size="xs" class="p-0"
                                    @click="removeSelectedEntity('region', entity.id)" />
                            </UBadge>
                        </div>
                        <div v-if="filterState.region.error" class="text-red-500 text-xs mt-1">
                            {{ filterState.region.error }}
                        </div>
                    </div>

                    <!-- System Filter -->
                    <div>
                        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            {{ $t('system') }}
                            <span class="text-xs text-gray-500 ml-1">
                                ({{ filterState.system.multipleValues.length }}/{{ filterState.system.maxEntities }})
                            </span>
                            <span class="text-xs font-normal text-gray-500 ml-1">
                                ({{ $t('campaignCreator.optional') }})
                            </span>
                        </label>
                        <div class="relative">
                            <input type="text" class="custom-input w-full" v-model="filterState.system.searchTerm"
                                placeholder="Search for a system..."
                                @input="debouncedSearch('system', filterState.system.searchTerm)"
                                @keydown="(e) => handleKeyDown('system', e)" :disabled="isLimitReached('system')" />

                            <!-- Search results dropdown -->
                            <div v-if="filterState.system.searchResults && filterState.system.searchResults.length > 0"
                                class="absolute z-10 mt-1 w-full system-search-dropdown rounded-md shadow-lg max-h-48 overflow-y-auto">
                                <a v-for="(result, index) in filterState.system.searchResults" :key="result.id"
                                    @click="selectSearchResult('system', result)"
                                    class="search-result-item block px-4 py-2 text-sm cursor-pointer"
                                    :class="{ 'search-result-selected': index === selectedResultIndex['system'] }">
                                    {{ result.name }}
                                </a>
                            </div>
                        </div>

                        <!-- Selected values -->
                        <div v-if="filterState.system.multipleValues.length > 0" class="flex flex-wrap gap-2 mt-2">
                            <UBadge v-for="entity in filterState.system.multipleValues" :key="entity.id" color="primary"
                                class="flex items-center gap-1 py-1 px-2">
                                {{ entity.name }}
                                <UButton color="white" variant="ghost" icon="i-lucide-x" size="xs" class="p-0"
                                    @click="removeSelectedEntity('system', entity.id)" />
                            </UBadge>
                        </div>
                        <div v-if="filterState.system.error" class="text-red-500 text-xs mt-1">
                            {{ filterState.system.error }}
                        </div>
                    </div>

                    <!-- Constellation Filter -->
                    <div>
                        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            {{ $t('constellation') }}
                            <span class="text-xs text-gray-500 ml-1">
                                ({{ filterState.constellation.multipleValues.length }}/{{
                                    filterState.constellation.maxEntities
                                }})
                            </span>
                            <span class="text-xs font-normal text-gray-500 ml-1">
                                ({{ $t('campaignCreator.optional') }})
                            </span>
                        </label>
                        <div class="relative">
                            <input type="text" class="custom-input w-full"
                                v-model="filterState.constellation.searchTerm"
                                placeholder="Search for a constellation..."
                                @input="debouncedSearch('constellation', filterState.constellation.searchTerm)"
                                @keydown="(e) => handleKeyDown('constellation', e)"
                                :disabled="isLimitReached('constellation')" />

                            <!-- Search results dropdown -->
                            <div v-if="filterState.constellation.searchResults && filterState.constellation.searchResults.length > 0"
                                class="absolute z-10 mt-1 w-full system-search-dropdown rounded-md shadow-lg max-h-48 overflow-y-auto">
                                <a v-for="(result, index) in filterState.constellation.searchResults" :key="result.id"
                                    @click="selectSearchResult('constellation', result)"
                                    class="search-result-item block px-4 py-2 text-sm cursor-pointer"
                                    :class="{ 'search-result-selected': index === selectedResultIndex['constellation'] }">
                                    {{ result.name }}
                                </a>
                            </div>
                        </div>

                        <!-- Selected values -->
                        <div v-if="filterState.constellation.multipleValues.length > 0"
                            class="flex flex-wrap gap-2 mt-2">
                            <UBadge v-for="entity in filterState.constellation.multipleValues" :key="entity.id"
                                color="primary" class="flex items-center gap-1 py-1 px-2">
                                {{ entity.name }}
                                <UButton color="white" variant="ghost" icon="i-lucide-x" size="xs" class="p-0"
                                    @click="removeSelectedEntity('constellation', entity.id)" />
                            </UBadge>
                        </div>
                        <div v-if="filterState.constellation.error" class="text-red-500 text-xs mt-1">
                            {{ filterState.constellation.error }}
                        </div>
                    </div>
                </div>

                <!-- Time Range Fields -->
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                    <div>
                        <label for="campaignStartTime"
                            class="block text-sm font-medium text-gray-700 dark:text-gray-300">
                            {{ $t('startTime') }} *
                        </label>
                        <input type="datetime-local" id="campaignStartTime" class="custom-input"
                            v-model="campaignStartTime" required>
                    </div>
                    <div>
                        <label for="campaignEndTime" class="block text-sm font-medium text-gray-700 dark:text-gray-300">
                            {{ $t('endTime') }}
                            <span class="text-xs text-gray-500 ml-1">({{ $t('campaignCreator.optional') }})</span>
                        </label>
                        <input type="datetime-local" id="campaignEndTime" class="custom-input"
                            v-model="campaignEndTime">
                    </div>
                </div>
            </div>

            <!-- Optional Filters Note -->
            <div class="mb-4 text-sm text-gray-600 dark:text-gray-400 italic">
                {{ $t('campaignCreator.optionalFiltersNote') }}
            </div>

            <!-- Attackers and Victims Section - Side by Side -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <!-- Attackers Section -->
                <div class="p-4 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800/30">
                    <h3 class="font-medium text-gray-800 dark:text-gray-200 mb-3">
                        {{ $t('campaignCreator.attackerFilters') }}
                        <span class="text-xs font-normal text-gray-500 ml-1">
                            ({{ $t('campaignCreator.optional') }})
                        </span>
                    </h3>

                    <!-- Attacker Character -->
                    <div class="mb-4">
                        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            {{ $t('character') }}
                            <span class="text-xs text-gray-500 ml-1">
                                ({{ filterState.attackerCharacter.multipleValues.length }}/{{
                                    filterState.attackerCharacter.maxEntities }})
                            </span>
                        </label>
                        <div class="relative">
                            <input type="text" class="custom-input w-full"
                                v-model="filterState.attackerCharacter.searchTerm"
                                placeholder="Search for a character..."
                                @input="debouncedSearch('attackerCharacter', filterState.attackerCharacter.searchTerm)"
                                @keydown="(e) => handleKeyDown('attackerCharacter', e)"
                                :disabled="isLimitReached('attackerCharacter')" />

                            <!-- Search results dropdown -->
                            <div v-if="filterState.attackerCharacter.searchResults && filterState.attackerCharacter.searchResults.length > 0"
                                class="absolute z-10 mt-1 w-full system-search-dropdown rounded-md shadow-lg max-h-48 overflow-y-auto">
                                <a v-for="(result, index) in filterState.attackerCharacter.searchResults"
                                    :key="result.id" @click="selectSearchResult('attackerCharacter', result)"
                                    class="search-result-item block px-4 py-2 text-sm cursor-pointer"
                                    :class="{ 'search-result-selected': index === selectedResultIndex['attackerCharacter'] }">
                                    {{ result.name }}
                                </a>
                            </div>
                        </div>

                        <!-- Selected values -->
                        <div v-if="filterState.attackerCharacter.multipleValues.length > 0"
                            class="flex flex-wrap gap-2 mt-2">
                            <UBadge v-for="entity in filterState.attackerCharacter.multipleValues" :key="entity.id"
                                color="primary" class="flex items-center gap-1 py-1 px-2">
                                {{ entity.name }}
                                <UButton color="white" variant="ghost" icon="i-lucide-x" size="xs" class="p-0"
                                    @click="removeSelectedEntity('attackerCharacter', entity.id)" />
                            </UBadge>
                        </div>
                        <div v-if="filterState.attackerCharacter.error" class="text-red-500 text-xs mt-1">
                            {{ filterState.attackerCharacter.error }}
                        </div>
                    </div>

                    <!-- Remaining attacker fields with similar pattern... -->
                    <!-- Attacker Corporation -->
                    <div class="mb-4">
                        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            {{ $t('corporation') }}
                            <span class="text-xs text-gray-500 ml-1">
                                ({{ filterState.attackerCorporation.multipleValues.length }}/{{
                                    filterState.attackerCorporation.maxEntities }})
                            </span>
                        </label>
                        <div class="relative">
                            <input type="text" class="custom-input w-full"
                                v-model="filterState.attackerCorporation.searchTerm"
                                placeholder="Search for a corporation..."
                                @input="debouncedSearch('attackerCorporation', filterState.attackerCorporation.searchTerm)"
                                @keydown="(e) => handleKeyDown('attackerCorporation', e)"
                                :disabled="isLimitReached('attackerCorporation')" />

                            <!-- Search results dropdown -->
                            <div v-if="filterState.attackerCorporation.searchResults && filterState.attackerCorporation.searchResults.length > 0"
                                class="absolute z-10 mt-1 w-full system-search-dropdown rounded-md shadow-lg max-h-48 overflow-y-auto">
                                <a v-for="(result, index) in filterState.attackerCorporation.searchResults"
                                    :key="result.id" @click="selectSearchResult('attackerCorporation', result)"
                                    class="search-result-item block px-4 py-2 text-sm cursor-pointer"
                                    :class="{ 'search-result-selected': index === selectedResultIndex['attackerCorporation'] }">
                                    {{ result.ticker ? `${result.name} [${result.ticker}]` : result.name }}
                                </a>
                            </div>
                        </div>

                        <!-- Selected values -->
                        <div v-if="filterState.attackerCorporation.multipleValues.length > 0"
                            class="flex flex-wrap gap-2 mt-2">
                            <UBadge v-for="entity in filterState.attackerCorporation.multipleValues" :key="entity.id"
                                color="primary" class="flex items-center gap-1 py-1 px-2">
                                {{ entity.name }}
                                <UButton color="white" variant="ghost" icon="i-lucide-x" size="xs" class="p-0"
                                    @click="removeSelectedEntity('attackerCorporation', entity.id)" />
                            </UBadge>
                        </div>
                        <div v-if="filterState.attackerCorporation.error" class="text-red-500 text-xs mt-1">
                            {{ filterState.attackerCorporation.error }}
                        </div>
                    </div>

                    <!-- Attacker Alliance -->
                    <div class="mb-4">
                        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            {{ $t('alliance') }}
                            <span class="text-xs text-gray-500 ml-1">
                                ({{ filterState.attackerAlliance.multipleValues.length }}/{{
                                    filterState.attackerAlliance.maxEntities }})
                            </span>
                        </label>
                        <div class="relative">
                            <input type="text" class="custom-input w-full"
                                v-model="filterState.attackerAlliance.searchTerm"
                                placeholder="Search for an alliance..."
                                @input="debouncedSearch('attackerAlliance', filterState.attackerAlliance.searchTerm)"
                                @keydown="(e) => handleKeyDown('attackerAlliance', e)"
                                :disabled="isLimitReached('attackerAlliance')" />

                            <!-- Search results dropdown -->
                            <div v-if="filterState.attackerAlliance.searchResults && filterState.attackerAlliance.searchResults.length > 0"
                                class="absolute z-10 mt-1 w-full system-search-dropdown rounded-md shadow-lg max-h-48 overflow-y-auto">
                                <a v-for="(result, index) in filterState.attackerAlliance.searchResults"
                                    :key="result.id" @click="selectSearchResult('attackerAlliance', result)"
                                    class="search-result-item block px-4 py-2 text-sm cursor-pointer"
                                    :class="{ 'search-result-selected': index === selectedResultIndex['attackerAlliance'] }">
                                    {{ result.ticker ? `${result.name} [${result.ticker}]` : result.name }}
                                </a>
                            </div>
                        </div>

                        <!-- Selected values -->
                        <div v-if="filterState.attackerAlliance.multipleValues.length > 0"
                            class="flex flex-wrap gap-2 mt-2">
                            <UBadge v-for="entity in filterState.attackerAlliance.multipleValues" :key="entity.id"
                                color="primary" class="flex items-center gap-1 py-1 px-2">
                                {{ entity.name }}
                                <UButton color="white" variant="ghost" icon="i-lucide-x" size="xs" class="p-0"
                                    @click="removeSelectedEntity('attackerAlliance', entity.id)" />
                            </UBadge>
                        </div>
                        <div v-if="filterState.attackerAlliance.error" class="text-red-500 text-xs mt-1">
                            {{ filterState.attackerAlliance.error }}
                        </div>
                    </div>

                    <!-- Attacker Faction -->
                    <div>
                        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            {{ $t('faction') }}
                            <span class="text-xs text-gray-500 ml-1">
                                ({{ filterState.attackerFaction.multipleValues.length }}/{{
                                    filterState.attackerFaction.maxEntities }})
                            </span>
                        </label>
                        <div class="relative">
                            <input type="text" class="custom-input w-full"
                                v-model="filterState.attackerFaction.searchTerm" placeholder="Search for a faction..."
                                @input="debouncedSearch('attackerFaction', filterState.attackerFaction.searchTerm)"
                                @keydown="(e) => handleKeyDown('attackerFaction', e)"
                                :disabled="isLimitReached('attackerFaction')" />

                            <!-- Search results dropdown -->
                            <div v-if="filterState.attackerFaction.searchResults && filterState.attackerFaction.searchResults.length > 0"
                                class="absolute z-10 mt-1 w-full system-search-dropdown rounded-md shadow-lg max-h-48 overflow-y-auto">
                                <a v-for="(result, index) in filterState.attackerFaction.searchResults" :key="result.id"
                                    @click="selectSearchResult('attackerFaction', result)"
                                    class="search-result-item block px-4 py-2 text-sm cursor-pointer"
                                    :class="{ 'search-result-selected': index === selectedResultIndex['attackerFaction'] }">
                                    {{ result.name }}
                                </a>
                            </div>
                        </div>

                        <!-- Selected values -->
                        <div v-if="filterState.attackerFaction.multipleValues.length > 0"
                            class="flex flex-wrap gap-2 mt-2">
                            <UBadge v-for="entity in filterState.attackerFaction.multipleValues" :key="entity.id"
                                color="primary" class="flex items-center gap-1 py-1 px-2">
                                {{ entity.name }}
                                <UButton color="white" variant="ghost" icon="i-lucide-x" size="xs" class="p-0"
                                    @click="removeSelectedEntity('attackerFaction', entity.id)" />
                            </UBadge>
                        </div>
                        <div v-if="filterState.attackerFaction.error" class="text-red-500 text-xs mt-1">
                            {{ filterState.attackerFaction.error }}
                        </div>
                    </div>
                </div>

                <!-- Victims Section -->
                <div class="p-4 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800/30">
                    <h3 class="font-medium text-gray-800 dark:text-gray-200 mb-3">
                        {{ $t('campaignCreator.victimFilters') }}
                        <span class="text-xs font-normal text-gray-500 ml-1">
                            ({{ $t('campaignCreator.optional') }})
                        </span>
                    </h3>

                    <!-- Victim Character -->
                    <div class="mb-4">
                        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            {{ $t('character') }}
                            <span class="text-xs text-gray-500 ml-1">
                                ({{ filterState.victimCharacter.multipleValues.length }}/{{
                                    filterState.victimCharacter.maxEntities }})
                            </span>
                        </label>
                        <div class="relative">
                            <input type="text" class="custom-input w-full"
                                v-model="filterState.victimCharacter.searchTerm" placeholder="Search for a character..."
                                @input="debouncedSearch('victimCharacter', filterState.victimCharacter.searchTerm)"
                                @keydown="(e) => handleKeyDown('victimCharacter', e)"
                                :disabled="isLimitReached('victimCharacter')" />

                            <!-- Search results dropdown -->
                            <div v-if="filterState.victimCharacter.searchResults && filterState.victimCharacter.searchResults.length > 0"
                                class="absolute z-10 mt-1 w-full system-search-dropdown rounded-md shadow-lg max-h-48 overflow-y-auto">
                                <a v-for="(result, index) in filterState.victimCharacter.searchResults" :key="result.id"
                                    @click="selectSearchResult('victimCharacter', result)"
                                    class="search-result-item block px-4 py-2 text-sm cursor-pointer"
                                    :class="{ 'search-result-selected': index === selectedResultIndex['victimCharacter'] }">
                                    {{ result.name }}
                                </a>
                            </div>
                        </div>

                        <!-- Selected values -->
                        <div v-if="filterState.victimCharacter.multipleValues.length > 0"
                            class="flex flex-wrap gap-2 mt-2">
                            <UBadge v-for="entity in filterState.victimCharacter.multipleValues" :key="entity.id"
                                color="primary" class="flex items-center gap-1 py-1 px-2">
                                {{ entity.name }}
                                <UButton color="white" variant="ghost" icon="i-lucide-x" size="xs" class="p-0"
                                    @click="removeSelectedEntity('victimCharacter', entity.id)" />
                            </UBadge>
                        </div>
                        <div v-if="filterState.victimCharacter.error" class="text-red-500 text-xs mt-1">
                            {{ filterState.victimCharacter.error }}
                        </div>
                    </div>

                    <!-- Remaining victim fields with similar pattern... -->
                    <!-- Victim Corporation -->
                    <div class="mb-4">
                        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            {{ $t('corporation') }}
                            <span class="text-xs text-gray-500 ml-1">
                                ({{ filterState.victimCorporation.multipleValues.length }}/{{
                                    filterState.victimCorporation.maxEntities }})
                            </span>
                        </label>
                        <div class="relative">
                            <input type="text" class="custom-input w-full"
                                v-model="filterState.victimCorporation.searchTerm"
                                placeholder="Search for a corporation..."
                                @input="debouncedSearch('victimCorporation', filterState.victimCorporation.searchTerm)"
                                @keydown="(e) => handleKeyDown('victimCorporation', e)"
                                :disabled="isLimitReached('victimCorporation')" />

                            <!-- Search results dropdown -->
                            <div v-if="filterState.victimCorporation.searchResults && filterState.victimCorporation.searchResults.length > 0"
                                class="absolute z-10 mt-1 w-full system-search-dropdown rounded-md shadow-lg max-h-48 overflow-y-auto">
                                <a v-for="(result, index) in filterState.victimCorporation.searchResults"
                                    :key="result.id" @click="selectSearchResult('victimCorporation', result)"
                                    class="search-result-item block px-4 py-2 text-sm cursor-pointer"
                                    :class="{ 'search-result-selected': index === selectedResultIndex['victimCorporation'] }">
                                    {{ result.ticker ? `${result.name} [${result.ticker}]` : result.name }}
                                </a>
                            </div>
                        </div>

                        <!-- Selected values -->
                        <div v-if="filterState.victimCorporation.multipleValues.length > 0"
                            class="flex flex-wrap gap-2 mt-2">
                            <UBadge v-for="entity in filterState.victimCorporation.multipleValues" :key="entity.id"
                                color="primary" class="flex items-center gap-1 py-1 px-2">
                                {{ entity.name }}
                                <UButton color="white" variant="ghost" icon="i-lucide-x" size="xs" class="p-0"
                                    @click="removeSelectedEntity('victimCorporation', entity.id)" />
                            </UBadge>
                        </div>
                        <div v-if="filterState.victimCorporation.error" class="text-red-500 text-xs mt-1">
                            {{ filterState.victimCorporation.error }}
                        </div>
                    </div>

                    <!-- Victim Alliance -->
                    <div class="mb-4">
                        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            {{ $t('alliance') }}
                            <span class="text-xs text-gray-500 ml-1">
                                ({{ filterState.victimAlliance.multipleValues.length }}/{{
                                    filterState.victimAlliance.maxEntities }})
                            </span>
                        </label>
                        <div class="relative">
                            <input type="text" class="custom-input w-full"
                                v-model="filterState.victimAlliance.searchTerm" placeholder="Search for an alliance..."
                                @input="debouncedSearch('victimAlliance', filterState.victimAlliance.searchTerm)"
                                @keydown="(e) => handleKeyDown('victimAlliance', e)"
                                :disabled="isLimitReached('victimAlliance')" />

                            <!-- Search results dropdown -->
                            <div v-if="filterState.victimAlliance.searchResults && filterState.victimAlliance.searchResults.length > 0"
                                class="absolute z-10 mt-1 w-full system-search-dropdown rounded-md shadow-lg max-h-48 overflow-y-auto">
                                <a v-for="(result, index) in filterState.victimAlliance.searchResults" :key="result.id"
                                    @click="selectSearchResult('victimAlliance', result)"
                                    class="search-result-item block px-4 py-2 text-sm cursor-pointer"
                                    :class="{ 'search-result-selected': index === selectedResultIndex['victimAlliance'] }">
                                    {{ result.ticker ? `${result.name} [${result.ticker}]` : result.name }}
                                </a>
                            </div>
                        </div>

                        <!-- Selected values -->
                        <div v-if="filterState.victimAlliance.multipleValues.length > 0"
                            class="flex flex-wrap gap-2 mt-2">
                            <UBadge v-for="entity in filterState.victimAlliance.multipleValues" :key="entity.id"
                                color="primary" class="flex items-center gap-1 py-1 px-2">
                                {{ entity.name }}
                                <UButton color="white" variant="ghost" icon="i-lucide-x" size="xs" class="p-0"
                                    @click="removeSelectedEntity('victimAlliance', entity.id)" />
                            </UBadge>
                        </div>
                        <div v-if="filterState.victimAlliance.error" class="text-red-500 text-xs mt-1">
                            {{ filterState.victimAlliance.error }}
                        </div>
                    </div>

                    <!-- Victim Faction -->
                    <div>
                        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            {{ $t('faction') }}
                            <span class="text-xs text-gray-500 ml-1">
                                ({{ filterState.victimFaction.multipleValues.length }}/{{
                                    filterState.victimFaction.maxEntities
                                }})
                            </span>
                        </label>
                        <div class="relative">
                            <input type="text" class="custom-input w-full"
                                v-model="filterState.victimFaction.searchTerm" placeholder="Search for a faction..."
                                @input="debouncedSearch('victimFaction', filterState.victimFaction.searchTerm)"
                                @keydown="(e) => handleKeyDown('victimFaction', e)"
                                :disabled="isLimitReached('victimFaction')" />

                            <!-- Search results dropdown -->
                            <div v-if="filterState.victimFaction.searchResults && filterState.victimFaction.searchResults.length > 0"
                                class="absolute z-10 mt-1 w-full system-search-dropdown rounded-md shadow-lg max-h-48 overflow-y-auto">
                                <a v-for="(result, index) in filterState.victimFaction.searchResults" :key="result.id"
                                    @click="selectSearchResult('victimFaction', result)"
                                    class="search-result-item block px-4 py-2 text-sm cursor-pointer"
                                    :class="{ 'search-result-selected': index === selectedResultIndex['victimFaction'] }">
                                    {{ result.name }}
                                </a>
                            </div>
                        </div>

                        <!-- Selected values -->
                        <div v-if="filterState.victimFaction.multipleValues.length > 0"
                            class="flex flex-wrap gap-2 mt-2">
                            <UBadge v-for="entity in filterState.victimFaction.multipleValues" :key="entity.id"
                                color="primary" class="flex items-center gap-1 py-1 px-2">
                                {{ entity.name }}
                                <UButton color="white" variant="ghost" icon="i-lucide-x" size="xs" class="p-0"
                                    @click="removeSelectedEntity('victimFaction', entity.id)" />
                            </UBadge>
                        </div>
                        <div v-if="filterState.victimFaction.error" class="text-red-500 text-xs mt-1">
                            {{ filterState.victimFaction.error }}
                        </div>
                    </div>
                </div>
            </div>

            <!-- Generated Query Preview -->
            <div v-if="generatedQueryString" class="mt-6">
                <h3 class="text-sm font-medium text-gray-600 dark:text-gray-400">{{ $t('generatedCampaignQuery') }}:
                </h3>
                <pre
                    class="mt-1 p-3 bg-gray-100 dark:bg-gray-800 rounded-md text-xs text-gray-700 dark:text-gray-300 overflow-x-auto">
            {{ generatedQueryString }}</pre>
            </div>
        </UCard>

        <!-- Save and Preview Buttons -->
        <div class="flex justify-end mt-6 gap-4">
            <UButton @click="previewCampaign" color="secondary" size="lg"
                :disabled="!isAuthenticated || !hasNonTimeFilter"
                :tooltip="!isAuthenticated ? $t('loginToCreateCampaigns') : (!hasNonTimeFilter ? $t('campaignCreator.needNonTimeFilter') : '')">
                {{ $t('campaign.preview') }}
            </UButton>
            <UButton @click="handleCreateCampaign" color="primary" size="lg" :disabled="!isAuthenticated"
                :loading="isLoading" :tooltip="!isAuthenticated ? $t('loginToCreateCampaigns') : ''">
                {{ submitButtonText }}
            </UButton>
        </div>

        <!-- Inline Campaign Preview - Only shown when preview is active -->
        <UCard v-if="showPreview && previewCampaignData" class="bg-blue-50 dark:bg-blue-900/20 border-0 mt-6">
            <template #header>
                <div class="flex items-center justify-between">
                    <h3 class="text-lg font-medium">{{ $t('campaign.preview') }}</h3>
                    <UButton icon="i-lucide-x" color="gray" variant="ghost" @click="closePreview" />
                </div>
            </template>

            <div class="p-4">
                <CampaignPreview v-if="previewCampaignData" :campaignData="previewCampaignData" @close="closePreview"
                    @save="saveFromPreview" />
            </div>
        </UCard>
    </div>
</template>

<style scoped>
.space-y-6>*+* {
    margin-top: 1.5rem;
}

.space-y-4>*+* {
    margin-top: 1rem;
}

/* Improved input styling to match battlegenerator */
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

/* Solid background for dropdown menus */
.system-search-dropdown {
    border: 2px solid #ccc;
    background-color: white !important;
    /* Force solid background */
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
}

.dark .system-search-dropdown {
    border-color: #4b5563;
    background-color: #1f2937 !important;
    /* Force solid background */
}

.search-result-item {
    color: #111827;
}

.search-result-item:hover {
    background-color: #f3f4f6 !important;
    /* Force hover color */
}

.dark .search-result-item {
    color: #f9fafb;
}

.dark .search-result-item:hover {
    background-color: #374151 !important;
    /* Force hover color */
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
