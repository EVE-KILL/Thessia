<template>
    <div class="min-h-screen">
        <div v-if="alliance" class="mx-auto p-4 text-white">
            <!-- Alliance Profile Header -->
            <UCard class="mb-4 bg-black bg-opacity-30 dark:bg-gray-900 dark:bg-opacity-30">
                <div class="flex flex-col md:flex-row items-start gap-4">
                    <!-- Left: Alliance logo -->
                    <div class="flex flex-col md:flex-row items-center gap-4">
                        <div class="relative">
                            <Image type="alliance" :id="alliance.alliance_id" :alt="`Alliance: ${alliance.name}`"
                                class="rounded-full w-32 h-32 md:w-48 md:h-48 lg:w-64 lg:h-64" format="webp"
                                size="256" />
                        </div>
                    </div>
                    <!-- Right: Alliance info and stats -->
                    <div class="flex-grow w-full md:w-auto">
                        <div class="flex flex-col md:flex-row w-full">
                            <!-- Alliance basic info -->
                            <div class="md:w-1/3 mb-4 md:mb-0">
                                <h1 class="text-xl md:text-2xl font-bold">{{ alliance.name }}</h1>
                                <div class="text-gray-300">{{ alliance.ticker }}</div>
                                <div v-if="!shortStatsLoading && validShortStats?.lastActive"
                                    class="text-gray-400 text-sm mt-1">
                                    {{ $t('lastActive') }}: {{ formatDate(validShortStats.lastActive) }}
                                </div>
                            </div>
                            <!-- Alliance stats -->
                            <div class="md:flex-grow grid grid-cols-1 md:grid-cols-2 gap-4">
                                <UCard v-if="shortStatsLoading"
                                    class="col-span-2 h-32 flex items-center justify-center bg-black bg-opacity-20">
                                    <UIcon name="i-lucide-loader-2" class="animate-spin text-gray-400" size="lg" />
                                    <span class="ml-2 text-gray-400">{{ $t('loading') }}</span>
                                </UCard>
                                <template v-else-if="validShortStats">
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
                <template #stats>
                    <div class="tab-content">
                        <AllianceStats />
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
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import AllianceCombined from '~/src/theme/modern/components/alliance/AllianceCombined.vue'
import AllianceKills from '~/src/theme/modern/components/alliance/AllianceKills.vue'
import AllianceLosses from '~/src/theme/modern/components/alliance/AllianceLosses.vue'
import AllianceCorporationMembers from '~/src/theme/modern/components/alliance/AllianceCorporationMembers.vue'
import AllianceCharacterMembers from '~/src/theme/modern/components/alliance/AllianceCharacterMembers.vue'
import AllianceStats from '~/src/theme/modern/components/alliance/AllianceStats.vue'

const { t, locale } = useI18n()
const route = useRoute()
const router = useRouter()
const allianceId = route.params.id

const { data: alliance, pending, error } = await useFetch(`/api/alliances/${allianceId}`, {
    timeout: 10000, // 10 second timeout
    onResponseError(context) {
        console.error('Error fetching alliance data:', context.error)
        return { error: 'Failed to fetch alliance data' }
    }
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

const { data: shortStatsData, pending: shortStatsLoading } = await useFetch<IShortStats | { error: string } | null>(
    `/api/alliances/${allianceId}/shortstats`,
    {
        timeout: 5000, // 5 second timeout
        onResponseError(context) {
            console.error('Error fetching alliance short stats:', context.error)
            return { error: 'Failed to fetch alliance stats' }
        }
    }
)

const validShortStats = computed(() => {
    if (shortStatsData.value && !('error' in shortStatsData.value)) {
        return shortStatsData.value as IShortStats;
    }
    return null;
})

const tabItems = [
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
        id: "stats",
        label: t("stats"),
        icon: "i-lucide-bar-chart",
        slot: "stats" as const,
    },
]

const activeTab = ref(route.query.tab?.toString() || "kills")

const getInitialTabIndex = () => {
    const tab = route.query.tab as string;
    const index = tabItems.findIndex((item) => item.id === tab);
    return index >= 0 ? index : 0;
};

const handleTabChange = (tabId: string) => {
    activeTab.value = tabId;
    router.replace({
        query: {
            ...route.query,
            tab: tabId,
        },
    });
};

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

const calcDangerRatio = (stats: IShortStats | null): string => {
    if (!stats) return "0";
    const { kills = 0, losses = 0 } = stats;
    if (kills === 0 && losses === 0) return "0";
    const ratio = (kills / (kills + losses)) * 100;
    return ratio.toFixed(1);
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
</style>
