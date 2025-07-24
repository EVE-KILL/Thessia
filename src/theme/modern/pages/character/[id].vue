<template>
    <div class="min-h-screen">
        <div v-if="character" class="mx-auto p-4 text-gray-900 dark:text-white">
            <!-- Redesigned Character Profile Header -->
            <div
                class="character-header rounded-lg overflow-hidden mb-6 bg-gray-100 bg-opacity-90 dark:bg-gray-900 dark:bg-opacity-30 border border-gray-300 dark:border-gray-800">
                <!-- Character summary section with portrait and basic info -->
                <div class="p-6">
                    <div class="flex flex-col md:flex-row gap-6">
                        <!-- Left: Character portrait with status indicators -->
                        <div class="character-portrait-container">
                            <div class="relative">
                                <Image type="character" :id="character.character_id"
                                    :alt="`Character: ${character.name}`"
                                    class="character-portrait rounded-lg shadow-lg" format="webp" size="256" />

                                <!-- Race indicator overlay at bottom left -->
                                <div
                                    class="race-indicator bg-gray-100 dark:bg-gray-900 text-white border-gray-300 dark:border-gray-700">
                                    {{ character.race_name }}
                                </div>

                                <!-- Bloodline indicator overlay above race indicator -->
                                <div
                                    class="bloodline-indicator bg-gray-100 dark:bg-gray-900 text-white border-gray-300 dark:border-gray-700">
                                    {{ character.bloodline_name }}
                                </div>

                                <!-- Security status indicator with gradient -->
                                <div class="security-status-indicator"
                                    :style="getSecurityStatusStyle(character.security_status)">
                                    {{ character.security_status.toFixed(2) }}
                                </div>
                            </div>
                        </div>

                        <!-- Right: Character details in a flex container -->
                        <div class="flex-grow flex md:flex-row flex-col">
                            <!-- Character information on the left -->
                            <div class="character-info md:mr-6 mb-4 md:mb-0">
                                <h1 class="text-2xl md:text-3xl font-bold mb-2 text-gray-900 dark:text-white">{{
                                    character.name }}</h1>

                                <!-- Character affiliations with icons -->
                                <div class="affiliations space-y-2">
                                    <div class="flex items-center gap-2">
                                        <Image type="corporation" :id="character.corporation_id"
                                            class="w-6 h-6 rounded-full" format="webp" size="64" />
                                        <NuxtLink :to="`/corporation/${character.corporation_id}`"
                                            class="text-gray-900 dark:text-gray-100 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                                            {{ (character as any).corporation_name || 'Unknown Corporation' }}
                                        </NuxtLink>
                                    </div>

                                    <div v-if="character.alliance_id && (character as any).alliance_name"
                                        class="flex items-center gap-2">
                                        <Image type="alliance" :id="character.alliance_id" class="w-6 h-6 rounded-full"
                                            format="webp" size="64" />
                                        <NuxtLink :to="`/alliance/${character.alliance_id}`"
                                            class="text-gray-900 dark:text-gray-100 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                                            {{ (character as any).alliance_name }}
                                        </NuxtLink>
                                    </div>

                                    <div v-if="character.faction_id && (character as any).faction_name"
                                        class="flex items-center gap-2">
                                        <Image type="corporation" :id="character.faction_id"
                                            class="w-6 h-6 rounded-full" format="webp" size="64" />
                                        <NuxtLink :to="`/faction/${character.faction_id}`"
                                            class="text-gray-900 dark:text-gray-100 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                                            {{ (character as any).faction_name }}
                                        </NuxtLink>
                                    </div>

                                    <div v-if="(character as any).title"
                                        class="flex items-center gap-2 italic text-gray-400">
                                        <UIcon name="i-lucide-award" class="flex-shrink-0 w-5 h-5" />
                                        {{ (character as any).title }}
                                    </div>
                                </div>
                            </div>

                            <!-- Activity information in the middle -->
                            <div class="activity-info md:self-start md:mt-2 flex-shrink-0">
                                <div class="text-sm">
                                    <!-- Last Active info -->
                                    <div v-if="!shortStatsLoading && validShortStats?.lastActive"
                                        class="activity-item mb-3">
                                        <div class="flex items-center gap-1 text-gray-600 dark:text-gray-400">
                                            <UIcon name="i-lucide-clock" class="flex-shrink-0 w-4 h-4" />
                                            <span>{{ $t('lastActive') }}:</span>
                                        </div>
                                        <div class="font-medium text-gray-900 dark:text-gray-300 ml-2">{{
                                            formatDate(validShortStats.lastActive) }}</div>
                                    </div>

                                    <!-- Enhanced Birthday info -->
                                    <div class="activity-item mb-3">
                                        <div class="flex items-center gap-1 text-gray-600 dark:text-gray-400">
                                            <UIcon name="i-lucide-calendar" class="flex-shrink-0 w-4 h-4" />
                                            <span>{{ $t('birthday') }}:</span>
                                        </div>
                                        <div class="font-medium text-gray-900 dark:text-gray-300 ml-2">
                                            {{ formatExactDate(character.birthday) }}
                                            <span class="text-xs">({{ calculateAge(character.birthday) }} {{
                                                $t('yearsOld') }})</span>
                                        </div>
                                    </div>

                                    <!-- Next Birthday info -->
                                    <div class="activity-item">
                                        <div class="flex items-center gap-1 text-gray-600 dark:text-gray-400">
                                            <UIcon name="i-lucide-cake" class="flex-shrink-0 w-4 h-4" />
                                            <span>{{ $t('nextBirthday') }}:</span>
                                        </div>
                                        <div class="font-medium text-gray-900 dark:text-gray-300 ml-2">
                                            {{ formatNextBirthday(character.birthday) }}
                                            <span class="text-xs">({{ getDaysUntilBirthday(character.birthday) }} {{
                                                $t('daysRemaining') }})</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <!-- Spacer to push affiliation logos to the right -->
                            <div class="md:flex-grow"></div>

                            <!-- Corporation, Alliance, Faction logos on the right -->
                            <div class="affiliation-logos flex gap-3 md:gap-4 md:justify-end">
                                <NuxtLink :to="`/corporation/${character.corporation_id}`"
                                    class="affiliation-logo-container">
                                    <Image type="corporation" :id="character.corporation_id"
                                        :alt="`Corporation: ${(character as any).corporation_name}`"
                                        class="rounded-lg w-16 h-16 md:w-20 md:h-20" format="webp" size="128" />
                                </NuxtLink>

                                <NuxtLink v-if="character.alliance_id" :to="`/alliance/${character.alliance_id}`"
                                    class="affiliation-logo-container">
                                    <Image type="alliance" :id="character.alliance_id"
                                        :alt="`Alliance: ${(character as any).alliance_name}`"
                                        class="rounded-lg w-16 h-16 md:w-20 md:h-20" format="webp" size="128" />
                                </NuxtLink>

                                <NuxtLink v-if="character.faction_id" :to="`/faction/${character.faction_id}`"
                                    class="affiliation-logo-container">
                                    <Image type="corporation" :id="character.faction_id"
                                        :alt="`Faction: ${(character as any).faction_name}`"
                                        class="rounded-lg w-16 h-16 md:w-20 md:h-20" format="webp" size="128" />
                                </NuxtLink>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Stats dashboard section -->
                <div
                    class="stats-dashboard p-6 bg-gradient-to-b from-gray-200/50 to-gray-100/50 dark:from-gray-900/50 dark:to-black/50 border-t border-gray-300 dark:border-gray-800">
                    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                        <!-- Stats loading state -->
                        <div v-if="shortStatsLoading" class="col-span-full flex items-center justify-center py-6">
                            <UIcon name="i-lucide-loader-2" class="animate-spin text-gray-400 mr-2" size="lg" />
                            <span class="text-gray-400">{{ $t('loading') }}</span>
                        </div>

                        <template v-else-if="validShortStats">
                            <!-- Kills & Losses Stats -->
                            <div class="stat-card">
                                <div class="stat-header">
                                    <UIcon name="i-lucide-swords" class="stat-icon text-red-500" />
                                    <h3 class="stat-title text-gray-700 dark:text-gray-200">{{ $t('combatMetrics') }}
                                    </h3>
                                </div>
                                <div class="stat-body">
                                    <div class="stat-row">
                                        <div class="stat-label text-gray-600 dark:text-gray-400">{{ $t('kills') }}</div>
                                        <div class="stat-value text-green-600 dark:text-green-400">{{
                                            formatNumber(validShortStats.kills) }}</div>
                                    </div>
                                    <div class="stat-row">
                                        <div class="stat-label text-gray-600 dark:text-gray-400">{{ $t('losses') }}
                                        </div>
                                        <div class="stat-value text-red-600 dark:text-red-400">{{
                                            formatNumber(validShortStats.losses) }}</div>
                                    </div>
                                    <div class="stat-row">
                                        <div class="stat-label text-gray-600 dark:text-gray-400">{{ $t('efficiency') }}
                                        </div>
                                        <div class="stat-value text-gray-900 dark:text-white">{{
                                            calcEfficiency(validShortStats) }}%</div>
                                    </div>
                                    <div class="stat-row">
                                        <div class="stat-label text-gray-600 dark:text-gray-400">{{ $t('dangerRatio') }}
                                        </div>
                                        <div class="stat-value" :class="getDangerClassColor(validShortStats)">
                                            {{ calcDangerRatio(validShortStats) }}%
                                            <UTooltip :text="$t('tooltips.dangerRatio')">
                                                <UIcon name="i-lucide-info" class="ml-1 w-3.5 h-3.5 text-gray-400" />
                                            </UTooltip>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <!-- ISK Stats - Fixed structure -->
                            <div class="stat-card">
                                <div class="stat-header">
                                    <UIcon name="i-lucide-coins" class="stat-icon text-yellow-500" />
                                    <h3 class="stat-title text-gray-700 dark:text-gray-200">{{ $t('iskMetrics') }}</h3>
                                </div>
                                <div class="stat-body">
                                    <div class="stat-row">
                                        <div class="stat-label text-gray-600 dark:text-gray-400">{{ $t('iskKilled') }}
                                        </div>
                                        <div class="stat-value text-green-600 dark:text-green-400">
                                            {{ formatIsk(validShortStats.iskKilled) }}
                                        </div>
                                    </div>
                                    <div class="stat-row">
                                        <div class="stat-label text-gray-600 dark:text-gray-400">{{ $t('iskLost') }}
                                        </div>
                                        <div class="stat-value text-red-600 dark:text-red-400">
                                            {{ formatIsk(validShortStats.iskLost) }}
                                        </div>
                                    </div>
                                    <div class="stat-row">
                                        <div class="stat-label text-gray-600 dark:text-gray-400">{{ $t('iskEfficiency')
                                            }}</div>
                                        <div class="stat-value text-gray-900 dark:text-white">
                                            {{ calcIskEfficiency(validShortStats) }}%
                                        </div>
                                    </div>
                                    <div class="stat-row">
                                        <div class="stat-label text-gray-600 dark:text-gray-400">{{ $t('iskBalance') }}
                                        </div>
                                        <div class="stat-value"
                                            :class="validShortStats.iskKilled > validShortStats.iskLost ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'">
                                            {{ formatIsk(validShortStats.iskKilled - validShortStats.iskLost) }}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <!-- Solo Stats -->
                            <div class="stat-card">
                                <div class="stat-header">
                                    <UIcon name="i-lucide-user" class="stat-icon text-blue-500" />
                                    <h3 class="stat-title text-gray-700 dark:text-gray-200">{{ $t('soloActivity') }}
                                    </h3>
                                </div>
                                <div class="stat-body">
                                    <div class="stat-row">
                                        <div class="stat-label text-gray-600 dark:text-gray-400">{{ $t('soloKills') }}
                                        </div>
                                        <div class="stat-value text-green-600 dark:text-green-400">{{
                                            formatNumber(validShortStats.soloKills) }}</div>
                                    </div>
                                    <div class="stat-row">
                                        <div class="stat-label text-gray-600 dark:text-gray-400">{{ $t('soloLosses') }}
                                        </div>
                                        <div class="stat-value text-red-600 dark:text-red-400">{{
                                            formatNumber(validShortStats.soloLosses) }}</div>
                                    </div>
                                    <div class="stat-row">
                                        <div class="stat-label text-gray-600 dark:text-gray-400">{{ $t('soloKillRatio')
                                            }}</div>
                                        <div class="stat-value text-gray-900 dark:text-white">{{
                                            calcSoloKillRatio(validShortStats) }}%</div>
                                    </div>
                                    <div class="stat-row">
                                        <div class="stat-label text-gray-600 dark:text-gray-400">{{ $t('soloEfficiency')
                                            }}
                                        </div>
                                        <div class="stat-value text-gray-900 dark:text-white">{{
                                            calcSoloEfficiency(validShortStats) }}%</div>
                                    </div>
                                </div>
                            </div>

                            <!-- Other Stats -->
                            <div class="stat-card">
                                <div class="stat-header">
                                    <UIcon name="i-lucide-bar-chart-2" class="stat-icon text-purple-500" />
                                    <h3 class="stat-title text-gray-700 dark:text-gray-200">{{ $t('otherMetrics') }}
                                    </h3>
                                </div>
                                <div class="stat-body">
                                    <div class="stat-row">
                                        <div class="stat-label text-gray-600 dark:text-gray-400">{{ $t('npcLosses') }}
                                        </div>
                                        <div class="stat-value text-gray-900 dark:text-white">{{
                                            formatNumber(validShortStats.npcLosses) }}</div>
                                    </div>
                                    <div class="stat-row">
                                        <div class="stat-label text-gray-600 dark:text-gray-400">{{ $t('npcLossRatio')
                                            }}</div>
                                        <div class="stat-value text-gray-900 dark:text-white">{{
                                            calcNpcLossRatio(validShortStats) }}</div>
                                    </div>
                                    <div class="stat-row">
                                        <div class="stat-label text-gray-600 dark:text-gray-400">{{ $t('avgKillsPerDay')
                                            }}
                                        </div>
                                        <div class="stat-value text-gray-900 dark:text-white">{{
                                            calcAvgKillsPerDay(validShortStats, character.birthday) }}</div>
                                    </div>
                                    <div class="stat-row">
                                        <div class="stat-label text-gray-600 dark:text-gray-400">{{ $t('activity') }}
                                        </div>
                                        <div class="stat-value" :class="getActivityClassColor(validShortStats)">
                                            {{ getActivityLevel(validShortStats) }}
                                            <UTooltip :text="$t('tooltips.activityLevel')">
                                                <UIcon name="i-lucide-info" class="ml-1 w-3.5 h-3.5 text-gray-400" />
                                            </UTooltip>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </template>
                    </div>
                </div>
            </div>

            <!-- Tabs Navigation -->
            <Tabs :items="tabItems" class="space-y-4" v-model="activeTabId">
                <template #dashboard>
                    <div class="tab-content">
                        <characterDashboard :character="character" />
                    </div>
                </template>

                <template #kills>
                    <div class="tab-content">
                        <CharacterKills :character="character" />
                    </div>
                </template>

                <template #losses>
                    <div class="tab-content">
                        <CharacterLosses :character="character" />
                    </div>
                </template>

                <template #combined>
                    <div class="tab-content">
                        <CharacterCombined :character="character" />
                    </div>
                </template>

                <template #battles>
                    <div class="tab-content">
                        <CharacterBattles />
                    </div>
                </template>

                <template #corporation-history>
                    <div class="tab-content">
                        <CharacterCorporationHistory />
                    </div>
                </template>

                <template #stats>
                    <div class="tab-content">
                        <CharacterStats />
                    </div>
                </template>
            </Tabs>
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
        <UCard v-else
            class="mx-auto p-4 text-center bg-gray-100 bg-opacity-90 dark:bg-gray-900 dark:bg-opacity-30 text-gray-900 dark:text-white">
            <template #header>
                <div class="flex justify-center mb-2">
                    <UIcon name="i-lucide-alert-triangle" class="text-amber-500 h-8 w-8" />
                </div>
                <h3 class="text-lg font-medium text-center">{{ t('character.notFound') }}</h3>
            </template>
            <p>{{ t('character.characterDoesNotExist') }}</p>
            <template #footer>
                <div class="flex justify-center">
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
import { addYears, differenceInDays, format, formatDistanceToNow } from "date-fns";
import { de, enUS, es, fr, ja, ko, ru, zhCN } from "date-fns/locale";
import { computed, onMounted, ref, watch } from 'vue';
import { useI18n } from "vue-i18n";
import type { ICharacter } from '~/server/interfaces/ICharacter';

const { t, locale } = useI18n();
const currentLocale = computed(() => locale.value);
const route = useRoute();
const router = useRouter();
const { id } = route.params;
const { generateCharacterStructuredData } = useStructuredData();

const tabItems = [
    {
        id: "dashboard",
        label: t("dashboard"),
        icon: "i-lucide-layout-dashboard",
        slot: "dashboard" as const,
    },
    {
        id: "kills",
        label: t("kills"),
        icon: "i-lucide-trophy",
        slot: "kills" as const,
    },
    {
        id: "losses",
        label: t("losses"),
        icon: "i-lucide-skull",
        slot: "losses" as const,
    },
    {
        id: "combined",
        label: t("combined"),
        icon: "i-lucide-layers",
        slot: "combined" as const,
    },
    {
        id: "battles",
        label: t("battles"),
        icon: "i-lucide-swords",
        slot: "battles" as const,
    },
    {
        id: "corporation-history",
        label: t("corporationHistory"),
        icon: "i-lucide-history",
        slot: "corporation-history" as const,
    },
    {
        id: "stats",
        label: t("stats"),
        icon: "i-lucide-bar-chart",
        slot: "stats" as const,
    },
] satisfies TabsItem[];

const activeTabId = ref(tabItems[0].id); // Default to the first tab's ID

// Watch for changes in route.hash to update activeTabId
watch(() => route.hash, (newHash) => {
    const hashValue = newHash.slice(1);
    if (hashValue && tabItems.some(item => item.id === hashValue)) {
        activeTabId.value = hashValue;
    } else if (!hashValue && tabItems.length > 0) {
        // If hash is empty or invalid, just set the active tab without updating URL
        activeTabId.value = tabItems[0].id;
    }
}, { immediate: true });

// Update URL only when activeTabId changes due to user interaction
watch(activeTabId, (newTabId, oldTabId) => {
    // Only update the URL if:
    // 1. This isn't the initial value (oldTabId exists)
    // 2. There was an actual change (newTabId !== oldTabId)
    // 3. The URL doesn't already have this hash
    // 4. Either: there's already a hash in the URL, OR the new tab isn't the default
    if (oldTabId &&
        newTabId !== oldTabId &&
        route.hash !== `#${newTabId}` &&
        (route.hash || newTabId !== tabItems[0].id)) {
        router.push({ hash: `#${newTabId}` });
    }
});

// Ensure correct tab is selected on page load without changing URL
onMounted(() => {
    const currentHash = route.hash.slice(1);
    const isValidHash = tabItems.some(item => item.id === currentHash);

    if (isValidHash) {
        activeTabId.value = currentHash;
    } else if (tabItems.length > 0) {
        activeTabId.value = tabItems[0].id;
    }
});

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

const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return formatDistanceToNow(date, {
        addSuffix: true,
        locale: dateLocales[currentLocale.value] || enUS,
    });
};

// Format date with exact date format
const formatExactDate = (dateString: string) => {
    const date = new Date(dateString);
    return format(date, 'MMM d, yyyy', {
        locale: dateLocales[currentLocale.value] || enUS,
    });
};

// Calculate character age in years
const calculateAge = (birthday: string) => {
    const birthDate = new Date(birthday);
    const today = new Date();

    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();

    // Adjust age if birthday hasn't occurred yet this year
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
    }

    return age;
};

// Format next birthday date
const formatNextBirthday = (birthday: string) => {
    const birthDate = new Date(birthday);
    const today = new Date();

    // Get this year's birthday
    const thisYearBirthday = new Date(
        today.getFullYear(),
        birthDate.getMonth(),
        birthDate.getDate()
    );

    // If this year's birthday has passed, get next year's
    const nextBirthday = today > thisYearBirthday
        ? addYears(thisYearBirthday, 1)
        : thisYearBirthday;

    return format(nextBirthday, 'MMM d, yyyy', {
        locale: dateLocales[currentLocale.value] || enUS,
    });
};

// Calculate days until next birthday
const getDaysUntilBirthday = (birthday: string) => {
    const birthDate = new Date(birthday);
    const today = new Date();

    // Get this year's birthday
    const thisYearBirthday = new Date(
        today.getFullYear(),
        birthDate.getMonth(),
        birthDate.getDate()
    );

    // If this year's birthday has passed, get next year's
    const nextBirthday = today > thisYearBirthday
        ? addYears(thisYearBirthday, 1)
        : thisYearBirthday;

    // Calculate difference in days
    return differenceInDays(nextBirthday, today);
};

const fetchKey = computed(() => `character-${id}`);

const {
    data: characterData,
    pending,
    error,
    refresh,
} = useFetch<ICharacter | { error: string } | null>(`/api/characters/${id}`, {
    key: fetchKey.value,
    watch: [() => route.params.id],
});

const character = computed(() => {
    if (characterData.value && !('error' in characterData.value)) {
        return characterData.value as ICharacter;
    }
    return null;
});

interface IShortStats {
    kills: number;
    losses: number;
    iskKilled: number;
    iskLost: number;
    npcLosses: number;
    soloKills: number;
    soloLosses: number;
    lastActive: string | null;
}

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

const validShortStats = computed(() => {
    if (shortStatsData.value && !('error' in shortStatsData.value)) {
        return shortStatsData.value as IShortStats;
    }
    return null;
});

// Generate structured data when character is loaded
watch(character, (newCharacter) => {
    if (newCharacter) {
        const characterUrl = `https://eve-kill.com${route.fullPath}`;
        generateCharacterStructuredData(newCharacter, characterUrl, validShortStats.value);
    }
}, { immediate: true });

useSeoMeta({
    title: computed(() => {
        const char = character.value as any;
        return char?.name ? `${char.name}` : t("character.characterPage");
    }),
    description: computed(() => {
        const char = character.value as any;
        return char?.name && char?.corporation_name
            ? t("characterMetaDescription", {
                name: char.name,
                corporation: char.corporation_name,
                alliance: char.alliance_name || t("noAlliance"),
            })
            : t("characterDefaultDescription", { id: id });
    }),
    ogImage: computed(() => {
        const char = character.value as any;
        return char?.character_id
            ? `https://images.eve-kill.com/characters/${char.character_id}/portrait?size=256`
            : "/images/default-og.png";
    }),
});

const formatNumber = (value: number): string => {
    return value?.toLocaleString() || "0";
};

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

const calcEfficiency = (stats: IShortStats | null): string => {
    if (!stats) return "0";
    const { kills = 0, losses = 0 } = stats;
    if (kills === 0 && losses === 0) return "0";
    return ((kills / (kills + losses)) * 100).toFixed(1);
};

const calcIskEfficiency = (stats: IShortStats | null): string => {
    if (!stats) return "0";
    const { iskKilled = 0, iskLost = 0 } = stats;
    if (iskKilled === 0 && iskLost === 0) return "0";
    return ((iskKilled / (iskKilled + iskLost)) * 100).toFixed(1);
};

const calcSoloKillRatio = (stats: IShortStats | null): string => {
    if (!stats) return "0";
    const { kills = 0, soloKills = 0 } = stats;
    if (kills === 0) return "0";
    return ((soloKills / kills) * 100).toFixed(1);
};

const calcSoloEfficiency = (stats: IShortStats | null): string => {
    if (!stats) return "0";
    const { soloKills = 0, soloLosses = 0 } = stats;
    if (soloKills === 0 && soloLosses === 0) return "0";
    return ((soloKills / (soloKills + soloLosses)) * 100).toFixed(1);
};

const calcNpcLossRatio = (stats: IShortStats | null): string => {
    if (!stats) return "0";
    const { losses = 0, npcLosses = 0 } = stats;
    if (losses === 0) return "0";
    return ((npcLosses / losses) * 100).toFixed(1);
};

const calcAvgKillsPerDay = (stats: IShortStats | null, birthday: Date): string => {
    if (!stats || !stats.lastActive) return "0";
    const characterAge = new Date(birthday).getTime();
    console.log(characterAge);
    //const characterAge = new Date().getTime() - new Date(stats.lastActive).getTime();
    const daysActive = Math.max(1, Math.ceil(characterAge / (1000 * 60 * 60 * 24)));
    console.log(daysActive);
    return (stats.kills / daysActive).toFixed(1);
};

/**
 * Calculate a decay factor based on time since last activity
 * Returns a value between 0 and 1, where:
 * - 1 = fully active (active today)
 * - Values decreasing toward 0 as inactivity time increases
 */
function calculateActivityDecay(lastActiveDate: string | null): number {
    if (!lastActiveDate) return 0; // No activity data means no activity

    const now = new Date();
    const lastActive = new Date(lastActiveDate);

    // Get days since last activity
    const daysSinceActive = Math.max(0, Math.floor((now.getTime() - lastActive.getTime()) / (1000 * 60 * 60 * 24)));

    // Decay function parameters
    // - Full activity (100%) for up to 7 days of inactivity
    // - Linear decay from day 7 to day 90 (3 months)
    // - Below 25% after 90 days
    // - Below 10% after 180 days (6 months)
    // - Minimum 5% after 365 days (1 year)

    if (daysSinceActive <= 7) {
        return 1; // Full activity if active within the last week
    } else if (daysSinceActive <= 90) {
        // Linear decay from 100% to 25% between 7 and 90 days
        return 1 - (0.75 * (daysSinceActive - 7) / (90 - 7));
    } else if (daysSinceActive <= 180) {
        // Linear decay from 25% to 10% between 90 and 180 days
        return 0.25 - (0.15 * (daysSinceActive - 90) / (180 - 90));
    } else if (daysSinceActive <= 365) {
        // Linear decay from 10% to 5% between 180 and 365 days
        return 0.10 - (0.05 * (daysSinceActive - 180) / (365 - 180));
    } else {
        // Bottom 1% for anything over a year
        return 0.01;
    }
}

/**
 * Enhanced getActivityLevel that incorporates time decay
 */
const getActivityLevel = (stats: IShortStats | null): string => {
    if (!stats) return t("activityLevel.inactive");

    const { kills = 0, losses = 0 } = stats;
    const total = kills + losses;

    // Calculate decay factor based on last activity
    const activityDecay = calculateActivityDecay(stats.lastActive);

    // Apply decay to the total activities
    const decayedTotal = Math.round(total * activityDecay);

    // Return activity level based on decayed total
    if (decayedTotal > 1000) return t("activityLevel.veryHigh");
    if (decayedTotal > 500) return t("activityLevel.high");
    if (decayedTotal > 100) return t("activityLevel.medium");
    if (decayedTotal > 10) return t("activityLevel.low");
    return t("activityLevel.minimal");
};

/**
 * Get a CSS class for coloring the activity level text
 */
const getActivityClassColor = (stats: IShortStats | null): string => {
    if (!stats) return "text-gray-400";

    const activityLevel = getActivityLevel(stats);

    switch (activityLevel) {
        case t("activityLevel.veryHigh"): return "text-green-600 dark:text-green-400";
        case t("activityLevel.high"): return "text-green-500 dark:text-green-300";
        case t("activityLevel.medium"): return "text-yellow-600 dark:text-yellow-300";
        case t("activityLevel.low"): return "text-orange-600 dark:text-orange-300";
        case t("activityLevel.minimal"): return "text-red-600 dark:text-red-300";
        default: return "text-gray-600 dark:text-gray-400";
    }
};

/**
 * Modified danger ratio calculation that includes time decay
 */
const calcDangerRatio = (stats: IShortStats | null): string => {
    if (!stats) return "0";

    const { kills = 0, losses = 0 } = stats;
    if (kills === 0 && losses === 0) return "0";

    // Base danger ratio
    const baseRatio = (kills / (kills + losses)) * 100;

    // Apply activity decay to the ratio
    const activityDecay = calculateActivityDecay(stats.lastActive);
    const decayedRatio = baseRatio * activityDecay;

    return decayedRatio.toFixed(1);
};

/**
 * Get a CSS class for coloring the danger ratio text
 */
const getDangerClassColor = (stats: IShortStats | null): string => {
    if (!stats) return "text-gray-600 dark:text-gray-400";

    const dangerRatio = parseFloat(calcDangerRatio(stats));

    // Color based on danger ratio
    if (dangerRatio >= 80) return "text-green-600 dark:text-green-400";
    if (dangerRatio >= 60) return "text-green-500 dark:text-green-300";
    if (dangerRatio >= 40) return "text-yellow-600 dark:text-yellow-300";
    if (dangerRatio >= 20) return "text-orange-600 dark:text-orange-300";
    return "text-red-600 dark:text-red-300";
};

const getSecurityStatusStyle = (securityStatus: number) => {
    const normalizedValue = (securityStatus + 10) / 20;
    const r = normalizedValue < 0.5
        ? 255
        : Math.round(255 - (normalizedValue - 0.5) * 510);
    const g = normalizedValue > 0.5
        ? 255
        : Math.round(normalizedValue * 510);
    const b = 0;
    const backgroundColor = `rgb(${r}, ${g}, ${b})`;
    const brightness = (r * 299 + g * 587 + b * 114) / 1000;
    const textColor = brightness > 125 ? '#000000' : '#ffffff';
    return {
        background: backgroundColor,
        color: textColor,
        fontWeight: 'bold',
    };
};

const getSecurityStatusColor = (securityStatus: number): string => {
    if (securityStatus >= 0.5) return "#00FF00";
    if (securityStatus >= 0.0) return "#FFFF00";
    if (securityStatus >= -5.0) return "#FF8C00";
    return "#FF0000";
};
</script>

<style>
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

/* New styles for the character header */
.character-header {
    position: relative;
    overflow: hidden;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
}

.character-portrait-container {
    position: relative;
    display: flex;
    justify-content: center;
}

.character-portrait {
    width: 164px;
    height: 164px;
    object-fit: cover;
}

/* Updated security status indicator to match race/bloodline positioning */
.security-status-indicator {
    position: absolute;
    bottom: 5px;
    /* Position inside the portrait */
    right: 5px;
    /* Position inside the portrait */
    padding: 4px 8px;
    border-radius: 6px;
    /* Match race/bloodline radius */
    font-size: 0.75rem;
    /* Match race/bloodline size */
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
    border: 1px solid rgba(255, 255, 255, 0.2);
    min-width: 60px;
    text-align: center;
    z-index: 10;
    /* Ensure it appears above the image */
}

/* Updated styles for race and bloodline indicators with fixed positioning */
.race-indicator,
.bloodline-indicator {
    position: absolute;
    left: 5px;
    /* Position inside the portrait instead of outside */
    padding: 4px 8px;
    border-radius: 6px;
    font-size: 0.75rem;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
    border: 1px solid;
    min-width: 60px;
    text-align: center;
    transition: background-color 0.2s ease, color 0.2s ease, border-color 0.2s ease;
    z-index: 10;
    /* Ensure they appear above the image */
    /* Force opaque backgrounds that override Tailwind's transparent classes */
    background-color: #f3f4f6 !important;
    /* Light mode - solid gray-100 */
}

.race-indicator {
    bottom: 5px;
    /* Position inside the portrait */
}

.bloodline-indicator {
    bottom: 40px;
    /* Stack above race indicator with enough separation */
}

/* Dark mode override */
@media (prefers-color-scheme: dark) {

    .race-indicator,
    .bloodline-indicator {
        background-color: #111827 !important;
        /* Dark mode - solid gray-900 */
    }
}

/* Responsive adjustments for race/bloodline indicators */
@media (max-width: 768px) {

    .race-indicator,
    .bloodline-indicator {
        font-size: 0.7rem;
        padding: 3px 6px;
        min-width: 50px;
    }

    .race-indicator {
        bottom: 5px;
    }

    .bloodline-indicator {
        bottom: 35px;
        /* Slightly closer on mobile */
    }
}

/* Stat card styles with light/dark mode support */
.stat-card {
    border-radius: 8px;
    border: 1px solid rgba(209, 213, 219, 0.5);
    padding: 16px;
}

@media (prefers-color-scheme: dark) {
    .stat-card {
        border-color: rgba(75, 85, 99, 0.3);
    }
}

.stat-header {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 12px;
    padding-bottom: 8px;
    border-bottom: 1px solid rgba(209, 213, 219, 0.5);
}

@media (prefers-color-scheme: dark) {
    .stat-header {
        border-color: rgba(75, 85, 99, 0.2);
    }
}

.stat-icon {
    width: 20px;
    height: 20px;
}

.stat-title {
    font-weight: 600;
    font-size: 0.95rem;
}

.stat-label {
    font-size: 0.85rem;
}

.stat-value {
    font-weight: 500;
    font-size: 0.95rem;
}

/* Style for stat rows to ensure horizontal alignment */
.stat-body {
    display: flex;
    flex-direction: column;
    gap: 8px;
}

.stat-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
}

/* Updated activity info styling for horizontal layout */
.activity-info {
    display: flex;
    flex-direction: column;
    min-width: 220px;
}

.activity-info .activity-item {
    display: flex;
    flex-direction: row;
    align-items: center;
    margin-bottom: 0.5rem;
}

.activity-item div {
    white-space: normal;
}

/* Responsive adjustments */
@media (max-width: 768px) {
    .affiliation-logos {
        justify-content: flex-start;
        margin-top: 1rem;
    }

    .character-portrait {
        width: 128px;
        height: 128px;
    }

    .activity-info {
        margin-top: 1rem;
        margin-bottom: 1rem;
        width: 100%;
    }

    .activity-info .activity-item {
        flex-direction: row;
        align-items: center;
        flex-wrap: wrap;
    }
}
</style>
