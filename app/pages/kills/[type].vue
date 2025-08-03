<template>
    <div class="min-h-screen text-white">
        <UContainer class="py-8">
            <!-- Header -->
            <div class="flex items-center justify-between mb-6">
                <h1 class="text-3xl font-bold capitalize">{{ typeLabel }} Kills</h1>

                <!-- Time Period Selector -->
                <div class="flex items-center space-x-3">
                    <span class="text-sm text-zinc-400">Stats for last:</span>
                    <div class="relative w-20">
                        <select v-model="selectedDays"
                            class="custom-select w-full appearance-none rounded-md border border-gray-300 dark:border-gray-700 pl-3 pr-8 py-1.5 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm font-medium shadow-sm">
                            <option v-for="option in dayOptions" :key="option.value" :value="option.value">
                                {{ option.label }}
                            </option>
                        </select>
                        <div
                            class="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700 dark:text-gray-300">
                            <svg class="h-4 w-4 fill-current" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                                <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
                            </svg>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Invalid type -->
            <div v-if="!isValidType" class="text-center text-gray-400 py-16">
                <h2 class="text-3xl font-bold mb-4">404</h2>
                <p>{{ t('notFound') }}</p>
            </div>

            <!-- Main content - renders immediately -->
            <div v-else>
                <!-- Most Valuable Kills - moved above split layout -->
                <div v-if="showMostValuableKills" class="mb-8">
                    <div class="mb-4">
                        <h3 class="text-lg font-semibold text-zinc-100">Most Valuable Kills</h3>
                        <p class="text-zinc-400 text-sm mt-1">Highest value killmails (Last {{ selectedDays }} Days)</p>
                    </div>
                    <KillsMostValuable :items="stats?.mostValuableKills?.slice(0, 7) || []" :loading="isStatsLoading" />
                </div>

                <!-- Ship Statistics - only for broader categories -->
                <div v-if="showShipStats" class="mb-8">
                    <div class="mb-4">
                        <h3 class="text-lg font-semibold text-zinc-100">Ship Statistics</h3>
                        <p class="text-zinc-400 text-sm mt-1">Ships destroyed breakdown (Last {{ selectedDays }} Days)
                        </p>
                    </div>
                    <KillsShipStats :stats="stats || {}" :loading="isStatsLoading" />
                </div>

                <!-- Killmails List -->
                <div class="grid grid-cols-1 xl:grid-cols-5 gap-8">
                    <!-- Left Side: 80% (4 columns out of 5) -->
                    <div class="xl:col-span-4">
                        <!-- Use the original KillList component with the type filter -->
                        <KillList :killlistType="currentType" :limit="100" :key="componentKey"
                            :wsFilter="currentType" />
                    </div>

                    <!-- Right Side: 20% (1 column out of 5) -->
                    <div class="xl:col-span-1 space-y-6">
                        <!-- Top Killers by Character -->
                        <KillsTopBox title="Top Killers" :entities="stats?.topKillersByCharacter || []"
                            countField="kills" entityType="character" :loading="isStatsLoading" :days="selectedDays" />

                        <!-- Top Killers by Corporation -->
                        <KillsTopBox title="Top Corporations" :entities="stats?.topKillersByCorporation || []"
                            countField="kills" entityType="corporation" :loading="isStatsLoading"
                            :days="selectedDays" />

                        <!-- Top Killers by Alliance -->
                        <KillsTopBox title="Top Alliances" :entities="stats?.topKillersByAlliance || []"
                            countField="kills" entityType="alliance" :loading="isStatsLoading" :days="selectedDays" />
                    </div>
                </div>
            </div>
        </UContainer>
    </div>
</template>

<script setup lang="ts">
// Simplified interface for kills page stats
interface KillsViewStats {
    shipGroupStats: Array<{
        ship_group_id: number;
        ship_group_name: string | Record<string, string>;
        killed: number;
    }>;
    mostValuableKills: Array<{
        killmail_id: number;
        total_value: number;
        victim: {
            ship_id: number;
            ship_name: string | Record<string, string>;
            character_id?: number;
            character_name?: string;
            corporation_id?: number;
            corporation_name?: string;
            alliance_id?: number;
            alliance_name?: string;
        };
        final_blow?: {
            character_id?: number;
            character_name?: string;
        };
    }>;
    topKillersByCharacter: Array<{
        character_id: number;
        character_name: string;
        kills: number;
    }>;
    topKillersByCorporation: Array<{
        corporation_id: number;
        corporation_name: string;
        kills: number;
    }>;
    topKillersByAlliance: Array<{
        alliance_id: number;
        alliance_name: string;
        kills: number;
    }>;
}

// Define allowed types (same as original kills page)
const allowedTypes = [
    'latest', 'abyssal', 'wspace', 'highsec', 'lowsec', 'nullsec', 'pochven', 'big', 'solo', 'npc',
    '5b', '10b', 'citadels', 't1', 't2', 't3', 'frigates', 'destroyers', 'cruisers',
    'battlecruisers', 'battleships', 'capitals', 'freighters', 'supercarriers', 'titans', 'structureboys'
]

// Mapping killlist types to filter queries for stats (last 30 days)
const killlistTypeToFilters: Record<string, Record<string, any>> = {
    latest: {},
    abyssal: { region_id: { $gte: 12000000, $lte: 13000000 } },
    wspace: { region_id: { $gte: 11000001, $lte: 11000033 } },
    highsec: { system_security: { $gte: 0.45 } },
    lowsec: { system_security: { $lte: 0.45, $gte: 0 } },
    nullsec: { system_security: { $lte: 0 } },
    pochven: { region_id: 10000070 },
    big: { "victim.ship_group_id": { $in: [547, 485, 513, 902, 941, 30, 659] } },
    solo: { is_solo: true },
    npc: { is_npc: true },
    '5b': { total_value: { $gte: 5000000000 } },
    '10b': { total_value: { $gte: 10000000000 } },
    citadels: { "victim.ship_group_id": { $in: [1657, 1406, 1404, 1408, 2017, 2016] } },
    t1: { "victim.ship_group_id": { $in: [419, 27, 29, 547, 26, 420, 25, 28, 941, 463, 237, 31] } },
    t2: { "victim.ship_group_id": { $in: [324, 898, 906, 540, 830, 893, 543, 541, 833, 358, 894, 831, 902, 832, 900, 834, 380] } },
    t3: { "victim.ship_group_id": { $in: [963, 1305] } },
    frigates: { "victim.ship_group_id": { $in: [324, 893, 25, 831, 237] } },
    destroyers: { "victim.ship_group_id": { $in: [420, 541] } },
    cruisers: { "victim.ship_group_id": { $in: [906, 26, 833, 358, 894, 832, 963] } },
    battlecruisers: { "victim.ship_group_id": { $in: [419, 540] } },
    battleships: { "victim.ship_group_id": { $in: [27, 898, 900] } },
    capitals: { "victim.ship_group_id": { $in: [547, 485] } },
    freighters: { "victim.ship_group_id": { $in: [513, 902] } },
    supercarriers: { "victim.ship_group_id": { $in: [659] } },
    titans: { "victim.ship_group_id": { $in: [30] } },
    structureboys: { "items.type_id": { $in: [56201, 56202, 56203, 56204, 56205, 56206, 56207, 56208] }, "items.flag": 5 }
}

// Types that should show ship statistics (broader categories only)
const shipStatsTypes = [
    'latest', 'abyssal', 'wspace', 'highsec', 'lowsec', 'nullsec', 'pochven', 'big', 'solo', 'npc', '5b', '10b', 'structureboys'
]

// Types that should show most valuable kills (all except very specific ship types)
const mostValuableKillsTypes = [
    'latest', 'abyssal', 'wspace', 'highsec', 'lowsec', 'nullsec', 'pochven', 'big', 'solo', 'npc', '5b', '10b', 'citadels', 'structureboys'
]

// Composables
const route = useRoute();
const { t, locale } = useI18n();

// Reactive state
const isStatsLoading = ref(true);
const stats = ref<any>(null);
const currentType = ref('');
const componentKey = ref(0);
const selectedDays = ref(7);

// Day options for the dropdown
const dayOptions = [
    { label: '1d', value: 1 },
    { label: '7d', value: 7 },
    { label: '14d', value: 14 },
    { label: '30d', value: 30 }
];

// Computed
const isValidType = computed(() => allowedTypes.includes(currentType.value))
const typeLabel = computed(() => {
    return currentType.value.charAt(0).toUpperCase() + currentType.value.slice(1)
})

// Computed properties for showing/hiding sections
const showShipStats = computed(() => shipStatsTypes.includes(currentType.value))
const showMostValuableKills = computed(() => mostValuableKillsTypes.includes(currentType.value))

// Lifecycle
onMounted(async () => {
    // Initial setup is handled by the route watcher with immediate: true
    // No need to call initializePage here to avoid duplicate API calls
});

// Watch for route changes to reload data when type changes
watch(() => route.params.type, async (newType, oldType) => {
    if (newType) {
        currentType.value = newType.toString() || 'latest';
        componentKey.value++; // Force KillList remount
        await initializePage();
    }
}, { immediate: true }); // This handles both initial load and route changes

// Watch for day selection changes to reload stats
watch(selectedDays, () => {
    // Reload stats for all valid types since we always show top killers
    if (isValidType.value) {
        loadStatsData();
    }
});

// Methods
async function initializePage() {
    const newType = route.params.type?.toString() || 'latest';
    currentType.value = newType;

    // Page renders immediately for valid types
    // Stats load separately in the background
    if (isValidType.value) {
        // Load stats in background for all valid types (to get top killers)
        loadStatsData(); // Don't await - let it load in background
    }
}

async function loadStatsData() {
    try {
        isStatsLoading.value = true;

        // Get the base filter for this killlist type
        const baseFilter = killlistTypeToFilters[currentType.value] || {};

        // Add time filter based on selected days
        const daysAgo = new Date();
        daysAgo.setDate(daysAgo.getDate() - selectedDays.value);
        // Normalize to YYYY-mm-dd format for consistency (without hours)
        daysAgo.setHours(0, 0, 0, 0); // Set to start of day for cache consistency

        const filters = {
            ...baseFilter,
            kill_time: { $gte: daysAgo.toISOString() }
        };

        // Determine which facets we need based on what we're showing
        const requestedFacets: string[] = [];

        if (showShipStats.value) {
            requestedFacets.push('shipStats');
        }

        if (showMostValuableKills.value) {
            requestedFacets.push('mostValuable');
        }

        // Always include top killers for all types to ensure they populate
        requestedFacets.push('topKillersChar', 'topKillersCorp', 'topKillersAlliance');

        const filtersParam = JSON.stringify(filters);
        const facetsParam = JSON.stringify(requestedFacets);
        const statsResponse = await $fetch(`/api/advancedview/stats?filters=${encodeURIComponent(filtersParam)}&facets=${encodeURIComponent(facetsParam)}`);
        stats.value = statsResponse;
    } catch (err: any) {
        console.error('Error loading stats:', err);
        // Don't set main error for stats failure, just log it
        console.warn('Stats failed to load for kills page');
    } finally {
        isStatsLoading.value = false;
    }
}

// SEO
useSeoMeta({
    title: () => `${typeLabel.value} Kills | Eve-Kill.net`,
    description: () => `Browse ${typeLabel.value} kills in EVE Online with detailed statistics and analytics`
});
</script>
