<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { useIntervalFn, useDocumentVisibility } from '@vueuse/core'
import VChart from 'vue-echarts'
import { use } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { BarChart } from 'echarts/charts'
import {
    TitleComponent,
    TooltipComponent,
    LegendComponent,
    GridComponent
} from 'echarts/components'

// Get i18n instance
const { t } = useI18n();
const isMobile = ref(false);

// Add SEO meta
useSeoMeta({
  title: t('status.pageTitle')
});

// Check if we're on mobile
const checkIfMobile = () => {
  isMobile.value = window.innerWidth < 768;
};

// Register ECharts components
use([
  CanvasRenderer,
  BarChart,
  TitleComponent,
  TooltipComponent,
  LegendComponent,
  GridComponent
])

// Chart options
const chartOptions = ref({})

// Time period options for chart display with proper formatting for USelect
const timePeriods = [
  { value: '1min', label: t('status.timePeriods.1min') },
  { value: '5min', label: t('status.timePeriods.5min') },
  { value: '15min', label: t('status.timePeriods.15min') },
  { value: '1hour', label: t('status.timePeriods.1hour') },
  { value: '6hours', label: t('status.timePeriods.6hours') },
  { value: '12hours', label: t('status.timePeriods.12hours') },
  { value: '24hours', label: t('status.timePeriods.24hours') },
  { value: '1week', label: t('status.timePeriods.1week') },
  { value: '1month', label: t('status.timePeriods.1month') }
]
// Change the default to 5min instead of 24hours
const selectedTimePeriod = ref('5min')

// Auto refresh settings
const autoRefresh = ref(true)
const autoRefreshInterval = ref(10) // seconds
const scrollPosition = ref(0)

// Use VueUse to track document visibility without directly accessing document
const isVisible = useDocumentVisibility()

// Use Nuxt's useLazyFetch for initial data loading
const { data: statusData, pending: loading, error, refresh: refreshData } = useLazyFetch('/api/status', {
  server: false // Only fetch on client-side
})

// Custom refresh function
const refresh = async () => {
  try {
    if (import.meta.client) {
      scrollPosition.value = window.scrollY
    }
    await refreshData()
    if (import.meta.client) {
      nextTick(() => {
        window.scrollTo({
          top: scrollPosition.value,
          behavior: 'instant'
        })
      })
    }
  } catch (err) {
    console.error('Error refreshing data:', err)
  }
}

// Setup auto-refresh using VueUse's useIntervalFn
const { pause, resume } = useIntervalFn(() => {
  if (import.meta.client && isVisible.value === 'visible' && autoRefresh.value) {
    refresh()
  }
}, autoRefreshInterval.value * 1000)

// Toggle auto-refresh
const toggleAutoRefresh = () => {
  autoRefresh.value = !autoRefresh.value
  if (autoRefresh.value) {
    resume()
  } else {
    pause()
  }
}

// Format uptime to days, hours, minutes, seconds
const formattedUptime = computed(() => {
  if (!statusData.value) return ''

  const uptime = statusData.value.uptime
  const days = Math.floor(uptime / (24 * 60 * 60))
  const hours = Math.floor((uptime % (24 * 60 * 60)) / (60 * 60))
  const minutes = Math.floor((uptime % (60 * 60)) / 60)
  const seconds = Math.floor(uptime % 60)

  return t('status.uptime.format', { days, hours, minutes, seconds })
})

// Format date to locale string
const formatDate = (dateString) => {
  return new Date(dateString).toLocaleString()
}

// Format numbers using the browser's locale system
const formatNumber = (value: number): string => {
  return value.toLocaleString("da-DK");
};

// Function to update chart options
const updateChartOptions = () => {
  if (!statusData.value) return

  const period = selectedTimePeriod.value
  const processedCounts = statusData.value.processedCounts
  const categories = Object.keys(processedCounts)

  // Extract data for the selected time period - now handling numeric values directly
  const dataPoints = categories.map(category => {
    const value = processedCounts[category][period]
    // Values are now already numbers from the API, no need for string conversion
    return {
      name: category,
      value: typeof value === 'number' ? value : 0
    }
  })

  // Sort by value for better visualization (descending order)
  dataPoints.sort((a, b) => b.value - a.value)

  // Colors for the bars
  const colors = [
    '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0',
    '#9966FF', '#FF9F40', '#C7C7C7', '#8AC926',
    '#1982C4', '#6A4C93', '#FFCA3A', '#FF595E'
  ]

  // Create simplified chart options
  chartOptions.value = {
    title: {
      text: t('status.processedItems', { period: period }),
      left: 'center'
    },
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      formatter: function(params) {
        const data = params[0]
        return `${data.name}: ${data.value.toLocaleString()}`
      }
    },
    grid: {
      left: '5%',
      right: '20%',
      bottom: '5%',
      containLabel: true
    },
    xAxis: {
      type: 'value',
      axisLabel: { formatter: (value) => value.toLocaleString() }
    },
    yAxis: {
      type: 'category',
      data: dataPoints.map(item => item.name),
      axisLabel: { formatter: (value) => value.charAt(0).toUpperCase() + value.slice(1) }
    },
    series: [{
      type: 'bar',
      data: dataPoints.map((item, index) => ({
        value: item.value,
        itemStyle: { color: colors[index % colors.length] }
      }))
    }]
  }
}

// Watch for changes in data and time period
watch([statusData, selectedTimePeriod], () => {
  if (statusData.value) {
    updateChartOptions()
  }
}, { immediate: true })

// Watch visibility changes to pause/resume auto-refresh
watch(isVisible, (newValue) => {
  if (newValue === 'visible' && autoRefresh.value) {
    resume()
  } else {
    pause()
  }
})

// Setup when mounted
onMounted(() => {
  if (autoRefresh.value) {
    resume()
  }

  checkIfMobile();
  window.addEventListener('resize', checkIfMobile);
})

onUnmounted(() => {
  window.removeEventListener('resize', checkIfMobile);
});

// Add active tab tracking - explicitly set to 'overview' as default
const activeTab = ref('overview')

// Invert the logic - change from simplified to detailed
const detailed = ref(false)

// Add summary stats computed property with number handling
const summaryStats = computed(() => {
  if (!statusData.value) return null

  return {
    totalQueued: Object.values(statusData.value.queueCounts).reduce(
      (sum, val) => sum + (typeof val === 'number' ? val : 0), 0
    ),
    // Values are now numbers directly from the API
    totalProcessed: Object.values(statusData.value.processedCounts).reduce(
      (sum, val) => sum + (val['5min'] || 0), 0
    ),
    unprocessedItems: statusData.value.databaseCounts.unprocessedCount || 0
  }
})
</script>

<template>
  <div class="mx-auto">
    <div class="bg-gray-100 dark:bg-gray-900 rounded-lg shadow-lg">
      <div class="flex justify-end items-center mb-4">
        <div class="flex items-center gap-2">
          <div class="flex items-center">
            <USwitch v-model="autoRefresh" @change="toggleAutoRefresh" />
            <span class="ml-2 text-xs sm:text-sm">{{ $t('status.autoRefresh', { seconds: autoRefreshInterval }) }}</span>
          </div>
          <UButton
            color="primary"
            variant="ghost"
            icon="lucide:refresh-cw"
            size="sm"
            @click="refresh"
            :loading="loading"
            :disabled="loading"
            :title="$t('status.refreshNow')"
          />
        </div>
      </div>

      <div v-if="loading && !statusData" class="flex justify-center my-8">
        <UProgress class="w-1/2" />
      </div>

      <div v-else-if="error" class="bg-red-100 dark:bg-red-900 border border-red-400 text-red-700 dark:text-red-300 px-4 py-3 rounded">
        <p>{{ error }}</p>
        <UButton class="mt-4" @click="refresh">{{ $t('status.retry') }}</UButton>
      </div>

      <ClientOnly fallback-tag="div" :fallback="$t('status.loading')">
        <div v-if="statusData">
          <!-- Summary Cards -->
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
            <div class="bg-indigo-50 dark:bg-indigo-900/30 rounded-lg shadow p-3">
              <div class="text-xs uppercase text-indigo-700 dark:text-indigo-300">{{ $t('status.summary.uptime') }}</div>
              <div class="text-xl font-mono truncate">{{ formattedUptime }}</div>
            </div>
            <div class="bg-emerald-50 dark:bg-emerald-900/30 rounded-lg shadow p-3">
              <div class="text-xs uppercase text-emerald-700 dark:text-emerald-300">{{ $t('status.summary.processedLast5m') }}</div>
              <div class="text-xl font-mono">{{ formatNumber(summaryStats?.totalProcessed) }}</div>
            </div>
            <div class="bg-amber-50 dark:bg-amber-900/30 rounded-lg shadow p-3">
              <div class="text-xs uppercase text-amber-700 dark:text-amber-300">{{ $t('status.summary.queuedItems') }}</div>
              <div class="text-xl font-mono">{{ formatNumber(summaryStats?.totalQueued) }}</div>
            </div>
          </div>

          <!-- Main Content Tabs - Using the correct default-selected prop -->
          <UTabs
            :items="[
              { label: isMobile ? '' : $t('status.tabs.overview'), icon: 'lucide:layout-dashboard', slot: 'overview', defaultSelected: true },
              { label: isMobile ? '' : $t('status.tabs.processing'), icon: 'lucide:bar-chart-2', slot: 'processing' },
              { label: isMobile ? '' : $t('status.tabs.database'), icon: 'lucide:database', slot: 'database' },
              { label: isMobile ? '' : $t('status.tabs.cache'), icon: 'lucide:hard-drive', slot: 'cache' },
            ]"
            class="mb-6"
          >
            <template #overview>
              <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <!-- System Information -->
                <UCard>
                  <template #header>
                    <div class="flex items-center">
                      <UIcon name="lucide:cpu" class="mr-2" />
                      <h3 class="font-bold">{{ $t('status.systemInfo') }}</h3>
                    </div>
                  </template>

                  <div class="space-y-3 text-sm">
                    <div><span class="font-semibold">{{ $t('status.uptime.since') }}:</span> {{ formatDate(statusData.upSince) }}</div>
                    <div><span class="font-semibold">{{ $t('status.operatingSystem.platform') }}:</span> {{ statusData.operatingSystem.systemPlatform }} ({{ statusData.operatingSystem.systemArch }})</div>
                    <div><span class="font-semibold">{{ $t('status.operatingSystem.loadAverage') }}:</span> {{ statusData.operatingSystem.loadAvg.join(' | ') }}</div>
                    <div><span class="font-semibold">{{ $t('status.operatingSystem.totalCPUs') }}:</span> {{ statusData.operatingSystem.totalCPUs }}</div>
                    <div><span class="font-semibold">{{ $t('status.operatingSystem.memory') }}:</span> {{ statusData.operatingSystem.totalMemoryGB }}</div>
                    <div><span class="font-semibold">{{ $t('status.environment.nodeVersion') }}:</span> {{ statusData.env.nodeVersion }}</div>
                    <div><span class="font-semibold">{{ $t('status.environment.nodeEnv') }}:</span> {{ statusData.env.nodeEnv }}</div>
                  </div>
                </UCard>

                <!-- Queue Counts -->
                <UCard>
                  <template #header>
                    <div class="flex items-center">
                      <UIcon name="lucide:list" class="mr-2" />
                      <h3 class="font-bold">{{ $t('status.queueCounts.title') }}</h3>
                    </div>
                  </template>

                  <div class="overflow-x-auto">
                    <table class="min-w-full">
                      <thead>
                        <tr>
                          <th class="text-left text-xs">{{ $t('status.queueCounts.queue') }}</th>
                          <th class="text-right text-xs">{{ $t('status.queueCounts.count') }}</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr v-for="(count, queue) in statusData.queueCounts" :key="queue"
                            class="border-t border-gray-200 dark:border-gray-700">
                          <td class="py-1 capitalize text-sm">{{ queue }}</td>
                          <td class="py-1 text-right font-mono text-sm">{{ formatNumber(count) }}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </UCard>
              </div>
            </template>

            <template #processing>
              <UCard>
                <template #header>
                  <div class="flex justify-between items-center">
                    <div class="flex items-center">
                      <UIcon name="lucide:bar-chart-2" class="mr-2" />
                      <h3 class="font-bold">{{ $t('status.processingStatistics.title') }}</h3>
                    </div>
                    <div class="flex items-center gap-2">
                      <USwitch v-model="detailed" size="sm" />
                      <span class="text-xs">{{ detailed ? $t('status.detailed') : $t('status.simplified') }}</span>
                    </div>
                  </div>
                </template>

                <div class="mb-4">
                  <label for="timePeriod" class="block text-xs font-medium mb-1">{{ $t('status.selectTimePeriod') }}:</label>
                  <USelect
                    id="timePeriod"
                    v-model="selectedTimePeriod"
                    :items="timePeriods"
                    size="sm"
                    placeholder="Select time period"
                    icon="lucide:clock"
                  />
                </div>

                <div class="h-64 relative mb-4">
                  <div v-if="loading" class="absolute inset-0 flex items-center justify-center bg-gray-50/50 dark:bg-gray-800/50 backdrop-blur-sm z-10">
                    <UIcon name="lucide:loader" class="animate-spin h-6 w-6" />
                  </div>
                  <v-chart class="w-full h-full" :option="chartOptions" autoresize />
                </div>

                <!-- Show detailed stats directly when detailed is true -->
                <div v-if="detailed" class="mt-4">
                  <h4 class="font-medium text-sm mb-2">{{ $t('status.detailedStats') }}</h4>
                  <div class="overflow-x-auto">
                    <!-- This table should automatically update when statusData changes -->
                    <table class="min-w-full text-xs">
                      <thead>
                        <tr>
                          <th class="py-1 text-left">{{ $t('status.queueCounts.queue') }}</th>
                          <th v-for="period in timePeriods" :key="period.value" class="py-1 px-1 text-right">
                            {{ period.label }}
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr v-for="(data, queue) in statusData.processedCounts" :key="queue"
                            class="border-t border-gray-200 dark:border-gray-700">
                          <td class="py-1 capitalize">{{ queue }}</td>
                          <td v-for="period in timePeriods" :key="period.value" class="py-1 px-1 text-right font-mono">
                            {{ formatNumber(data[period.value]) }}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </UCard>
            </template>

            <template #database>
              <UCard>
                <template #header>
                  <div class="flex items-center">
                    <UIcon name="lucide:database" class="mr-2" />
                    <h3 class="font-bold">{{ $t('status.databaseCounts.title') }}</h3>
                  </div>
                </template>

                <div class="overflow-x-auto">
                  <table class="min-w-full">
                    <thead>
                      <tr>
                        <th class="text-left text-xs">{{ $t('status.databaseCounts.collection') }}</th>
                        <th class="text-right text-xs">{{ $t('status.databaseCounts.count') }}</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr v-for="(count, collection) in statusData.databaseCounts" :key="collection"
                          class="border-t border-gray-200 dark:border-gray-700"
                          :class="{'bg-amber-100 dark:bg-amber-900/50': collection === 'unprocessedCount'}">
                        <td class="py-1 capitalize text-sm">{{ collection }}</td>
                        <td class="py-1 text-right font-mono text-sm">{{ formatNumber(count) }}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </UCard>
            </template>

            <template #cache>
              <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <!-- Cache Sizes -->
                <UCard>
                  <template #header>
                    <div class="flex items-center">
                      <UIcon name="lucide:table" class="mr-2" />
                      <h3 class="font-bold">{{ $t('status.cacheSizes.title') }}</h3>
                    </div>
                  </template>

                  <div class="overflow-x-auto">
                    <table class="min-w-full">
                      <thead>
                        <tr>
                          <th class="text-left text-xs">{{ $t('status.cacheSizes.cache') }}</th>
                          <th class="text-right text-xs">{{ $t('status.cacheSizes.size') }}</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr v-for="(size, cache) in statusData.cacheSizes" :key="cache"
                            class="border-t border-gray-200 dark:border-gray-700">
                          <td class="py-1 text-sm">{{ cache }}</td>
                          <td class="py-1 text-right font-mono text-sm">{{ formatNumber(size) }}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </UCard>

                <!-- Cache Hits -->
                <UCard>
                  <template #header>
                    <div class="flex items-center">
                      <UIcon name="lucide:zap" class="mr-2" />
                      <h3 class="font-bold">{{ $t('status.cacheHits.title') }}</h3>
                    </div>
                  </template>

                  <div class="overflow-x-auto">
                    <table class="min-w-full">
                      <thead>
                        <tr>
                          <th class="text-left text-xs">{{ $t('status.cacheHits.cache') }}</th>
                          <th class="text-right text-xs">{{ $t('status.cacheHits.hits') }}</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr v-for="(hits, cache) in statusData.cacheHits" :key="cache"
                            class="border-t border-gray-200 dark:border-gray-700">
                          <td class="py-1 text-sm">{{ cache }}</td>
                          <td class="py-1 text-right font-mono text-sm">{{ formatNumber(hits) }}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </UCard>
              </div>
            </template>
          </UTabs>

          <!-- Last update indicator -->
          <div class="text-center text-xs text-gray-500 dark:text-gray-400 mt-4">
            <span>{{ $t('status.lastUpdated', { time: formatDate(new Date()) }) }}</span>
            <span v-if="autoRefresh"> · {{ $t('status.autoRefreshing', { seconds: autoRefreshInterval }) }}</span>
          </div>
        </div>
      </ClientOnly>
    </div>
  </div>
</template>

<style scoped>
/* No custom classes needed anymore */
</style>
