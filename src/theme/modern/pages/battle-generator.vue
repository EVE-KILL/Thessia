<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import BattleAlliances from '~/src/theme/modern/components/battle/BattleAlliances.vue';
import BattleCharacters from '~/src/theme/modern/components/battle/BattleCharacters.vue';
import BattleCorporations from '~/src/theme/modern/components/battle/BattleCorporations.vue';
import BattleKills from '~/src/theme/modern/components/battle/BattleKills.vue';
import BattleOverview from '~/src/theme/modern/components/battle/BattleOverview.vue';
import BattleTeams from '~/src/theme/modern/components/battle/BattleTeams.vue';
import BattleTimeline from '~/src/theme/modern/components/battle/BattleTimeline.vue';

// Define types for entities
interface Entity {
    id: number;
    name: string;
    type: 'alliance' | 'corporation';
    alliance_id?: number | null;
    alliance_name?: string | null;
}

// Define reactive state
const systemSearchTerm = ref('');
const systemSearchResults = ref<{ id: number; name: string }[]>([]);
const selectedSystem = ref<{ id: number; name: string } | null>(null);
const lastSystemSearchTerm = ref('');
const startTime = ref('');
const endTime = ref('');
const loading = ref(false);
const error = ref('');

// Define the three columns of entities
const sideA = ref<Entity[]>([]);
const undecided = ref<Entity[]>([]);
const sideB = ref<Entity[]>([]);

// Preview data
const previewData = ref<any | null>(null);
const previewKillmails = ref<any[]>([]);
const blueTeamKills = ref<any[]>([]);
const redTeamKills = ref<any[]>([]);
const blueTeamStats = ref({ iskLost: 0, shipsLost: 0, damageInflicted: 0 });
const redTeamStats = ref({ iskLost: 0, shipsLost: 0, damageInflicted: 0 });
const blueTeamAlliances = ref<any[]>([]);
const redTeamAlliances = ref<any[]>([]);
const blueTeamCorporations = ref<any[]>([]);
const redTeamCorporations = ref<any[]>([]);
const blueTeamCharacters = ref<any[]>([]);
const redTeamCharacters = ref<any[]>([]);

// Check if preview is ready
const previewReady = computed(() =>
    selectedSystem.value &&
    startTime.value &&
    endTime.value &&
    sideA.value.length > 0 &&
    sideB.value.length > 0
);

// Tabs for preview
const tabs = [
    { label: 'Overview', slot: 'overview' },
    { label: 'Kills', slot: 'kills' },
    { label: 'Alliances', slot: 'alliances' },
    { label: 'Corporations', slot: 'corporations' },
    { label: 'Characters', slot: 'characters' },
    { label: 'Timeline', slot: 'timeline' }
];

const tabsUi = {
    list: "mb-0",
    tab: "p-2 text-sm font-semibold text-white rounded-lg bg-background-700 hover:bg-background-600 ml-2"
};

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

// Debounce the search function
const debouncedSearch = useDebounceFn(searchSystems, 300);

// Watch for changes to the search term
watch(systemSearchTerm, (newTerm) => {
    if (newTerm && newTerm.length >= 2) {
        debouncedSearch(newTerm);
    } else {
        systemSearchResults.value = [];
    }
});

// Select a system from search results
function selectSystem(system: { id: number; name: string }) {
    selectedSystem.value = system;
    systemSearchTerm.value = system.name;
    systemSearchResults.value = [];
}

// Function to load entities from the API
const loadEntities = async () => {
    if (!selectedSystem.value) {
        error.value = 'System is required';
        return;
    }

    if (!startTime.value) {
        error.value = 'Start time is required';
        return;
    }

    if (!endTime.value) {
        error.value = 'End time is required';
        return;
    }
    // Enforce max timespan of 36 hours
    {
        const start = new Date(startTime.value);
        const end = new Date(endTime.value);
        const diff = end.getTime() - start.getTime();
        const maxMs = 36 * 60 * 60 * 1000;
        if (diff > maxMs) {
            error.value = 'Time range cannot exceed 36 hours';
            loading.value = false;
            return;
        }
    }

    error.value = '';
    loading.value = true;

    try {
        const response = await fetch('/api/battles/entities', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                systemId: selectedSystem.value.id,
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
    } catch (err) {
        error.value = err instanceof Error ? err.message : 'An unknown error occurred';
    } finally {
        loading.value = false;
    }
};

// Functions to move entities between columns
const moveToSideA = (entity: Entity) => {
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
        // This is a corporation - only allow move if it has no alliance or alliance is not in any team
        const hasAllianceInTeams = entity.alliance_id &&
            (sideA.value.some(e => e.type === 'alliance' && e.id === entity.alliance_id) ||
                sideB.value.some(e => e.type === 'alliance' && e.id === entity.alliance_id));

        if (!hasAllianceInTeams) {
            const index = undecided.value.findIndex(e => e.id === entity.id && e.type === entity.type);
            if (index !== -1) {
                sideA.value.push(entity);
                undecided.value.splice(index, 1);
            }
        }
    }
};

const moveToSideB = (entity: Entity) => {
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
        // This is a corporation - only allow move if it has no alliance or alliance is not in any team
        const hasAllianceInTeams = entity.alliance_id &&
            (sideA.value.some(e => e.type === 'alliance' && e.id === entity.alliance_id) ||
                sideB.value.some(e => e.type === 'alliance' && e.id === entity.alliance_id));

        if (!hasAllianceInTeams) {
            const index = undecided.value.findIndex(e => e.id === entity.id && e.type === entity.type);
            if (index !== -1) {
                sideB.value.push(entity);
                undecided.value.splice(index, 1);
            }
        }
    }
};

const moveToUndecidedFromA = (entity: Entity) => {
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
        // This is a corporation - only allow move if it has no alliance or alliance is not in any team
        const hasAllianceInTeams = entity.alliance_id &&
            sideA.value.some(e => e.type === 'alliance' && e.id === entity.alliance_id);

        if (!hasAllianceInTeams) {
            const index = sideA.value.findIndex(e => e.id === entity.id && e.type === entity.type);
            if (index !== -1) {
                undecided.value.push(entity);
                sideA.value.splice(index, 1);
            }
        }
    }
};

const moveToUndecidedFromB = (entity: Entity) => {
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
                corpIndices.unshift(index); // Add to beginning so we can remove from highest index first
                undecided.value.push(e);
            }
        });

        // Remove the corporations from sideB (in reverse order to maintain indices)
        corpIndices.forEach(index => {
            sideB.value.splice(index, 1);
        });
    } else {
        // This is a corporation - only allow move if it has no alliance or alliance is not in any team
        const hasAllianceInTeams = entity.alliance_id &&
            sideB.value.some(e => e.type === 'alliance' && e.id === entity.alliance_id);

        if (!hasAllianceInTeams) {
            const index = sideB.value.findIndex(e => e.id === entity.id && e.type === entity.type);
            if (index !== -1) {
                undecided.value.push(entity);
                sideB.value.splice(index, 1);
            }
        }
    }
};

// Function to save the battle
const saveBattle = async () => {
    if (!selectedSystem.value) {
        error.value = 'System is required';
        return;
    }

    if (!startTime.value) {
        error.value = 'Start time is required';
        return;
    }

    if (!endTime.value) {
        error.value = 'End time is required';
        return;
    }

    if (sideA.value.length === 0 || sideB.value.length === 0) {
        error.value = 'Both sides must have at least one entity';
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
            body: JSON.stringify({
                systemId: selectedSystem.value.id,
                startTime: startTime.value,
                endTime: endTime.value,
                sideA: sideA.value,
                sideB: sideB.value,
            }),
        });

        if (!response.ok) {
            throw new Error(`API error: ${response.status}`);
        }

        const data = await response.json();

        // Redirect to the newly created battle
        if (data.battle_id) {
            window.location.href = `/battle/${data.battle_id}`;
        }
    } catch (err) {
        error.value = err instanceof Error ? err.message : 'An unknown error occurred';
    } finally {
        loading.value = false;
    }
};

// Function to preview the battle
const previewBattle = async () => {
    if (!selectedSystem.value) {
        error.value = 'System is required';
        return;
    }

    if (!startTime.value) {
        error.value = 'Start time is required';
        return;
    }

    if (!endTime.value) {
        error.value = 'End time is required';
        return;
    }

    if (sideA.value.length === 0 || sideB.value.length === 0) {
        error.value = 'Both sides must have at least one entity';
        return;
    }

    error.value = '';
    loading.value = true;

    try {
        const response = await fetch('/api/battles/preview', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                systemId: selectedSystem.value.id,
                startTime: startTime.value,
                endTime: endTime.value,
                sideA: sideA.value,
                sideB: sideB.value,
            }),
        });

        if (!response.ok) {
            throw new Error(`API error: ${response.status}`);
        }

        const data = await response.json();
        previewData.value = data;

        // Process the preview data similar to [...slug].vue
        const allKillmailIds = [
            ...(data?.killmail_ids || []),
            ...(data?.blue_team_kill_ids || []),
            ...(data?.red_team_kill_ids || []),
        ];

        // Get unique IDs
        const uniqueKillmailIds = Array.from(new Set(allKillmailIds));

        if (uniqueKillmailIds.length > 0) {
            try {
                // Fetch full killmail objects using the batch endpoint
                const fetchedKillmails: any[] = await $fetch('/api/killmails/batch', {
                    method: 'POST',
                    body: { ids: uniqueKillmailIds }
                });

                // Create a lookup map for easy access
                const killmailMap = new Map(fetchedKillmails.map(km => [km.killmail_id, km]));

                // Populate killmails for timeline (sorted by time)
                previewKillmails.value = (data?.killmail_ids || [])
                    .map((id: number) => killmailMap.get(id))
                    .filter((km: any) => km !== undefined)
                    .sort((a: any, b: any) => new Date(a.kill_time).getTime() - new Date(b.kill_time).getTime());

                // Populate team kills (sorted by value)
                blueTeamKills.value = (data?.blue_team_kill_ids || [])
                    .map((id: number) => killmailMap.get(id))
                    .filter((km: any) => km !== undefined)
                    .sort((a: any, b: any) => (b.total_value || 0) - (a.total_value || 0));

                redTeamKills.value = (data?.red_team_kill_ids || [])
                    .map((id: number) => killmailMap.get(id))
                    .filter((km: any) => km !== undefined)
                    .sort((a: any, b: any) => (b.total_value || 0) - (a.total_value || 0));

                // Populate stats and entity lists directly from data
                blueTeamStats.value = data?.blue_team_stats || { iskLost: 0, shipsLost: 0, damageInflicted: 0 };
                redTeamStats.value = data?.red_team_stats || { iskLost: 0, shipsLost: 0, damageInflicted: 0 };
                blueTeamAlliances.value = data?.blue_team_alliances_stats || [];
                redTeamAlliances.value = data?.red_team_alliances_stats || [];
                blueTeamCorporations.value = data?.blue_team_corporations_stats || [];
                redTeamCorporations.value = data?.red_team_corporations_stats || [];
                blueTeamCharacters.value = data?.blue_team_characters_stats || [];
                redTeamCharacters.value = data?.red_team_characters_stats || [];
            } catch (error) {
                console.error('Error fetching killmails in batch:', error);
                previewKillmails.value = [];
                blueTeamKills.value = [];
                redTeamKills.value = [];
            }
        } else {
            // No killmail IDs found in battle data
            previewKillmails.value = [];
            blueTeamKills.value = [];
            redTeamKills.value = [];
            blueTeamStats.value = data?.blue_team_stats || { iskLost: 0, shipsLost: 0, damageInflicted: 0 };
            redTeamStats.value = data?.red_team_stats || { iskLost: 0, shipsLost: 0, damageInflicted: 0 };
            blueTeamAlliances.value = data?.blue_team_alliances_stats || [];
            redTeamAlliances.value = data?.red_team_alliances_stats || [];
            blueTeamCorporations.value = data?.blue_team_corporations_stats || [];
            redTeamCorporations.value = data?.red_team_corporations_stats || [];
            blueTeamCharacters.value = data?.blue_team_characters_stats || [];
            redTeamCharacters.value = data?.red_team_characters_stats || [];
        }
    } catch (err) {
        error.value = err instanceof Error ? err.message : 'An unknown error occurred';
        previewData.value = null;
    } finally {
        loading.value = false;
    }
};
</script>

<template>
    <div class="space-y-6">
        <h1 class="text-2xl font-bold">Battle Generator</h1>

        <!-- Input Form -->
        <div class="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg">
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                    <label for="systemSearch" class="block text-sm font-medium mb-1">System</label>
                    <div class="relative">
                        <UInput id="systemSearch" v-model="systemSearchTerm" placeholder="Search for a system"
                            class="w-full" />

                        <!-- Search results dropdown -->
                        <div v-if="systemSearchResults.length > 0"
                            class="absolute z-10 w-full border dark:border-gray-700 bg-white dark:bg-gray-900 rounded-md mt-1 max-h-60 overflow-y-auto">
                            <div v-for="result in systemSearchResults" :key="result.id"
                                class="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer"
                                @click="selectSystem(result)">
                                {{ result.name }}
                            </div>
                        </div>

                        <!-- Selected system display -->
                        <div v-if="selectedSystem" class="mt-2 text-sm text-gray-600 dark:text-gray-400">
                            Selected: {{ selectedSystem.name }} ({{ selectedSystem.id }})
                        </div>
                    </div>
                </div>

                <div>
                    <label for="startTime" class="block text-sm font-medium mb-1">Start Time</label>
                    <UInput id="startTime" v-model="startTime" type="datetime-local" class="w-full" />
                </div>

                <div>
                    <label for="endTime" class="block text-sm font-medium mb-1">End Time</label>
                    <UInput id="endTime" v-model="endTime" type="datetime-local" class="w-full" />
                </div>
            </div>

            <div class="mt-4 flex justify-end">
                <UButton @click="loadEntities" :loading="loading" :disabled="loading || !selectedSystem"
                    color="primary">
                    Load Entities
                </UButton>
            </div>
        </div>

        <!-- Error Alert -->
        <UAlert v-if="error" icon="i-heroicons-exclamation-triangle" color="error" variant="soft" :title="error"
            class="mb-4" />

        <!-- Entity Columns -->
        <div v-if="undecided.length > 0 || sideA.length > 0 || sideB.length > 0"
            class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <!-- Side A Column -->
            <div class="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                <h2 class="text-lg font-semibold mb-3 text-center">Side A</h2>
                <div class="space-y-2 min-h-300">
                    <div v-for="entity in sideA" :key="`a-${entity.type}-${entity.id}`"
                        class="flex items-center justify-between p-2 bg-white dark:bg-gray-800 rounded">
                        <div class="flex items-center">
                            <Image :id="entity.id" :type="entity.type" size="32" format="webp" class="w-8 h-8 mr-2" />
                            <span>{{ entity.name }}</span>
                        </div>
                        <UButton icon="i-heroicons-arrow-right" color="neutral" variant="ghost" size="xs"
                            @click="moveToUndecidedFromA(entity)" class="ml-2" />
                    </div>
                </div>
            </div>

            <!-- Undecided Column -->
            <div class="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg">
                <h2 class="text-lg font-semibold mb-3 text-center">Undecided</h2>
                <div class="space-y-2 min-h-300">
                    <div v-for="entity in undecided" :key="`u-${entity.type}-${entity.id}`"
                        class="flex items-center justify-between p-2 bg-white dark:bg-gray-700 rounded">
                        <UButton icon="i-heroicons-arrow-left" color="primary" variant="ghost" size="xs"
                            @click="moveToSideA(entity)" class="mr-2" />
                        <div class="flex items-center flex-grow">
                            <Image :id="entity.id" :type="entity.type" size="32" format="webp" class="w-8 h-8 mr-2" />
                            <div class="flex flex-col">
                                <span>{{ entity.name }}</span>
                                <span v-if="entity.type === 'corporation' && entity.alliance_id"
                                    class="text-xs text-gray-500">
                                    Member of {{ entity.alliance_name }}
                                </span>
                            </div>
                        </div>
                        <UButton icon="i-heroicons-arrow-right" color="error" variant="ghost" size="xs"
                            @click="moveToSideB(entity)" class="ml-2" />
                    </div>
                </div>
            </div>

            <!-- Side B Column -->
            <div class="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg">
                <h2 class="text-lg font-semibold mb-3 text-center">Side B</h2>
                <div class="space-y-2 min-h-300">
                    <div v-for="entity in sideB" :key="`b-${entity.type}-${entity.id}`"
                        class="flex items-center justify-between p-2 bg-white dark:bg-gray-800 rounded">
                        <UButton icon="i-heroicons-arrow-left" color="neutral" variant="ghost" size="xs"
                            @click="moveToUndecidedFromB(entity)" class="mr-2" />
                        <div class="flex items-center">
                            <Image :id="entity.id" :type="entity.type" size="32" format="webp" class="w-8 h-8 mr-2" />
                            <span>{{ entity.name }}</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Save and Preview Buttons -->
        <div v-if="sideA.length > 0 && sideB.length > 0" class="flex justify-end mt-6 gap-4">
            <UButton @click="saveBattle" :loading="loading" :disabled="loading || !selectedSystem" color="primary"
                size="lg">
                Save Battle
            </UButton>
            <UButton @click="previewBattle" :loading="loading" :disabled="loading || !previewReady" color="secondary"
                size="lg">
                Preview Battle
            </UButton>
        </div>

        <!-- Preview Section -->
        <div v-if="previewData" class="mt-8">
            <h2 class="text-xl font-bold mb-4">Battle Preview</h2>

            <!-- Teams Table -->
            <BattleTeams :blueTeamStats="blueTeamStats" :redTeamStats="redTeamStats"
                :blueTeamAlliances="blueTeamAlliances" :redTeamAlliances="redTeamAlliances"
                :blueTeamCorporations="blueTeamCorporations" :redTeamCorporations="redTeamCorporations" />

            <!-- Tabs -->
            <div class="mb-4 mt-6">
                <UTabs :items="tabs" :ui="tabsUi" color="neutral">
                    <template #overview>
                        <BattleOverview v-if="previewData" :battle="previewData" />
                    </template>
                    <template #kills>
                        <BattleKills :blueTeamKills="blueTeamKills" :redTeamKills="redTeamKills" />
                    </template>
                    <template #alliances>
                        <BattleAlliances :blueTeamAlliances="blueTeamAlliances" :redTeamAlliances="redTeamAlliances" />
                    </template>
                    <template #corporations>
                        <BattleCorporations :blueTeamCorporations="blueTeamCorporations"
                            :redTeamCorporations="redTeamCorporations" />
                    </template>
                    <template #characters>
                        <BattleCharacters :blueTeamCharacters="blueTeamCharacters"
                            :redTeamCharacters="redTeamCharacters" />
                    </template>
                    <template #timeline>
                        <BattleTimeline v-if="previewData" :killmails="previewKillmails" :battle="previewData" />
                    </template>
                </UTabs>
            </div>
        </div>
    </div>
</template>

<style scoped>
/* Add any additional custom styles here */
.min-h-300 {
    min-height: 300px;
}
</style>
