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
              <Image
                type="character"
                :id="character.character_id"
                :alt="`Character: ${character.name}`"
                class="rounded-full w-32 h-32 md:w-48 md:h-48 lg:w-64 lg:h-64"
                format="webp"
                size="256"
              />
            </div>

            <!-- Corporation, Alliance, Faction logos -->
            <div class="flex flex-row md:flex-col gap-2 mt-2 md:mt-0">
              <NuxtLink :to="`/corporation/${character.corporation_id}`" class="block">
                <Image
                  type="corporation"
                  :id="character.corporation_id"
                  :alt="`Corporation: ${character.corporation_name}`"
                  class="rounded-full w-12 h-12 md:w-16 md:h-16"
                  format="webp"
                  size="64"
                />
              </NuxtLink>
              <NuxtLink
                v-if="character.alliance_id"
                :to="`/alliance/${character.alliance_id}`"
                class="block"
              >
                <Image
                  type="alliance"
                  :id="character.alliance_id"
                  :alt="`Alliance: ${character.alliance_name}`"
                  class="rounded-full w-12 h-12 md:w-16 md:h-16"
                  format="webp"
                  size="64"
                />
              </NuxtLink>
              <NuxtLink
                v-if="character.faction_id"
                :to="`/faction/${character.faction_id}`"
                class="block"
              >
                <Image
                  type="corporation"
                  :id="character.faction_id"
                  :alt="`Faction: ${character.faction_name}`"
                  class="rounded-full w-12 h-12 md:w-16 md:h-16"
                  format="webp"
                  size="64"
                />
              </NuxtLink>
            </div>
          </div>

          <!-- Right: Character info and stats -->
          <div class="flex-grow w-full md:w-auto">
            <div class="flex flex-col md:flex-row w-full">
              <!-- Character basic info -->
              <div class="md:w-1/3 mb-4 md:mb-0">
                <h1 class="text-xl md:text-2xl font-bold">{{ character.name }}</h1>
                <NuxtLink :to="`/corporation/${character.corporation_id}`" class="hover:underline text-gray-300">
                  {{ character.corporation_name }}
                </NuxtLink>
                <div v-if="character.title" class="text-gray-400 text-sm">
                  {{ character.title }}
                </div>
                <NuxtLink
                  v-if="character.alliance_id"
                  :to="`/alliance/${character.alliance_id}`"
                  class="hover:underline text-gray-300 block"
                >
                  {{ character.alliance_name }}
                </NuxtLink>
                <NuxtLink
                  v-if="character.faction_id"
                  :to="`/faction/${character.faction_id}`"
                  class="hover:underline text-gray-300 block"
                >
                  {{ character.faction_name }}
                </NuxtLink>
                <div class="text-gray-300 mt-1">
                  {{ $t('character.securityStatus') }}:
                  <span :style="{ color: getSecurityStatusColor(character.security_status) }">
                    {{ character.security_status.toFixed(3) }}
                  </span>
                </div>
                <div v-if="!shortStatsLoading && shortStats?.lastActive" class="text-gray-400 text-sm">
                  {{ $t('character.lastActive') }}: {{ formatDate(shortStats.lastActive) }}
                </div>
              </div>

              <!-- Character stats -->
              <div class="md:flex-grow grid grid-cols-1 md:grid-cols-2 gap-4">
                <!-- Stats loading state -->
                <UCard v-if="shortStatsLoading" class="col-span-2 h-32 flex items-center justify-center bg-black bg-opacity-20">
                  <UIcon name="i-lucide-loader-2" class="animate-spin text-gray-400" size="lg" />
                  <span class="ml-2 text-gray-400">{{ $t('common.loading') }}</span>
                </UCard>

                <!-- Stats data -->
                <template v-else>
                  <!-- Left stats column -->
                  <div class="space-y-1">
                    <div class="flex justify-between">
                      <span class="text-gray-300">{{ $t('character.kills') }}:</span>
                      <span class="text-white font-medium">{{ formatNumber(shortStats.kills) }}</span>
                    </div>
                    <div class="flex justify-between">
                      <span class="text-gray-300">{{ $t('character.losses') }}:</span>
                      <span class="text-white font-medium">{{ formatNumber(shortStats.losses) }}</span>
                    </div>
                    <div class="flex justify-between">
                      <span class="text-gray-300">{{ $t('character.iskKilled') }}:</span>
                      <span class="text-white font-medium">{{ formatIsk(shortStats.iskKilled) }}</span>
                    </div>
                    <div class="flex justify-between">
                      <span class="text-gray-300">{{ $t('character.iskLost') }}:</span>
                      <span class="text-white font-medium">{{ formatIsk(shortStats.iskLost) }}</span>
                    </div>
                  </div>

                  <!-- Right stats column -->
                  <div class="space-y-1">
                    <div class="flex justify-between">
                      <span class="text-gray-300">{{ $t('character.npcLosses') }}:</span>
                      <span class="text-white font-medium">{{ formatNumber(shortStats.npcLosses) }}</span>
                    </div>
                    <div class="flex justify-between">
                      <span class="text-gray-300">{{ $t('character.soloKills') }}:</span>
                      <span class="text-white font-medium">{{ formatNumber(shortStats.soloKills) }}</span>
                    </div>
                    <div class="flex justify-between">
                      <span class="text-gray-300">{{ $t('character.soloLosses') }}:</span>
                      <span class="text-white font-medium">{{ formatNumber(shortStats.soloLosses) }}</span>
                    </div>
                    <div class="flex justify-between">
                      <span class="text-gray-300">{{ $t('character.dangerRatio') }}:</span>
                      <span class="text-white font-medium">{{ calcDangerRatio(shortStats) }}%</span>
                    </div>
                  </div>
                </template>
              </div>
            </div>
          </div>
        </div>
      </UCard>

      <!-- Tabs Navigation -->
      <UTabs
        :items="tabItems"
        :default-index="getInitialTabIndex()"
        @change="handleTabChange"
        class="space-y-4"
      >
        <!-- Dashboard Tab -->
        <template #dashboard>
          <div class="tab-content">
            <characterDashboard :character="character" />
          </div>
        </template>

        <!-- Kills Tab -->
        <template #kills>
          <UCard class="bg-black bg-opacity-30 dark:bg-gray-900 dark:bg-opacity-30">
            <div class="text-center">
              <p class="text-sm text-gray-400">{{ t('character.killsPlaceholder') }}</p>
            </div>
          </UCard>
        </template>

        <!-- Losses Tab -->
        <template #losses>
          <UCard class="bg-black bg-opacity-30 dark:bg-gray-900 dark:bg-opacity-30">
            <div class="text-center">
              <p class="text-sm text-gray-400">{{ t('character.lossesPlaceholder') }}</p>
            </div>
          </UCard>
        </template>

        <!-- Combined Tab -->
        <template #combined>
          <UCard class="bg-black bg-opacity-30 dark:bg-gray-900 dark:bg-opacity-30">
            <div class="text-center">
              <p class="text-sm text-gray-400">{{ t('character.combinedPlaceholder') }}</p>
            </div>
          </UCard>
        </template>

        <!-- Corporation History Tab -->
        <template #corporation-history>
          <UCard class="bg-black bg-opacity-30 dark:bg-gray-900 dark:bg-opacity-30">
            <div class="text-center">
              <p class="text-sm text-gray-400">{{ t('character.corporationHistoryPlaceholder') }}</p>
            </div>
          </UCard>
        </template>

        <!-- Stats Tab -->
        <template #stats>
          <UCard class="bg-black bg-opacity-30 dark:bg-gray-900 dark:bg-opacity-30">
            <div class="text-center">
              <p class="text-sm text-gray-400">{{ t('character.statsPlaceholder') }}</p>
            </div>
          </UCard>
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
          <UButton
            icon="i-lucide-arrow-left"
            variant="ghost"
            @click="() => navigateTo('/')"
          >
            {{ t('common.goToHomepage') }}
          </UButton>
        </div>
      </template>
    </UCard>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import { formatDistanceToNow } from 'date-fns';
import { enUS, de, es, fr, ja, ko, ru, zhCN } from 'date-fns/locale';
import type { TabsItem } from '@nuxt/ui';

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
  zh: zhCN
};

// Format date with date-fns using current locale
const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  return formatDistanceToNow(date, {
    addSuffix: true,
    locale: dateLocales[currentLocale.value] || enUS
  });
};

// Generate a dynamic fetch key that changes with each route ID change
const fetchKey = computed(() => `character-${id}-${Date.now()}`);

// Fetch character data with improved caching strategy
const { data: character, pending, error, refresh } = useFetch(`/api/characters/${id}`, {
  initialCache: false, // Don't use initial cache
  key: fetchKey.value, // Use dynamic key to ensure proper cache invalidation
  watch: [() => route.params.id], // Watch for route parameter changes
});

// Fetch character short stats
const shortStatsKey = computed(() => `character-${id}-shortstats-${Date.now()}`);
const { data: shortStats, pending: shortStatsLoading } = useFetch(`/api/characters/${id}/shortstats`, {
  initialCache: false,
  key: shortStatsKey.value,
  watch: [() => route.params.id],
});

// Set up SEO metadata
useSeoMeta({
  title: computed(() => character.value ? `${character.value.name} - EVE Kill` : t('character.characterPage')),
  description: computed(() => character.value
    ? t('character.metaDescription', {
        name: character.value.name,
        corporation: character.value.corporation_name,
        alliance: character.value.alliance_name || t('character.noAlliance')
      })
    : t('character.defaultDescription')),
  ogImage: computed(() => character.value
    ? `https://images.eve-kill.com/characters/${character.value.character_id}/portrait?size=256`
    : '/images/default-og.png')
});

// Tab navigation configuration with slot property properly defined
const tabItems = [
  {
    id: 'dashboard',
    label: computed(() => t('character.dashboard')),
    icon: 'i-lucide-layout-dashboard',
    slot: 'dashboard' as const
  },
  {
    id: 'kills',
    label: computed(() => t('character.kills')),
    icon: 'i-lucide-trophy',
    slot: 'kills' as const
  },
  {
    id: 'losses',
    label: computed(() => t('character.losses')),
    icon: 'i-lucide-skull',
    slot: 'losses' as const
  },
  {
    id: 'combined',
    label: computed(() => t('character.combined')),
    icon: 'i-lucide-layers',
    slot: 'combined' as const
  },
  {
    id: 'corporation-history',
    label: computed(() => t('character.corporationHistory')),
    icon: 'i-lucide-history',
    slot: 'corporation-history' as const
  },
  {
    id: 'stats',
    label: computed(() => t('character.stats')),
    icon: 'i-lucide-bar-chart',
    slot: 'stats' as const
  }
] satisfies TabsItem[];

// Active tab from query param or default to dashboard
const activeTab = ref(route.query.tab?.toString() || 'dashboard');

// Get initial tab index from query parameter or default to dashboard
const getInitialTabIndex = () => {
  const tab = route.query.tab as string;
  const index = tabItems.findIndex(item => item.id === tab);
  return index >= 0 ? index : 0;
};

// Handle tab changes by updating the URL query parameter
const handleTabChange = (tabId: string) => {
  activeTab.value = tabId;
  router.replace({
    query: {
      ...route.query,
      tab: tabId
    }
  });
};

// Format numbers with commas
const formatNumber = (value: number): string => {
  return value?.toLocaleString() || '0';
};

// Format ISK value with B/M suffix
const formatIsk = (value: number): string => {
  if (!value) return '0 ISK';

  if (value >= 1000000000) {
    return `${(value / 1000000000).toFixed(2)}B ISK`;
  } else if (value >= 1000000) {
    return `${(value / 1000000).toFixed(2)}M ISK`;
  } else {
    return `${Math.round(value).toLocaleString()} ISK`;
  }
};

// Calculate danger ratio (kills / (kills + losses) * 100)
const calcDangerRatio = (stats: any): string => {
  if (!stats) return '0';

  const { kills = 0, losses = 0 } = stats;
  if (kills === 0 && losses === 0) return '0';

  const ratio = (kills / (kills + losses)) * 100;
  return ratio.toFixed(1);
};

// Get color for security status
const getSecurityStatusColor = (securityStatus: number): string => {
  if (securityStatus >= 0.5) return '#00FF00'; // High sec - green
  if (securityStatus >= 0.0) return '#FFFF00'; // Low sec - yellow
  if (securityStatus >= -5.0) return '#FF8C00'; // Negative but not too bad - orange
  return '#FF0000'; // Very negative - red
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
