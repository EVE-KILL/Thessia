<template>
  <div class="character-dashboard">
    <div class="grid-container">
      <!-- Character Bio Section -->
      <UCard class="bg-black bg-opacity-30 dark:bg-gray-900 dark:bg-opacity-30">
        <template #header>
          <div class="header-container">
            <h3 class="header-title">{{ $t('bio') }}</h3>
          </div>
        </template>

        <div v-if="characterBio" class="character-bio" v-html="characterBio"></div>
        <div v-else class="empty-bio">
          {{ $t('noBio') }}
        </div>
      </UCard>

      <!-- Character Stats Section -->
      <UCard class="bg-black bg-opacity-30 dark:bg-gray-900 dark:bg-opacity-30">
        <template #header>
          <div class="header-container">
            <h3 class="header-title">
              {{ $t('stats') }} ({{ activePeriodLabel }})
            </h3>
            <div class="period-selector">
              <UButton
                v-for="period in periods"
                :key="period.value"
                size="xs"
                :variant="activePeriod === period.value ? 'solid' : 'outline'"
                @click="changePeriod(period.value)"
              >
                {{ period.label }}
              </UButton>
            </div>
          </div>
        </template>

        <!-- Loading state -->
        <div v-if="statsLoading" class="loading-container">
          <UIcon name="i-lucide-loader-2" class="loading-icon" size="xl" />
        </div>

        <!-- Stats content when loaded -->
        <div v-else-if="stats" class="stats-content">
          <!-- Basic Stats -->
          <div class="stats-table-container">
            <Table
              :columns="statColumns"
              :items="formattedStats"
              background="transparent"
              :show-header="false"
              density="compact"
              :bordered="false"
              :fit-content="false"
              :special-header="true"
            >
              <template #cell-name="{ item }">
                <div class="stat-name">{{ item.name }}</div>
              </template>
              <template #cell-value="{ item }">
                <div class="stat-value">{{ item.value }}</div>
              </template>
            </Table>
          </div>

          <!-- Heat Map Activity -->
          <div class="heat-map-container">
            <h3 class="section-title">{{ $t('heatMap') }}</h3>
            <div class="heat-map-grid">
              <div
                v-for="(count, hour) in stats.heatMap"
                :key="hour"
                class="heat-map-hour"
              >
                <div
                  class="heat-map-cell"
                  :class="getHeatMapColor(count, getMaxHeatMapValue(stats.heatMap))"
                >
                  <div class="hour-label">{{ hour.replace('h', '') }}:00</div>
                  <div class="hour-value">{{ formatNumber(count) }}</div>
                </div>
              </div>
            </div>
          </div>

          <!-- Most Used Ships -->
          <div v-if="stats.mostUsedShips && Object.keys(stats.mostUsedShips).length > 0" class="stats-section">
            <h3 class="section-title">{{ $t('mostUsedShips') }}</h3>
            <Table
              :columns="shipColumns"
              :items="sortByCountDesc(stats.mostUsedShips)"
              background="transparent"
              density="compact"
              :bordered="false"
              :special-header="true"
            >
              <template #cell-name="{ item }">
                <div class="text-white">{{ getLocalizedString(item.name, currentLocale) }}</div>
              </template>
              <template #cell-count="{ item }">
                <div class="count-value">{{ formatNumber(item.count) }}</div>
              </template>
            </Table>
          </div>

          <!-- Most Lost Ships -->
          <div v-if="stats.mostLostShips && Object.keys(stats.mostLostShips).length > 0" class="stats-section">
            <h3 class="section-title">{{ $t('mostLostShips') }}</h3>
            <Table
              :columns="shipColumns"
              :items="sortByCountDesc(stats.mostLostShips)"
              background="transparent"
              density="compact"
              :bordered="false"
              :special-header="true"
            >
              <template #cell-name="{ item }">
                <div class="text-white">{{ getLocalizedString(item.name, currentLocale) }}</div>
              </template>
              <template #cell-count="{ item }">
                <div class="count-value">{{ formatNumber(item.count) }}</div>
              </template>
            </Table>
          </div>

          <!-- Dies To Corporations -->
          <div v-if="stats.diesToCorporations && Object.keys(stats.diesToCorporations).length > 0" class="stats-section">
            <h3 class="section-title">{{ $t('diesToCorporations') }}</h3>
            <Table
              :columns="corpColumns"
              :items="sortByCountDesc(stats.diesToCorporations)"
              background="transparent"
              density="compact"
              :bordered="false"
              :special-header="true"
            >
              <template #cell-name="{ item }">
                <div class="text-white">{{ item.name }}</div>
              </template>
              <template #cell-count="{ item }">
                <div class="count-value">{{ formatNumber(item.count) }}</div>
              </template>
            </Table>
          </div>

          <!-- Dies To Alliances -->
          <div v-if="stats.diesToAlliances && Object.keys(stats.diesToAlliances).length > 0" class="stats-section">
            <h3 class="section-title">{{ $t('diesToAlliances') }}</h3>
            <Table
              :columns="allianceColumns"
              :items="sortByCountDesc(stats.diesToAlliances)"
              background="transparent"
              density="compact"
              :bordered="false"
              :special-header="true"
            >
              <template #cell-name="{ item }">
                <div class="text-white">{{ item.name }}</div>
              </template>
              <template #cell-count="{ item }">
                <div class="count-value">{{ formatNumber(item.count) }}</div>
              </template>
            </Table>
          </div>

          <!-- Flies With Corporations -->
          <div v-if="stats.fliesWithCorporations && Object.keys(stats.fliesWithCorporations).length > 0" class="stats-section">
            <h3 class="section-title">{{ $t('fliesWithCorporations') }}</h3>
            <Table
              :columns="corpColumns"
              :items="sortByCountDesc(stats.fliesWithCorporations)"
              background="transparent"
              density="compact"
              :bordered="false"
              :special-header="true"
            >
              <template #cell-name="{ item }">
                <div class="text-white">{{ item.name }}</div>
              </template>
              <template #cell-count="{ item }">
                <div class="count-value">{{ formatNumber(item.count) }}</div>
              </template>
            </Table>
          </div>

          <!-- Flies With Alliances -->
          <div v-if="stats.fliesWithAlliances && Object.keys(stats.fliesWithAlliances).length > 0" class="stats-section">
            <h3 class="section-title">{{ $t('fliesWithAlliances') }}</h3>
            <Table
              :columns="allianceColumns"
              :items="sortByCountDesc(stats.fliesWithAlliances)"
              background="transparent"
              density="compact"
              :bordered="false"
              :special-header="true"
            >
              <template #cell-name="{ item }">
                <div class="text-white">{{ item.name }}</div>
              </template>
              <template #cell-count="{ item }">
                <div class="count-value">{{ formatNumber(item.count) }}</div>
              </template>
            </Table>
          </div>
        </div>

        <!-- Error message -->
        <div v-else-if="statsError" class="error-container">
          <UIcon name="i-lucide-alert-triangle" class="error-icon" size="lg" />
          <p class="error-message">{{ $t('common.errorLoadingData') }}</p>
          <UButton size="sm" variant="ghost" class="retry-button" @click="fetchStats(activePeriod)">
            {{ $t('common.retry') }}
          </UButton>
        </div>
      </UCard>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useEveHtmlParser } from '~/src/theme/modern/composables/useEveHtmlParser';
import { useI18n } from 'vue-i18n';
import { formatDistanceToNow } from 'date-fns';
import { enUS, de, es, fr, ja, ko, ru, zhCN } from 'date-fns/locale';

const props = defineProps({
  character: {
    type: Object,
    required: true
  }
});

const { t, locale } = useI18n();
const { convertEveHtml } = useEveHtmlParser();
const currentLocale = computed(() => locale.value);

// Period handling
const activePeriod = ref('90');
const periods = [
  { value: '14', label: '14d' },
  { value: '30', label: '30d' },
  { value: '90', label: '90d' },
  { value: 'all', label: t('allTime') }
];

const activePeriodLabel = computed(() => {
  if (activePeriod.value === 'all') return t('allTime');
  return `${activePeriod.value}d`;
});

// Character bio
const characterBio = computed(() => {
  if (!props.character?.description) return '';
  return convertEveHtml(props.character.description);
});

// Stats data
const stats = ref<any>(null);
const statsLoading = ref(true);
const statsError = ref(false);

// Table columns - adjusted with proper width alignment
const statColumns = [
  { id: 'name', header: t('name'), width: '50%' },
  { id: 'value', header: t('value'), headerClass: 'text-right', width: '50%' }
];

const shipColumns = [
  { id: 'name', header: t('ship'), width: '75%' },
  { id: 'count', header: t('count'), headerClass: 'text-right', width: '25%' }
];

const corpColumns = [
  { id: 'name', header: t('corporation'), width: '75%' },
  { id: 'count', header: t('count'), headerClass: 'text-right', width: '25%' }
];

const allianceColumns = [
  { id: 'name', header: t('alliance'), width: '75%' },
  { id: 'count', header: t('count'), headerClass: 'text-right', width: '25%' }
];

// Timezone data (evening playtimes)
const timezones = {
  'EUTZ Morning': [7, 12],
  'EUTZ Afternoon': [12, 17],
  'EUTZ Evening': [17, 22],
  'USWTZ Morning': [14, 19],
  'USWTZ Afternoon': [19, 0],
  'USWTZ Evening': [0, 5],
  'USETZ Morning': [11, 16],
  'USETZ Afternoon': [16, 21],
  'USETZ Evening': [21, 2],
  'AUTZ Morning': [21, 2],
  'AUTZ Afternoon': [2, 7],
  'AUTZ Evening': [7, 12],
  'CHTZ Morning': [23, 4],
  'CHTZ Afternoon': [4, 9],
  'CHTZ Evening': [9, 14],
  'RUTZ Morning': [4, 9],
  'RUTZ Afternoon': [9, 14],
  'RUTZ Evening': [14, 19]
};

// Date locale mapping
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

/**
 * Gets localized string from an object containing translations
 */
function getLocalizedString(obj: any, locale: string): string {
  if (!obj) return '';
  return obj[locale] || obj['en'] || '';
}

// Format date with date-fns using current locale
const formatDate = (dateString: string) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  return formatDistanceToNow(date, {
    addSuffix: true,
    locale: dateLocales[currentLocale.value] || enUS
  });
};

// Format numbers with commas
const formatNumber = (value: number): string => {
  return new Intl.NumberFormat().format(value || 0);
};

// Format ISK values
const formatIsk = (value: number): string => {
  if (!value) return '0 ISK';
  return `${new Intl.NumberFormat().format(value)} ISK`;
};

// Helper function to sort by count in descending order
const sortByCountDesc = (items: Record<string, any>) => {
  if (!items) return [];
  return Object.values(items).sort((a, b) => b.count - a.count).slice(0, 10); // Top 10 only
};

// Function to handle period change
const changePeriod = (period: string) => {
  activePeriod.value = period;
  fetchStats(period);
};

// Function to determine the most active timezone based on the heatmap
const determineActiveTimezone = (heatMap: Record<string, number>): string => {
  if (!heatMap) return 'Unknown';

  const hours = Object.entries(heatMap).map(([hour, count]) => ({
    hour: parseInt(hour.replace('h', '')),
    count
  }));

  const sortedHours = hours.sort((a, b) => b.count - a.count);

  if (sortedHours.length === 0) return 'Unknown';

  const activeHour = sortedHours[0].hour;

  for (const [timezone, [start, end]] of Object.entries(timezones)) {
    // Handle the case where the timezone spans over midnight (e.g., USTZ)
    if (start > end) {
      if (activeHour >= start || activeHour <= end) {
        return timezone;
      }
    } else {
      if (activeHour >= start && activeHour <= end) {
        return timezone;
      }
    }
  }

  return 'Unknown';
};

// Get color for heatmap based on activity level
const getHeatMapColor = (count: number, maxValue: number): string => {
  if (!count || !maxValue) return 'bg-gray-800';

  const intensity = Math.min(Math.floor((count / maxValue) * 10), 10);

  switch (intensity) {
    case 0: return 'bg-gray-800';
    case 1: return 'bg-blue-900 dark:bg-blue-950';
    case 2: return 'bg-blue-800 dark:bg-blue-900';
    case 3: return 'bg-blue-700 dark:bg-blue-800';
    case 4: return 'bg-blue-600 dark:bg-blue-700';
    case 5: return 'bg-blue-500 dark:bg-blue-600';
    case 6: return 'bg-indigo-500 dark:bg-indigo-600';
    case 7: return 'bg-indigo-400 dark:bg-indigo-500';
    case 8: return 'bg-violet-400 dark:bg-violet-500';
    case 9: return 'bg-violet-300 dark:bg-violet-400';
    case 10: return 'bg-purple-300 dark:bg-purple-400';
    default: return 'bg-gray-800';
  }
};

// Find the maximum value in the heatmap
const getMaxHeatMapValue = (heatMap: Record<string, number>): number => {
  if (!heatMap) return 0;
  return Math.max(...Object.values(heatMap));
};

// Generate formatted stats for the basic stats table
const formattedStats = computed(() => {
  if (!stats.value) return [];

  const activeTimezone = determineActiveTimezone(stats.value.heatMap);

  return [
    { name: t('kills'), value: formatNumber(stats.value.kills) },
    { name: t('losses'), value: formatNumber(stats.value.losses) },
    { name: t('isk') + ' ' + t('killed'), value: formatIsk(stats.value.iskKilled) },
    { name: t('isk') + ' ' + t('lost'), value: formatIsk(stats.value.iskLost) },
    { name: t('solo') + ' ' + t('kills'), value: formatNumber(stats.value.soloKills) },
    { name: t('solo') + ' ' + t('losses'), value: formatNumber(stats.value.soloLosses) },
    { name: t('npc') + ' ' + t('losses'), value: formatNumber(stats.value.npcLosses) },
    { name: t('blobFactor'), value: stats.value.blobFactor?.toFixed(2) || '0.00' },
    { name: t('lastActive'), value: formatDate(stats.value.lastActive) },
    { name: t('activeTimezone'), value: activeTimezone },
    { name: t('knownFC'), value: stats.value.possibleFC ? t('yes') : t('no') },
    { name: t('knownCynoAlt'), value: stats.value.possibleCynoAlt ? t('yes') : t('no') },
  ];
});

// Fetch stats data
const fetchStats = async (period = '90') => {
  if (!props.character?.character_id) return;

  statsLoading.value = true;
  statsError.value = false;

  try {
    const url = `/api/characters/${props.character.character_id}/stats${period === 'all' ? '' : `?days=${period}`}`;
    const { data, error } = await useFetch(url);

    if (error.value) {
      throw new Error('Failed to fetch stats');
    }

    stats.value = data.value;
  } catch (err) {
    console.error('Failed to fetch character stats:', err);
    statsError.value = true;
  } finally {
    statsLoading.value = false;
  }
};

// Fetch data on component mount
onMounted(() => {
  fetchStats(activePeriod.value);
});
</script>

<style scoped>
.character-dashboard {
  width: 100%;
}

.grid-container {
  display: grid;
  grid-template-columns: 1fr;
  gap: 1rem;
}

@media (min-width: 1024px) {
  .grid-container {
    grid-template-columns: 1fr 1fr;
  }
}

.header-container {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-title {
  font-size: 1.125rem;
  font-weight: 500;
}

.period-selector {
  display: flex;
  gap: 0.5rem;
}

.character-bio {
  line-height: 1;
  font-family: monospace;
  word-break: break-word;
  font-size: 1.4rem;
  padding: 0.5rem;
  overflow-y: auto;
}

.character-bio a {
  color: rgb(99, 102, 241);
  text-decoration: none;
}

.character-bio a:hover {
  text-decoration: underline;
}

.empty-bio {
  text-align: center;
  padding: 1rem 0;
  color: rgb(156, 163, 175);
  font-size: 0.875rem;
}

.loading-container {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 2rem 0;
}

.loading-icon {
  animation: spin 1s linear infinite;
  color: rgb(156, 163, 175);
}

.stats-content {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.stats-table-container {
  margin-bottom: 0.5rem;
}

.stat-name {
  font-weight: 400;
  color: rgb(209, 213, 219);
}

.stat-value {
  text-align: right;
  color: rgb(255, 255, 255);
  font-weight: 500;
}

.count-value {
  text-align: right;
  color: rgb(255, 255, 255);
}

.section-title {
  font-size: 1rem;
  font-weight: 500;
  margin-bottom: 0.5rem;
  color: rgb(229, 231, 235);
  border-bottom: 1px solid rgba(75, 85, 99, 0.2);
  padding-bottom: 0.25rem;
}

.stats-section {
  margin-bottom: 1.5rem;
}

.heat-map-container {
  margin-bottom: 1.5rem;
}

.heat-map-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 0.5rem;
}

@media (min-width: 768px) {
  .heat-map-grid {
    grid-template-columns: repeat(6, 1fr);
  }
}

@media (min-width: 1024px) {
  .heat-map-grid {
    grid-template-columns: repeat(8, 1fr);
  }
}

.heat-map-hour {
  position: relative;
  color: white;
}

.heat-map-cell {
  padding: 0.5rem;
  text-align: center;
  border-radius: 0.375rem;
}

.hour-label {
  font-size: 0.75rem;
  font-weight: 500;
}

.hour-value {
  font-size: 0.65rem;
  line-height: 0.85rem;
}

.error-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 2rem 1rem;
}

.error-icon {
  color: rgb(245, 158, 11);
  margin-bottom: 0.75rem;
}

.error-message {
  font-size: 0.875rem;
  margin-bottom: 0.75rem;
}

.retry-button {
  margin-top: 0.75rem;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

/* Ensure proper alignment in tables */
:deep(.body-cell) {
  padding: 0.25rem 0.5rem;
}

:deep(.table-header) {
  padding: 0.5rem;
}

:deep(.table-row) {
  padding: 0.25rem 0;
}
</style>
