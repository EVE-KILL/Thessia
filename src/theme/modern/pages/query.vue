<script setup lang="ts">
import { computed, ref, watch } from "vue";
import {
    DEFAULT_LIMIT,
    type FilterCondition,
    MAX_LIMIT,
    type QueryAPIRequest,
    type QueryableField,
    type SortDirection,
    and,
    createQuery,
    exists,
    field,
    gt,
    gte,
    inArray,
    include,
    lt,
    lte,
    ne,
    notInArray,
    or,
} from "~/shared/helpers/queryAPIHelper";


// Example static maps for demo (replace with real data lookups in production)
const SYSTEM_TO_CONSTELLATION: Record<number, number> = {};
const SYSTEM_TO_REGION: Record<number, number> = {};
const CONSTELLATION_TO_REGION: Record<number, number> = {};
const CORP_TO_ALLIANCE: Record<number, number> = {};
const CHAR_TO_CORP: Record<number, number> = {};
const CORP_TO_FACTION: Record<number, number> = {};
const ALLIANCE_TO_FACTION: Record<number, number> = {};
const CHAR_TO_ALLIANCE: Record<number, number> = {};

// i18n setup
const { t } = useI18n();

// SEO
useSeoMeta({
    title: "Query Builder - EVE Kill",
    description: "Advanced killmail search and filtering",
});

// Constants
const MAX_FACETS = 30;
const MAX_PAGES = 100; // Set maximum page limit to 100
const OPERATOR_OPTIONS = [
    { value: "$eq", label: t("equal") },
    { value: "$ne", label: t("notEqual") },
    { value: "$gt", label: t("greaterThan") },
    { value: "$gte", label: t("greaterThanEqual") },
    { value: "$lt", label: t("lessThan") },
    { value: "$lte", label: t("lessThanEqual") },
    { value: "$in", label: t("inList") },
    { value: "$nin", label: t("notInList") },
    { value: "$exists", label: t("exists") },
];

const SORT_DIRECTION_OPTIONS = [
    { value: "desc", label: t("descending") },
    { value: "asc", label: t("ascending") },
];

const CONJUNCTION_OPTIONS = [
    { value: "and", label: t("and") },
    { value: "or", label: t("or") },
];

const BOOLEAN_OPTIONS = [
    { value: true, label: t("true") },
    { value: false, label: t("false") },
];

// Organize fields by category for better UX
const FIELD_OPTIONS = [
    { value: "killmail_id", label: "Killmail ID" },
    { value: "kill_time", label: "Kill Date/Time" },
    { value: "total_value", label: "ISK Value" },
    { value: "is_npc", label: "NPC Kill" },
    { value: "is_solo", label: "Solo Kill" },
    { value: "region_id", label: "Region" },
    { value: "system_id", label: "System" },
    { value: "system_security", label: "Security Status" },
    { value: "constellation_id", label: "Constellation" },
    { value: "victim.ship_id", label: "Victim Ship" },
    { value: "victim.ship_group_id", label: "Victim Ship Group" },
    { value: "victim.character_id", label: "Victim Character" },
    { value: "victim.corporation_id", label: "Victim Corporation" },
    { value: "victim.alliance_id", label: "Victim Alliance" },
    { value: "victim.faction_id", label: "Victim Faction" },
    { value: "attackers.ship_id", label: "Attacker Ship" },
    { value: "attackers.ship_group_id", label: "Attacker Ship Group" },
    { value: "attackers.character_id", label: "Attacker Character" },
    { value: "attackers.corporation_id", label: "Attacker Corporation" },
    { value: "attackers.alliance_id", label: "Attacker Alliance" },
    { value: "attackers.faction_id", label: "Attacker Faction" },
    { value: "attackers.weapon_type_id", label: "Weapon Type" },
    { value: "items.type_id", label: "Item Type" },
    { value: "items.group_id", label: "Item Group" },
];

// Determine which fields support search
function supportsSearch(fieldId: string): boolean {
    return [
        "region_id",
        "system_id",
        "victim.ship_id",
        "victim.character_id",
        "victim.corporation_id",
        "victim.alliance_id",
        "victim.faction_id",
        "attackers.ship_id",
        "attackers.character_id",
        "attackers.corporation_id",
        "attackers.alliance_id",
        "attackers.faction_id",
        "items.type_id",
    ].includes(fieldId);
}

// Determine entity type for search based on field
function getEntityTypeForField(fieldId: string): string {
    if (fieldId.includes("character_id")) return "character";
    if (fieldId.includes("corporation_id")) return "corporation";
    if (fieldId.includes("alliance_id")) return "alliance";
    if (fieldId.includes("faction_id")) return "faction";
    if (fieldId.includes("ship_id") || fieldId.includes("weapon_type_id")) return "item";
    if (fieldId.includes("items.type_id")) return "item";
    if (fieldId === "system_id") return "system";
    if (fieldId === "region_id") return "region";
    return "";
}

// Reactive state
const facets = ref<
    Array<{
        id: string;
        field: string;
        operator: string;
        value: any;
        searchTerm?: string;
        searchResults?: any[];
        entityType?: string;
        valueLabel?: string;
    }>
>([]);

const sortField = ref<QueryableField>("kill_time");
const sortDirection = ref<SortDirection>("desc");
const limit = ref(DEFAULT_LIMIT);
const conjunction = ref<"and" | "or">("and");
const generateQuery = ref(true);
const generatedQuery = ref<string>("");
const queryObject = ref<QueryAPIRequest | null>(null);
const queryResult = ref<any[] | null>(null);
const isLoading = ref(false);
const error = ref<string | null>(null);
const showRawQuery = ref(false);

// Validation warnings
const validationWarnings = ref<string[]>([]);

// Validate facets for logical consistency (calls backend validation API)
async function validateFacets() {
    const warnings: string[] = [];

    // Operator misuse and conflicting filters (basic demo, keep on frontend)
    const seenFields = new Set<string>();
    for (const facet of facets.value) {
        if (seenFields.has(facet.field)) {
            warnings.push(`Multiple filters on "${facet.field}" may conflict.`);
        }
        seenFields.add(facet.field);

        // Example: $in/$nin with single value
        if ((facet.operator === "$in" || facet.operator === "$nin") && Array.isArray(facet.value) && facet.value.length === 1) {
            warnings.push(`Operator "${facet.operator}" on "${facet.field}" has only one value. Consider using "$eq" or "$ne".`);
        }
    }

    // Call backend validation API for cross-entity checks
    try {
        const { data, error } = await useFetch("/api/query/validate", {
            method: "POST",
            body: { facets: facets.value },
        });
        if (error.value) {
            warnings.push("Validation API error: " + (error.value.message || "Unknown error"));
        } else if (data.value && Array.isArray(data.value.warnings)) {
            warnings.push(...data.value.warnings);
        }
    } catch (err) {
        warnings.push("Validation API error: " + (err instanceof Error ? err.message : String(err)));
    }

    validationWarnings.value = warnings;
}

// Watch facets for validation
watch(facets, validateFacets, { deep: true });

// Track last search terms to prevent redundant API calls
const lastSearchTerms = ref<Record<string, string>>({});

// Pagination state
const currentPage = ref(1);

// Calculate skip value for pagination
const skip = computed(() => (currentPage.value - 1) * limit.value);

// Estimate total items for pagination UI (without API call)
const estimatedTotal = computed(() =>
    Math.max(queryResult.value?.length || 0, limit.value * Math.min(currentPage.value + 10, MAX_PAGES))
);

// Check if there might be more pages
const hasNextPage = computed(() => {
    if (!queryResult.value) return false;
    // If we received exactly the requested limit, likely there are more results
    return queryResult.value.length >= limit.value && currentPage.value < MAX_PAGES;
});

// Watch for currentPage changes to automatically execute the query
watch(
    currentPage,
    (newPage, oldPage) => {
        if (newPage !== oldPage && queryObject.value) {
            // Only execute if we have a valid query and the page actually changed
            executeQuery();
        }
    }
);

// Add a new facet
const addFacet = () => {
    if (facets.value.length >= MAX_FACETS) return;

    const id = `facet-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
    facets.value.push({
        id,
        field: "killmail_id",
        operator: "$eq",
        value: "",
        searchTerm: "",
        searchResults: [],
    });
};

// Remove a facet by ID
const removeFacet = (id: string) => {
    const index = facets.value.findIndex((f) => f.id === id);
    if (index !== -1) {
        facets.value.splice(index, 1);
    }
};

// Handle field selection for a facet
const handleFieldChange = (facetId: string, newField: string) => {
    const facet = facets.value.find((f) => f.id === facetId);
    if (!facet) return;

    facet.field = newField;
    facet.value = "";
    facet.searchTerm = "";
    facet.searchResults = [];
    facet.entityType = getEntityTypeForField(newField);

    // Set appropriate default operator based on field type
    if (newField === "is_npc" || newField === "is_solo") {
        facet.operator = "$eq";
        facet.value = true;
    } else if (
        newField === "kill_time" ||
        newField === "total_value" ||
        newField === "system_security"
    ) {
        facet.operator = "$gte";
    } else if (newField.includes("_id")) {
        facet.operator = "$eq";
    }
};

// Handle operator change for a facet
const handleOperatorChange = (facetId: string, newOperator: string) => {
    const facet = facets.value.find((f) => f.id === facetId);
    if (!facet) return;

    facet.operator = newOperator;

    // Adjust value based on operator
    if (newOperator === "$exists") {
        facet.value = true;
    } else if (["$in", "$nin"].includes(newOperator)) {
        facet.value = facet.value ? [facet.value] : [];
    }
};

// Search entities using Meilisearch
const searchEntities = async (facetId: string, searchTerm: string) => {
    if (!searchTerm || searchTerm.length < 2) return;

    const facet = facets.value.find((f) => f.id === facetId);
    if (!facet || !facet.entityType) return;

    // Skip if the search term hasn't changed to prevent API call loops
    if (lastSearchTerms.value[facetId] === searchTerm) return;

    // Store current search term to compare in future calls
    lastSearchTerms.value[facetId] = searchTerm;

    try {
        const encoded = encodeURIComponent(searchTerm);
        const { data } = await useFetch(`/api/search/${encoded}`);

        if (data.value && data.value.hits) {
            // Filter results by entity type
            facet.searchResults = data.value.hits
                .filter((hit) => hit.type === facet.entityType)
                .slice(0, 10); // Limit to 10 results
        }
    } catch (err) {
        console.error("Search error:", err);
    }
};

// Improved debounced search with better typing
const debouncedSearch = useDebounceFn(searchEntities, 300);

// Watch search term changes with optimized trigger logic
watch(
    facets,
    (newFacets) => {
        for (const facet of newFacets) {
            if (
                facet.searchTerm &&
                supportsSearch(facet.field) &&
                lastSearchTerms.value[facet.id] !== facet.searchTerm
            ) {
                debouncedSearch(facet.id, facet.searchTerm);
            }
        }
    },
    { deep: true },
);

// Select a search result
const selectSearchResult = (facetId: string, result: any) => {
    const facet = facets.value.find((f) => f.id === facetId);
    if (!facet) return;

    facet.value = result.id;
    facet.valueLabel = result.name;
    facet.searchResults = [];
    facet.searchTerm = result.name;

    // Update last search term to prevent redundant search
    lastSearchTerms.value[facetId] = result.name;
};

// Add a value to a multi-value array (for $in, $nin operators)
const addValueToArray = (facetId: string) => {
    const facet = facets.value.find((f) => f.id === facetId);
    if (!facet || !facet.searchTerm) return;

    if (!Array.isArray(facet.value)) {
        facet.value = [];
    }

    if (facet.value.includes(facet.searchTerm)) return;

    facet.value.push(facet.searchTerm);
    facet.searchTerm = "";
};

// Remove a value from a multi-value array
const removeValueFromArray = (facetId: string, value: any) => {
    const facet = facets.value.find((f) => f.id === facetId);
    if (!facet || !Array.isArray(facet.value)) return;

    const index = facet.value.indexOf(value);
    if (index !== -1) {
        facet.value.splice(index, 1);
    }
};

// Build the query object from facets
const buildQueryObject = (): QueryAPIRequest => {
    const validFacets = facets.value.filter(
        (f) =>
            (f.field && f.operator && f.value !== undefined && f.value !== "") ||
            f.operator === "$exists",
    );

    if (validFacets.length === 0) {
        // Default query with no filters
        return createQuery(undefined, {
            sort: { [sortField.value]: sortDirection.value === "asc" ? 1 : -1 },
            limit: limit.value,
            skip: skip.value, // Add skip for pagination
            projection: getProjection(),
        });
    }

    // Create individual filter conditions
    const conditions: FilterCondition[] = validFacets.map((f) => {
        // Handle specific operators
        if (f.operator === "$eq") {
            return field(f.field as QueryableField, f.value);
        } else if (f.operator === "$gt") {
            return field(f.field as QueryableField, gt(f.value));
        } else if (f.operator === "$gte") {
            return field(f.field as QueryableField, gte(f.value));
        } else if (f.operator === "$lt") {
            return field(f.field as QueryableField, lt(f.value));
        } else if (f.operator === "$lte") {
            return field(f.field as QueryableField, lte(f.value));
        } else if (f.operator === "$ne") {
            return field(f.field as QueryableField, ne(f.value));
        } else if (f.operator === "$in" && Array.isArray(f.value)) {
            return field(f.field as QueryableField, inArray(f.value));
        } else if (f.operator === "$nin" && Array.isArray(f.value)) {
            return field(f.field as QueryableField, notInArray(f.value));
        } else if (f.operator === "$exists") {
            return field(f.field as QueryableField, exists(!!f.value));
        } else {
            // Generic operator
            return field(f.field as QueryableField, { [f.operator]: f.value });
        }
    });

    // Create the filter using AND/OR conjunction
    let filter: FilterCondition;

    if (conditions.length === 1) {
        filter = conditions[0];
    } else if (conjunction.value === "and") {
        // For AND, merge conditions into a single object if they're simple field-value pairs
        // This creates a more idiomatic MongoDB query without $and when not needed
        const mergedFilter: Record<string, any> = {};
        let needsExplicitAnd = false;

        for (const condition of conditions) {
            // Check if this is a simple field-value pair that can be merged
            const entries = Object.entries(condition);
            if (entries.length === 1 && !entries[0][0].startsWith("$")) {
                const [field, value] = entries[0];
                // If field already exists in merged filter, we need explicit $and
                if (field in mergedFilter) {
                    needsExplicitAnd = true;
                    break;
                }
                mergedFilter[field] = value;
            } else {
                // Complex condition with operators, need explicit $and
                needsExplicitAnd = true;
                break;
            }
        }

        // Use merged filter if possible, otherwise fallback to explicit $and
        filter = needsExplicitAnd ? and(conditions) : mergedFilter;
    } else {
        // For OR, always use explicit $or operator
        filter = or(conditions);
    }

    // Create the complete query with pagination
    return createQuery(filter, {
        sort: { [sortField.value]: sortDirection.value === "asc" ? 1 : -1 },
        limit: limit.value,
        skip: skip.value, // Add skip for pagination
        projection: getProjection(),
    });
};

// Get the required projection for KillList component
const getProjection = () => {
    return include(
        "killmail_id",
        "total_value",
        "system_id",
        "system_name",
        "system_security",
        "region_id",
        "region_name",
        "kill_time",
        "is_npc",
        "is_solo",
        "victim.ship_id",
        "victim.ship_name",
        "victim.character_id",
        "victim.character_name",
        "victim.corporation_id",
        "victim.corporation_name",
        "victim.alliance_id",
        "victim.alliance_name",
        "victim.faction_id",
        "victim.faction_name",
        "attackers.character_id",
        "attackers.character_name",
        "attackers.corporation_id",
        "attackers.corporation_name",
        "attackers.alliance_id",
        "attackers.alliance_name",
        "attackers.faction_id",
        "attackers.faction_name",
        "attackers.ship_group_name",
    );
};

// Generate the query string representation and query object
const updateQuery = () => {
    try {
        const query = buildQueryObject();
        queryObject.value = query;
        generatedQuery.value = JSON.stringify(query, null, 2);
        error.value = null;
    } catch (err) {
        console.error("Query building error:", err);
        error.value = err instanceof Error ? err.message : "Unknown error building query";
        queryObject.value = null;
        generatedQuery.value = "";
    }
};

// Execute the query with pagination
const executeQuery = async () => {
    // Always update query to ensure latest pagination is included
    updateQuery();

    // Block execution if there is a critical validation error
    const criticalErrors = validationWarnings.value.filter(w =>
        w.includes("does not belong to the selected region") ||
        w.includes("does not belong to the selected constellation") ||
        w.includes("does not belong to the selected alliance") ||
        w.includes("does not belong to the selected corporation") ||
        w.includes("does not belong to the selected faction")
    );
    if (criticalErrors.length > 0) {
        error.value = criticalErrors.join(" ");
        return;
    }

    if (!queryObject.value) return;

    try {
        isLoading.value = true;
        error.value = null;

        const { data, error: fetchError } = await useFetch("/api/query", {
            method: "POST",
            body: queryObject.value,
        });

        if (fetchError.value) {
            throw new Error(fetchError.value.message || "Error fetching data");
        }

        queryResult.value = data.value;
        error.value = null;
    } catch (err) {
        console.error("Query execution error:", err);
        error.value = err instanceof Error ? err.message : "Unknown error executing query";
        queryResult.value = null;
    } finally {
        isLoading.value = false;
    }
};

// Handle page change
const handlePageChange = (page: number) => {
    // Ensure page doesn't exceed MAX_PAGES
    currentPage.value = Math.min(page, MAX_PAGES);
    executeQuery();
};

// Watch for changes and update the query
watch(
    [facets, sortField, sortDirection, limit, conjunction],
    () => {
        if (currentPage.value !== 1) {
            currentPage.value = 1;
        }

        if (generateQuery.value) {
            updateQuery();
        }
    },
    { deep: true },
);

// Transform query results to match KillList expected format
const transformedQueryResult = computed(() => {
    if (!queryResult.value) return null;

    return queryResult.value.map(kill => {
        // Find final blow attacker - default to first attacker if none has final_blow=true
        const finalBlowAttacker = kill.attackers?.find(a => a.final_blow) || kill.attackers?.[0] || {};

        // Format the killmail in the structure that KillList expects
        return {
            killmail_id: kill.killmail_id,
            total_value: kill.total_value,
            system_id: kill.system_id,
            system_name: kill.system_name || "",
            system_security: kill.system_security || 0,
            region_id: kill.region_id,
            region_name: kill.region_name || {},
            kill_time: kill.kill_time,
            attackerCount: kill.attackers?.length || 0,
            commentCount: 0,
            is_npc: kill.is_npc || false,
            is_solo: kill.is_solo || false,

            // Ensure victim object has all required properties
            victim: {
                ship_id: kill.victim?.ship_id || 0,
                ship_name: kill.victim?.ship_name || {},
                character_id: kill.victim?.character_id || 0,
                character_name: kill.victim?.character_name || "",
                corporation_id: kill.victim?.corporation_id || 0,
                corporation_name: kill.victim?.corporation_name || "",
                alliance_id: kill.victim?.alliance_id || 0,
                alliance_name: kill.victim?.alliance_name || "",
                faction_id: kill.victim?.faction_id || 0,
                faction_name: kill.victim?.faction_name || ""
            },

            // Create properly structured finalBlow object
            finalblow: {
                character_id: finalBlowAttacker.character_id || 0,
                character_name: finalBlowAttacker.character_name || "",
                corporation_id: finalBlowAttacker.corporation_id || 0,
                corporation_name: finalBlowAttacker.corporation_name || "",
                alliance_id: finalBlowAttacker.alliance_id || 0,
                alliance_name: finalBlowAttacker.alliance_name || "",
                faction_id: finalBlowAttacker.faction_id || 0,
                faction_name: finalBlowAttacker.faction_name || "",
                ship_group_name: finalBlowAttacker.ship_group_name || {}
            }
        };
    });
});

// Add default facet
if (facets.value.length === 0) {
    addFacet();
}
</script>

<template>
    <div class="query-builder container mx-auto py-6 px-4">
        <h1 class="text-2xl font-bold mb-4">{{ $t('queryBuilder') }}</h1>

        <div class="mb-6">
            <UCard>
                <!-- Validation warnings -->
                <div v-if="validationWarnings.length" class="mb-4">
                    <UAlert color="amber" icon="i-lucide-alert-triangle">
                        <template #title>Potential Query Issues</template>
                        <template #description>
                            <ul class="list-disc pl-5">
                                <li v-for="(warn, i) in validationWarnings" :key="i">{{ warn }}</li>
                            </ul>
                        </template>
                    </UAlert>
                </div>
                <template #header>
                    <div class="flex justify-between items-center">
                        <h2 class="text-lg font-medium">{{ $t('filters') }}</h2>
                        <div class="flex gap-4">
                            <USelect v-model="conjunction" :items="CONJUNCTION_OPTIONS" size="sm" class="w-36" />

                            <UButton v-if="facets.length < MAX_FACETS" icon="i-lucide-plus-circle" size="sm"
                                color="primary" @click="addFacet">
                                {{ $t('addFacet') }}
                            </UButton>
                        </div>
                    </div>
                </template>

                <!-- Individual facets -->
                <div v-if="facets.length > 0" class="space-y-4">
                    <div v-for="facet in facets" :key="facet.id"
                        class="facet-row border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                        <div class="flex flex-wrap md:flex-nowrap gap-3 items-start">
                            <!-- Field selector -->
                            <div class="w-full md:w-1/3">
                                <UFormField :label="$t('field')">
                                    <USelect v-model="facet.field" :items="FIELD_OPTIONS"
                                        @update:modelValue="(val) => handleFieldChange(facet.id, val)"
                                        class="field-selector w-64" />
                                </UFormField>
                            </div>

                            <!-- Operator selector -->
                            <div class="w-full md:w-1/4">
                                <UFormField :label="$t('operator')">
                                    <USelect v-model="facet.operator" :items="OPERATOR_OPTIONS"
                                        @update:modelValue="(val) => handleOperatorChange(facet.id, val)"
                                        class="operator-selector w-64" />
                                </UFormField>
                            </div>

                            <!-- Value input -->
                            <div class="w-full md:w-1/3">
                                <UFormField :label="$t('value')">
                                    <!-- Boolean selectors -->
                                    <template
                                        v-if="facet.field === 'is_npc' || facet.field === 'is_solo' || facet.operator === '$exists'">
                                        <URadioGroup v-model="facet.value" :items="BOOLEAN_OPTIONS"
                                            class="flex gap-4" />
                                    </template>

                                    <!-- Multi-value (in/not in array) -->
                                    <template v-else-if="['$in', '$nin'].includes(facet.operator)">
                                        <div class="space-y-2">
                                            <div class="flex gap-2">
                                                <UInput v-model="facet.searchTerm" :placeholder="$t('typeToSearch')" />
                                                <UButton icon="i-lucide-plus" @click="addValueToArray(facet.id)" />
                                            </div>

                                            <!-- Selected values -->
                                            <div v-if="Array.isArray(facet.value) && facet.value.length > 0"
                                                class="flex flex-wrap gap-2 mt-2">
                                                <UBadge v-for="(val, i) in facet.value" :key="i" color="primary"
                                                    class="flex items-center gap-1">
                                                    {{ val }}
                                                    <UButton color="white" variant="ghost" icon="i-lucide-x" size="xs"
                                                        class="p-0" @click="removeValueFromArray(facet.id, val)" />
                                                </UBadge>
                                            </div>

                                            <!-- Search results for entity lookups -->
                                            <div v-if="supportsSearch(facet.field) && facet.searchTerm && facet.searchResults && facet.searchResults.length > 0"
                                                class="search-results border dark:border-gray-700 rounded-md mt-1 max-h-60 overflow-y-auto">
                                                <div v-for="result in facet.searchResults" :key="result.id"
                                                    class="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer"
                                                    @click="selectSearchResult(facet.id, result)">
                                                    {{ result.name }}
                                                </div>
                                            </div>
                                        </div>
                                    </template>

                                    <!-- Entity search for ID fields -->
                                    <template v-else-if="supportsSearch(facet.field)">
                                        <div class="relative">
                                            <UInput v-model="facet.searchTerm"
                                                :placeholder="$t('searchFor') + ' ' + facet.entityType" />

                                            <input v-model="facet.value" type="hidden" />

                                            <!-- Search results dropdown -->
                                            <div v-if="facet.searchResults && facet.searchResults.length > 0"
                                                class="search-results absolute z-10 w-full border dark:border-gray-700 bg-white dark:bg-gray-900 rounded-md mt-1 max-h-60 overflow-y-auto">
                                                <div v-for="result in facet.searchResults" :key="result.id"
                                                    class="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer"
                                                    @click="selectSearchResult(facet.id, result)">
                                                    {{ result.name }}
                                                </div>

                                            </div>

                                            <!-- Selected entity display -->
                                            <div v-if="facet.valueLabel"
                                                class="mt-2 text-sm text-gray-600 dark:text-gray-400">
                                                {{ $t('selected') }}: {{ facet.valueLabel }} ({{ facet.value }})
                                            </div>
                                        </div>
                                    </template>

                                    <!-- Numeric input for numeric fields -->
                                    <template
                                        v-else-if="['killmail_id', 'total_value', 'system_security'].includes(facet.field)">
                                        <UInput v-model.number="facet.value" type="number"
                                            :step="facet.field === 'system_security' ? '0.1' : '1'" />
                                    </template>

                                    <!-- Date/time input for kill_time -->
                                    <template v-else-if="facet.field === 'kill_time'">
                                        <!-- Using timestamp input for now (could enhance with date picker) -->
                                        <UInput v-model.number="facet.value" type="number"
                                            :placeholder="$t('unixTimestamp')" />
                                        <p class="text-xs text-gray-500 mt-1">{{ $t('unixTimestampHelp') }}</p>
                                    </template>

                                    <!-- Default text input for other fields -->
                                    <template v-else>
                                        <UInput v-model="facet.value" />
                                    </template>
                                </UFormField>
                            </div>

                            <!-- Remove facet button -->
                            <div class="flex items-center pt-8 md:w-10">
                                <UButton color="red" variant="ghost" icon="i-lucide-trash-2"
                                    @click="removeFacet(facet.id)" />
                            </div>
                        </div>
                    </div>
                </div>

                <div v-else class="text-center py-4 text-gray-500">
                    {{ $t('noFilters') }}
                </div>
            </UCard>
        </div>

        <!-- Sort and limit controls -->
        <div class="mb-6">
            <UCard>
                <template #header>
                    <h2 class="text-lg font-medium">{{ $t('options') }}</h2>
                </template>

                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div class="sort-controls">
                        <h3 class="text-md font-medium mb-2">{{ $t('sort') }}</h3>
                        <div class="flex flex-wrap md:flex-nowrap gap-3">
                            <USelect v-model="sortField" :items="FIELD_OPTIONS" class="flex-1" />
                            <USelect v-model="sortDirection" :items="SORT_DIRECTION_OPTIONS" class="w-40" />
                        </div>
                    </div>

                    <div class="limit-controls">
                        <h3 class="text-md font-medium mb-2">{{ $t('limit') }}</h3>
                        <UInput v-model.number="limit" type="number" :min="1" :max="MAX_LIMIT" />
                        <p class="text-xs text-gray-500 mt-1">{{ $t('maxLimit', { max: MAX_LIMIT }) }}</p>
                    </div>
                </div>
            </UCard>
        </div>

        <!-- Query execution controls -->
        <div class="mb-6 flex gap-4">
            <UButton color="primary" icon="i-lucide-search" :loading="isLoading" @click="executeQuery">
                {{ $t('executeQuery') }}
            </UButton>

            <UCheckbox v-model="generateQuery" name="auto-generate">
                {{ $t('autoGenerateQuery') }}
            </UCheckbox>

            <UButton v-if="!generateQuery" @click="updateQuery">{{ $t('generateQuery') }}</UButton>
        </div>

        <!-- Error display -->
        <UAlert v-if="error" color="red" class="mb-6">
            <template #title>{{ $t('error') }}</template>
            <template #description>{{ error }}</template>
        </UAlert>

        <!-- Query preview -->
        <UCard v-if="generatedQuery && !queryResult" class="mb-6">
            <template #header>
                <h2 class="text-lg font-medium">{{ $t('generatedQuery') }}</h2>
            </template>
            <pre class="overflow-auto p-4 bg-gray-50 dark:bg-gray-800 rounded">{{ generatedQuery }}</pre>
        </UCard>

        <!-- Query results visualization with transformed data and pagination -->
        <div v-if="queryResult" class="mb-6">
            <div class="flex justify-between items-center mb-4">
                <h2 class="text-lg font-medium">{{ $t('results') }}</h2>
                <UBadge color="primary" class="text-sm">
                    {{ $t('resultCount', { count: queryResult.length }) }}
                </UBadge>
            </div>

            <!-- Top pagination controls -->
            <div class="flex justify-between mb-4">
                <UBadge v-if="isLoading" color="gray" class="text-sm animate-pulse">
                    {{ $t('loading') }}
                </UBadge>

                <div class="flex-grow"></div>

                <UPagination v-model:page="currentPage" :total="estimatedTotal" :page-size="limit" :max="MAX_PAGES" :ui="{
                    wrapper: 'flex items-center gap-1',
                    default: {
                        padding: 'px-3 py-1.5',
                        size: 'text-sm',
                        inactive: 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                    }
                }" />
            </div>

            <!-- Use the transformed query results with proper props -->
            <KillList :externalKilllistData="transformedQueryResult" :limit="limit" :enablePagination="false"
                wsDisabled />

            <!-- Bottom pagination controls -->
            <div class="flex justify-between mt-4">
                <UBadge v-if="isLoading" color="gray" class="text-sm animate-pulse">
                    {{ $t('loading') }}
                </UBadge>

                <div class="flex-grow"></div>

                <UPagination v-model:page="currentPage" :total="estimatedTotal" :page-size="limit" :max="MAX_PAGES" :ui="{
                    wrapper: 'flex items-center gap-1',
                    default: {
                        padding: 'px-3 py-1.5',
                        size: 'text-sm',
                        inactive: 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                    }
                }" />
            </div>

            <!-- Show warning when approaching max pages -->
            <div v-if="currentPage >= MAX_PAGES - 5"
                class="mt-2 text-xs text-amber-600 dark:text-amber-400 text-center">
                {{ $t('paginationLimitWarning', { max: MAX_PAGES }) }}
            </div>

            <!-- Toggle to show the raw query -->
            <div v-if="generatedQuery" class="mt-4">
                <UButton variant="soft" size="sm" @click="showRawQuery = !showRawQuery" class="text-xs">
                    {{ showRawQuery ? $t('hideQuery') : $t('showQuery') }}
                </UButton>
                <div v-if="showRawQuery" class="mt-2">
                    <pre class="overflow-auto p-4 bg-gray-50 dark:bg-gray-800 rounded text-xs font-mono">{{ generatedQuery }}
            </pre>
                </div>
            </div>
        </div>
    </div>
</template>

<style scoped>
.search-results {
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
}

/* Make dropdown text readable with proper wrapping */
:deep(.u-select-input .u-input) {
    white-space: normal;
    word-wrap: break-word;
    min-height: 42px;
}

/* Ensure dropdown menus are wide enough */
:deep(.u-select-dropdown) {
    min-width: 280px !important;
    width: auto !important;
    max-width: 500px !important;
}

/* Custom styling for specific selectors */
:deep(.field-selector .u-select-dropdown) {
    min-width: 350px !important;
    width: auto !important;
}

:deep(.operator-selector .u-select-dropdown) {
    min-width: 250px !important;
    width: auto !important;
}

/* Ensure options in dropdown have enough space and wrap text */
:deep(.u-select-option) {
    white-space: normal !important;
    word-wrap: break-word !important;
    padding: 10px 14px !important;
    width: 100% !important;
    text-overflow: clip !important;
}

/* Increase specificity to override default styles */
:deep(.u-select-dropdown .u-select-options .u-select-option) {
    white-space: normal !important;
    overflow: visible !important;
}

/* Fix dropdown placement */
:deep(.u-popper) {
    width: auto !important;
    max-width: none !important;
}

/* Ensure popper content is sized correctly */
:deep(.u-popper-content) {
    width: auto !important;
    max-width: none !important;
}

/* Add animation for loading indicator */
.animate-pulse {
    animation: pulse 1.5s ease-in-out infinite;
}

@keyframes pulse {

    0%,
    100% {
        opacity: 0.7;
    }

    50% {
        opacity: 0.3;
    }
}
</style>
