<template>
    <div class="min-h-screen">
        <div v-if="character" class="mx-auto p-4 text-white">
            <!-- Character Profile Header integrated directly -->
            <UCard class="mb-4 bg-black bg-opacity-30 dark:bg-gray-900 dark:bg-opacity-30">
                <div class="flex flex-col md:flex-row items-start gap-4">
                    <!-- Left: Character portrait and affiliated images -->
                    <div class="flex flex-col md:flex-row items-center gap-4">
                        <!-- Character portrait -->
                        <div class="relative">
                            <Image type="character" :id="character.character_id" :alt="`Character: ${character.name}`"
                                class="rounded-full w-32 h-32 md:w-48 md:h-48 lg:w-64 lg:h-64" format="webp"
                                size="256" />
                        </div>

                        <!-- Corporation, Alliance, Faction logos -->
                        <div class="flex flex-row md:flex-col gap-2 mt-2 md:mt-0">
                            <NuxtLink :to="`/corporation/${character.corporation_id}`" class="block">
                                <Image type="corporation" :id="character.corporation_id"
                                    :alt="`Corporation: ${(character as any).corporation_name}`"
                                    class="rounded-full w-12 h-12 md:w-16 md:h-16" format="webp" size="64" />
                            </NuxtLink>
                            <NuxtLink v-if="character.alliance_id" :to="`/alliance/${character.alliance_id}`"
                                class="block">
                                <Image type="alliance" :id="character.alliance_id"
                                    :alt="`Alliance: ${(character as any).alliance_name}`"
                                    class="rounded-full w-12 h-12 md:w-16 md:h-16" format="webp" size="64" />
                            </NuxtLink>
                            <NuxtLink v-if="character.faction_id" :to="`/faction/${character.faction_id}`"
                                class="block">
                                <Image type="corporation" :id="character.faction_id"
                                    :alt="`Faction: ${(character as any).faction_name}`"
                                    class="rounded-full w-12 h-12 md:w-16 md:h-16" format="webp" size="64" />
                            </NuxtLink>
                        </div>
                    </div>

                    <!-- Right: Character info and stats -->
                    <div class="flex-grow w-full md:w-auto">
                        <div class="flex flex-col md:flex-row w-full">
                            <!-- Character basic info -->
                            <div class="md:w-1/3 mb-4 md:mb-0">
                                <h1 class="text-xl md:text-2xl font-bold">{{ character.name }}</h1>
                                <NuxtLink :to="`/corporation/${character.corporation_id}`"
                                    class="hover:underline text-gray-300">
                                    {{ (character as any).corporation_name || 'Unknown Corporation' }}
                                </NuxtLink>
                                <div v-if="(character as any).title" class="text-gray-400 text-sm">
                                    {{ (character as any).title }}
                                </div>
                                <NuxtLink v-if="character.alliance_id && (character as any).alliance_name"
                                    :to="`/alliance/${character.alliance_id}`"
                                    class="hover:underline text-gray-300 block">
                                    {{ (character as any).alliance_name }}
                                </NuxtLink>
                                <NuxtLink v-if="character.faction_id && (character as any).faction_name"
                                    :to="`/faction/${character.faction_id}`"
                                    class="hover:underline text-gray-300 block">
                                    {{ (character as any).faction_name }}
                                </NuxtLink>
                                <div class="text-gray-300 mt-1">
                                    {{ $t('securityStatus') }}:
                                    <span :style="{ color: getSecurityStatusColor(character.security_status) }">
                                        {{ character.security_status.toFixed(3) }}
                                    </span>
                                </div>
                                <!-- Use validShortStats and optional chaining -->
                                <div v-if="!shortStatsLoading && validShortStats?.lastActive"
                                    class="text-gray-400 text-sm">
                                    {{ $t('lastActive') }}: {{ formatDate(validShortStats.lastActive) }}
                                </div>
                            </div>

                            <!-- Character stats -->
                            <div class="md:flex-grow grid grid-cols-1 md:grid-cols-2 gap-4">
                                <!-- Stats loading state -->
                                <UCard v-if="shortStatsLoading"
                                    class="col-span-2 h-32 flex items-center justify-center bg-black bg-opacity-20">
                                    <UIcon name="i-lucide-loader-2" class="animate-spin text-gray-400" size="lg" />
                                    <span class="ml-2 text-gray-400">{{ $t('loading') }}</span>
                                </UCard>

                                <!-- Stats data -->
                                <template v-else-if="validShortStats"> <!-- Check validShortStats here -->
                                    <!-- Left stats column -->
                                    <div class="space-y-1">
                                        <div class="flex justify-between">
                                            <span class="text-gray-300">{{ $t('kills') }}:</span>
                                            <span class="text-white font-medium">{{ formatNumber(validShortStats.kills)
                                            }}</span>
                                        </div>
                                        <div class="flex justify-between">
                                            <span class="text-gray-300">{{ $t('losses') }}:</span>
                                            <span class="text-white font-medium">{{ formatNumber(validShortStats.losses)
                                            }}</span>
                                        </div>
                                        <div class="flex justify-between">
                                            <span class="text-gray-300">{{ $t('isk') + ' ' + $t('killed') }}:</span>
                                            <span class="text-white font-medium">{{ formatIsk(validShortStats.iskKilled)
                                            }}</span>
                                        </div>
                                        <div class="flex justify-between">
                                            <span class="text-gray-300">{{ $t('isk') + ' ' + $t('lost') }}:</span>
                                            <span class="text-white font-medium">{{ formatIsk(validShortStats.iskLost)
                                            }}</span>
                                        </div>
                                    </div>

                                    <!-- Right stats column -->
                                    <div class="space-y-1">
                                        <div class="flex justify-between">
                                            <span class="text-gray-300">{{ $t('npc') + ' ' + $t('losses') }}:</span>
                                            <span class="text-white font-medium">{{
                                                formatNumber(validShortStats.npcLosses) }}</span>
                                        </div>
                                        <div class="flex justify-between">
                                            <span class="text-gray-300">{{ $t('solo') + ' ' + $t('kills') }}:</span>
                                            <span class="text-white font-medium">{{
                                                formatNumber(validShortStats.soloKills) }}</span>
                                        </div>
                                        <div class="flex justify-between">
                                            <span class="text-gray-300">{{ $t('solo') + ' ' + $t('losses') }}:</span>
                                            <span class="text-white font-medium">{{
                                                formatNumber(validShortStats.soloLosses) }}</span>
                                        </div>
                                        <div class="flex justify-between">
                                            <span class="text-gray-300">{{ $t('dangerRatio') }}:</span>
                                            <span class="text-white font-medium">{{ calcDangerRatio(validShortStats)
                                            }}%</span>
                                        </div>
                                    </div>
                                </template>
                            </div>
                        </div>
                    </div>
                </div>
            </UCard>

            <!-- Tabs Navigation -->
            <UTabs :items="tabItems" :default-index="getInitialTabIndex()" @change="handleTabChange" class="space-y-4">
                <!-- Dashboard Tab -->
                <template #dashboard>
                    <div class="tab-content">
                        <characterDashboard :character="character" />
                    </div>
                </template>

                <!-- Kills Tab -->
                <template #kills>
                    <div class="tab-content">
                        <!-- Use component directly, assuming auto-import -->
                        <CharacterKills :character="character" />
                    </div>
                </template>

                <!-- Losses Tab -->
                <template #losses>
                    <div class="tab-content">
                        <CharacterLosses :character="character" />
                    </div>
                </template>

                <!-- Combined Tab -->
                <template #combined>
                    <div class="tab-content">
                        <CharacterCombined :character="character" />
                    </div>
                </template>

                <!-- Corporation History Tab -->
                <template #corporation-history>
                    <div class="tab-content">
                        <CharacterCorporationHistory />
                    </div>
                </template>

                <!-- Stats Tab -->
                <template #stats>
                    <div class="tab-content">
                        <CharacterStats />
                    </div>
                </template>
            </UTabs>
        </div>

        <!-- Loading State -->
        <div v-else-if="pending" class="mx-auto p-4">
            <USkeleton class="h-64 rounded-lg mb-4" />
            <USkeleton class="h-8 w-64 mb-6" />
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                <USkeleton v-for="i in 6" :key="i" class="h-32 rounded-lg" />
            </div>
        </div>

        <!-- Error State -->
        <UCard v-else class="mx-auto p-4 text-center bg-black bg-opacity-30 dark:bg-gray-900 dark:bg-opacity-30">
            <template #header>
                <div class="flex justify-center mb-2">
                    <UIcon name="i-lucide-alert-triangle" class="text-amber-500 h-8 w-8" />
                </div>
                <h3 class="text-lg font-medium text-center">{{ t('character.notFound') }}</h3>
            </template>
            <p>{{ t('character.characterDoesNotExist') }}</p>
            <template #footer>
                <div class="flex justify-center">
                    <!-- Adjust navigateTo call -->
                    <UButton icon="i-lucide-arrow-left" variant="ghost" @click="() => { navigateTo('/'); }">
                        {{ t('common.goToHomepage') }}
                    </UButton>
                </div>
            </template>
        </UCard>
    </div>
</template>

<script setup lang="ts">
import type { TabsItem } from "@nuxt/ui";
import { formatDistanceToNow } from "date-fns";
import { de, enUS, es, fr, ja, ko, ru, zhCN } from "date-fns/locale";
import { useI18n } from "vue-i18n";
import { computed, ref, onMounted } from 'vue';
import type { ICharacter } from '~/server/interfaces/ICharacter'; // Add ICharacter import
// Removed explicit import for CharacterKills - relying on Nuxt auto-import

const { t, locale } = useI18n();
const currentLocale = computed(() => locale.value);
const route = useRoute();
const router = useRouter();
const { id } = route.params;
const loading = ref(true);

// Map of locale identifiers to date-fns locale objects
const dateLocales = {
    en: enUS,
    de: de,
    es: es,
    fr: fr,
    ja: ja,
    ko: ko,
    ru: ru,
    zh: zhCN,
};

// Format date with date-fns using current locale
const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return formatDistanceToNow(date, {
        addSuffix: true,
        locale: dateLocales[currentLocale.value] || enUS,
    });
};

// Generate a dynamic fetch key that changes with each route ID change
const fetchKey = computed(() => `character-${id}-${Date.now()}`);

// Fetch character data with improved caching strategy
const {
    data: characterData, // Rename to avoid conflict with computed prop
    pending,
    error,
    refresh,
    // Explicitly type the data expected from the API
} = useFetch<ICharacter | { error: string } | null>(`/api/characters/${id}`, { // Allow null as well
    key: fetchKey.value,
    watch: [() => route.params.id],
});

// Computed property to get the valid character object or null
const character = computed(() => {
    if (characterData.value && !('error' in characterData.value)) {
        return characterData.value as ICharacter;
    }
    return null;
});

// Define expected structure for short stats (adjust if needed)
interface IShortStats {
    kills: number;
    losses: number;
    iskKilled: number;
    iskLost: number;
    npcLosses: number;
    soloKills: number;
    soloLosses: number;
    lastActive: string | null; // Assuming lastActive is a string or null
}

// Fetch character short stats on client-side
const shortStatsLoading = ref(true);
const shortStatsData = ref<IShortStats | { error: string } | null>(null);

onMounted(() => {
    $fetch<IShortStats | { error: string } | null>(`/api/characters/${id}/shortstats`)
        .then(data => {
            shortStatsData.value = data;
            shortStatsLoading.value = false;
        })
        .catch(error => {
            console.error('Error fetching character short stats:', error);
            shortStatsLoading.value = false;
            shortStatsData.value = { error: 'Failed to fetch character stats' };
        });
});

// Computed property for valid short stats
const validShortStats = computed(() => {
    if (shortStatsData.value && !('error' in shortStatsData.value)) {
        return shortStatsData.value as IShortStats;
    }
    return null;
});

// Set up SEO metadata
useSeoMeta({
    title: computed(() => {
        // Check if character.value exists and has the name property
        const char = character.value as any; // Use 'as any' or a proper type assertion if ICharacter is defined
        return char?.name ? `${char.name}` : t("character.characterPage");
    }),
    description: computed(() => {
        const char = character.value as any; // Use 'as any' or a proper type assertion
        return char?.name && char?.corporation_name
            ? t("characterMetaDescription", {
                name: char.name,
                corporation: char.corporation_name,
                alliance: char.alliance_name || t("noAlliance"),
            })
            : t("characterDefaultDescription", { id: id });
    }),
    ogImage: computed(() => {
        const char = character.value as any; // Use 'as any' or a proper type assertion
        return char?.character_id
            ? `https://images.eve-kill.com/characters/${char.character_id}/portrait?size=256`
            : "/images/default-og.png";
    }),
});

// Tab navigation configuration with slot property properly defined
const tabItems = [
    {
        id: "dashboard",
        label: t("dashboard"), // Use t() directly
        icon: "i-lucide-layout-dashboard",
        slot: "dashboard" as const,
    },
    {
        id: "kills",
        label: t("kills"), // Use t() directly
        icon: "i-lucide-trophy",
        slot: "kills" as const,
    },
    {
        id: "losses",
        label: t("losses"), // Use t() directly
        icon: "i-lucide-skull",
        slot: "losses" as const,
    },
    {
        id: "combined",
        label: t("combined"), // Use t() directly
        icon: "i-lucide-layers",
        slot: "combined" as const,
    },
    {
        id: "corporation-history",
        label: t("corporationHistory"), // Use t() directly
        icon: "i-lucide-history",
        slot: "corporation-history" as const,
    },
    {
        id: "stats",
        label: t("stats"), // Use t() directly
        icon: "i-lucide-bar-chart",
        slot: "stats" as const,
    },
] satisfies TabsItem[];

// Active tab from query param or default to dashboard
const activeTab = ref(route.query.tab?.toString() || "dashboard");

// Get initial tab index from query parameter or default to dashboard
const getInitialTabIndex = () => {
    const tab = route.query.tab as string;
    const index = tabItems.findIndex((item) => item.id === tab);
    return index >= 0 ? index : 0;
};

// Handle tab changes by updating the URL query parameter
const handleTabChange = (tabId: string) => {
    activeTab.value = tabId;
    router.replace({
        query: {
            ...route.query,
            tab: tabId,
        },
    });
};

// Format numbers with commas
const formatNumber = (value: number): string => {
    return value?.toLocaleString() || "0";
};

// Format ISK value with B/M suffix
const formatIsk = (value: number): string => {
    if (!value) return "0 ISK";

    if (value >= 1000000000) {
        return `${(value / 1000000000).toFixed(2)}B ISK`;
    }
    if (value >= 1000000) {
        return `${(value / 1000000).toFixed(2)}M ISK`;
    }
    return `${Math.round(value).toLocaleString()} ISK`;
};

// Calculate danger ratio (kills / (kills + losses) * 100)
// Update to accept IShortStats or null
const calcDangerRatio = (stats: IShortStats | null): string => {
    if (!stats) return "0";

    const { kills = 0, losses = 0 } = stats; // Default values handled by destructuring
    if (kills === 0 && losses === 0) return "0";

    const ratio = (kills / (kills + losses)) * 100;
    return ratio.toFixed(1);
};

// Get color for security status
const getSecurityStatusColor = (securityStatus: number): string => {
    if (securityStatus >= 0.5) return "#00FF00"; // High sec - green
    if (securityStatus >= 0.0) return "#FFFF00"; // Low sec - yellow
    if (securityStatus >= -5.0) return "#FF8C00"; // Negative but not too bad - orange
    return "#FF0000"; // Very negative - red
};
</script>

<style>
/* Add any additional custom styles here */
.animate-spin {
    animation: spin 1s linear infinite;
}

@keyframes spin {
    to {
        transform: rotate(360deg);
    }
}

.tab-content {
    background-color: rgba(0, 0, 0, 0.3);
    border-radius: 0.5rem;
    padding: 1rem;
}

@media (prefers-color-scheme: dark) {
    .tab-content {
        background-color: rgba(17, 24, 39, 0.3);
    }
}
</style>
