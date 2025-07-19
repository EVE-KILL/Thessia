<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from "vue";
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
    title: "Query Builder",
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

import { useRoute, useRouter } from "vue-router";

// Save Query state
const showSaveFields = ref(true);
const showEditButton = ref(false);
const editing = ref(false);
const saveTitle = ref("");
const saveDescription = ref("");
const saveError = ref("");
const isSaving = ref(false);
const savedQueryId = ref<string | null>(null);

const route = useRoute();
const router = useRouter();

// Create refs for custom dropdowns
const fieldDropdownOpen = ref<Record<string, boolean>>({});
const operatorDropdownOpen = ref<Record<string, boolean>>({});
const sortFieldDropdownOpen = ref(false);
const sortDirectionDropdownOpen = ref(false);
const conjunctionDropdownOpen = ref(false);

// Functions to toggle dropdowns
const toggleFieldDropdown = (facetId: string) => {
    // Close any other open dropdowns
    for (const key in fieldDropdownOpen.value) {
        if (key !== facetId) fieldDropdownOpen.value[key] = false;
    }
    for (const key in operatorDropdownOpen.value) {
        operatorDropdownOpen.value[key] = false;
    }
    sortFieldDropdownOpen.value = false;
    sortDirectionDropdownOpen.value = false;
    conjunctionDropdownOpen.value = false;

    // Toggle this dropdown
    fieldDropdownOpen.value[facetId] = !fieldDropdownOpen.value[facetId];
};

const toggleOperatorDropdown = (facetId: string) => {
    // Close any other open dropdowns
    for (const key in fieldDropdownOpen.value) {
        fieldDropdownOpen.value[key] = false;
    }
    for (const key in operatorDropdownOpen.value) {
        if (key !== facetId) operatorDropdownOpen.value[key] = false;
    }
    sortFieldDropdownOpen.value = false;
    sortDirectionDropdownOpen.value = false;
    conjunctionDropdownOpen.value = false;

    // Toggle this dropdown
    operatorDropdownOpen.value[facetId] = !operatorDropdownOpen.value[facetId];
};

const toggleSortFieldDropdown = () => {
    // Close other dropdowns
    for (const key in fieldDropdownOpen.value) {
        fieldDropdownOpen.value[key] = false;
    }
    for (const key in operatorDropdownOpen.value) {
        operatorDropdownOpen.value[key] = false;
    }
    sortDirectionDropdownOpen.value = false;
    conjunctionDropdownOpen.value = false;

    // Toggle this dropdown
    sortFieldDropdownOpen.value = !sortFieldDropdownOpen.value;
};

const toggleSortDirectionDropdown = () => {
    // Close other dropdowns
    for (const key in fieldDropdownOpen.value) {
        fieldDropdownOpen.value[key] = false;
    }
    for (const key in operatorDropdownOpen.value) {
        operatorDropdownOpen.value[key] = false;
    }
    sortFieldDropdownOpen.value = false;
    conjunctionDropdownOpen.value = false;

    // Toggle this dropdown
    sortDirectionDropdownOpen.value = !sortDirectionDropdownOpen.value;
};

const toggleConjunctionDropdown = () => {
    // Close other dropdowns
    for (const key in fieldDropdownOpen.value) {
        fieldDropdownOpen.value[key] = false;
    }
    for (const key in operatorDropdownOpen.value) {
        operatorDropdownOpen.value[key] = false;
    }
    sortFieldDropdownOpen.value = false;
    sortDirectionDropdownOpen.value = false;

    // Toggle this dropdown
    conjunctionDropdownOpen.value = !conjunctionDropdownOpen.value;
};

// Close dropdown when clicking outside
const clickOutsideHandler = (e: MouseEvent) => {
    const target = e.target as HTMLElement;

    // If click is on dropdown toggle button or inside dropdown, don't close
    if (target.closest('.dropdown-toggle') || target.closest('.dropdown-menu')) return;

    // Close all dropdowns
    for (const key in fieldDropdownOpen.value) {
        fieldDropdownOpen.value[key] = false;
    }
    for (const key in operatorDropdownOpen.value) {
        operatorDropdownOpen.value[key] = false;
    }
    sortFieldDropdownOpen.value = false;
    sortDirectionDropdownOpen.value = false;
    conjunctionDropdownOpen.value = false;
};

// Set up click outside listener
onMounted(() => {
    document.addEventListener('click', clickOutsideHandler);
});

onUnmounted(() => {
    document.removeEventListener('click', clickOutsideHandler);
});

// Exposed methods for setting values in custom dropdown
const setFieldValue = (facetId: string, value: string) => {
    handleFieldChange(facetId, value);
    fieldDropdownOpen.value[facetId] = false;
};

const setOperatorValue = (facetId: string, value: string) => {
    handleOperatorChange(facetId, value);
    operatorDropdownOpen.value[facetId] = false;
};

const setSortFieldValue = (value: QueryableField) => {
    sortField.value = value;
    sortFieldDropdownOpen.value = false;
};

const setSortDirectionValue = (value: SortDirection) => {
    sortDirection.value = value;
    sortDirectionDropdownOpen.value = false;
};

const setConjunctionValue = (value: "and" | "or") => {
    conjunction.value = value;
    conjunctionDropdownOpen.value = false;
};

// Parse a saved query into facets, sort, etc.
function parseQueryToUI(savedQuery: QueryAPIRequest) {
    try {
        // Clear existing facets
        facets.value = [];

        // Parse filter conditions into facets
        if (savedQuery.filter) {
            // Handle AND conditions
            if (savedQuery.filter.$and) {
                conjunction.value = "and";
                for (const condition of savedQuery.filter.$and) {
                    parseSingleCondition(condition);
                }
            }
            // Handle OR conditions
            else if (savedQuery.filter.$or) {
                conjunction.value = "or";
                for (const condition of savedQuery.filter.$or) {
                    parseSingleCondition(condition);
                }
            }
            // Handle single condition or flat object with multiple fields
            else {
                // If it's a flat object with multiple fields, treat as AND
                const entries = Object.entries(savedQuery.filter);
                if (entries.length > 1) {
                    conjunction.value = "and";
                }

                for (const [field, value] of entries) {
                    if (!field.startsWith("$")) { // Skip operators like $and, $or
                        parseSingleCondition({ [field]: value });
                    }
                }
            }
        }

        // If no facets were created, add a default one
        if (facets.value.length === 0) {
            addFacet();
        }

        // Parse sort options
        if (savedQuery.options?.sort) {
            const sortEntry = Object.entries(savedQuery.options.sort)[0];
            if (sortEntry) {
                const [field, direction] = sortEntry;
                sortField.value = field as QueryableField;
                sortDirection.value = direction === 1 ? "asc" : "desc";
            }
        }

        // Parse limit
        if (savedQuery.options?.limit) {
            limit.value = Math.min(savedQuery.options.limit, MAX_LIMIT);
        }

        // Update the generated query
        updateQuery();
    } catch (err) {
        console.error("Error parsing saved query:", err);
        // Add a default facet if parsing failed
        if (facets.value.length === 0) {
            addFacet();
        }
    }
}

// Parse a single filter condition into a facet
function parseSingleCondition(condition: any) {
    const entries = Object.entries(condition);
    if (entries.length === 0) return;

    const [field, value] = entries[0];

    // Skip non-field entries (like operators)
    if (field.startsWith("$")) return;

    // Create a new facet
    const id = `facet-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
    const facet: any = {
        id,
        field,
        operator: "$eq", // Default
        value: null,
        searchTerm: "",
        searchResults: [],
        entityType: getEntityTypeForField(field),
    };

    // Determine operator and value
    if (typeof value === "object" && value !== null) {
        // Handle operator objects like {$gt: 5}
        const opEntries = Object.entries(value);
        if (opEntries.length > 0) {
            const [op, val] = opEntries[0];
            facet.operator = op;
            facet.value = val;

            // Special handling for array operators
            if ((op === "$in" || op === "$nin") && !Array.isArray(val)) {
                facet.value = [val];
            }
        }
    } else {
        // Simple equality
        facet.value = value;
    }

    facets.value.push(facet);
}

onMounted(async () => {
    const id = route.query.id as string | undefined;

    if (id) {
        savedQueryId.value = id;
        showSaveFields.value = false;
        showEditButton.value = true;
        editing.value = false;

        // Fetch saved query using direct fetch instead of useFetch
        try {
            // Use direct fetch API instead of useFetch
            const response = await fetch(`/api/query/load?id=${id}`);

            if (!response.ok) {
                throw new Error(`API returned status ${response.status}`);
            }

            const data = await response.json();

            if (data && data.query) {
                // Store title/description
                saveTitle.value = data.title || "";
                saveDescription.value = data.description || "";

                // Parse the saved query into UI components
                parseQueryToUI(data.query);

                // Update the query object and generated query
                updateQuery();

                // Execute the query automatically
                await executeQuery();
            } else {
                console.error("Invalid query data received");
            }
        } catch (err) {
            console.error("Error fetching saved query:", err);
        }
    } else {
        showSaveFields.value = true;
        showEditButton.value = false;
        editing.value = true;
    }
});

function handleEditQuery() {
    showSaveFields.value = true;
    showEditButton.value = false;
    editing.value = true;
}

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

// Add a ref to track the currently selected result in the dropdown for keyboard navigation
const selectedResultIndex = ref<Record<string, number>>({});

// Handle keyboard navigation for search dropdowns
const handleKeyDown = (facetId: string, e: KeyboardEvent) => {
    const facet = facets.value.find(f => f.id === facetId);
    if (!facet || !facet.searchResults || facet.searchResults.length === 0) return;

    // Initialize selectedResultIndex for this facet if not exists
    if (selectedResultIndex.value[facetId] === undefined) {
        selectedResultIndex.value[facetId] = -1;
    }

    switch (e.key) {
        case 'ArrowDown':
            e.preventDefault(); // Prevent cursor movement
            selectedResultIndex.value[facetId] = Math.min(
                (selectedResultIndex.value[facetId] + 1),
                facet.searchResults.length - 1
            );
            break;
        case 'ArrowUp':
            e.preventDefault(); // Prevent cursor movement
            selectedResultIndex.value[facetId] = Math.max(
                (selectedResultIndex.value[facetId] - 1),
                0
            );
            break;
        case 'Enter':
            e.preventDefault(); // Prevent form submission
            if (selectedResultIndex.value[facetId] >= 0) {
                selectSearchResult(facetId, facet.searchResults[selectedResultIndex.value[facetId]]);
            }
            break;
        case 'Escape':
            facet.searchResults = []; // Clear results
            selectedResultIndex.value[facetId] = -1;
            break;
    }
};

// Reset the selected index when search term changes or results update
watch(facets, (newFacets) => {
    for (const facet of newFacets) {
        if (facet.searchTerm !== lastSearchTerms.value[facet.id]) {
            selectedResultIndex.value[facet.id] = -1;
        }
    }
}, { deep: true });

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

async function saveQuery() {
    saveError.value = "";
    if (!saveTitle.value.trim()) {
        saveError.value = "Title is required.";
        return;
    }
    isSaving.value = true;
    try {
        let url = "/api/query/save";
        let body: any = {
            title: saveTitle.value,
            description: saveDescription.value,
            query: buildQueryObject(),
        };
        if (savedQueryId.value) {
            url = "/api/query/save";
            body.id = savedQueryId.value;
        }
        const { data, error } = await useFetch(url, {
            method: "POST",
            body,
        });
        if (error.value || !data.value || !data.value.hash) {
            saveError.value = error.value?.message || "Failed to save query.";
            isSaving.value = false;
            return;
        }
        // If new, redirect to /query?id=<hash>
        if (!savedQueryId.value) {
            window.location.href = `/query?id=${data.value.hash}`;
        } else {
            // If updating, just reload page
            window.location.reload();
        }
    } catch (err: any) {
        saveError.value = err.message || "Failed to save query.";
    } finally {
        isSaving.value = false;
    }
}

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
    <div class="space-y-6">
        <h1 class="text-2xl font-bold">{{ $t('queryBuilder') }}</h1>

        <!-- Show saved query title and description when viewing a saved query -->
        <div v-if="!showSaveFields && savedQueryId" class="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg mb-4">
            <h1 class="text-2xl font-bold mb-2">{{ saveTitle }}</h1>
            <p v-if="saveDescription" class="text-gray-600 dark:text-gray-400 mb-4">{{ saveDescription }}</p>
            <div class="mb-2">
                <UButton color="primary" icon="i-lucide-edit" @click="handleEditQuery">
                    Edit Query
                </UButton>
            </div>
        </div>

        <!-- Query builder components - only show when editing -->
        <template v-if="showSaveFields">
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

            <!-- Filters Section -->
            <div class="mb-6">
                <UCard class="filter-card bg-blue-50 dark:bg-blue-900/20 border-0 !overflow-visible">
                    <template #header>
                        <div class="flex justify-between items-center">
                            <h2 class="text-lg font-bold">{{ $t('filters') }}</h2>
                            <div class="flex gap-4">
                                <!-- Custom conjunction dropdown -->
                                <div class="custom-select-container relative">
                                    <button @click.stop="toggleConjunctionDropdown"
                                        class="custom-select dropdown-toggle flex items-center justify-between px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-sm">
                                        <span>{{ conjunction === 'and' ? t('and') : t('or') }}</span>
                                        <span class="ml-2">
                                            <Icon name="lucide:chevron-down" class="w-4 h-4" />
                                        </span>
                                    </button>

                                    <div v-show="conjunctionDropdownOpen"
                                        class="dropdown-menu absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md shadow-lg max-h-60 overflow-y-auto">
                                        <div v-for="option in CONJUNCTION_OPTIONS" :key="option.value"
                                            @click="setConjunctionValue(option.value as 'and' | 'or')"
                                            class="custom-option px-3 py-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700"
                                            :class="{ 'bg-blue-100 dark:bg-blue-900/30': conjunction === option.value }">
                                            {{ option.label }}
                                        </div>
                                    </div>
                                </div>

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
                            class="facet-row bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 shadow-sm transition-all hover:shadow-md">
                            <div class="flex flex-wrap md:flex-nowrap gap-3 items-start">
                                <!-- Field selector -->
                                <div class="w-full md:w-1/3">
                                    <div class="form-field">
                                        <label class="block text-sm font-medium mb-1">{{ $t('field') }}</label>
                                        <div class="custom-select-container relative">
                                            <button @click.stop="toggleFieldDropdown(facet.id)"
                                                class="custom-select dropdown-toggle flex items-center justify-between px-3 py-2 w-full border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800">
                                                <span class="truncate">{{FIELD_OPTIONS.find(f => f.value ===
                                                    facet.field)?.label ||
                                                    facet.field}}</span>
                                                <span class="ml-2">
                                                    <Icon name="lucide:chevron-down" class="w-4 h-4" />
                                                </span>
                                            </button>

                                            <div v-show="fieldDropdownOpen[facet.id]"
                                                class="dropdown-menu absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md shadow-lg max-h-60 overflow-y-auto">
                                                <div v-for="option in FIELD_OPTIONS" :key="option.value"
                                                    @click="setFieldValue(facet.id, option.value)"
                                                    class="custom-option px-3 py-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700"
                                                    :class="{ 'bg-blue-100 dark:bg-blue-900/30': facet.field === option.value }">
                                                    {{ option.label }}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <!-- Operator selector -->
                                <div class="w-full md:w-1/4">
                                    <div class="form-field">
                                        <label class="block text-sm font-medium mb-1">{{ $t('operator') }}</label>
                                        <div class="custom-select-container relative">
                                            <button @click.stop="toggleOperatorDropdown(facet.id)"
                                                class="custom-select dropdown-toggle flex items-center justify-between px-3 py-2 w-full border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800">
                                                <span>{{OPERATOR_OPTIONS.find(o => o.value === facet.operator)?.label
                                                    ||
                                                    facet.operator}}</span>
                                                <span class="ml-2">
                                                    <Icon name="lucide:chevron-down" class="w-4 h-4" />
                                                </span>
                                            </button>

                                            <div v-show="operatorDropdownOpen[facet.id]"
                                                class="dropdown-menu absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md shadow-lg max-h-60 overflow-y-auto">
                                                <div v-for="option in OPERATOR_OPTIONS" :key="option.value"
                                                    @click="setOperatorValue(facet.id, option.value)"
                                                    class="custom-option px-3 py-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700"
                                                    :class="{ 'bg-blue-100 dark:bg-blue-900/30': facet.operator === option.value }">
                                                    {{ option.label }}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <!-- Value input -->
                                <div class="w-full md:w-1/3">
                                    <div class="form-field">
                                        <label class="block text-sm font-medium mb-1">{{ $t('value') }}</label>
                                        <!-- Boolean selectors -->
                                        <template
                                            v-if="facet.field === 'is_npc' || facet.field === 'is_solo' || facet.operator === '$exists'">
                                            <URadioGroup v-model="facet.value" :items="BOOLEAN_OPTIONS"
                                                class="flex gap-4 radio-group" />
                                        </template>

                                        <!-- Multi-value (in/not in array) -->
                                        <template v-else-if="['$in', '$nin'].includes(facet.operator)">
                                            <div class="space-y-2">
                                                <div class="flex gap-2">
                                                    <input v-model="facet.searchTerm" :placeholder="$t('typeToSearch')"
                                                        class="custom-input flex-1"
                                                        @keydown="(e) => handleKeyDown(facet.id, e)" />
                                                    <button @click="addValueToArray(facet.id)"
                                                        class="custom-btn flex items-center justify-center px-3 py-2 bg-gray-100 dark:bg-gray-700 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600">
                                                        <Icon name="lucide:plus" class="w-4 h-4" />
                                                    </button>
                                                </div>

                                                <!-- Selected values -->
                                                <div v-if="Array.isArray(facet.value) && facet.value.length > 0"
                                                    class="flex flex-wrap gap-2 mt-2">
                                                    <UBadge v-for="(val, i) in facet.value" :key="i" color="primary"
                                                        class="flex items-center gap-1 py-1 px-2">
                                                        {{ val }}
                                                        <UButton color="white" variant="ghost" icon="i-lucide-x"
                                                            size="xs" class="p-0"
                                                            @click="removeValueFromArray(facet.id, val)" />
                                                    </UBadge>
                                                </div>

                                                <!-- Search results for entity lookups -->
                                                <div v-if="supportsSearch(facet.field) && facet.searchTerm && facet.searchResults && facet.searchResults.length > 0"
                                                    class="search-results border dark:border-gray-700 rounded-md mt-1 max-h-60 overflow-y-auto">
                                                    <div v-for="(result, index) in facet.searchResults" :key="result.id"
                                                        class="search-result-item p-2 cursor-pointer"
                                                        :class="{ 'search-result-selected': index === selectedResultIndex[facet.id] }"
                                                        @click="selectSearchResult(facet.id, result)">
                                                        {{ result.name }}
                                                    </div>
                                                </div>
                                            </div>
                                        </template>

                                        <!-- Entity search for ID fields -->
                                        <template v-else-if="supportsSearch(facet.field)">
                                            <div class="relative">
                                                <input v-model="facet.searchTerm"
                                                    :placeholder="$t('searchFor') + ' ' + facet.entityType"
                                                    class="custom-input w-full"
                                                    @keydown="(e) => handleKeyDown(facet.id, e)" />

                                                <input v-model="facet.value" type="hidden" />

                                                <!-- Search results dropdown -->
                                                <div v-if="facet.searchResults && facet.searchResults.length > 0"
                                                    class="search-results absolute z-10 w-full border dark:border-gray-700 bg-white dark:bg-gray-900 rounded-md mt-1 max-h-60 overflow-y-auto shadow-lg">
                                                    <div v-for="(result, index) in facet.searchResults" :key="result.id"
                                                        class="search-result-item p-2 cursor-pointer"
                                                        :class="{ 'search-result-selected': index === selectedResultIndex[facet.id] }"
                                                        @click="selectSearchResult(facet.id, result)">
                                                        {{ result.name }}
                                                    </div>
                                                </div>

                                                <!-- Selected entity display -->
                                                <div v-if="facet.valueLabel"
                                                    class="mt-2 text-sm text-blue-600 dark:text-blue-400 font-medium">
                                                    {{ $t('selected') }}: {{ facet.valueLabel }} ({{ facet.value }})
                                                </div>
                                            </div>
                                        </template>

                                        <!-- Numeric input for numeric fields -->
                                        <template
                                            v-else-if="['killmail_id', 'total_value', 'system_security'].includes(facet.field)">
                                            <input v-model.number="facet.value" type="number"
                                                class="custom-input w-full"
                                                :step="facet.field === 'system_security' ? '0.1' : '1'" />
                                        </template>

                                        <!-- Date/time input for kill_time -->
                                        <template v-else-if="facet.field === 'kill_time'">
                                            <input v-model.number="facet.value" type="number"
                                                class="custom-input w-full" :placeholder="$t('unixTimestamp')" />
                                            <p class="text-xs text-gray-500 mt-1">{{ $t('unixTimestampHelp') }}</p>
                                        </template>

                                        <!-- Default text input for other fields -->
                                        <template v-else>
                                            <input v-model="facet.value" class="custom-input w-full" />
                                        </template>
                                    </div>
                                </div>

                                <!-- Remove facet button -->
                                <div class="flex items-center pt-8 md:w-10">
                                    <button @click="removeFacet(facet.id)"
                                        class="p-2 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/20 rounded-md">
                                        <Icon name="lucide:trash-2" class="w-5 h-5" />
                                    </button>
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
                <UCard class="options-card bg-green-50 dark:bg-green-900/20 border-0 !overflow-visible">
                    <template #header>
                        <h2 class="text-lg font-bold">{{ $t('options') }}</h2>
                    </template>

                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div class="sort-controls bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm">
                            <h3 class="text-md font-medium mb-2">{{ $t('sort') }}</h3>
                            <div class="flex flex-wrap md:flex-nowrap gap-3">
                                <!-- Custom sort field dropdown -->
                                <div class="flex-1 relative">
                                    <div class="custom-select-container relative">
                                        <button @click.stop="toggleSortFieldDropdown"
                                            class="custom-select dropdown-toggle flex items-center justify-between px-3 py-2 w-full border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800">
                                            <span class="truncate">{{FIELD_OPTIONS.find(f => f.value ===
                                                sortField)?.label ||
                                                sortField}}</span>
                                            <span class="ml-2">
                                                <Icon name="lucide:chevron-down" class="w-4 h-4" />
                                            </span>
                                        </button>

                                        <div v-show="sortFieldDropdownOpen"
                                            class="dropdown-menu absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md shadow-lg max-h-60 overflow-y-auto">
                                            <div v-for="option in FIELD_OPTIONS" :key="option.value"
                                                @click="setSortFieldValue(option.value as QueryableField)"
                                                class="custom-option px-3 py-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700"
                                                :class="{ 'bg-blue-100 dark:bg-blue-900/30': sortField === option.value }">
                                                {{ option.label }}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <!-- Custom sort direction dropdown -->
                                <div class="w-40 relative">
                                    <div class="custom-select-container relative">
                                        <button @click.stop="toggleSortDirectionDropdown"
                                            class="custom-select dropdown-toggle flex items-center justify-between px-3 py-2 w-full border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800">
                                            <span>{{SORT_DIRECTION_OPTIONS.find(d => d.value === sortDirection)?.label
                                                ||
                                                sortDirection}}</span>
                                            <span class="ml-2">
                                                <Icon name="lucide:chevron-down" class="w-4 h-4" />
                                            </span>
                                        </button>

                                        <div v-show="sortDirectionDropdownOpen"
                                            class="dropdown-menu absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md shadow-lg">
                                            <div v-for="option in SORT_DIRECTION_OPTIONS" :key="option.value"
                                                @click="setSortDirectionValue(option.value as SortDirection)"
                                                class="custom-option px-3 py-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700"
                                                :class="{ 'bg-blue-100 dark:bg-blue-900/30': sortDirection === option.value }">
                                                {{ option.label }}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div class="limit-controls bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm">
                            <h3 class="text-md font-medium mb-2">{{ $t('limit') }}</h3>
                            <input v-model.number="limit" type="number" :min="1" :max="MAX_LIMIT"
                                class="custom-input w-full" />
                            <p class="text-xs text-gray-500 mt-1">{{ $t('maxLimit', { max: MAX_LIMIT }) }}</p>
                        </div>
                    </div>
                </UCard>
            </div>

            <!-- Query execution controls and Save Query fields -->
            <div
                class="mb-6 bg-gray-100 dark:bg-gray-800 p-4 rounded-lg flex flex-wrap gap-4 items-center justify-between">
                <div class="flex gap-3">
                    <UButton color="primary" icon="i-lucide-search" :loading="isLoading" @click="executeQuery"
                        class="btn-execute" size="lg">
                        {{ $t('executeQuery') }}
                    </UButton>
                    <UButton color="primary" variant="outline" icon="i-lucide-save" @click="saveQuery"
                        :loading="isSaving" class="btn-save" size="lg">
                        {{ savedQueryId ? 'Update Query' : 'Save Query' }}
                    </UButton>
                    <div class="flex items-center px-2 py-1 bg-white dark:bg-gray-700 rounded-lg">
                        <UCheckbox v-model="generateQuery" name="auto-generate" class="mr-2" />
                        <span class="text-sm">
                            {{ $t('autoGenerateQuery') }}
                            <UTooltip
                                text="Automatically generates and updates the query whenever you change filters, sort options, or limit">
                                <UButton icon="i-lucide-help-circle" variant="ghost" color="gray" size="xs"
                                    class="p-0" />
                            </UTooltip>
                        </span>
                    </div>
                </div>
                <UButton v-if="!generateQuery" @click="updateQuery" variant="soft" size="lg">{{ $t('generateQuery') }}
                </UButton>
            </div>

            <!-- Save Query fields -->
            <div class="mb-6">
                <UCard class="save-card bg-yellow-50 dark:bg-yellow-900/20 border-0">
                    <template #header>
                        <h2 class="text-lg font-bold">{{ savedQueryId ? 'Update Query' : 'Save Query' }}</h2>
                    </template>
                    <div class="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm">
                        <div class="flex flex-col md:flex-row gap-4 items-start">
                            <div class="flex-1">
                                <label for="saveTitle" class="block text-sm font-medium mb-1">Title</label>
                                <input id="saveTitle" v-model="saveTitle" placeholder="Enter a title for your query"
                                    class="custom-input w-full" required />
                            </div>
                            <div class="flex-1">
                                <label for="saveDescription" class="block text-sm font-medium mb-1">Description</label>
                                <textarea id="saveDescription" v-model="saveDescription"
                                    placeholder="Describe this query (optional)"
                                    class="custom-textarea w-full"></textarea>
                            </div>
                        </div>
                        <div v-if="saveError" class="text-red-600 mt-2 p-2 bg-red-50 dark:bg-red-900/20 rounded">{{
                            saveError }}
                        </div>
                    </div>
                </UCard>
            </div>

            <!-- Query preview - only show when editing -->
            <UCard v-if="generatedQuery" class="mb-6 generated-card bg-gray-100 dark:bg-gray-800 border-0">
                <template #header>
                    <div class="flex items-center justify-between">
                        <h2 class="text-lg font-bold">{{ $t('generatedQuery') }}</h2>
                        <UButton @click="showRawQuery = !showRawQuery" variant="ghost" size="xs"
                            class="text-xs hover:bg-gray-200 dark:hover:bg-gray-700">
                            {{ showRawQuery ? $t('hideQuery') : $t('showQuery') }}
                        </UButton>
                    </div>
                </template>
                <div v-if="showRawQuery">
                    <pre class="overflow-auto p-4 bg-white dark:bg-gray-900 rounded-lg shadow-inner font-mono text-sm">{{
                        generatedQuery }}</pre>
                </div>
            </UCard>
        </template>

        <!-- Error display -->
        <UAlert v-if="error" color="red" class="mb-6">
            <template #title>{{ $t('error') }}</template>
            <template #description>{{ error }}</template>
        </UAlert>

        <!-- Query results visualization with transformed data and pagination -->
        <div v-if="queryResult" class="mt-8">
            <div
                class="results-header bg-gray-100 dark:bg-gray-800 p-4 rounded-lg mb-4 flex justify-between items-center">
                <h2 class="text-xl font-bold">{{ $t('results') }}</h2>
                <UBadge color="primary" class="text-sm px-3 py-1">
                    {{ $t('resultCount', { count: queryResult.length }) }}
                </UBadge>
            </div>

            <!-- Pagination controls -->
            <div
                class="pagination-controls bg-gray-50 dark:bg-gray-900/50 p-3 rounded-lg flex justify-between items-center mb-4">
                <UBadge v-if="isLoading" color="gray" class="text-sm animate-pulse px-3 py-1">
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

            <!-- Results -->
            <div class="results-container bg-white dark:bg-gray-900/20 rounded-lg p-4 shadow-lg">
                <!-- Use the transformed query results with proper props -->
                <KillList :externalKilllistData="transformedQueryResult" :limit="limit" :enablePagination="false"
                    wsDisabled />
            </div>

            <!-- Bottom pagination controls -->
            <div
                class="pagination-controls bg-gray-50 dark:bg-gray-900/50 p-3 rounded-lg flex justify-between items-center mt-4">
                <UBadge v-if="isLoading" color="gray" class="text-sm animate-pulse px-3 py-1">
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
                class="mt-2 text-xs text-amber-600 dark:text-amber-400 text-center p-2 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
                {{ $t('paginationLimitWarning', { max: MAX_PAGES }) }}
            </div>
        </div>
    </div>
</template>

<style scoped>
/* Card colors and styling */
.filter-card {
    transition: all 0.2s ease;
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
}

.options-card {
    transition: all 0.2s ease;
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
}

.save-card {
    transition: all 0.2s ease;
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
}

.generated-card {
    transition: all 0.2s ease;
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
}

/* Facet row transitions */
.facet-row {
    transition: all 0.2s ease;
}

.facet-row:hover {
    border-color: #93c5fd;
}

/* Custom input styling */
.custom-input {
    display: block;
    height: 42px;
    padding: 0.5rem 0.75rem;
    font-size: 0.875rem;
    font-family: inherit;
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

.custom-textarea {
    display: block;
    min-height: 80px;
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

.custom-textarea:focus {
    border-color: #3b82f6;
    box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.3);
}

/* Custom dropdown styling - with solid backgrounds */
.custom-select-container {
    position: relative;
    width: 100%;
}

.custom-select {
    width: 100%;
    min-height: 42px;
    background-color: #ffffff;
    border: 1px solid #d1d5db;
    border-radius: 0.375rem;
    font-size: 0.875rem;
    cursor: pointer;
    text-align: left;
    transition: all 0.2s ease;
}

.custom-select:hover {
    border-color: #93c5fd;
}

/* Ensure dropdown menus have solid backgrounds */
.dropdown-menu {
    position: absolute;
    z-index: 100;
    /* Higher z-index to ensure visibility */
    width: 100%;
    max-height: 250px;
    overflow-y: auto;
    background-color: #ffffff !important;
    /* Force solid white background */
    border: 2px solid #d1d5db;
    border-radius: 0.375rem;
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
}

.custom-option {
    padding: 0.5rem 0.75rem;
    cursor: pointer;
    transition: background-color 0.15s ease;
    background-color: transparent;
    /* Start transparent for hover effect */
}

.custom-option:hover {
    background-color: #f3f4f6 !important;
    /* Force hover color */
}

/* Dark mode styles with forced solid backgrounds */
.dark .custom-select {
    color: #f9fafb;
    background-color: #1f2937;
    border-color: #4b5563;
}

.dark .dropdown-menu {
    background-color: #111827 !important;
    /* Force solid dark background */
    border-color: #374151;
    border-width: 2px;
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.5);
}

.dark .custom-option:hover {
    background-color: #374151 !important;
    /* Force hover color in dark mode */
}

/* Search results styling with solid backgrounds */
.search-results {
    position: absolute;
    z-index: 100;
    /* Higher z-index to ensure visibility */
    background-color: #ffffff !important;
    /* Force solid background */
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    border-radius: 0.375rem;
    border: 2px solid #d1d5db;
    width: 100%;
}

.search-result-item {
    padding: 0.5rem 0.75rem;
    color: #111827;
    transition: background-color 0.15s ease;
    background-color: transparent;
    /* Start transparent for hover effect */
}

.search-result-item:hover {
    background-color: #f3f4f6 !important;
    /* Force hover color */
}

.dark .search-results {
    background-color: #111827 !important;
    /* Force solid background in dark mode */
    border-color: #374151;
}

.dark .search-result-item {
    color: #f9fafb;
}

.dark .search-result-item:hover {
    background-color: #374151 !important;
    /* Force hover color in dark mode */
}

.search-result-selected {
    background-color: #e0f2fe !important;
    /* Light blue background */
    color: #0369a1 !important;
    /* Darker blue text */
}

.dark .search-result-selected {
    background-color: #0c4a6e !important;
    /* Dark blue background */
    color: #7dd3fc !important;
    /* Light blue text */
}

/* Form field alignment */
.form-field {
    margin-bottom: 0;
    height: 100%;
}

/* Align radio buttons with other inputs */
.radio-group {
    height: 42px;
    /* Match other input heights */
    display: flex;
    align-items: center;
}

/* Animation for loading indicator */
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

/* Responsive adjustments */
@media (max-width: 768px) {
    .facet-row {
        padding: 1rem 0.5rem;
    }

    .results-header {
        flex-direction: column;
        align-items: flex-start;
        gap: 0.5rem;
    }
}
</style>
