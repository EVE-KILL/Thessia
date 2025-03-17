<script setup lang="ts">
import { ref, computed, onMounted, watch, nextTick } from 'vue'
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
const selectedTimePeriod = ref('24hours') // Default to 24 hours

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
    if (process.client) {
      scrollPosition.value = window.scrollY
    }
    await refreshData()
    if (process.client) {
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
  if (process.client && isVisible.value === 'visible' && autoRefresh.value) {
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

// Function to update chart options
const updateChartOptions = () => {
  if (!statusData.value) return

  const period = selectedTimePeriod.value
  const processedCounts = statusData.value.processedCounts
  const categories = Object.keys(processedCounts)

  // Extract data for the selected time period and convert to numbers
  const dataPoints = categories.map(category => {
    const strValue = processedCounts[category][period]
    // Parse the number string by removing dots/commas and converting to number
    const numValue = Number(strValue.replace(/\./g, '').replace(/,/g, ''))
    return {
      name: category,
      value: numValue
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
})
</script>

<template>
    <div class="mx-auto max-w-7xl">
      <div class="bg-gray-100 dark:bg-gray-900 rounded-lg shadow-lg p-3 md:p-8 mb-8">
        <div class="flex justify-between items-center mb-6">
          <h1 class="text-3xl md:text-4xl font-bold">{{ $t('status.title') }}</h1>
          <div class="flex items-center gap-3">
            <div class="flex items-center">
              <USwitch v-model="autoRefresh" @change="toggleAutoRefresh" />
              <span class="ml-2 text-sm">{{ $t('status.autoRefresh', { seconds: autoRefreshInterval }) }}</span>
            </div>
            <UButton
              color="primary"
              variant="ghost"
              icon="i-heroicons-arrow-path"
              @click="refresh"
              :loading="loading"
              :disabled="loading"
              :title="$t('status.refreshNow')"
            />
          </div>
        </div>

        <div v-if="loading && !statusData" class="flex justify-center my-12">
          <UProgress class="w-1/2" />
        </div>

        <div v-else-if="error" class="bg-red-100 dark:bg-red-900 border border-red-400 text-red-700 dark:text-red-300 px-4 py-3 rounded">
          <p>{{ error }}</p>
          <UButton class="mt-4" @click="refresh">{{ $t('status.retry') }}</UButton>
        </div>

        <ClientOnly fallback-tag="div" :fallback="$t('status.loading')">
          <div v-if="statusData">
            <!-- System Information -->
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mb-8">
              <div class="bg-gray-50 dark:bg-gray-800 rounded-lg shadow p-3">
                <h2 class="text-xl font-bold mb-4 flex items-center">
                  <UIcon name="i-heroicons-clock" class="mr-2" /> {{ $t('status.uptime.title') }}
                </h2>
                <div class="text-2xl font-mono">{{ formattedUptime }}</div>
                <div class="text-sm opacity-75 mt-2">
                  <div>{{ $t('status.uptime.since') }}: {{ formatDate(statusData.upSince) }}</div>
                  <div>{{ $t('status.uptime.localTime') }}: {{ formatDate(statusData.localTime) }}</div>
                </div>
              </div>

              <div class="bg-gray-50 dark:bg-gray-800 rounded-lg shadow p-3">
                <h2 class="text-xl font-bold mb-4 flex items-center">
                  <UIcon name="i-heroicons-server" class="mr-2" /> {{ $t('status.environment.title') }}
                </h2>
                <div class="space-y-2">
                  <div><span class="font-semibold">{{ $t('status.environment.nodeEnv') }}:</span> {{ statusData.env.nodeEnv }}</div>
                  <div><span class="font-semibold">{{ $t('status.environment.nodeVersion') }}:</span> {{ statusData.env.nodeVersion }}</div>
                  <div class="text-xs truncate"><span class="font-semibold">{{ $t('status.environment.process') }}:</span> {{ statusData.env.processName }}</div>
                </div>
              </div>

              <div class="bg-gray-50 dark:bg-gray-800 rounded-lg shadow p-3">
                <h2 class="text-xl font-bold mb-4 flex items-center">
                  <UIcon name="i-heroicons-cpu-chip" class="mr-2" /> {{ $t('status.operatingSystem.title') }}
                </h2>
                <div class="space-y-2">
                  <div><span class="font-semibold">{{ $t('status.operatingSystem.platform') }}:</span> {{ statusData.operatingSystem.systemPlatform }}</div>
                  <div><span class="font-semibold">{{ $t('status.operatingSystem.architecture') }}:</span> {{ statusData.operatingSystem.systemArch }}</div>
                  <div><span class="font-semibold">{{ $t('status.operatingSystem.loadAverage') }}:</span> {{ statusData.operatingSystem.loadAvg.join(' | ') }}</div>
                  <div><span class="font-semibold">{{ $t('status.operatingSystem.totalCPUs') }}:</span> {{ statusData.operatingSystem.totalCPUs }}</div>
                  <div><span class="font-semibold">{{ $t('status.operatingSystem.memory') }}:</span> {{ statusData.operatingSystem.totalMemoryGB }}</div>
                </div>
              </div>
            </div>

            <!-- Queue Counts -->
            <div class="bg-gray-50 dark:bg-gray-800 rounded-lg shadow p-3 mb-8">
              <h2 class="text-xl font-bold mb-4 flex items-center">
                <UIcon name="i-heroicons-queue-list" class="mr-2" /> {{ $t('status.queueCounts.title') }}
              </h2>
              <div class="overflow-x-auto">
                <table class="min-w-full bg-transparent">
                  <thead>
                    <tr>
                      <th class="px-4 py-2 text-left font-semibold">{{ $t('status.queueCounts.queue') }}</th>
                      <th class="px-4 py-2 text-right font-semibold">{{ $t('status.queueCounts.count') }}</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="(count, queue) in statusData.queueCounts" :key="queue"
                        class="border-t border-gray-200 dark:border-gray-700">
                      <td class="px-4 py-2 capitalize">{{ queue }}</td>
                      <td class="px-4 py-2 text-right font-mono">{{ count }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <!-- Processed Counts Graph -->
            <div class="bg-gray-50 dark:bg-gray-800 rounded-lg shadow p-3 mb-8">
              <h2 class="text-xl font-bold mb-4 flex items-center">
                <UIcon name="i-heroicons-chart-bar" class="mr-2" /> {{ $t('status.processingStatistics.title') }}
              </h2>

              <div class="mb-4">
                <label for="timePeriod" class="block text-sm font-medium mb-1">{{ $t('status.timePeriod') }}:</label>
                <USelect
                  id="timePeriod"
                  v-model="selectedTimePeriod"
                  :options="timePeriods"
                />
              </div>

              <div class="h-80 relative">
                <div v-if="loading" class="absolute inset-0 flex items-center justify-center bg-gray-50/50 dark:bg-gray-800/50 backdrop-blur-sm z-10">
                  <UIcon name="i-heroicons-arrow-path" class="animate-spin h-8 w-8" />
                </div>
                <v-chart class="w-full h-full" :option="chartOptions" autoresize />
              </div>

              <!-- Detailed Table -->
              <div class="mt-8 overflow-x-auto">
                <table class="min-w-full bg-transparent">
                  <thead>
                    <tr>
                      <th class="px-2 py-2 text-left font-semibold">{{ $t('status.queueCounts.queue') }}</th>
                      <th v-for="period in timePeriods" :key="period.value" class="px-2 py-2 text-right font-semibold">
                        {{ period.label }}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="(data, queue) in statusData.processedCounts" :key="queue"
                        class="border-t border-gray-200 dark:border-gray-700">
                      <td class="px-2 py-2 capitalize">{{ queue }}</td>
                      <td v-for="period in timePeriods" :key="period.value" class="px-2 py-2 text-right font-mono">
                        {{ data[period.value] }}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <!-- Database Counts -->
            <div class="bg-gray-50 dark:bg-gray-800 rounded-lg shadow p-3 mb-8">
              <h2 class="text-xl font-bold mb-4 flex items-center">
                <UIcon name="i-heroicons-cube" class="mr-2" /> {{ $t('status.databaseCounts.title') }}
              </h2>
              <div class="overflow-x-auto">
                <table class="min-w-full bg-transparent">
                  <thead>
                    <tr>
                      <th class="px-4 py-2 text-left font-semibold">{{ $t('status.databaseCounts.collection') }}</th>
                      <th class="px-4 py-2 text-right font-semibold">{{ $t('status.databaseCounts.count') }}</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="(count, collection) in statusData.databaseCounts" :key="collection"
                        class="border-t border-gray-200 dark:border-gray-700"
                        :class="{'bg-amber-100 dark:bg-amber-900': collection === 'unprocessedCount'}">
                      <td class="px-4 py-2 capitalize">{{ collection }}</td>
                      <td class="px-4 py-2 text-right font-mono">{{ count }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <!-- Cache Information -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-3 mb-8">
              <!-- Cache Sizes -->
              <div class="bg-gray-50 dark:bg-gray-800 rounded-lg shadow p-3">
                <h2 class="text-xl font-bold mb-4 flex items-center">
                  <UIcon name="i-heroicons-table-cells" class="mr-2" /> {{ $t('status.cacheSizes.title') }}
                </h2>
                <div class="overflow-x-auto">
                  <table class="min-w-full bg-transparent">
                    <thead>
                      <tr>
                        <th class="px-4 py-2 text-left font-semibold">{{ $t('status.cacheSizes.cache') }}</th>
                        <th class="px-4 py-2 text-right font-semibold">{{ $t('status.cacheSizes.size') }}</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr v-for="(size, cache) in statusData.cacheSizes" :key="cache"
                          class="border-t border-gray-200 dark:border-gray-700">
                        <td class="px-4 py-2">{{ cache }}</td>
                        <td class="px-4 py-2 text-right font-mono">{{ size }}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              <!-- Cache Hits -->
              <div class="bg-gray-50 dark:bg-gray-800 rounded-lg shadow p-3">
                <h2 class="text-xl font-bold mb-4 flex items-center">
                  <UIcon name="i-heroicons-bolt" class="mr-2" /> {{ $t('status.cacheHits.title') }}
                </h2>
                <div class="overflow-x-auto">
                  <table class="min-w-full bg-transparent">
                    <thead>
                      <tr>
                        <th class="px-4 py-2 text-left font-semibold">{{ $t('status.cacheHits.cache') }}</th>
                        <th class="px-4 py-2 text-right font-semibold">{{ $t('status.cacheHits.hits') }}</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr v-for="(hits, cache) in statusData.cacheHits" :key="cache"
                          class="border-t border-gray-200 dark:border-gray-700">
                        <td class="px-4 py-2">{{ cache }}</td>
                        <td class="px-4 py-2 text-right font-mono">{{ hits }}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <!-- Last update indicator -->
            <div class="text-center text-sm text-gray-500 dark:text-gray-400">
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
