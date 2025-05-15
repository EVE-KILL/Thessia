<template>
    <div class="min-h-screen">
        <div v-if="corporation" class="mx-auto p-4 text-gray-900 dark:text-white">
            <!-- Corporation Profile Header -->
            <div
                class="corporation-header rounded-lg overflow-hidden mb-6 bg-gray-100 bg-opacity-90 dark:bg-gray-900 dark:bg-opacity-30 border border-gray-300 dark:border-gray-800">
                <div class="p-6">
                    <div class="flex flex-col md:flex-row items-start gap-6">
                        <!-- Left: Corporation logo -->
                        <div class="corporation-logo-container">
                            <div class="relative">
                                <Image type="corporation" :id="corporation.corporation_id"
                                    :alt="`Corporation: ${corporation.name}`"
                                    class="corporation-logo rounded-lg shadow-lg" format="webp" size="256" />
                            </div>
                        </div>

                        <!-- Right: Corporation details -->
                        <div class="flex-grow flex flex-col md:flex-row">
                            <!-- Corporation info -->
                            <div class="corporation-info md:mr-6 mb-4 md:mb-0 w-full md:w-1/3">
                                <!-- Updated to show name and ticker together -->
                                <h1 class="text-2xl md:text-3xl font-bold mb-2 text-gray-900 dark:text-white">
                                    {{ corporation.name }} <span class="text-gray-600 dark:text-gray-400">[{{
                                        corporation.ticker }}]</span>
                                </h1>

                                <!-- Affiliations -->
                                <div class="affiliations space-y-3">
                                    <NuxtLink v-if="corporation.alliance_id && corporation.alliance_name"
                                        :to="`/alliance/${corporation.alliance_id}`"
                                        class="flex items-center gap-2 text-gray-800 dark:text-gray-200 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                                        <Image type="alliance" :id="corporation.alliance_id"
                                            class="w-6 h-6 rounded-full" format="webp" size="64" />
                                        {{ corporation.alliance_name }}
                                    </NuxtLink>

                                    <NuxtLink v-if="corporation.faction_id && corporation.faction_name"
                                        :to="`/faction/${corporation.faction_id}`"
                                        class="flex items-center gap-2 text-gray-800 dark:text-gray-200 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                                        <Image type="corporation" :id="corporation.faction_id"
                                            class="w-6 h-6 rounded-full" format="webp" size="64" />
                                        {{ corporation.faction_name }}
                                    </NuxtLink>

                                    <div v-if="!shortStatsLoading && validShortStats?.lastActive"
                                        class="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                                        <UIcon name="i-lucide-clock" class="w-4 h-4" />
                                        {{ $t('lastActive') }}: {{ formatDate(validShortStats.lastActive) }}
                                    </div>
                                </div>

                                <!-- Added member count here instead of on image -->
                                <div v-if="corporation.member_count !== undefined"
                                    class="flex items-center gap-2 text-gray-700 dark:text-gray-300 mb-3">
                                    <UIcon name="i-lucide-users" class="w-4 h-4" />
                                    {{ $t('members') }}: {{ formatNumber(corporation.member_count) }}
                                </div>
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
                                        <div class="stat-value text-gray-900 dark:text-white">
                                            {{ calcEfficiency(validShortStats) }}%
                                        </div>
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

                            <!-- ISK Stats -->
                            <div class="stat-card">
                                <div class="stat-header">
                                    <UIcon name="i-lucide-coins" class="stat-icon text-yellow-500" />
                                    <h3 class="stat-title text-gray-700 dark:text-gray-200">{{ $t('iskMetrics') }}</h3>
                                </div>
                                <div class="stat-body">
                                    <div class="stat-row">
                                        <div class="stat-label text-gray-600 dark:text-gray-400">{{ $t('iskKilled') }}
                                        </div>
                                        <div class="stat-value text-green-600 dark:text-green-400">{{
                                            formatIsk(validShortStats.iskKilled) }}</div>
                                    </div>
                                    <div class="stat-row">
                                        <div class="stat-label text-gray-600 dark:text-gray-400">{{ $t('iskLost') }}
                                        </div>
                                        <div class="stat-value text-red-600 dark:text-red-400">{{
                                            formatIsk(validShortStats.iskLost) }}</div>
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
                                        <div class="stat-value text-gray-900 dark:text-white">
                                            {{ calcSoloKillRatio(validShortStats) }}%
                                        </div>
                                    </div>
                                    <div class="stat-row">
                                        <div class="stat-label text-gray-600 dark:text-gray-400">{{ $t('soloEfficiency')
                                            }}</div>
                                        <div class="stat-value text-gray-900 dark:text-white">
                                            {{ calcSoloEfficiency(validShortStats) }}%
                                        </div>
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
                                        <div class="stat-value text-gray-900 dark:text-white">
                                            {{ validShortStats.losses > 0 ? ((validShortStats.npcLosses /
                                                validShortStats.losses) * 100).toFixed(1) : "0" }}%
                                        </div>
                                    </div>
                                    <div v-if="corporation.member_count" class="stat-row">
                                        <div class="stat-label text-gray-600 dark:text-gray-400">{{ $t('members') }}
                                        </div>
                                        <div class="stat-value text-gray-900 dark:text-white">{{
                                            corporation.member_count }}</div>
                                    </div>
                                    <div class="stat-row">
                                        <div class="stat-label text-gray-600 dark:text-gray-400">{{ $t('lastActive') }}
                                        </div>
                                        <div class="stat-value text-gray-900 dark:text-white">
                                            {{ validShortStats.lastActive ? formatDate(validShortStats.lastActive) :
                                                $t('unknown') }}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </template>
                    </div>
                </div>
            </div>

            <!-- Tabs Navigation -->
            <UTabs :items="tabItems" v-model="selectedTabIndex" class="space-y-4">
                <template #dashboard>
                    <div class="tab-content">
                        <CorporationDashboard :corporation="corporation" />
                    </div>
                </template>
                <template #kills>
                    <div class="tab-content">
                        <CorporationKills :corporation="corporation" />
                    </div>
                </template>
                <template #losses>
                    <div class="tab-content">
                        <CorporationLosses :corporation="corporation" />
                    </div>
                </template>
                <template #combined>
                    <div class="tab-content">
                        <CorporationCombined :corporation="corporation" />
                    </div>
                </template>
                <template #members>
                    <div class="tab-content">
                        <CorporationMembers :corporation="corporation" />
                    </div>
                </template>
                <template #stats>
                    <div class="tab-content">
                        <CorporationStats />
                    </div>
                </template>
                <template #battles>
                    <div class="tab-content">
                        <CorporationBattles />
                    </div>
                </template>
            </UTabs>
        </div>
        <div v-else-if="pending" class="mx-auto p-4">
            <USkeleton class="h-64 rounded-lg mb-4" />
            <USkeleton class="h-8 w-64 mb-6" />
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                <USkeleton v-for="i in 6" :key="i" class="h-32 rounded-lg" />
            </div>
        </div>
        <UCard v-else class="mx-auto p-4 text-center bg-black bg-opacity-30 dark:bg-gray-900 dark:bg-opacity-30">
            <template #header>
                <div class="flex justify-center mb-2">
                    <UIcon name="i-lucide-alert-triangle" class="text-amber-500 h-8 w-8" />
                </div>
                <h3 class="text-lg font-medium text-center">{{ t('corporation.notFound') }}</h3>
            </template>
            <p>{{ t('corporation.corporationDoesNotExist') }}</p>
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
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import CorporationBattles from '~/components/corporation/CorporationBattles.vue'
import CorporationCombined from '~/src/theme/modern/components/corporation/CorporationCombined.vue'
import CorporationDashboard from '~/src/theme/modern/components/corporation/CorporationDashboard.vue'
import CorporationKills from '~/src/theme/modern/components/corporation/CorporationKills.vue'
import CorporationLosses from '~/src/theme/modern/components/corporation/CorporationLosses.vue'
import CorporationMembers from '~/src/theme/modern/components/corporation/CorporationMembers.vue'
import CorporationStats from '~/src/theme/modern/components/corporation/CorporationStats.vue'

const { t, locale } = useI18n()
const route = useRoute()
const router = useRouter()
const corporationId = route.params.id

const { data: corporation, pending, error } = await useFetch(`/api/corporations/${corporationId}`)

// SEO meta for corporation page
useSeoMeta({
    title: computed(() => {
        const c = corporation.value as any
        return c?.name ? `${c.name}` : t("corporation.corporationPage")
    }),
    description: computed(() => {
        const c = corporation.value as any
        return c?.name && c?.ticker
            ? t("corporationMetaDescription", {
                name: c.name,
                ticker: c.ticker,
                alliance: c.alliance_name || t("noAlliance"),
            })
            : t("corporationDefaultDescription", { id: corporationId })
    }),
    ogImage: computed(() => {
        const c = corporation.value as any
        return c?.corporation_id
            ? `https://images.eve-kill.com/corporations/${c.corporation_id}/logo?size=256`
            : "/images/default-og.png"
    }),
})

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

const shortStatsLoading = ref(true)
const shortStatsData = ref<IShortStats | { error: string } | null>(null)

onMounted(() => {
    $fetch<IShortStats | { error: string } | null>(`/api/corporations/${corporationId}/shortstats`)
        .then(data => {
            shortStatsData.value = data
            shortStatsLoading.value = false
        })
        .catch(error => {
            console.error('Error fetching corporation short stats:', error)
            shortStatsLoading.value = false
            shortStatsData.value = { error: 'Failed to fetch corporation stats' }
        })

    // If no hash in URL, set to default tab
    if (!route.hash) {
        router.replace({
            path: route.path,
            hash: '#dashboard'
        }, { preserveState: true });
    }
})

const validShortStats = computed(() => {
    if (shortStatsData.value && !('error' in shortStatsData.value)) {
        return shortStatsData.value as IShortStats;
    }
    return null;
})

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
        id: "members",
        label: t("members"),
        icon: "i-lucide-users",
        slot: "members" as const,
    },
    {
        id: "stats",
        label: t("stats"),
        icon: "i-lucide-bar-chart",
        slot: "stats" as const,
    },
    {
        id: "battles",
        label: t("battles"),
        icon: "i-lucide-swords",
        slot: "battles" as const,
    },
]

const selectedTabIndex = computed({
    get() {
        // Get the hash from the URL (without the # symbol)
        const hash = route.hash.slice(1);

        // Find the index of the tab matching the hash
        const tabIndex = tabItems.findIndex(item => item.id === hash);

        // Return the index as a string or '0' if not found
        return tabIndex >= 0 ? String(tabIndex) : '0';
    },
    set(newIndex) {
        // Convert string index to number to safely access the tabItems array
        const index = parseInt(newIndex, 10);

        // Get the tab id from the tabItems array
        const tabId = tabItems[index]?.id || 'dashboard';

        // Update the URL with the hash
        router.push({
            path: `/corporation/${corporationId}`,
            hash: `#${tabId}`,
        });
    }
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

    // Decay function parameters - more gradual decay than character page
    // - Full activity (100%) for up to 14 days of inactivity (corporations inactive less quickly)
    // - Linear decay from day 14 to day 120 (4 months)
    // - Below 30% after 120 days
    // - Below 15% after 240 days (8 months)
    // - Minimum 10% after 365 days (1 year)

    if (daysSinceActive <= 14) {
        return 1; // Full activity if active within the last two weeks
    } else if (daysSinceActive <= 120) {
        // Linear decay from 100% to 30% between 14 and 120 days
        return 1 - (0.7 * (daysSinceActive - 14) / (120 - 14));
    } else if (daysSinceActive <= 240) {
        // Linear decay from 30% to 15% between 120 and 240 days
        return 0.3 - (0.15 * (daysSinceActive - 120) / (240 - 120));
    } else if (daysSinceActive <= 365) {
        // Linear decay from 15% to 10% between 240 and 365 days
        return 0.15 - (0.05 * (daysSinceActive - 240) / (365 - 240));
    } else {
        // Bottom 10% for anything over a year
        return 0.1;
    }
}

/**
 * Modified danger ratio calculation that includes time decay
 */
const calcDangerRatio = (stats: IShortStats | null): string => {
    if (!stats) return "0";

    const { kills = 0, losses = 0 } = stats;
    if (kills === 0 && losses === 0) return "0";

    // Base danger ratio
    const baseRatio = (kills / (kills + losses)) * 100;

    // Apply activity decay to the ratio - but less aggressive than for characters
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

const formatDate = (dateString: string) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toLocaleDateString(locale.value, {
        year: "numeric",
        month: "short",
        day: "numeric",
    });
};
</script>

<style>
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

/* Corporation header and indicator styling */
.corporation-header {
    position: relative;
    overflow: hidden;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
}

.corporation-logo-container {
    position: relative;
    display: flex;
    justify-content: center;
}

.corporation-logo {
    width: 164px;
    height: 164px;
    object-fit: cover;
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
}

/* Removed member-count style as we're not using it on the image anymore */

/* Stat card styles */
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

/* Animation for loading spinner */
.animate-spin {
    animation: spin 1s linear infinite;
}

@keyframes spin {
    to {
        transform: rotate(360deg);
    }
}
</style>
