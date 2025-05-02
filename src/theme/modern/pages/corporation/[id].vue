<template>
  <div class="min-h-screen">
    <div v-if="corporation" class="mx-auto p-4 text-white">
      <!-- Corporation Profile Header -->
      <UCard class="mb-4 bg-black bg-opacity-30 dark:bg-gray-900 dark:bg-opacity-30">
        <div class="flex flex-col md:flex-row items-start gap-4">
          <!-- Left: Corporation logo -->
          <div class="flex flex-col md:flex-row items-center gap-4">
            <div class="relative">
              <Image type="corporation" :id="corporation.corporation_id" :alt="`Corporation: ${corporation.name}`"
                class="rounded-full w-32 h-32 md:w-48 md:h-48 lg:w-64 lg:h-64" format="webp" size="256" />
            </div>
            <!-- Alliance, Faction logos -->
            <div class="flex flex-row md:flex-col gap-2 mt-2 md:mt-0">
              <NuxtLink v-if="corporation.alliance_id" :to="`/alliance/${corporation.alliance_id}`" class="block">
                <Image type="alliance" :id="corporation.alliance_id" :alt="`Alliance: ${corporation.alliance_name}`"
                  class="rounded-full w-12 h-12 md:w-16 md:h-16" format="webp" size="64" />
              </NuxtLink>
              <NuxtLink v-if="corporation.faction_id" :to="`/faction/${corporation.faction_id}`" class="block">
                <Image type="corporation" :id="corporation.faction_id" :alt="`Faction: ${corporation.faction_name}`"
                  class="rounded-full w-12 h-12 md:w-16 md:h-16" format="webp" size="64" />
              </NuxtLink>
            </div>
          </div>
          <!-- Right: Corporation info and stats -->
          <div class="flex-grow w-full md:w-auto">
            <div class="flex flex-col md:flex-row w-full">
              <!-- Corporation basic info -->
              <div class="md:w-1/3 mb-4 md:mb-0">
                <h1 class="text-xl md:text-2xl font-bold">{{ corporation.name }}</h1>
                <div class="text-gray-300">{{ corporation.ticker }}</div>
                <NuxtLink v-if="corporation.alliance_id" :to="`/alliance/${corporation.alliance_id}`"
                  class="hover:underline text-gray-300 block">
                  {{ corporation.alliance_name }}
                </NuxtLink>
                <NuxtLink v-if="corporation.faction_id" :to="`/faction/${corporation.faction_id}`"
                  class="hover:underline text-gray-300 block">
                  {{ corporation.faction_name }}
                </NuxtLink>
                <div v-if="!shortStatsLoading && validShortStats?.lastActive" class="text-gray-400 text-sm mt-1">
                  {{ $t('lastActive') }}: {{ formatDate(validShortStats.lastActive) }}
                </div>
              </div>
              <!-- Corporation stats -->
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
                      <span class="text-white font-medium">{{ formatNumber(validShortStats.kills) }}</span>
                    </div>
                    <div class="flex justify-between">
                      <span class="text-gray-300">{{ $t('losses') }}:</span>
                      <span class="text-white font-medium">{{ formatNumber(validShortStats.losses) }}</span>
                    </div>
                    <div class="flex justify-between">
                      <span class="text-gray-300">{{ $t('isk') + ' ' + $t('killed') }}:</span>
                      <span class="text-white font-medium">{{ formatIsk(validShortStats.iskKilled) }}</span>
                    </div>
                    <div class="flex justify-between">
                      <span class="text-gray-300">{{ $t('isk') + ' ' + $t('lost') }}:</span>
                      <span class="text-white font-medium">{{ formatIsk(validShortStats.iskLost) }}</span>
                    </div>
                  </div>
                  <div class="space-y-1">
                    <div class="flex justify-between">
                      <span class="text-gray-300">{{ $t('npc') + ' ' + $t('losses') }}:</span>
                      <span class="text-white font-medium">{{ formatNumber(validShortStats.npcLosses) }}</span>
                    </div>
                    <div class="flex justify-between">
                      <span class="text-gray-300">{{ $t('solo') + ' ' + $t('kills') }}:</span>
                      <span class="text-white font-medium">{{ formatNumber(validShortStats.soloKills) }}</span>
                    </div>
                    <div class="flex justify-between">
                      <span class="text-gray-300">{{ $t('solo') + ' ' + $t('losses') }}:</span>
                      <span class="text-white font-medium">{{ formatNumber(validShortStats.soloLosses) }}</span>
                    </div>
                    <div class="flex justify-between">
                      <span class="text-gray-300">{{ $t('dangerRatio') }}:</span>
                      <span class="text-white font-medium">{{ calcDangerRatio(validShortStats) }}%</span>
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
import { computed, ref, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
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
  $fetch<IShortStats | { error: string } | null>(`/api/corporations/${corporationId}/shortstats`, {
    timeout: 5000,
  })
    .then(data => {
      shortStatsData.value = data
      shortStatsLoading.value = false
    })
    .catch(error => {
      console.error('Error fetching corporation short stats:', error)
      shortStatsLoading.value = false
      shortStatsData.value = { error: 'Failed to fetch corporation stats' }
    })
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
]

const activeTab = ref(route.query.tab?.toString() || "dashboard")

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
