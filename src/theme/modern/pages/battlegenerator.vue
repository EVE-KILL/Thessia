<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';

const { t, locale } = useI18n();
const route = useRoute();
const router = useRouter();

// Define types for entities
interface Entity {
    id: number;
    name: string;
    type: 'alliance' | 'corporation';
    alliance_id?: number | null;
    alliance_name?: string | null;
}

// Define system interface
interface SelectedSystem {
    id: number;
    name: string;
}

// Number of sides to display
const numSides = ref(2);
const sideOptions = computed(() => [
    { value: 2, label: t('battleGenerator.numSides.two') },
    { value: 3, label: t('battleGenerator.numSides.three') },
    { value: 4, label: t('battleGenerator.numSides.four') }
]);

// Side names with defaults
const sideAName = ref(t('battleGenerator.sideA'));
const sideBName = ref(t('battleGenerator.sideB'));
const sideCName = ref(t('battleGenerator.sideC'));
const sideDName = ref(t('battleGenerator.sideD'));

// Side name editing state
const editingSideA = ref(false);
const editingSideB = ref(false);
const editingSideC = ref(false);
const editingSideD = ref(false);

// Define reactive state
const systemSearchTerm = ref('');
const systemSearchResults = ref<{ id: number; name: string }[]>([]);
const selectedSystems = ref<SelectedSystem[]>([]);
const lastSystemSearchTerm = ref('');
const startTime = ref();
const endTime = ref();
const loading = ref(false);
const error = ref('');
const justSelected = ref(false); // New flag to prevent immediate search after selection
const showGeneratedData = ref(false); // Hide generated data by default
const generatedData = ref<string>(''); // Keep this ref as it's used by other functions
const MAX_SYSTEMS = 5;

// Add a ref to track the currently selected result in the dropdown
const selectedResultIndex = ref(-1);

// Define the columns of entities
const sideA = ref<Entity[]>([]);
const undecided = ref<Entity[]>([]);
const sideB = ref<Entity[]>([]);
const sideC = ref<Entity[]>([]);
const sideD = ref<Entity[]>([]);

// Preview data - update to only use new data structure
const previewData = ref<any | null>(null);
const previewKillmails = ref<any[]>([]);
const teamKills = ref<Record<string, any[]>>({});
const teamStats = ref<Record<string, any>>({});
const teamAlliances = ref<Record<string, any[]>>({});
const teamCorporations = ref<Record<string, any[]>>({});
const teamCharacters = ref<Record<string, any[]>>({});

const activeTabId = ref('');

// Check if systems limit reached
const systemLimitReached = computed(() => {
    return selectedSystems.value.length >= MAX_SYSTEMS;
});

// Check if preview is ready
const previewReady = computed(() => {
    if (selectedSystems.value.length === 0 || !startTime.value || !endTime.value) {
        return false;
    }

    // Check first 2 sides always
    if (sideA.value.length === 0 || sideB.value.length === 0) {
        return false;
    }

    // Check side C if enabled
    if (numSides.value >= 3 && sideC.value.length === 0) {
        return false;
    }

    // Check side D if enabled
    if (numSides.value >= 4 && sideD.value.length === 0) {
        return false;
    }

    return true;
});

// Tabs for preview
const tabs = computed(() => [
    { id: 'overview', label: t('battleGenerator.tabs.overview'), slot: 'overview' },
    { id: 'kills', label: t('battleGenerator.tabs.kills'), slot: 'kills' },
    { id: 'alliances', label: t('battleGenerator.tabs.alliances'), slot: 'alliances' },
    { id: 'corporations', label: t('battleGenerator.tabs.corporations'), slot: 'corporations' },
    { id: 'characters', label: t('battleGenerator.tabs.characters'), slot: 'characters' },
    { id: 'timeline', label: t('battleGenerator.tabs.timeline'), slot: 'timeline' }
]);

const tabsUi = {
    list: "mb-0",
    tab: "p-2 text-sm font-semibold text-white rounded-lg bg-background-700 hover:bg-background-600 ml-2"
};

// Define common input styling - updating to ensure consistent height and appearance
const inputClass = "w-full font-sans text-sm";

// Add a ref to control corporation visibility
const showCorpsInAlliances = ref(false);

// Search for systems
async function searchSystems(term: string) {
    // Don't search for short terms
    if (term.length < 2) {
        systemSearchResults.value = [];
        return;
    }

    // Don't repeat the same search
    if (lastSystemSearchTerm.value === term) return;

    try {
        const encoded = encodeURIComponent(term);
        const { data } = await useFetch(`/api/search/${encoded}`);

        if (data.value && data.value.hits) {
            // Filter results to only include systems
            systemSearchResults.value = data.value.hits
                .filter((hit) => hit.type === 'system')
                .slice(0, 10); // Limit to 10 results
        }

        // Update last search term
        lastSystemSearchTerm.value = term;
    } catch (err) {
        console.error("System search error:", err);
    }
}

// Create a debounced version of the search function
const debouncedSearch = useDebounceFn(searchSystems, 300);

// Handle keyboard navigation
const handleKeyDown = (e: KeyboardEvent) => {
    // Only process if we have results and not at system limit
    if (systemSearchResults.value.length === 0 || systemLimitReached.value) return;

    switch (e.key) {
        case 'ArrowDown':
            e.preventDefault(); // Prevent cursor movement
            selectedResultIndex.value = Math.min(selectedResultIndex.value + 1, systemSearchResults.value.length - 1);
            break;
        case 'ArrowUp':
            e.preventDefault(); // Prevent cursor movement
            selectedResultIndex.value = Math.max(selectedResultIndex.value - 1, 0);
            break;
        case 'Enter':
            e.preventDefault(); // Prevent form submission
            if (selectedResultIndex.value >= 0) {
                selectSystem(systemSearchResults.value[selectedResultIndex.value]);
            }
            break;
        case 'Escape':
            systemSearchResults.value = []; // Clear results
            break;
    }
};

// Watch for changes to the search term
watch(systemSearchTerm, (newTerm) => {
    // Skip search if we just selected an item
    if (justSelected.value) return;

    if (newTerm && newTerm.length >= 2) {
        debouncedSearch(newTerm);
    } else {
        systemSearchResults.value = [];
    }

    // Reset the selected index whenever search term changes
    selectedResultIndex.value = -1;
});

// Select a system from search results
function selectSystem(system: { id: number; name: string }) {
    // Set the flag to prevent search
    justSelected.value = true;

    // Check if system is already selected
    const alreadySelected = selectedSystems.value.some(s => s.id === system.id);
    if (alreadySelected) {
        justSelected.value = false;
        return;
    }

    // Check if we've reached the maximum number of systems
    if (selectedSystems.value.length >= MAX_SYSTEMS) {
        error.value = t('battleGenerator.errors.maxSystemsReached', { max: MAX_SYSTEMS });
        justSelected.value = false;
        return;
    }

    // Add the system to our selected systems
    selectedSystems.value.push({
        id: system.id,
        name: system.name
    });

    // Clear search term and results
    systemSearchTerm.value = '';
    systemSearchResults.value = [];

    // Reset the flag after a short delay
    setTimeout(() => {
        justSelected.value = false;
    }, 500);
}

// Remove a system from selected systems
function removeSystem(systemId: number) {
    selectedSystems.value = selectedSystems.value.filter(system => system.id !== systemId);
}

// Function to load entities from the API
const loadEntities = async () => {
    if (selectedSystems.value.length === 0) {
        error.value = t('battleGenerator.errors.systemRequired');
        return;
    }

    if (!startTime.value) {
        error.value = t('battleGenerator.errors.startTimeRequired');
        return;
    }

    if (!endTime.value) {
        error.value = t('battleGenerator.errors.endTimeRequired');
        return;
    }
    // Enforce max timespan of 36 hours
    {
        const start = new Date(startTime.value);
        const end = new Date(endTime.value);
        const diff = end.getTime() - start.getTime();
        const maxMs = 36 * 60 * 60 * 1000;
        if (diff > maxMs) {
            error.value = t('battleGenerator.errors.maxTimespan');
            loading.value = false;
            return;
        }
    }

    error.value = '';
    loading.value = true;

    try {
        const systemIds = selectedSystems.value.map(system => system.id);
        const response = await fetch('/api/battles/entities', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                systemIds,
                startTime: startTime.value,
                endTime: endTime.value,
            }),
        });

        if (!response.ok) {
            throw new Error(`API error: ${response.status}`);
        }

        const data = await response.json();

        // Reset the lists
        sideA.value = [];
        sideB.value = [];
        sideC.value = [];
        sideD.value = [];

        // Initialize undecided with all entities
        undecided.value = [
            ...data.alliances.map((alliance: any) => ({
                id: alliance.id,
                name: alliance.name,
                type: 'alliance' as const,
            })),
            ...data.corporations.map((corporation: any) => ({
                id: corporation.id,
                name: corporation.name,
                type: 'corporation' as const,
                alliance_id: corporation.alliance_id,
                alliance_name: corporation.alliance_name,
            })),
        ];

        // Update generated data
        updateGeneratedData();
    } catch (err: any) {
        let messageKey = 'battleGenerator.errors.unknownError';
        const messageParams = {}; // Future use if API sends params with keys
        if (err && err.message && typeof err.message === 'string' && err.message.startsWith('apiErrors.')) {
            messageKey = err.message;
            // Example for future: if (err.data) { messageParams = err.data; }
        } else if (err && err.message && typeof err.message === 'string' && !err.message.startsWith('API error:')) {
            // If it's not an API key, but also not our generic "API error: status" message,
            // it might be a direct message from an unexpected client-side error.
            // For now, we'll let it fall through to unknownError, or you could display it directly if deemed safe.
            // error.value = err.message; // Potentially display direct non-keyed client error
            // return;
        }
        error.value = t(messageKey, messageParams);
    } finally {
        loading.value = false;
    }
};

// Functions to move entities between columns
const moveToSideA = (entity: Entity) => {
    // If this is a corporation that belongs to an alliance, prevent moving it independently
    if (entity.type === 'corporation' && entity.alliance_id) {
        return; // Prevent moving corporations that belong to an alliance
    }

    // If this is an alliance, also move all its corporations
    if (entity.type === 'alliance') {
        // First move the alliance
        const allianceIndex = undecided.value.findIndex(e => e.id === entity.id && e.type === entity.type);
        if (allianceIndex !== -1) {
            sideA.value.push(entity);
            undecided.value.splice(allianceIndex, 1);
        }

        // Then find and move all corporations belonging to this alliance
        const corpIndices: number[] = [];
        undecided.value.forEach((e, index) => {
            if (e.type === 'corporation' && e.alliance_id === entity.id) {
                corpIndices.unshift(index); // Add to beginning so we can remove from highest index first
                sideA.value.push(e);
            }
        });

        // Remove the corporations from undecided (in reverse order to maintain indices)
        corpIndices.forEach(index => {
            undecided.value.splice(index, 1);
        });
    } else {
        // This is a corporation with no alliance
        const index = undecided.value.findIndex(e => e.id === entity.id && e.type === entity.type);
        if (index !== -1) {
            sideA.value.push(entity);
            undecided.value.splice(index, 1);
        }
    }
};

const moveToSideB = (entity: Entity) => {
    // If this is a corporation that belongs to an alliance, prevent moving it independently
    if (entity.type === 'corporation' && entity.alliance_id) {
        return; // Prevent moving corporations that belong to an alliance
    }

    // If this is an alliance, also move all its corporations
    if (entity.type === 'alliance') {
        // First move the alliance
        const allianceIndex = undecided.value.findIndex(e => e.id === entity.id && e.type === entity.type);
        if (allianceIndex !== -1) {
            sideB.value.push(entity);
            undecided.value.splice(allianceIndex, 1);
        }

        // Then find and move all corporations belonging to this alliance
        const corpIndices: number[] = [];
        undecided.value.forEach((e, index) => {
            if (e.type === 'corporation' && e.alliance_id === entity.id) {
                corpIndices.unshift(index); // Add to beginning so we can remove from highest index first
                sideB.value.push(e);
            }
        });

        // Remove the corporations from undecided (in reverse order to maintain indices)
        corpIndices.forEach(index => {
            undecided.value.splice(index, 1);
        });
    } else {
        // This is a corporation with no alliance
        const index = undecided.value.findIndex(e => e.id === entity.id && e.type === entity.type);
        if (index !== -1) {
            sideB.value.push(entity);
            undecided.value.splice(index, 1);
        }
    }
};

const moveToSideC = (entity: Entity) => {
    // If this is a corporation that belongs to an alliance, prevent moving it independently
    if (entity.type === 'corporation' && entity.alliance_id) {
        return; // Prevent moving corporations that belong to an alliance
    }

    // If this is an alliance, also move all its corporations
    if (entity.type === 'alliance') {
        // First move the alliance
        const allianceIndex = undecided.value.findIndex(e => e.id === entity.id && e.type === entity.type);
        if (allianceIndex !== -1) {
            sideC.value.push(entity);
            undecided.value.splice(allianceIndex, 1);
        }

        // Then find and move all corporations belonging to this alliance
        const corpIndices: number[] = [];
        undecided.value.forEach((e, index) => {
            if (e.type === 'corporation' && e.alliance_id === entity.id) {
                corpIndices.unshift(index); // Add to beginning so we can remove from highest index first
                sideC.value.push(e);
            }
        });

        // Remove the corporations from undecided (in reverse order to maintain indices)
        corpIndices.forEach(index => {
            undecided.value.splice(index, 1);
        });
    } else {
        // This is a corporation with no alliance
        const index = undecided.value.findIndex(e => e.id === entity.id && e.type === entity.type);
        if (index !== -1) {
            sideC.value.push(entity);
            undecided.value.splice(index, 1);
        }
    }
};

const moveToSideD = (entity: Entity) => {
    // If this is a corporation that belongs to an alliance, prevent moving it independently
    if (entity.type === 'corporation' && entity.alliance_id) {
        return; // Prevent moving corporations that belong to an alliance
    }

    // If this is an alliance, also move all its corporations
    if (entity.type === 'alliance') {
        // First move the alliance
        const allianceIndex = undecided.value.findIndex(e => e.id === entity.id && e.type === entity.type);
        if (allianceIndex !== -1) {
            sideD.value.push(entity);
            undecided.value.splice(allianceIndex, 1);
        }

        // Then find and move all corporations belonging to this alliance
        const corpIndices: number[] = [];
        undecided.value.forEach((e, index) => {
            if (e.type === 'corporation' && e.alliance_id === entity.id) {
                corpIndices.unshift(index); // Add to beginning so we can remove from highest index first
                sideD.value.push(e);
            }
        });

        // Remove the corporations from undecided (in reverse order to maintain indices)
        corpIndices.forEach(index => {
            undecided.value.splice(index, 1);
        });
    } else {
        // This is a corporation with no alliance
        const index = undecided.value.findIndex(e => e.id === entity.id && e.type === entity.type);
        if (index !== -1) {
            sideD.value.push(entity);
            undecided.value.splice(index, 1);
        }
    }
};

const moveToUndecidedFromA = (entity: Entity) => {
    // If this is a corporation that belongs to an alliance, prevent moving it independently
    if (entity.type === 'corporation' && entity.alliance_id) {
        return; // Prevent moving corporations that belong to an alliance
    }

    // If this is an alliance, also move all its corporations
    if (entity.type === 'alliance') {
        // First move the alliance
        const allianceIndex = sideA.value.findIndex(e => e.id === entity.id && e.type === entity.type);
        if (allianceIndex !== -1) {
            undecided.value.push(entity);
            sideA.value.splice(allianceIndex, 1);
        }

        // Then find and move all corporations belonging to this alliance
        const corpIndices: number[] = [];
        sideA.value.forEach((e, index) => {
            if (e.type === 'corporation' && e.alliance_id === entity.id) {
                corpIndices.unshift(index); // Add to beginning so we can remove from highest index first
                undecided.value.push(e);
            }
        });

        // Remove the corporations from sideA (in reverse order to maintain indices)
        corpIndices.forEach(index => {
            sideA.value.splice(index, 1);
        });
    } else {
        // This is a corporation with no alliance
        const index = sideA.value.findIndex(e => e.id === entity.id && e.type === entity.type);
        if (index !== -1) {
            undecided.value.push(entity);
            sideA.value.splice(index, 1);
        }
    }
};

const moveToUndecidedFromB = (entity: Entity) => {
    // If this is a corporation that belongs to an alliance, prevent moving it independently
    if (entity.type === 'corporation' && entity.alliance_id) {
        return;
    }

    // If this is an alliance, also move all its corporations
    if (entity.type === 'alliance') {
        // First move the alliance
        const allianceIndex = sideB.value.findIndex(e => e.id === entity.id && e.type === entity.type);
        if (allianceIndex !== -1) {
            undecided.value.push(entity);
            sideB.value.splice(allianceIndex, 1);
        }

        // Then find and move all corporations belonging to this alliance
        const corpIndices: number[] = [];
        sideB.value.forEach((e, index) => {
            if (e.type === 'corporation' && e.alliance_id === entity.id) {
                corpIndices.unshift(index);
                undecided.value.push(e);
            }
        });

        corpIndices.forEach(index => {
            sideB.value.splice(index, 1);
        });
    } else {
        // This is a corporation with no alliance
        const index = sideB.value.findIndex(e => e.id === entity.id && e.type === entity.type);
        if (index !== -1) {
            undecided.value.push(entity);
            sideB.value.splice(index, 1);
        }
    }
};

const moveToUndecidedFromC = (entity: Entity) => {
    // If this is a corporation that belongs to an alliance, prevent moving it independently
    if (entity.type === 'corporation' && entity.alliance_id) {
        return;
    }

    // If this is an alliance, also move all its corporations
    if (entity.type === 'alliance') {
        const allianceIndex = sideC.value.findIndex(e => e.id === entity.id && e.type === entity.type);
        if (allianceIndex !== -1) {
            undecided.value.push(entity);
            sideC.value.splice(allianceIndex, 1);
        }

        const corpIndices: number[] = [];
        sideC.value.forEach((e, index) => {
            if (e.type === 'corporation' && e.alliance_id === entity.id) {
                corpIndices.unshift(index);
                undecided.value.push(e);
            }
        });

        corpIndices.forEach(index => {
            sideC.value.splice(index, 1);
        });
    } else {
        const index = sideC.value.findIndex(e => e.id === entity.id && e.type === entity.type);
        if (index !== -1) {
            undecided.value.push(entity);
            sideC.value.splice(index, 1);
        }
    }
};

const moveToUndecidedFromD = (entity: Entity) => {
    // If this is a corporation that belongs to an alliance, prevent moving it independently
    if (entity.type === 'corporation' && entity.alliance_id) {
        return;
    }

    // If this is an alliance, also move all its corporations
    if (entity.type === 'alliance') {
        const allianceIndex = sideD.value.findIndex(e => e.id === entity.id && e.type === entity.type);
        if (allianceIndex !== -1) {
            undecided.value.push(entity);
            sideD.value.splice(allianceIndex, 1);
        }

        const corpIndices: number[] = [];
        sideD.value.forEach((e, index) => {
            if (e.type === 'corporation' && e.alliance_id === entity.id) {
                corpIndices.unshift(index);
                undecided.value.push(e);
            }
        });

        corpIndices.forEach(index => {
            sideD.value.splice(index, 1);
        });
    } else {
        const index = sideD.value.findIndex(e => e.id === entity.id && e.type === entity.type);
        if (index !== -1) {
            undecided.value.push(entity);
            sideD.value.splice(index, 1);
        }
    }
};

// Function to update generated data display
const updateGeneratedData = () => {
    const sides = [
        {
            side_id: "blue",
            name: sideAName.value,
            entities: sideA.value.map(entity => ({
                id: entity.id,
                type: entity.type
            }))
        },
        {
            side_id: "red",
            name: sideBName.value,
            entities: sideB.value.map(entity => ({
                id: entity.id,
                type: entity.type
            }))
        }
    ];

    // Add Side C if enabled
    if (numSides.value >= 3) {
        sides.push({
            side_id: "green",
            name: sideCName.value,
            entities: sideC.value.map(entity => ({
                id: entity.id,
                type: entity.type
            }))
        });
    }

    // Add Side D if enabled
    if (numSides.value >= 4) {
        sides.push({
            side_id: "yellow",
            name: sideDName.value,
            entities: sideD.value.map(entity => ({
                id: entity.id,
                type: entity.type
            }))
        });
    }

    const data = {
        systems: selectedSystems.value.map(system => ({ system_id: system.id })),
        sides: sides,
        startTime: startTime.value,
        endTime: endTime.value,
    };

    generatedData.value = JSON.stringify(data, null, 2);
};

// Watch for changes and update generated data
watch([selectedSystems, sideA, sideB, sideC, sideD, startTime, endTime, numSides, sideAName, sideBName, sideCName, sideDName], () => {
    updateGeneratedData();
}, { deep: true });

// Helper functions to toggle name editing
const toggleEditSideA = () => {
    editingSideA.value = !editingSideA.value;
    if (!editingSideA.value && !sideAName.value.trim()) {
        sideAName.value = t('battleGenerator.sideA');
    }
};

const toggleEditSideB = () => {
    editingSideB.value = !editingSideB.value;
    if (!editingSideB.value && !sideBName.value.trim()) {
        sideBName.value = t('battleGenerator.sideB');
    }
};

const toggleEditSideC = () => {
    editingSideC.value = !editingSideC.value;
    if (!editingSideC.value && !sideCName.value.trim()) {
        sideCName.value = t('battleGenerator.sideC');
    }
};

const toggleEditSideD = () => {
    editingSideD.value = !editingSideD.value;
    if (!editingSideD.value && !sideDName.value.trim()) {
        sideDName.value = t('battleGenerator.sideD');
    }
};

// Update the generated data on component mount
onMounted(() => {
    updateGeneratedData();

    if (tabs.value.length > 0) {
        const hash = route.hash.substring(1);
        const validTab = tabs.value.find(item => item.id === hash);
        if (validTab) {
            activeTabId.value = hash;
        } else if (tabs.value[0]?.id) {
            activeTabId.value = tabs.value[0].id;
            // Update URL if we defaulted, but only if not on server and preview is visible
            if (typeof window !== 'undefined' && previewData.value) {
                router.replace({ hash: `#${activeTabId.value}` });
            }
        }
    }
});

watch(() => route.hash, (newHash) => {
    if (previewData.value) { // Only update from hash if preview is visible
        const tabIdFromHash = newHash.substring(1);
        if (tabs.value.some(item => item.id === tabIdFromHash) && activeTabId.value !== tabIdFromHash) {
            activeTabId.value = tabIdFromHash;
        }
    }
});

watch(activeTabId, (newId) => {
    if (previewData.value && newId && `#${newId}` !== route.hash) { // Only update hash if preview is visible
        if (typeof window !== 'undefined') {
            router.push({ hash: `#${newId}` });
        }
    }
});

// When previewData becomes available, set the active tab and update URL if needed
watch(previewData, (newPreviewData) => {
    if (newPreviewData && tabs.value.length > 0) {
        const hash = route.hash.substring(1);
        const validTab = tabs.value.find(item => item.id === hash);
        if (validTab) {
            activeTabId.value = hash;
        } else if (tabs.value[0]?.id) {
            activeTabId.value = tabs.value[0].id;
            if (typeof window !== 'undefined') {
                router.replace({ hash: `#${activeTabId.value}` });
            }
        }
    } else if (!newPreviewData) {
        // Optionally clear hash when preview is hidden or reset activeTabId
        // if (typeof window !== 'undefined' && route.hash) {
        //     router.replace({ hash: '' });
        // }
        // activeTabId.value = tabs.value[0]?.id || ''; // Reset to first tab or empty
    }
});

// Function to save the battle
const saveBattle = async () => {
    if (!previewData.value) {
        error.value = t('battleGenerator.errors.previewRequired'); // Or a more specific error
        return;
    }

    // Basic checks can remain, or be removed if previewData implies these are met
    if (selectedSystems.value.length === 0) {
        error.value = t('battleGenerator.errors.systemRequired');
        return;
    }

    if (!startTime.value) {
        error.value = t('battleGenerator.errors.startTimeRequired');
        return;
    }

    if (!endTime.value) {
        error.value = t('battleGenerator.errors.endTimeRequired');
        return;
    }

    if (sideA.value.length === 0 || sideB.value.length === 0) {
        error.value = t('battleGenerator.errors.bothSidesRequired');
        return;
    }

    // Conditional checks for sideC and sideD can also be inferred from previewData if it's robust
    if (numSides.value >= 3 && sideC.value.length === 0 && (!previewData.value.sides.green || previewData.value.sides.green.entities.length === 0)) {
        error.value = t('battleGenerator.errors.sideCRequired');
        return;
    }

    if (numSides.value >= 4 && sideD.value.length === 0 && (!previewData.value.sides.yellow || previewData.value.sides.yellow.entities.length === 0)) {
        error.value = t('battleGenerator.errors.sideDRequired');
        return;
    }

    error.value = '';
    loading.value = true;

    try {
        const response = await fetch('/api/battles/custom', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(previewData.value), // Send previewData directly
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ message: `API error: ${response.status}` }));
            throw new Error(errorData.message || `API error: ${response.status}`);
        }

        const data = await response.json(); // Expects { battle_id: number, message: string }

        // Redirect to the newly created battle
        if (data.battle_id) {
            window.location.href = `/battle/${data.battle_id}`;
        } else {
            // Handle cases where battle_id might be missing, though API should always return it on success
            error.value = data.message || t('battleGenerator.errors.unknownError');
        }
    } catch (err: any) {
        let messageKey = 'battleGenerator.errors.unknownError';
        const messageParams = {}; // Future use if API sends params with keys
        if (err && err.message && typeof err.message === 'string' && err.message.startsWith('apiErrors.')) {
            messageKey = err.message;
            // Example for future: if (err.data) { messageParams = err.data; }
        } else if (err && err.message && typeof err.message === 'string' && !err.message.startsWith('API error:')) {
            // Non-keyed client error
        }
        error.value = t(messageKey, messageParams);
    } finally {
        loading.value = false;
    }
};

// Function to preview the battle - simplified without backward compatibility
const previewBattle = async () => {
    if (selectedSystems.value.length === 0) {
        error.value = t('battleGenerator.errors.systemRequired');
        return;
    }

    if (!startTime.value) {
        error.value = t('battleGenerator.errors.startTimeRequired');
        return;
    }

    if (!endTime.value) {
        error.value = t('battleGenerator.errors.endTimeRequired');
        return;
    }

    if (sideA.value.length === 0 || sideB.value.length === 0) {
        error.value = t('battleGenerator.errors.bothSidesRequired');
        return;
    }

    if (numSides.value >= 3 && sideC.value.length === 0) {
        error.value = t('battleGenerator.errors.sideCRequired');
        return;
    }

    if (numSides.value >= 4 && sideD.value.length === 0) {
        error.value = t('battleGenerator.errors.sideDRequired');
        return;
    }

    error.value = '';
    loading.value = true;

    try {
        const systems = selectedSystems.value.map(system => ({ system_id: system.id }));

        // Format sides as an array of objects with the expected properties
        const sides = [
            {
                side_id: "blue",
                name: sideAName.value,
                entities: sideA.value.map(entity => ({
                    id: entity.id,
                    type: entity.type
                }))
            },
            {
                side_id: "red",
                name: sideBName.value,
                entities: sideB.value.map(entity => ({
                    id: entity.id,
                    type: entity.type
                }))
            }
        ];

        // Add Side C if enabled
        if (numSides.value >= 3) {
            sides.push({
                side_id: "green",
                name: sideCName.value,
                entities: sideC.value.map(entity => ({
                    id: entity.id,
                    type: entity.type
                }))
            });
        }

        // Add Side D if enabled
        if (numSides.value >= 4) {
            sides.push({
                side_id: "yellow",
                name: sideDName.value,
                entities: sideD.value.map(entity => ({
                    id: entity.id,
                    type: entity.type
                }))
            });
        }

        const response = await fetch('/api/battles/preview', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                systems,
                sides,
                startTime: startTime.value,
                endTime: endTime.value,
            }),
        });

        if (!response.ok) {
            throw new Error(`API error: ${response.status}`);
        }

        const data = await response.json();
        previewData.value = data;

        // Reset team data containers
        teamKills.value = {};
        teamStats.value = {};
        teamAlliances.value = {};
        teamCorporations.value = {};
        teamCharacters.value = {};

        // Process the preview data
        const sideIds = previewData.value?.side_ids || [];

        // Process all killmail IDs from the main list
        const allKillmailIds = previewData.value?.killmail_ids || [];

        // Get unique IDs
        const uniqueKillmailIds = Array.from(new Set(allKillmailIds));

        if (uniqueKillmailIds.length > 0) {
            try {
                // Fetch full killmail objects using the batch endpoint
                const fetchedKillmails: any[] = await $fetch('/api/killmail/batch', {
                    method: 'POST',
                    body: { ids: uniqueKillmailIds }
                });

                // Create a lookup map for easy access
                const killmailMap = new Map(fetchedKillmails.map(km => [km.killmail_id, km]));

                // Populate killmails for timeline (sorted by time)
                previewKillmails.value = (allKillmailIds)
                    .map((id: number) => killmailMap.get(id))
                    .filter((km: any) => km !== undefined)
                    .sort((a: any, b: any) => new Date(a.kill_time).getTime() - new Date(b.kill_time).getTime());

                // Populate team data
                for (const sideId of sideIds) {
                    if (previewData.value?.sides?.[sideId]) {
                        const side = previewData.value.sides[sideId];

                        // Populate team kills
                        teamKills.value[sideId] = (side.kill_ids || [])
                            .map((id: number) => killmailMap.get(id))
                            .filter((km: any) => km !== undefined)
                            .sort((a: any, b: any) => (b.total_value || 0) - (a.total_value || 0));

                        // Populate stats and entity lists
                        teamStats.value[sideId] = side.stats || { iskLost: 0, shipsLost: 0, damageInflicted: 0 };
                        teamAlliances.value[sideId] = side.alliances_stats || [];
                        teamCorporations.value[sideId] = side.corporations_stats || [];
                        teamCharacters.value[sideId] = side.characters_stats || [];
                    }
                }
            } catch (error) {
                console.error('Error fetching killmails in batch:', error);
                previewKillmails.value = [];
                teamKills.value = {};
            }
        } else {
            // No killmail IDs found in battle data
            previewKillmails.value = [];
            teamKills.value = {};

            // Process empty teams data
            for (const sideId of sideIds) {
                if (previewData.value?.sides?.[sideId]) {
                    const side = previewData.value.sides[sideId];
                    teamStats.value[sideId] = side.stats || { iskLost: 0, shipsLost: 0, damageInflicted: 0 };
                    teamAlliances.value[sideId] = side.alliances_stats || [];
                    teamCorporations.value[sideId] = side.corporations_stats || [];
                    teamCharacters.value[sideId] = side.characters_stats || [];
                }
            }
        }

        // Show the generated data section
        showGeneratedData.value = true;
    } catch (err: any) {
        previewData.value = null; // Clear previous preview
        let messageKey = 'battleGenerator.errors.unknownError';
        const messageParams = {}; // Future use if API sends params with keys
        if (err && err.message && typeof err.message === 'string' && err.message.startsWith('apiErrors.')) {
            messageKey = err.message;
            // Example for future: if (err.data) { messageParams = err.data; }
        } else if (err && err.message && typeof err.message === 'string' && !err.message.startsWith('API error:')) {
            // Non-keyed client error
        }
        error.value = t(messageKey, messageParams);
    } finally {
        loading.value = false;
    }
};
</script>

<template>
    <div class="space-y-6">
        <h1 class="text-2xl font-bold">{{ t('battleGenerator.title') }}</h1>

        <!-- Input Form -->
        <div class="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg">
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                    <label for="systemSearch" class="block text-sm font-medium mb-1">
                        {{ t('battleGenerator.systems') }} ({{ selectedSystems.length }}/{{ MAX_SYSTEMS }})
                    </label>
                    <div class="relative">
                        <input id="systemSearch" v-model="systemSearchTerm"
                            :placeholder="t('battleGenerator.searchForSystem')" class="custom-input"
                            :disabled="systemLimitReached" @keydown="handleKeyDown" />

                        <!-- Search results dropdown with specific class name -->
                        <div v-if="systemSearchResults.length > 0 && !systemLimitReached"
                            class="system-search-dropdown absolute z-10 w-full rounded-md mt-1 max-h-60 overflow-y-auto">
                            <div v-for="(result, index) in systemSearchResults" :key="result.id"
                                class="search-result-item p-2 cursor-pointer"
                                :class="{ 'search-result-selected': index === selectedResultIndex }"
                                @click="selectSystem(result)">
                                {{ result.name }}
                            </div>
                        </div>

                        <!-- Selected systems display -->
                        <div v-if="selectedSystems.length > 0" class="mt-2 flex flex-wrap gap-2">
                            <UBadge v-for="system in selectedSystems" :key="system.id" color="primary"
                                class="flex items-center gap-1">
                                {{ system.name }}
                                <UButton color="white" variant="ghost" icon="i-lucide-x" size="xs" class="p-0"
                                    @click="removeSystem(system.id)" />
                            </UBadge>
                        </div>
                    </div>
                </div>

                <div>
                    <label for="startTime" class="block text-sm font-medium mb-1">
                        {{ t('battleGenerator.startTime') }}
                    </label>
                    <input id="startTime" v-model="startTime" type="datetime-local" class="custom-input" />
                </div>

                <div>
                    <label for="endTime" class="block text-sm font-medium mb-1">
                        {{ t('battleGenerator.endTime') }}
                    </label>
                    <input id="endTime" v-model="endTime" type="datetime-local" class="custom-input" />
                </div>
            </div>

            <div class="mt-4 flex justify-end">
                <UButton @click="loadEntities" :loading="loading" :disabled="loading || selectedSystems.length === 0"
                    color="primary">
                    {{ t('battleGenerator.loadEntities') }}
                </UButton>
            </div>
        </div>

        <!-- Error Alert -->
        <UAlert v-if="error" icon="i-heroicons-exclamation-triangle" color="error" variant="soft" :title="error"
            class="mb-4" />

        <!-- Entity Columns -->
        <div v-if="undecided.length > 0 || sideA.length > 0 || sideB.length > 0" class="grid grid-cols-1 gap-4" :class="{
            'md:grid-cols-3': numSides === 2,
            'md:grid-cols-4': numSides === 3,
            'md:grid-cols-5': numSides === 4
        }">

            <!-- Options bar -->
            <div
                class="md:col-span-full mb-4 p-2 bg-gray-50 dark:bg-gray-800 rounded-lg flex items-center justify-between">
                <span class="font-medium text-sm">{{ t('battleGenerator.displayOptions') }}:</span>
                <div class="flex items-center gap-4">
                    <UCheckbox v-model="showCorpsInAlliances" :label="t('battleGenerator.showCorpsInAlliances')" />
                    <USelect v-model="numSides" :items="sideOptions" class="w-36" />
                </div>
            </div>

            <!-- Side D Column - only shown when 4 sides are selected -->
            <div v-if="numSides >= 4" class="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg">
                <div class="flex items-center justify-center mb-3">
                    <div v-if="!editingSideD" @click="toggleEditSideD"
                        class="text-lg font-semibold cursor-pointer flex items-center">
                        {{ sideDName }}
                        <UIcon name="i-lucide-edit-2" class="ml-2 w-4 h-4" />
                    </div>
                    <div v-else class="flex items-center">
                        <input v-model="sideDName" size="sm" class="custom-input w-40" autofocus @blur="toggleEditSideD"
                            @keyup.enter="toggleEditSideD" />
                    </div>
                </div>
                <div class="space-y-2 min-h-300">
                    <div v-for="entity in sideD" :key="`d-${entity.type}-${entity.id}`"
                        v-show="showCorpsInAlliances || entity.type === 'alliance' || !entity.alliance_id"
                        class="flex items-center justify-between p-2 bg-white dark:bg-gray-800 rounded">
                        <div class="flex items-center justify-start flex-1">
                            <Image :id="entity.id" :type="entity.type" size="32" format="webp" class="w-8 h-8 mr-2" />
                            <div class="flex flex-col items-start">
                                <span>{{ entity.name }}</span>
                                <span v-if="entity.type === 'corporation' && entity.alliance_id"
                                    class="text-xs text-gray-500">
                                    {{ t('battleGenerator.memberOf') }} {{ entity.alliance_name }}
                                </span>
                            </div>
                        </div>
                        <UButton v-if="entity.type === 'alliance' || !entity.alliance_id" icon="i-heroicons-arrow-right"
                            color="neutral" variant="ghost" size="xs" @click="moveToUndecidedFromD(entity)"
                            class="ml-2" />
                    </div>
                </div>
            </div>

            <!-- Side A Column -->
            <div class="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                <div class="flex items-center justify-center mb-3">
                    <div v-if="!editingSideA" @click="toggleEditSideA"
                        class="text-lg font-semibold cursor-pointer flex items-center">
                        {{ sideAName }}
                        <UIcon name="i-lucide-edit-2" class="ml-2 w-4 h-4" />
                    </div>
                    <div v-else class="flex items-center">
                        <input v-model="sideAName" size="sm" class="custom-input w-40" autofocus @blur="toggleEditSideA"
                            @keyup.enter="toggleEditSideA" />
                    </div>
                </div>
                <div class="space-y-2 min-h-300">
                    <div v-for="entity in sideA" :key="`a-${entity.type}-${entity.id}`"
                        v-show="showCorpsInAlliances || entity.type === 'alliance' || !entity.alliance_id"
                        class="flex items-center justify-between p-2 bg-white dark:bg-gray-800 rounded">
                        <div class="flex items-center justify-start flex-1">
                            <Image :id="entity.id" :type="entity.type" size="32" format="webp" class="w-8 h-8 mr-2" />
                            <div class="flex flex-col items-start">
                                <span>{{ entity.name }}</span>
                                <span v-if="entity.type === 'corporation' && entity.alliance_id"
                                    class="text-xs text-gray-500">
                                    {{ t('battleGenerator.memberOf') }} {{ entity.alliance_name }}
                                </span>
                            </div>
                        </div>
                        <UButton v-if="entity.type === 'alliance' || !entity.alliance_id" icon="i-heroicons-arrow-right"
                            color="neutral" variant="ghost" size="xs" @click="moveToUndecidedFromA(entity)"
                            class="ml-2" />
                    </div>
                </div>
            </div>

            <!-- Undecided Column -->
            <div class="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg">
                <h2 class="text-lg font-semibold mb-3 text-center">{{ t('battleGenerator.undecided') }}</h2>
                <div class="space-y-2 min-h-300">
                    <div v-for="entity in undecided" :key="`u-${entity.type}-${entity.id}`"
                        v-show="showCorpsInAlliances || entity.type === 'alliance' || !entity.alliance_id"
                        class="flex items-center justify-between p-2 bg-white dark:bg-gray-700 rounded">
                        <div class="flex items-center space-x-2">
                            <UButton v-if="(numSides >= 4) && (entity.type === 'alliance' || !entity.alliance_id)"
                                icon="i-heroicons-arrow-left" color="yellow" variant="ghost" size="xs"
                                @click="moveToSideD(entity)" />
                            <UButton v-if="entity.type === 'alliance' || !entity.alliance_id"
                                icon="i-heroicons-arrow-left" color="primary" variant="ghost" size="xs"
                                @click="moveToSideA(entity)" />
                        </div>

                        <div class="flex items-center flex-grow">
                            <Image :id="entity.id" :type="entity.type" size="32" format="webp" class="w-8 h-8 mr-2" />
                            <div class="flex flex-col">
                                <span>{{ entity.name }}</span>
                                <span v-if="entity.type === 'corporation' && entity.alliance_id"
                                    class="text-xs text-gray-500">
                                    {{ t('battleGenerator.memberOf') }} {{ entity.alliance_name }}
                                </span>
                            </div>
                        </div>

                        <div class="flex items-center space-x-2">
                            <UButton v-if="entity.type === 'alliance' || !entity.alliance_id"
                                icon="i-heroicons-arrow-right" color="error" variant="ghost" size="xs"
                                @click="moveToSideB(entity)" />
                            <UButton v-if="(numSides >= 3) && (entity.type === 'alliance' || !entity.alliance_id)"
                                icon="i-heroicons-arrow-right" color="green" variant="ghost" size="xs"
                                @click="moveToSideC(entity)" />
                        </div>
                    </div>
                </div>
            </div>

            <!-- Side B Column -->
            <div class="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg">
                <div class="flex items-center justify-center mb-3">
                    <div v-if="!editingSideB" @click="toggleEditSideB"
                        class="text-lg font-semibold cursor-pointer flex items-center">
                        {{ sideBName }}
                        <UIcon name="i-lucide-edit-2" class="ml-2 w-4 h-4" />
                    </div>
                    <div v-else class="flex items-center">
                        <input v-model="sideBName" size="sm" class="custom-input w-40" autofocus @blur="toggleEditSideB"
                            @keyup.enter="toggleEditSideB" />
                    </div>
                </div>
                <div class="space-y-2 min-h-300">
                    <div v-for="entity in sideB" :key="`b-${entity.type}-${entity.id}`"
                        v-show="showCorpsInAlliances || entity.type === 'alliance' || !entity.alliance_id"
                        class="flex items-center justify-between p-2 bg-white dark:bg-gray-800 rounded">
                        <UButton v-if="entity.type === 'alliance' || !entity.alliance_id" icon="i-heroicons-arrow-left"
                            color="neutral" variant="ghost" size="xs" @click="moveToUndecidedFromB(entity)"
                            class="mr-2" />
                        <div class="flex items-center justify-end flex-1 text-right">
                            <div class="flex flex-col items-end">
                                <span class="text-right">{{ entity.name }}</span>
                                <span v-if="entity.type === 'corporation' && entity.alliance_id"
                                    class="text-xs text-gray-500 text-right">
                                    {{ t('battleGenerator.memberOf') }} {{ entity.alliance_name }}
                                </span>
                            </div>
                            <Image :id="entity.id" :type="entity.type" size="32" format="webp" class="w-8 h-8 ml-2" />
                        </div>
                    </div>
                </div>
            </div>

            <!-- Side C Column - only shown when 3 or 4 sides are selected -->
            <div v-if="numSides >= 3" class="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
                <div class="flex items-center justify-center mb-3">
                    <div v-if="!editingSideC" @click="toggleEditSideC"
                        class="text-lg font-semibold cursor-pointer flex items-center">
                        {{ sideCName }}
                        <UIcon name="i-lucide-edit-2" class="ml-2 w-4 h-4" />
                    </div>
                    <div v-else class="flex items-center">
                        <input v-model="sideCName" size="sm" class="custom-input w-40" autofocus @blur="toggleEditSideC"
                            @keyup.enter="toggleEditSideC" />
                    </div>
                </div>
                <div class="space-y-2 min-h-300">
                    <div v-for="entity in sideC" :key="`c-${entity.type}-${entity.id}`"
                        v-show="showCorpsInAlliances || entity.type === 'alliance' || !entity.alliance_id"
                        class="flex items-center justify-between p-2 bg-white dark:bg-gray-800 rounded">
                        <UButton v-if="entity.type === 'alliance' || !entity.alliance_id" icon="i-heroicons-arrow-left"
                            color="neutral" variant="ghost" size="xs" @click="moveToUndecidedFromC(entity)"
                            class="mr-2" />
                        <div class="flex items-center justify-end flex-1 text-right">
                            <div class="flex flex-col items-end">
                                <span class="text-right">{{ entity.name }}</span>
                                <span v-if="entity.type === 'corporation' && entity.alliance_id"
                                    class="text-xs text-gray-500 text-right">
                                    {{ t('battleGenerator.memberOf') }} {{ entity.alliance_name }}
                                </span>
                            </div>
                            <Image :id="entity.id" :type="entity.type" size="32" format="webp" class="w-8 h-8 ml-2" />
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Save and Preview Buttons -->
        <div v-if="sideA.length > 0 && sideB.length > 0" class="flex justify-end mt-6 gap-4">
            <UButton @click="saveBattle" :loading="loading" :disabled="loading || selectedSystems.length === 0"
                color="primary" size="lg">
                {{ t('battleGenerator.save') }}
            </UButton>
            <UButton @click="previewBattle" :loading="loading" :disabled="loading || !previewReady" color="secondary"
                size="lg">
                {{ t('battleGenerator.preview') }}
            </UButton>
        </div>

        <!-- Preview Section -->
        <div v-if="previewData" class="mt-8">
            <h2 class="text-xl font-bold mb-4">{{ t('battleGenerator.battlePreview') }}</h2>

            <!-- Teams Table -->
            <CustomBattleTeams :previewData="previewData" :teamStats="teamStats" :teamAlliances="teamAlliances"
                :teamCorporations="teamCorporations" :teamCharacters="teamCharacters" />

            <!-- Tabs -->
            <div class="mb-4 mt-6">
                <Tabs v-model="activeTabId" :items="tabs" :ui="tabsUi" color="neutral">
                    <template #overview>
                        <CustomBattleOverview v-if="previewData" :battle="previewData" />
                    </template>
                    <template #kills>
                        <CustomBattleKills :teamKills="teamKills" :sideIds="previewData.side_ids" />
                    </template>
                    <template #alliances>
                        <CustomBattleAlliances :teamAlliances="teamAlliances" :sideIds="previewData.side_ids" />
                    </template>
                    <template #corporations>
                        <CustomBattleCorporations :teamCorporations="teamCorporations"
                            :sideIds="previewData.side_ids" />
                    </template>
                    <template #characters>
                        <CustomBattleCharacters :teamCharacters="teamCharacters" :sideIds="previewData.side_ids" />
                    </template>
                    <template #timeline>
                        <CustomBattleTimeline v-if="previewData" :killmails="previewKillmails" :battle="previewData" />
                    </template>
                </Tabs>
            </div>
        </div>
    </div>
</template>

<style scoped>
/* Add any additional custom styles here */
.min-h-300 {
    min-height: 300px;
}

/* Force consistent styling for datetime-local inputs */
input[type="datetime-local"] {
    font-family: inherit;
    font-size: inherit;
    height: 38px;
    /* Match height of text inputs */
    padding: 0.5rem 0.75rem;
    box-sizing: border-box;
}

/* Unified custom input styling */
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

/* Dark mode styles */
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

/* System dropdown styling */
.system-search-dropdown {
    border: 2px solid #ccc;
    background-color: white;
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
}

.dark .system-search-dropdown {
    border-color: #4b5563;
    background-color: #1f2937;
}

.search-result-item {
    color: #111827;
}

.search-result-item:hover {
    background-color: #f3f4f6;
}

.dark .search-result-item {
    color: #f9fafb;
}

.dark .search-result-item:hover {
    background-color: #374151;
}

/* Add styling for the selected item in dropdown */
.search-result-selected {
    background-color: #e0f2fe;
    /* Light blue background */
    color: #0369a1;
    /* Darker blue text */
}

.dark .search-result-selected {
    background-color: #0c4a6e;
    /* Dark blue background */
    color: #7dd3fc;
    /* Light blue text */
}

/* Add additional style to ensure text wrapping maintains right alignment */
.text-right {
    text-align: right;
}

/* Style for editable team names */
.cursor-pointer:hover {
    text-decoration: underline;
    text-decoration-style: dotted;
}
</style>
