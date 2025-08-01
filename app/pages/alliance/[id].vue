<template>
    <div class="min-h-screen">
        <!-- Always show loading until both hydrated AND data is ready -->
        <div v-if="pending || !alliance" class="mx-auto p-4">
            <USkeleton class="h-64 rounded-lg mb-4" />
            <USkeleton class="h-8 w-64 mb-6" />
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                <USkeleton v-for="i in 6" :key="i" class="h-32 rounded-lg" />
            </div>
        </div>

        <!-- Main content - only show when data is ready -->
        <div v-else-if="alliance" class="mx-auto p-4 text-gray-900 dark:text-white">
            <!-- Alliance Profile Header -->
            <div
                class="alliance-header rounded-lg overflow-hidden mb-6 bg-gray-100 bg-opacity-90 dark:bg-gray-900 dark:bg-opacity-30 border border-gray-300 dark:border-gray-800">
                <div class="p-6">
                    <div class="flex flex-col md:flex-row items-start gap-6">
                        <!-- Left: Alliance logo -->
                        <div class="alliance-logo-container">
                            <div class="relative">
                                <Image type="alliance" :id="alliance.alliance_id" :alt="`Alliance: ${alliance.name}`"
                                    class="alliance-logo rounded-lg shadow-lg" size="256" />
                            </div>
                        </div>

                        <!-- Right: Alliance details -->
                        <div class="flex-grow flex flex-col md:flex-row">
                            <!-- Alliance info -->
                            <div class="alliance-info md:mr-6 mb-4 md:mb-0 w-full md:w-1/3">
                                <!-- Updated to show name and ticker together -->
                                <h1 class="text-2xl md:text-3xl font-bold mb-2 text-gray-900 dark:text-white">
                                    {{ alliance.name }} <span class="text-gray-600 dark:text-gray-400">[{{
                                        alliance.ticker }}]</span>
                                </h1>

                                <!-- Added corporation and member counts here -->
                                <div v-if="alliance.corporation_count !== undefined"
                                    class="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                                    <UIcon name="i-lucide-building" class="w-4 h-4" />
                                    {{ $t('corporations') }}: {{ formatNumber(alliance.corporation_count) }}
                                </div>

                                <div v-if="alliance.member_count !== undefined"
                                    class="flex items-center gap-2 text-gray-700 dark:text-gray-300 mb-3">
                                    <UIcon name="i-lucide-users" class="w-4 h-4" />
                                    {{ $t('members') }}: {{ formatNumber(alliance.member_count) }}
                                </div>

                                <!-- Additional info -->
                                <div class="info-items space-y-3">
                                    <div v-if="alliance.faction_id && alliance.faction_name"
                                        class="flex items-center gap-2 text-gray-800 dark:text-gray-200">
                                        <Image type="corporation" :id="alliance.faction_id" class="w-4 h-4 rounded-full"
                                            size="64" />
                                        <span>{{ $t('faction.title') }}:</span>
                                        <NuxtLink :to="`/faction/${alliance.faction_id}`"
                                            class="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                                            {{ alliance.faction_name }}
                                        </NuxtLink>
                                    </div>

                                    <div v-if="!shortStatsLoading && validShortStats?.lastActive"
                                        class="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                                        <UIcon name="i-lucide-clock" class="w-4 h-4" />
                                        {{ $t('lastActive') }}: {{ formatDate(validShortStats.lastActive) }}
                                    </div>
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

                            <!-- Organization Stats -->
                            <div class="stat-card">
                                <div class="stat-header">
                                    <UIcon name="i-lucide-bar-chart-2" class="stat-icon text-purple-500" />
                                    <h3 class="stat-title text-gray-700 dark:text-gray-200">{{ $t('otherMetrics') }}
                                    </h3>
                                </div>
                                <div class="stat-body">
                                    <div class="stat-row">
                                        <div class="stat-label text-gray-600 dark:text-gray-400">{{ $t('corporations')
                                        }}</div>
                                        <div class="stat-value text-gray-900 dark:text-white">{{
                                            formatNumber(alliance.corporation_count || 0) }}</div>
                                    </div>
                                    <div class="stat-row">
                                        <div class="stat-label text-gray-600 dark:text-gray-400">{{ $t('members') }}
                                        </div>
                                        <div class="stat-value text-gray-900 dark:text-white">{{
                                            formatNumber(alliance.member_count || 0) }}</div>
                                    </div>
                                    <div class="stat-row">
                                        <div class="stat-label text-gray-600 dark:text-gray-400">{{ $t('npcLosses') }}
                                        </div>
                                        <div class="stat-value text-gray-900 dark:text-white">{{
                                            formatNumber(validShortStats.npcLosses) }}</div>
                                    </div>
                                    <div class="stat-label text-gray-600 dark:text-gray-400">{{ $t('lastActive') }}
                                    </div>
                                    <div class="stat-value text-gray-900 dark:text-white">
                                        {{ validShortStats.lastActive ? formatDate(validShortStats.lastActive) :
                                            $t('unknown') }}
                                    </div>
                                </div>
                            </div>
                        </template>
                    </div>
                </div>
            </div>

            <!-- Tabs Navigation -->
            <Tabs :items="tabItems" v-model="activeTabId" class="space-y-4">
                <template #kills>
                    <div class="tab-content">
                        <AllianceKills :alliance="alliance" />
                    </div>
                </template>
                <template #losses>
                    <div class="tab-content">
                        <AllianceLosses :alliance="alliance" />
                    </div>
                </template>
                <template #combined>
                    <div class="tab-content">
                        <AllianceCombined :alliance="alliance" />
                    </div>
                </template>
                <template #corporationMembers>
                    <div class="tab-content">
                        <AllianceCorporationMembers :alliance="alliance" />
                    </div>
                </template>
                <template #characterMembers>
                    <div class="tab-content">
                        <AllianceCharacterMembers :alliance="alliance" />
                    </div>
                </template>
                <template #top>
                    <div class="tab-content">
                        <AllianceTop />
                    </div>
                </template>
                <template #stats>
                    <div class="tab-content">
                        <AllianceStats :alliance="alliance" />
                    </div>
                </template>
                <template #battles>
                    <div class="tab-content">
                        <AllianceBattles />
                    </div>
                </template>
                <template #dashboard>
                    <div class="tab-content">
                        <AllianceDashboard :alliance="alliance" />
                    </div>
                </template>
            </Tabs>
        </div>

        <!-- Error State -->
        <UCard v-else-if="error || (alliance && 'error' in alliance)"
            class="mx-auto p-4 text-center bg-gray-100 bg-opacity-90 dark:bg-gray-900 dark:bg-opacity-30 text-gray-900 dark:text-white">
            <template #header>
                <div class="flex justify-center mb-2">
                    <UIcon name="i-lucide-alert-triangle" class="text-amber-500 h-8 w-8" />
                </div>
                <h3 class="text-lg font-medium text-center">{{ t('alliance.notFound') }}</h3>
            </template>
            <p>{{ t('alliance.allianceDoesNotExist') }}</p>
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
import { formatDistanceToNow } from "date-fns";
import { de, enUS, es, fr, ja, ko, ru, zhCN } from "date-fns/locale";
import { computed, nextTick, onMounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute, useRouter } from 'vue-router';

const { t, locale } = useI18n()
const route = useRoute()
const router = useRouter()
const allianceId = route.params.id
const { generateAllianceStructuredData } = useStructuredData();

// For hydration safety
const isClient = ref(false);

onMounted(() => {
    isClient.value = true;

    nextTick(() => {
        const currentHash = route.hash.slice(1);
        console.log('onMounted - currentHash:', currentHash);

        if (currentHash && tabItems.value.some(item => item.id === currentHash)) {
            console.log('onMounted - setting activeTabId to hash:', currentHash);
            activeTabId.value = currentHash;
        }
    });
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

const currentLocale = computed(() => locale.value);

// Updated formatDate function to match character page
const formatDate = (dateString: string) => {
    if (!dateString) return t('unknown');
    const date = new Date(dateString);
    return formatDistanceToNow(date, {
        addSuffix: true,
        locale: dateLocales[currentLocale.value] || enUS,
    });
};

const fetchKey = computed(() => `alliance-${allianceId}`);

const { data: alliance, pending, error } = useAsyncData(fetchKey.value, () =>
    $fetch(`/api/alliances/${allianceId}`), {
    lazy: true,
    server: true,
    watch: [() => route.params.id],
});

// SEO meta for alliance page
useSeoMeta({
    title: computed(() => {
        const a = alliance.value as any
        return a?.name && a?.ticker
            ? t('seo.alliance.title', { allianceName: a.name, ticker: a.ticker })
            : t("alliance.alliancePage")
    }),
    description: computed(() => {
        const a = alliance.value as any
        return a?.name && a?.ticker
            ? t('seo.alliance.description', { allianceName: a.name, ticker: a.ticker })
            : t("allianceDefaultDescription", { id: allianceId })
    }),
    ogTitle: computed(() => {
        const a = alliance.value as any
        return a?.name && a?.ticker
            ? t('seo.alliance.title', { allianceName: a.name, ticker: a.ticker })
            : t("alliance.alliancePage")
    }),
    ogDescription: computed(() => {
        const a = alliance.value as any
        return a?.name && a?.ticker
            ? t('seo.alliance.description', { allianceName: a.name, ticker: a.ticker })
            : t("allianceDefaultDescription", { id: allianceId })
    }),
    ogImage: computed(() => {
        const a = alliance.value as any
        return a?.alliance_id
            ? `https://images.evetech.net/alliances/${a.alliance_id}/logo?size=512`
            : "/images/default-og.png"
    }),
    ogType: 'website',
    twitterCard: 'summary_large_image',
    twitterTitle: computed(() => {
        const a = alliance.value as any
        return a?.name && a?.ticker
            ? t('seo.alliance.title', { allianceName: a.name, ticker: a.ticker })
            : t("alliance.alliancePage")
    }),
    twitterDescription: computed(() => {
        const a = alliance.value as any
        return a?.name && a?.ticker
            ? t('seo.alliance.description', { allianceName: a.name, ticker: a.ticker })
            : t("allianceDefaultDescription", { id: allianceId })
    }),
    twitterImage: computed(() => {
        const a = alliance.value as any
        return a?.alliance_id
            ? `https://images.evetech.net/alliances/${a.alliance_id}/logo?size=512`
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

const {
    data: shortStatsData,
    pending: shortStatsLoading,
} = useAsyncData(`alliance-stats-${allianceId}`, () =>
    $fetch<IShortStats | { error: string } | null>(`/api/stats/alliance_id/${allianceId}?dataType=basic&days=0`), {
    lazy: true,
    server: true,
    watch: [() => route.params.id],
});

const validShortStats = computed(() => {
    if (shortStatsData.value && !('error' in shortStatsData.value)) {
        return shortStatsData.value as IShortStats;
    }
    return null;
})

// Generate structured data when alliance is loaded
watch(alliance, (newAlliance) => {
    if (!isClient.value) return; // Don't run until hydrated

    if (newAlliance) {
        try {
            const allianceUrl = `https://eve-kill.com${route.fullPath}`;
            generateAllianceStructuredData(newAlliance, allianceUrl, validShortStats.value);
        } catch (error) {
            console.warn('Failed to generate structured data:', error);
        }
    }
}, { immediate: true });

const tabItems = computed(() => [
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
        id: "corporationMembers",
        label: t("corporations"),
        icon: "i-lucide-building",
        slot: "corporationMembers" as const,
    },
    {
        id: "characterMembers",
        label: t("characters"),
        icon: "i-lucide-users",
        slot: "characterMembers" as const,
    },
    {
        id: "top",
        label: t("top"),
        icon: "i-lucide-trending-up",
        slot: "top" as const,
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
]);

// For SSR compatibility, always start with the default tab
// Hash-based initialization will happen after hydration
const activeTabId = ref<string>(tabItems.value[0]?.id || '');

// Watch for changes in route.hash to update activeTabId
watch(() => route.hash, (newHash) => {
    if (!isClient.value) return; // Don't run until hydrated

    const hashValue = newHash.slice(1);
    if (hashValue && tabItems.value.some(item => item.id === hashValue)) {
        activeTabId.value = hashValue;
    } else if (!hashValue && tabItems.value.length > 0) {
        // If hash is empty or invalid, just set the active tab without updating URL
        activeTabId.value = tabItems.value[0]?.id || '';
    }
}, { immediate: false }); // Don't run immediately to avoid conflicts with onMounted

// Update URL only when activeTabId changes due to user interaction
watch(activeTabId, (newTabId, oldTabId) => {
    if (!isClient.value) return; // Don't run until hydrated

    // Only update the URL if:
    // 1. This isn't the initial value (oldTabId exists)
    // 2. There was an actual change (newTabId !== oldTabId)
    // 3. The URL doesn't already have this hash
    // 4. Either: there's already a hash in the URL, OR the new tab isn't the default
    if (oldTabId &&
        newTabId !== oldTabId &&
        route.hash !== `#${newTabId}` &&
        (route.hash || newTabId !== (tabItems.value[0]?.id || ''))) {
        try {
            router.push({ hash: `#${newTabId}` });
        } catch (error) {
            console.warn('Failed to update hash:', error);
        }
    }
}, { flush: 'post' }); // Wait for DOM updates

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

    // Decay function parameters - even more gradual decay than corporation page
    // - Full activity (100%) for up to 21 days of inactivity (alliances inactive even less quickly)
    // - Linear decay from day 21 to day 150 (5 months)
    // - Below 35% after 150 days
    // - Below 20% after 270 days (9 months)
    // - Minimum 15% after 365 days (1 year)

    if (daysSinceActive <= 21) {
        return 1; // Full activity if active within the last three weeks
    } else if (daysSinceActive <= 150) {
        // Linear decay from 100% to 35% between 21 and 150 days
        return 1 - (0.65 * (daysSinceActive - 21) / (150 - 21));
    } else if (daysSinceActive <= 270) {
        // Linear decay from 35% to 20% between 150 and 270 days
        return 0.35 - (0.15 * (daysSinceActive - 150) / (270 - 150));
    } else if (daysSinceActive <= 365) {
        // Linear decay from 20% to 15% between 270 and 365 days
        return 0.20 - (0.05 * (daysSinceActive - 270) / (365 - 270));
    } else {
        // Bottom 15% for anything over a year
        return 0.15;
    }
}

const calcDangerRatio = (stats: IShortStats | null): string => {
    if (!stats) return "0";
    const { kills = 0, losses = 0 } = stats;
    if (kills === 0 && losses === 0) return "0";

    // Base danger ratio
    const baseRatio = (kills / (kills + losses)) * 100;

    // Apply activity decay to the ratio - even less aggressive than for corporations
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

/* Alliance header and indicator styling */
.alliance-header {
    position: relative;
    overflow: hidden;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
}

.alliance-logo-container {
    position: relative;
    display: flex;
    justify-content: center;
}

.alliance-logo {
    width: 164px;
    height: 164px;
    object-fit: cover;
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
}

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

.stat-title {
    font-weight: 600;
    font-size: 0.95rem;
}

.stat-label {
    font-size: 0.85rem;
}

.stat-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
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
