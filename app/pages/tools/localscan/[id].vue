<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import { useRoute } from 'vue-router';

// Define the CharacterWithStats interface without shortStats
interface CharacterWithStats {
    name: string;
    character_id?: number;
    stats: {
        killsLastWeek: number;
        isPotentiallyDangerous: boolean;
    };
}

const { t } = useI18n();
const route = useRoute();
const id = route.params.id as string;

const { data, pending, error } = await useFetch(`/api/tools/localscan/${id}`, {
    key: `localscan-${id}`,
});

// Calculate counts and structure alliance data
const alliancesData = computed(() => {
    if (!data.value?.alliances) return [];

    return Object.entries(data.value.alliances).map(([allianceId, alliance]) => {
        const corporationsArray = alliance.corporations ? Object.entries(alliance.corporations) : [];
        const corporationsData = corporationsArray.map(([corpId, corp]) => {
            // Ensure corp.characters is an array of CharacterWithStats
            const chars: CharacterWithStats[] = Array.isArray(corp.characters) ? corp.characters : [];
            return {
                id: corpId,
                name: corp.name,
                ticker: corp.ticker,
                characterCount: chars.length,
                characters: chars // Now contains CharacterWithStats[]
            };
        }).sort((a, b) => a.name.localeCompare(b.name));

        const totalCharacters = corporationsData.reduce((sum, corp) => sum + corp.characterCount, 0);

        return {
            id: allianceId,
            name: alliance.name,
            ticker: alliance.ticker,
            corporationCount: corporationsData.length,
            characterCount: totalCharacters,
            corporations: corporationsData
        };
    }).sort((a, b) => b.characterCount - a.characterCount);
});

// Get non-alliance corporations
const nonAllianceCorps = computed(() => {
    if (!data.value?.corporations) return [];

    return Object.entries(data.value.corporations).map(([corpId, corp]) => {
        // Ensure corp.characters is an array of CharacterWithStats
        const chars: CharacterWithStats[] = Array.isArray(corp.characters) ? corp.characters : [];
        return {
            id: corpId,
            name: corp.name,
            ticker: corp.ticker,
            characterCount: chars.length,
            characters: chars // Now contains CharacterWithStats[]
        };
    }).sort((a, b) => b.characterCount - a.characterCount);
});

// Total character count
const totalCharacterCount = computed(() => {
    let count = 0;
    alliancesData.value.forEach(alliance => {
        count += alliance.characterCount;
    });
    nonAllianceCorps.value.forEach(corp => {
        count += corp.characterCount;
    });
    return count;
});

// Potential Threats
const potentialThreats = computed(() => {
    if (!data.value) return [];
    const threats: (CharacterWithStats & { corpName?: string, corpId?: string, allianceName?: string, allianceId?: string })[] = [];

    // Collect from alliances
    if (data.value.alliances) {
        Object.values(data.value.alliances).forEach(alliance => {
            if (alliance.corporations) {
                Object.values(alliance.corporations).forEach(corp => {
                    if (Array.isArray(corp.characters)) {
                        corp.characters.forEach((character: CharacterWithStats) => {
                            if (character.stats?.isPotentiallyDangerous) {
                                threats.push({
                                    ...character,
                                    corpName: corp.name,
                                    corpId: Object.keys(alliance.corporations!).find(key => alliance.corporations![key] === corp),
                                    allianceName: alliance.name,
                                    allianceId: Object.keys(data.value.alliances!).find(key => data.value.alliances![key] === alliance)
                                });
                            }
                        });
                    }
                });
            }
        });
    }

    // Collect from non-alliance corporations
    if (data.value.corporations) {
        Object.values(data.value.corporations).forEach(corp => {
            if (Array.isArray(corp.characters)) {
                corp.characters.forEach((character: CharacterWithStats) => {
                    if (character.stats?.isPotentiallyDangerous) {
                        threats.push({
                            ...character,
                            corpName: corp.name,
                            corpId: Object.keys(data.value.corporations!).find(key => data.value.corporations![key] === corp)
                        });
                    }
                });
            }
        });
    }

    return threats.sort((a, b) => (b.stats?.killsLastWeek ?? 0) - (a.stats?.killsLastWeek ?? 0));
});

// Track collapsed state of alliances and corps
const collapsedState = ref<Record<string, boolean>>({});

// Initialize collapse states after data is loaded
watch(() => data.value, (newData) => {
    if (!newData) return;

    // Initialize alliance collapse states
    if (newData.alliances) {
        Object.keys(newData.alliances).forEach(allianceId => {
            collapsedState.value[`alliance-${allianceId}`] = true;

            // Initialize corporation collapse states
            const alliance = newData.alliances[allianceId];
            if (alliance.corporations) {
                Object.keys(alliance.corporations).forEach(corpId => {
                    collapsedState.value[`corp-${allianceId}-${corpId}`] = true;
                });
            }
        });
    }

    // Initialize non-alliance corporation collapse states
    if (newData.corporations) {
        Object.keys(newData.corporations).forEach(corpId => {
            collapsedState.value[`corp-na-${corpId}`] = true;
        });
    }
}, { immediate: true });

function toggleCollapse(id: string, event?: Event) {
    if (event) {
        event.preventDefault();
        event.stopPropagation();
    }
    // Ensure the key exists before toggling
    if (collapsedState.value[id] === undefined) {
        collapsedState.value[id] = false;
    } else {
        collapsedState.value[id] = !collapsedState.value[id];
    }
}

function isCollapsed(id: string): boolean {
    // Explicitly check for Boolean `false` rather than falsy values
    return collapsedState.value[id] !== false;
}

// Track non-alliance corporations collapsed state
const nonAllianceCollapsed = ref(true); // Initialize to true (collapsed)

function toggleNonAlliance(event?: Event) {
    if (event) {
        event.preventDefault();
        event.stopPropagation();
    }
    nonAllianceCollapsed.value = !nonAllianceCollapsed.value;
}

useSeoMeta({
    title: () => t('tools.localscan.result_title'),
    description: () => t('tools.localscan.result_description'),
});
</script>

<template>
    <div>
        <UContainer>
            <div class="my-6 space-y-4">
                <div class="flex justify-between items-center">
                    <h1 class="text-2xl font-bold">{{ t('tools.localscan.result_title') }}</h1>
                    <UButton to="/tools/localscan" icon="arrow-left" variant="outline">
                        {{ t('general.back') }}
                    </UButton>
                </div>

                <div v-if="pending" class="bg-background-800 p-4 rounded-lg shadow-lg">
                    <div class="flex justify-center p-8">
                        <UIcon name="loader" class="animate-spin h-8 w-8" />
                    </div>
                </div>

                <div v-else-if="error" class="bg-background-800 p-4 rounded-lg shadow-lg">
                    <div class="p-4">
                        <UAlert color="red" icon="alert-triangle">
                            {{ t('tools.localscan.error_loading') }}
                        </UAlert>
                    </div>
                </div>

                <div v-else-if="data" class="bg-background-800 rounded-lg shadow-lg overflow-hidden">
                    <!-- Potential Threats Section -->
                    <div v-if="potentialThreats.length > 0" class="p-4 border-b border-gray-200 dark:border-gray-700">
                        <h2 class="text-xl font-semibold mb-3 text-red-500 dark:text-red-400 flex items-center">
                            <UIcon name="shield-exclamation" class="mr-2 h-6 w-6" />
                            {{ t('tools.localscan.potential_threats') }} ({{ potentialThreats.length }})
                        </h2>
                        <div class="space-y-2 max-h-96 overflow-y-auto">
                            <div v-for="threat in potentialThreats" :key="threat.character_id || threat.name"
                                class="p-3 rounded-md flex justify-between items-center"
                                style="background-color: light-dark(rgba(255, 230, 230, 0.15), rgba(50, 20, 20, 0.4));">
                                <div class="flex items-center space-x-3">
                                    <Image v-if="threat.character_id" type="character" :id="threat.character_id"
                                        :size="32" />
                                    <div class="flex-grow">
                                        <div class="font-semibold">
                                            <NuxtLink v-if="threat.character_id"
                                                :to="`/character/${threat.character_id}`" class="hover:underline">
                                                {{ threat.name }}
                                            </NuxtLink>
                                            <span v-else>{{ threat.name }}</span>
                                        </div>
                                        <div class="text-xs text-gray-500 dark:text-gray-400">
                                            <span v-if="threat.corpName">
                                                <NuxtLink v-if="threat.corpId" :to="`/corporation/${threat.corpId}`"
                                                    class="hover:underline">
                                                    {{ threat.corpName }}
                                                </NuxtLink>
                                                <span v-else>{{ threat.corpName }}</span>
                                                <span v-if="threat.allianceName"> /
                                                    <NuxtLink v-if="threat.allianceId"
                                                        :to="`/alliance/${threat.allianceId}`" class="hover:underline">
                                                        {{ threat.allianceName }}
                                                    </NuxtLink>
                                                    <span v-else>{{ threat.allianceName }}</span>
                                                </span>
                                            </span>
                                            <span v-else>{{ t('tools.localscan.unknown_corp') }}</span>
                                        </div>
                                    </div>
                                </div>
                                <div class="text-right">
                                    <UBadge color="error" variant="soft" size="md" class="px-2 py-1">
                                        {{ threat.stats.killsLastWeek }}
                                        {{ t('tools.localscan.kills_last_week_short') }}
                                    </UBadge>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Summary Stats Bar -->
                    <div class="p-4 border-b border-gray-200 dark:border-gray-700">
                        <div class="flex justify-between items-center">
                            <h2 class="text-xl font-semibold">
                                {{ t('tools.localscan.alliance_corp_breakdown') }}
                            </h2>
                            <UBadge color="primary" size="lg" class="text-sm font-medium">
                                {{ t('tools.localscan.total_characters', { count: totalCharacterCount }) }}
                            </UBadge>
                        </div>

                        <div class="grid grid-cols-2 sm:grid-cols-3 gap-4 mt-4">
                            <div class="p-3 rounded-md"
                                style="background-color: light-dark(rgba(245, 245, 245, 0.1), rgba(26, 26, 26, 0.4))">
                                <div class="text-sm text-gray-500 dark:text-gray-400">{{ t('tools.localscan.alliances')
                                }}</div>
                                <div class="text-lg font-semibold">{{ alliancesData.length }}</div>
                            </div>
                            <div class="p-3 rounded-md"
                                style="background-color: light-dark(rgba(245, 245, 245, 0.1), rgba(26, 26, 26, 0.4))">
                                <div class="text-sm text-gray-500 dark:text-gray-400">{{
                                    t('tools.localscan.corporations') }}</div>
                                <div class="text-lg font-semibold">
                                    {{alliancesData.reduce((sum, alliance) => sum + alliance.corporations.length, 0) +
                                        nonAllianceCorps.length}}
                                </div>
                            </div>
                            <div class="p-3 rounded-md"
                                style="background-color: light-dark(rgba(245, 245, 245, 0.1), rgba(26, 26, 26, 0.4))">
                                <div class="text-sm text-gray-500 dark:text-gray-400">{{ t('tools.localscan.characters')
                                }}</div>
                                <div class="text-lg font-semibold">{{ totalCharacterCount }}</div>
                            </div>
                        </div>
                    </div>

                    <div class="p-4">
                        <!-- Alliances Section -->
                        <div v-if="alliancesData.length > 0" class="space-y-4">
                            <div v-for="alliance in alliancesData" :key="alliance.id" class="mb-4">
                                <!-- Alliance Header -->
                                <div class="flex items-center justify-between p-2 rounded-lg cursor-pointer"
                                    style="background-color: light-dark(rgba(245, 245, 245, 0.15), rgba(38, 38, 38, 0.4));"
                                    :class="{ 'hover-highlight': true }"
                                    @click.prevent="toggleCollapse(`alliance-${alliance.id}`, $event)">
                                    <div class="flex items-center space-x-3">
                                        <Image v-if="alliance.id" type="alliance" :id="alliance.id" :size="32" />
                                        <div>
                                            <div class="flex items-center">
                                                <NuxtLink :to="`/alliance/${alliance.id}`"
                                                    class="font-semibold hover:underline" @click.stop>{{ alliance.name
                                                    }}</NuxtLink>
                                                <span v-if="alliance.ticker"
                                                    class="ml-2 text-sm text-gray-500 dark:text-gray-400">[{{
                                                        alliance.ticker }}]</span>
                                            </div>
                                            <div class="text-sm text-gray-500 dark:text-gray-400">
                                                {{ t('tools.localscan.corps_and_chars', {
                                                    corps: alliance.corporationCount,
                                                    chars: alliance.characterCount
                                                }) }}
                                            </div>
                                        </div>
                                    </div>

                                    <UBadge color="primary" class="flex items-center gap-1">
                                        {{ alliance.characterCount }}
                                        <UIcon
                                            :name="isCollapsed(`alliance-${alliance.id}`) ? 'chevron-down' : 'chevron-up'"
                                            class="h-4 w-4" />
                                    </UBadge>
                                </div>

                                <!-- Alliance Corporations -->
                                <div v-if="!isCollapsed(`alliance-${alliance.id}`)" class="pl-4 mt-2 space-y-3">
                                    <div v-for="corp in alliance.corporations" :key="corp.id"
                                        class="border-l-2 border-gray-200 dark:border-gray-700 pl-4">
                                        <!-- Corporation Header -->
                                        <div class="flex items-center justify-between p-2 rounded-md cursor-pointer"
                                            style="background-color: light-dark(rgba(245, 245, 245, 0.05), rgba(26, 26, 26, 0.2));"
                                            :class="{ 'hover-highlight': true }"
                                            @click.prevent="toggleCollapse(`corp-${alliance.id}-${corp.id}`, $event)">
                                            <div class="flex items-center space-x-3">
                                                <Image v-if="corp.id" type="corporation" :id="corp.id" :size="24" />
                                                <div>
                                                    <div class="flex items-center">
                                                        <NuxtLink :to="`/corporation/${corp.id}`"
                                                            class="font-medium hover:underline" @click.stop>{{ corp.name
                                                            }}</NuxtLink>
                                                        <span v-if="corp.ticker"
                                                            class="ml-2 text-xs text-gray-500 dark:text-gray-400">[{{
                                                                corp.ticker }}]</span>
                                                    </div>
                                                </div>
                                            </div>

                                            <UBadge color="info" class="flex items-center gap-1">
                                                {{ corp.characterCount }}
                                                <UIcon
                                                    :name="isCollapsed(`corp-${alliance.id}-${corp.id}`) ? 'chevron-down' : 'chevron-up'"
                                                    class="h-3 w-3" />
                                            </UBadge>
                                        </div>

                                        <!-- Corporation Characters -->
                                        <div v-if="!isCollapsed(`corp-${alliance.id}-${corp.id}`)" class="mt-2 pl-2">
                                            <div class="organizations-section pl-4 text-sm grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-1"
                                                style="background-color: light-dark(rgba(245, 245, 245, 0.05), rgba(26, 26, 26, 0.1)); padding: 0.5rem; border-radius: 0.375rem;">
                                                <div v-for="character in corp.characters"
                                                    :key="character.character_id || character.name"
                                                    class="py-1 px-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded flex justify-between items-center">
                                                    <NuxtLink v-if="character.character_id"
                                                        :to="`/character/${character.character_id}`"
                                                        class="hover:underline">{{ character.name }}</NuxtLink>
                                                    <span v-else>{{ character.name }}</span>
                                                    <UBadge v-if="character.stats?.killsLastWeek !== undefined"
                                                        color="error" variant="soft" class="ml-1">
                                                        {{ character.stats.killsLastWeek }} {{
                                                            t('tools.localscan.kills_last_week_short') }}
                                                    </UBadge>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- Non-Alliance Corps Section -->
                        <div v-if="nonAllianceCorps.length > 0" class="mt-6">
                            <div class="flex items-center justify-between p-2 rounded-lg cursor-pointer"
                                style="background-color: light-dark(rgba(255, 236, 179, 0.15), rgba(66, 48, 0, 0.4));"
                                :class="{ 'hover-highlight': true }" @click.prevent="toggleNonAlliance($event)">
                                <div class="font-semibold flex items-center">
                                    <UIcon name="users" class="mr-2 h-5 w-5 text-yellow-500 dark:text-yellow-400" />
                                    {{ t('tools.localscan.corps_without_alliance') }}
                                </div>

                                <UBadge color="yellow" size="sm" class="flex items-center gap-1">
                                    {{nonAllianceCorps.reduce((sum, corp) => sum + corp.characterCount, 0)}}
                                    <UIcon :name="nonAllianceCollapsed ? 'chevron-down' : 'chevron-up'"
                                        class="h-4 w-4" />
                                </UBadge>
                            </div>

                            <div v-if="!nonAllianceCollapsed" class="space-y-3 mt-2">
                                <div v-for="corp in nonAllianceCorps" :key="corp.id"
                                    class="border-l-2 border-gray-200 dark:border-gray-700 pl-4">
                                    <!-- Corporation Header -->
                                    <div class="flex items-center justify-between p-2 rounded-md cursor-pointer"
                                        style="background-color: light-dark(rgba(245, 245, 245, 0.05), rgba(26, 26, 26, 0.2));"
                                        :class="{ 'hover-highlight': true }"
                                        @click.prevent="toggleCollapse(`corp-na-${corp.id}`, $event)">
                                        <div class="flex items-center space-x-3">
                                            <Image v-if="corp.id" type="corporation" :id="corp.id" :size="24" />
                                            <div>
                                                <div class="flex items-center">
                                                    <NuxtLink :to="`/corporation/${corp.id}`"
                                                        class="font-medium hover:underline" @click.stop>{{ corp.name }}
                                                    </NuxtLink>
                                                    <span v-if="corp.ticker"
                                                        class="ml-2 text-xs text-gray-500 dark:text-gray-400">[{{
                                                            corp.ticker }}]</span>
                                                </div>
                                            </div>
                                        </div>

                                        <UBadge color="gray" size="sm" class="flex items-center gap-1">
                                            {{ corp.characterCount }}
                                            <UIcon
                                                :name="isCollapsed(`corp-na-${corp.id}`) ? 'chevron-down' : 'chevron-up'"
                                                class="h-3 w-3" />
                                        </UBadge>
                                    </div>

                                    <!-- Corporation Characters -->
                                    <div v-if="!isCollapsed(`corp-na-${corp.id}`)" class="mt-2 pl-2">
                                        <div class="text-sm grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-1"
                                            style="background-color: light-dark(rgba(245, 245, 245, 0.05), rgba(26, 26, 26, 0.1)); padding: 0.5rem; border-radius: 0.375rem;">
                                            <div v-for="character in corp.characters"
                                                :key="character.character_id || character.name"
                                                class="py-1 px-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded flex justify-between items-center">
                                                <NuxtLink v-if="character.character_id"
                                                    :to="`/character/${character.character_id}`"
                                                    class="hover:underline">{{ character.name }}</NuxtLink>
                                                <span v-else>{{ character.name }}</span>
                                                <UBadge v-if="character.stats?.killsLastWeek !== undefined" size="sm"
                                                    color="red" variant="soft" class="ml-1">
                                                    {{ character.stats.killsLastWeek }} {{
                                                        t('tools.localscan.kills_last_week_short') }}
                                                </UBadge>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div v-else class="bg-background-800 p-4 rounded-lg shadow-lg">
                    <div class="p-4">
                        <UAlert icon="info">
                            {{ t('tools.localscan.no_data') }}
                        </UAlert>
                    </div>
                </div>
            </div>
        </UContainer>
    </div>
</template>

<style scoped>
/* Animation for collapse/expand */
.alliance-enter-active,
.alliance-leave-active,
.corp-enter-active,
.corp-leave-active {
    transition: all 0.3s ease;
}

.alliance-enter-from,
.alliance-leave-to,
.corp-enter-from,
.corp-leave-to {
    opacity: 0;
    transform: translateY(-10px);
}

/* Hover effects */
.hover-highlight:hover {
    background-color: light-dark(rgba(245, 245, 245, 0.25), rgba(45, 45, 45, 0.5)) !important;
}

/* Light/dark mode utility function */
@media (prefers-color-scheme: dark) {
    [style*="light-dark"] {
        --tw-light-dark: var(--tw-dark);
    }
}

@media (prefers-color-scheme: light) {
    [style*="light-dark"] {
        --tw-light-dark: var(--tw-light);
    }
}
</style>
