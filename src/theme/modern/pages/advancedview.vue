<template>
  <div class="min-h-screen text-white">
    <UContainer class="py-8">
      <!-- Header with back button -->
      <div class="flex items-center mb-6">
        <UButton
          variant="ghost"
          color="gray"
          icon="i-lucide-arrow-left"
          @click="goBackToSearch"
          class="mr-4"
        >
          Back to Search
        </UButton>
        <h1 class="text-3xl font-bold">Advanced View</h1>
      </div>

      <!-- Error state -->
      <div v-if="error" class="text-center py-8">
        <Icon name="lucide:alert-circle" class="w-12 h-12 mx-auto mb-4 text-red-500" />
        <p class="text-lg font-medium text-red-400 mb-2">Error Occurred</p>
        <p class="text-gray-400">{{ error }}</p>
        <UButton @click="refreshData" class="mt-4">Try Again</UButton>
      </div>

      <!-- Loading state -->
      <div v-else-if="isLoading" class="text-center py-8">
        <Icon name="lucide:loader-2" class="w-12 h-12 mx-auto mb-4 animate-spin text-blue-500" />
        <p class="text-lg">Loading Advanced View...</p>
      </div>

      <!-- Main content - show once at least one section is loaded -->
      <div v-else>
        <!-- Top Section: Summary Stats -->
        <div class="mb-8">
          <!-- Summary Stats Cards -->
          <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <UCard>
              <div class="text-center p-6">
                <template v-if="isStatsLoading">
                  <div class="animate-pulse">
                    <div class="h-8 bg-gray-300 rounded mb-2"></div>
                    <div class="h-4 bg-gray-300 rounded"></div>
                  </div>
                </template>
                <template v-else>
                  <div class="text-3xl font-bold text-green-400">
                    {{ stats?.totalKills?.toLocaleString() || '0' }}
                  </div>
                  <div class="text-sm text-gray-500">Total Kills</div>
                </template>
              </div>
            </UCard>

            <UCard>
              <div class="text-center p-6">
                <template v-if="isStatsLoading">
                  <div class="animate-pulse">
                    <div class="h-8 bg-gray-300 rounded mb-2"></div>
                    <div class="h-4 bg-gray-300 rounded"></div>
                  </div>
                </template>
                <template v-else>
                  <div class="text-3xl font-bold text-blue-400">
                    {{ formatIsk(stats?.iskDestroyed) }}
                  </div>
                  <div class="text-sm text-gray-500">ISK Destroyed</div>
                </template>
              </div>
            </UCard>

            <UCard>
              <div class="text-center p-6">
                <template v-if="isStatsLoading">
                  <div class="animate-pulse">
                    <div class="h-8 bg-gray-300 rounded mb-2"></div>
                    <div class="h-4 bg-gray-300 rounded"></div>
                  </div>
                </template>
                <template v-else>
                  <div class="text-3xl font-bold text-purple-400">
                    {{ stats?.totalKillmails?.toLocaleString() || '0' }}
                  </div>
                  <div class="text-sm text-gray-500">Total Killmails</div>
                </template>
              </div>
            </UCard>
          </div>
        </div>

        <!-- Main Content: Split Layout (80% / 20%) -->
        <div class="grid grid-cols-1 xl:grid-cols-5 gap-8">
          <!-- Left Side: 80% (4 columns out of 5) -->
          <div class="xl:col-span-4 space-y-8">
            <!-- Ship Statistics -->
            <template v-if="isStatsLoading">
              <div class="mb-4">
                <h3 class="text-lg font-semibold text-zinc-100">Ship Statistics</h3>
                <p class="text-zinc-400 text-sm mt-1">Ships destroyed breakdown</p>
              </div>
              <div class="animate-pulse bg-gray-300 h-64 rounded"></div>
            </template>
            <template v-else-if="stats?.shipGroupStats && stats.shipGroupStats.length > 0">
              <div class="mb-4">
                <h3 class="text-lg font-semibold text-zinc-100">Ship Statistics</h3>
                <p class="text-zinc-400 text-sm mt-1">Ships destroyed breakdown</p>
              </div>
              <AdvancedShipStats :stats="stats" />
            </template>

            <!-- Most Valuable Kills -->
            <template v-if="isStatsLoading">
              <div class="mb-4">
                <h3 class="text-lg font-semibold text-zinc-100">Most Valuable Kills</h3>
                <p class="text-zinc-400 text-sm mt-1">Highest value killmails</p>
              </div>
              <div class="animate-pulse bg-gray-300 h-32 rounded"></div>
            </template>
            <template v-else-if="stats?.mostValuableKills && stats.mostValuableKills.length > 0">
              <div class="mb-4">
                <h3 class="text-lg font-semibold text-zinc-100">Most Valuable Kills</h3>
                <p class="text-zinc-400 text-sm mt-1">Highest value killmails</p>
              </div>
              <AdvancedMostValuable
                title=""
                :items="stats.mostValuableKills"
                :loading="false"
              />
            </template>

            <!-- Killmails List -->
            <div>
              <div class="mb-4">
                <h3 class="text-lg font-semibold text-zinc-100">Recent Killmails</h3>
                <p class="text-zinc-400 text-sm mt-1">Latest killmails matching your filters</p>
              </div>

              <div>
                <template v-if="isKillmailsLoading">
                  <div class="space-y-4">
                    <div v-for="i in 5" :key="i" class="animate-pulse">
                      <div class="bg-gray-300 h-16 rounded"></div>
                    </div>
                  </div>
                </template>
                <template v-else-if="killmails.length > 0">
                  <KillList
                    :externalKilllistData="killmails"
                    :limit="currentLimit"
                    :enablePagination="true"
                    :currentPage="currentPage"
                    :totalPages="totalPages"
                    @update:page="handlePageChange"
                    @update:limit="handleLimitChange"
                    wsDisabled
                  />
                </template>
                <template v-else>
                  <div class="text-center py-8 text-zinc-400">
                    <Icon name="lucide:search-x" class="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p class="text-lg font-medium mb-2">No killmails found</p>
                    <p class="text-sm">Try adjusting your search filters.</p>
                  </div>
                </template>
              </div>
            </div>
          </div>

          <!-- Right Side: 20% (1 column out of 5) -->
          <div class="xl:col-span-1 space-y-6">
            <!-- Top Killers -->
            <CampaignTopBox
              title="Top Killers"
              :entities="stats?.topKillersByCharacter || []"
              countField="kills"
              entityType="character"
              :loading="isStatsLoading"
            />

            <!-- Top Victims -->
            <CampaignTopBox
              title="Top Victims"
              :entities="stats?.topVictimsByCharacter || []"
              countField="losses"
              countTitle="Losses"
              entityType="character"
              :loading="isStatsLoading"
            />

            <!-- Top Damage Dealers -->
            <CampaignTopBox
              title="Top Damage Dealers"
              :entities="stats?.topDamageDealersByCharacter || []"
              countField="damageDone"
              countTitle="Damage"
              entityType="character"
              :loading="isStatsLoading"
            />

            <!-- Top Corporations -->
            <CampaignTopBox
              title="Top Corporations"
              :entities="stats?.topKillersByCorporation || []"
              countField="kills"
              entityType="corporation"
              :loading="isStatsLoading"
            />

            <!-- Top Alliances -->
            <CampaignTopBox
              title="Top Alliances"
              :entities="stats?.topKillersByAlliance || []"
              countField="kills"
              entityType="alliance"
              :loading="isStatsLoading"
            />
          </div>
        </div>
      </div>
    </UContainer>
  </div>
</template>

<script setup lang="ts">
import KillList from '~/src/theme/modern/components/common/KillList.vue'
import AdvancedShipStats from '~/src/theme/modern/components/advancedview/AdvancedShipStats.vue'
import AdvancedMostValuable from '~/src/theme/modern/components/advancedview/AdvancedMostValuable.vue'

interface AdvancedViewStats {
  query: Record<string, any>;
  totalKillmails: number;
  totalKills: number;
  totalLosses: number;
  iskDestroyed: number;
  iskDamageDealt: number;
  efficiency: number;
  shipGroupStats: Array<{
    ship_group_id: number;
    ship_group_name: string | Record<string, string>;
    killed: number;
    lost: number;
  }>;
  topKillersByCharacter: Array<{
    character_id: number;
    character_name: string;
    kills: number;
  }>;
  topVictimsByCharacter: Array<{
    character_id: number;
    character_name: string;
    losses: number;
  }>;
  topDamageDealersByCharacter: Array<{
    character_id: number;
    character_name: string;
    damageDone: number;
  }>;
  topDamageTakersByCharacter: Array<{
    character_id: number;
    character_name: string;
    damageTaken: number;
  }>;
  topKillersByCorporation: Array<{
    corporation_id: number;
    corporation_name: string;
    kills: number;
  }>;
  topVictimsByCorporation: Array<{
    corporation_id: number;
    corporation_name: string;
    losses: number;
  }>;
  topKillersByAlliance: Array<{
    alliance_id: number;
    alliance_name: string;
    kills: number;
  }>;
  topVictimsByAlliance: Array<{
    alliance_id: number;
    alliance_name: string;
    losses: number;
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
      ship_id: number;
      ship_name: string | Record<string, string>;
    };
  }>;
  killmailIds: number[];
}

// Composables
const route = useRoute();
const router = useRouter();
const { t, locale } = useI18n();

// Reactive state
const isLoading = ref(true);
const isStatsLoading = ref(true);
const isKillmailsLoading = ref(true);
const error = ref<string | null>(null);
const stats = ref<any>(null);
const killmails = ref<any[]>([]);
const parsedFilters = ref<any>(null);
const currentPage = ref(1);
const totalPages = ref(1);
const currentLimit = ref(25);

// Computed
const formattedFilters = computed(() => {
  if (!parsedFilters.value) return '';
  return JSON.stringify(parsedFilters.value, null, 2);
});

// Lifecycle
onMounted(async () => {
  await loadData();
});

// Watch for route changes to reload data when filters change
watch(() => route.query, async (newQuery, oldQuery) => {
  // Only reload if the filters parameter actually changed
  const newFilters = newQuery.filters || newQuery.filter;
  const oldFilters = oldQuery?.filters || oldQuery?.filter;

  if (newFilters !== oldFilters && newFilters) {
    await loadData();
  }
}, { deep: true });

// Methods
async function loadData() {
  isLoading.value = true;
  isStatsLoading.value = true;
  isKillmailsLoading.value = true;
  error.value = null;

  try {
    // Get filters from URL parameter (support both 'filters' and 'filter')
    const filtersParam = (route.query.filters || route.query.filter) as string;
    if (!filtersParam) {
      error.value = 'No filters provided';
      return;
    }

    // Parse filters
    try {
      parsedFilters.value = JSON.parse(filtersParam);
    } catch (e) {
      error.value = 'Invalid filters format';
      return;
    }

    // Load killmails first (usually faster) - don't await
    loadKillmailsData(filtersParam);

    // Load stats in background - don't await
    loadStatsData(filtersParam);

  } catch (err: any) {
    console.error('Error loading advanced view data:', err);
    error.value = err.data?.message || err.message || 'Failed to load data';
  } finally {
    isLoading.value = false;
  }
}

async function loadKillmailsData(filtersParam: string) {
  try {
    isKillmailsLoading.value = true;
    const killmailsResponse = await $fetch(`/api/advancedview/killmails?filters=${encodeURIComponent(filtersParam)}&page=${currentPage.value}&limit=${currentLimit.value}`);
    killmails.value = killmailsResponse.killmails;
    totalPages.value = killmailsResponse.pagination.totalPages;
  } catch (err: any) {
    console.error('Error loading killmails:', err);
    error.value = err.data?.message || err.message || 'Failed to load killmails';
  } finally {
    isKillmailsLoading.value = false;
  }
}

async function loadStatsData(filtersParam: string) {
  try {
    isStatsLoading.value = true;
    const statsResponse = await $fetch(`/api/advancedview/stats?filters=${encodeURIComponent(filtersParam)}`);
    stats.value = statsResponse;
  } catch (err: any) {
    console.error('Error loading stats:', err);
    // Don't set main error for stats failure, just log it
    console.warn('Stats failed to load, but killmails are available');
  } finally {
    isStatsLoading.value = false;
  }
}

async function refreshData() {
  await loadData();
}

function goBackToSearch() {
  router.push('/advancedsearch');
}

async function handlePageChange(page: number) {
  currentPage.value = page;

  // Load new page of killmails
  try {
    isKillmailsLoading.value = true;
    const filtersParam = (route.query.filters || route.query.filter) as string;
    const killmailsResponse = await $fetch(`/api/advancedview/killmails?filters=${encodeURIComponent(filtersParam)}&page=${page}&limit=${currentLimit.value}`);
    killmails.value = killmailsResponse.killmails;
    totalPages.value = killmailsResponse.pagination.totalPages;
  } catch (err: any) {
    console.error('Error loading page:', err);
    error.value = err.data?.message || err.message || 'Failed to load page';
  } finally {
    isKillmailsLoading.value = false;
  }
}

async function handleLimitChange(limit: number) {
  // Update the current limit and reset to first page
  currentLimit.value = limit;
  currentPage.value = 1;

  // Reload killmails with new limit
  try {
    isKillmailsLoading.value = true;
    const filtersParam = (route.query.filters || route.query.filter) as string;
    const killmailsResponse = await $fetch(`/api/advancedview/killmails?filters=${encodeURIComponent(filtersParam)}&page=1&limit=${limit}`);
    killmails.value = killmailsResponse.killmails;
    totalPages.value = killmailsResponse.pagination.totalPages;
  } catch (err: any) {
    console.error('Error loading with new limit:', err);
    error.value = err.data?.message || err.message || 'Failed to load data';
  } finally {
    isKillmailsLoading.value = false;
  }
}

// Helper functions
function formatNumber(num: number): string {
  return new Intl.NumberFormat(locale.value).format(num);
}

function formatIsk(value: number): string {
  if (value >= 1000000000000) return `${(value / 1000000000000).toFixed(2)}T`;
  if (value >= 1000000000) return `${(value / 1000000000).toFixed(2)}B`;
  if (value >= 1000000) return `${(value / 1000000).toFixed(2)}M`;
  if (value >= 1000) return `${(value / 1000).toFixed(2)}K`;
  return value.toString();
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diff = now.getTime() - date.getTime();

  const minutes = Math.floor(diff / (1000 * 60));
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
}

function getEfficiencyColor(efficiency: number): string {
  if (efficiency >= 0.75) return 'text-green-400';
  if (efficiency >= 0.5) return 'text-yellow-400';
  return 'text-red-400';
}

// SEO
useSeoMeta({
  title: 'Advanced View - EVE Kill Analytics',
  description: 'Detailed analysis and statistics for your filtered killmail data'
});
</script>