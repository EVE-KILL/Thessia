<script setup lang="ts">
import { useDocumentVisibility, useIntervalFn } from "@vueuse/core";
import { BarChart } from "echarts/charts";
import {
  GridComponent,
  LegendComponent,
  TitleComponent,
  TooltipComponent,
} from "echarts/components";
import { use } from "echarts/core";
import { CanvasRenderer } from "echarts/renderers";
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from "vue";
import VChart from "vue-echarts";

// Get i18n instance
const { t } = useI18n();
const isMobile = ref(false);

// Add SEO meta
useSeoMeta({
  title: t("statusPageTitle"),
});

// Check if we're on mobile
const checkIfMobile = () => {
  isMobile.value = window.innerWidth < 768;
};

// Register ECharts components
use([CanvasRenderer, BarChart, TitleComponent, TooltipComponent, LegendComponent, GridComponent]);

// Chart options
const chartOptions = ref({});

// Time period options for chart display
const timePeriods = [
  { value: "1min", label: t("1min") },
  { value: "5min", label: t("5min") },
  { value: "10min", label: t("10min") },
  { value: "15min", label: t("15min") },
  { value: "30min", label: t("30min") },
  { value: "1hour", label: t("1hour") },
  { value: "6hours", label: t("6hours") },
  { value: "12hours", label: t("12hours") },
  { value: "24hours", label: t("24hours") },
  { value: "1week", label: t("1week") },
  { value: "1month", label: t("1month") },
];
// Default time period
const selectedTimePeriod = ref("5min");

// Auto refresh settings
const autoRefresh = ref(true);
const autoRefreshInterval = ref(10); // seconds
const scrollPosition = ref(0);

// Use VueUse to track document visibility
const isVisible = useDocumentVisibility();

// Track change stats for UI display
const prevProcessedCount = ref(0);
const prevQueuedCount = ref(0);
const processedDiff = ref(0);
const queuedDiff = ref(0);

// Fetch status data
const {
  data: statusData,
  pending: loading,
  error,
  refresh: refreshData,
} = useLazyFetch("/api/status", {
  server: false, // Only fetch on client-side
});

// Custom refresh function with change tracking
const refresh = async () => {
  try {
    if (import.meta.client) {
      scrollPosition.value = window.scrollY;
    }

    // Store current values to calculate difference
    if (statusData.value) {
      prevProcessedCount.value = summaryStats.value?.totalProcessed || 0;
      prevQueuedCount.value = summaryStats.value?.totalQueued || 0;
    }

    await refreshData();

    // Calculate differences
    if (statusData.value) {
      processedDiff.value = (summaryStats.value?.totalProcessed || 0) - prevProcessedCount.value;
      queuedDiff.value = (summaryStats.value?.totalQueued || 0) - prevQueuedCount.value;
    }

    if (import.meta.client) {
      nextTick(() => {
        window.scrollTo({
          top: scrollPosition.value,
          behavior: "instant",
        });
      });
    }
  } catch (err) {
    console.error("Error refreshing data:", err);
  }
};

// Setup auto-refresh
const { pause, resume } = useIntervalFn(() => {
  if (import.meta.client && isVisible.value === "visible" && autoRefresh.value) {
    refresh();
  }
}, autoRefreshInterval.value * 1000);

// Toggle auto-refresh
const toggleAutoRefresh = () => {
  autoRefresh.value = !autoRefresh.value;
  if (autoRefresh.value) {
    resume();
  } else {
    pause();
  }
};

// Format uptime to days, hours, minutes, seconds
const formattedUptime = computed(() => {
  if (!statusData.value) return "";

  const uptime = statusData.value.uptime;
  const days = Math.floor(uptime / (24 * 60 * 60));
  const hours = Math.floor((uptime % (24 * 60 * 60)) / (60 * 60));
  const minutes = Math.floor((uptime % (60 * 60)) / 60);
  const seconds = Math.floor(uptime % 60);

  return t("uptimeFormat", { days, hours, minutes, seconds });
});

// Format date to locale string
const formatDate = (dateString) => {
  return new Date(dateString);
};

// Format numbers using locale
const formatNumber = (value: number): string => {
  return value;
};

// Function to update chart options
const updateChartOptions = () => {
  if (!statusData.value) return;

  const period = selectedTimePeriod.value;
  const processedCounts = statusData.value.processedCounts;
  const categories = Object.keys(processedCounts);

  // Extract data for the selected time period
  const dataPoints = categories.map((category) => {
    const value = processedCounts[category][period];
    return {
      name: category,
      value: typeof value === "number" ? value : 0,
    };
  });

  // Sort by value (descending order)
  dataPoints.sort((a, b) => b.value - a.value);

  // Colors for the bars
  const colors = [
    "#FF6384",
    "#36A2EB",
    "#FFCE56",
    "#4BC0C0",
    "#9966FF",
    "#FF9F40",
    "#C7C7C7",
    "#8AC926",
    "#1982C4",
    "#6A4C93",
    "#FFCA3A",
    "#FF595E",
  ];

  // Create chart options
  chartOptions.value = {
    title: {
      text: t("processedItems", { period: period }),
      left: "center",
    },
    tooltip: {
      trigger: "axis",
      axisPointer: { type: "shadow" },
      formatter: (params) => {
        const data = params[0];
        return `${data.name}: ${data.value}`;
      },
    },
    grid: {
      left: "5%",
      right: "20%",
      bottom: "5%",
      containLabel: true,
    },
    xAxis: {
      type: "value",
      axisLabel: { formatter: (value) => value },
    },
    yAxis: {
      type: "category",
      data: dataPoints.map((item) => item.name),
      axisLabel: { formatter: (value) => value.charAt(0).toUpperCase() + value.slice(1) },
    },
    series: [
      {
        type: "bar",
        data: dataPoints.map((item, index) => ({
          value: item.value,
          itemStyle: { color: colors[index % colors.length] },
        })),
      },
    ],
  };
};

// Watch for changes in data and time period
watch(
  [statusData, selectedTimePeriod],
  () => {
    if (statusData.value) {
      updateChartOptions();
    }
  },
  { immediate: true },
);

// Watch visibility changes
watch(isVisible, (newValue) => {
  if (newValue === "visible" && autoRefresh.value) {
    resume();
  } else {
    pause();
  }
});

// Setup when mounted
onMounted(() => {
  if (autoRefresh.value) {
    resume();
  }

  checkIfMobile();
  window.addEventListener("resize", checkIfMobile);
});

onUnmounted(() => {
  window.removeEventListener("resize", checkIfMobile);
});

// Tab state
const activeTab = ref("overview");
const detailed = ref(false);

// Summary stats computed property
const summaryStats = computed(() => {
  if (!statusData.value) return null;

  return {
    totalQueued: Object.values(statusData.value.queueCounts).reduce(
      (sum, val) => sum + (typeof val === "number" ? val : 0),
      0,
    ),
    totalProcessed: Object.values(statusData.value.processedCounts).reduce(
      (sum, val) => sum + (val["5min"] || 0),
      0,
    ),
    unprocessedItems: statusData.value.databaseCounts.unprocessedCount || 0,
  };
});

// Format bytes to human readable format
const formatBytes = (bytes?: number): string => {
  if (bytes === undefined) return "N/A";

  const units = ["B", "KB", "MB", "GB", "TB"];
  let value = bytes;
  let unitIndex = 0;

  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex++;
  }

  return `${value.toFixed(2)} ${units[unitIndex]}`;
};

// Format Redis uptime
const formatRedisUptime = (seconds?: number): string => {
  if (!seconds) return "N/A";

  const days = Math.floor(seconds / (24 * 60 * 60));
  const hours = Math.floor((seconds % (24 * 60 * 60)) / (60 * 60));
  const minutes = Math.floor((seconds % (60 * 60)) / 60);
  const remainingSeconds = Math.floor(seconds % 60);

  return t("uptimeFormat", { days, hours, minutes, seconds: remainingSeconds });
};

// Format time in milliseconds to human readable format
const formatTime = (ms?: number): string => {
  if (!ms) return "N/A";

  if (ms < 1000) return `${ms} ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(2)} s`;
  if (ms < 3600000) return `${(ms / 60000).toFixed(2)} min`;

  return `${(ms / 3600000).toFixed(2)} h`;
};

// Calculate hit ratio
const calculateHitRatio = (hits?: number, misses?: number): string => {
  if (!hits || !misses) return "N/A";
  const total = hits + misses;
  if (total === 0) return "0.00";

  return ((hits / total) * 100).toFixed(2);
};

// Parse keyspace info string
const parseKeyspaceInfo = (info: string) => {
  const result = { keys: 0, expires: 0, avg_ttl: 0 };

  if (typeof info === "string") {
    const parts = info.split(",");
    parts.forEach((part) => {
      if (part.includes("keys=")) result.keys = Number.parseInt(part.split("=")[1], 10);
      if (part.includes("expires=")) result.expires = Number.parseInt(part.split("=")[1], 10);
      if (part.includes("avg_ttl=")) result.avg_ttl = Number.parseInt(part.split("=")[1], 10);
    });
  }

  return result;
};

// Check if keyspace info exists
const hasKeyspaceInfo = computed(() => {
  return (
    statusData.value?.redis?.keyspace && Object.keys(statusData.value.redis.keyspace).length > 0
  );
});
</script>

<template>
  <div class="mx-auto">
    <div class="bg-gray-100 dark:bg-gray-900 rounded-lg shadow-lg">
      <div class="flex justify-end items-center mb-4">
        <div class="flex items-center gap-2">
          <div class="flex items-center">
            <USwitch v-model="autoRefresh" @change="toggleAutoRefresh" />
            <span class="ml-2 text-xs sm:text-sm">{{ $t('autoRefresh', { seconds: autoRefreshInterval }) }}</span>
          </div>
          <UButton color="primary" variant="ghost" icon="lucide:refresh-cw" size="sm" @click="refresh"
            :loading="loading" :disabled="loading" :title="$t('refreshNow')" />
        </div>
      </div>

      <div v-if="loading && !statusData" class="flex justify-center my-8">
        <UProgress class="w-1/2" />
      </div>

      <div v-else-if="error"
        class="bg-red-100 dark:bg-red-900 border border-red-400 text-red-700 dark:text-red-300 px-4 py-3 rounded">
        <p>{{ error }}</p>
        <UButton class="mt-4" @click="refresh">{{ $t('retry') }}</UButton>
      </div>

      <ClientOnly fallback-tag="div" :fallback="$t('loading')">
        <div v-if="statusData">
          <!-- Summary Cards -->
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
            <div class="bg-indigo-50 dark:bg-indigo-900/30 rounded-lg shadow p-3">
              <div class="text-xs uppercase text-indigo-700 dark:text-indigo-300">{{ $t('uptime') }}</div>
              <div class="text-xl font-mono truncate">{{ formattedUptime }}</div>
            </div>
            <div class="bg-emerald-50 dark:bg-emerald-900/30 rounded-lg shadow p-3">
              <div class="text-xs uppercase text-emerald-700 dark:text-emerald-300">{{ $t('processedLast5m') }}</div>
              <div class="text-xl font-mono">
                {{ formatNumber(summaryStats?.totalProcessed) }}
                <span v-if="processedDiff !== 0"
                  :class="processedDiff > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'"
                  class="text-sm ml-1">
                  ({{ processedDiff > 0 ? '+' : '' }}{{ formatNumber(processedDiff) }})
                </span>
              </div>
            </div>
            <div class="bg-amber-50 dark:bg-amber-900/30 rounded-lg shadow p-3">
              <div class="text-xs uppercase text-amber-700 dark:text-amber-300">{{ $t('queuedItems') }}</div>
              <div class="text-xl font-mono">
                {{ formatNumber(summaryStats?.totalQueued) }}
                <span v-if="queuedDiff !== 0"
                  :class="queuedDiff > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-green-600 dark:text-green-400'"
                  class="text-sm ml-1">
                  ({{ queuedDiff > 0 ? '+' : '' }}{{ formatNumber(queuedDiff) }})
                </span>
              </div>
            </div>
          </div>

          <!-- Main Content Tabs - Using the correct default-selected prop -->
          <Tabs :items="[
            { label: isMobile ? '' : $t('overview'), icon: 'lucide:layout-dashboard', slot: 'overview', defaultSelected: true },
            { label: isMobile ? '' : $t('processing'), icon: 'lucide:bar-chart-2', slot: 'processing' },
            { label: isMobile ? '' : $t('database'), icon: 'lucide:database', slot: 'database' },
            { label: isMobile ? '' : $t('cache'), icon: 'lucide:hard-drive', slot: 'cache' },
            { label: isMobile ? '' : $t('redis'), icon: 'lucide:database', slot: 'redis' },
          ]" class="mb-6" color="neutral">
            <template #overview>
              <!-- Overview with refined 3-column layout -->
              <div class="space-y-4">
                <!-- Top row: 3 cards -->
                <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <!-- Improved System Information - Using overview-specific keys -->
                  <UCard>
                    <template #header>
                      <div class="flex items-center">
                        <UIcon name="lucide:cpu" class="mr-2" />
                        <h3 class="font-bold">{{ $t('systemInfo') }}</h3>
                      </div>
                    </template>
                    <div class="space-y-2 text-sm">
                      <div class="flex justify-between">
                        <span>{{ $t('loadAverage') }}:</span>
                        <span class="font-mono">{{ statusData.operatingSystem.loadAvg.join(' | ') }}</span>
                      </div>
                      <div class="flex justify-between">
                        <span>{{ $t('nodeVersion') }}:</span>
                        <span class="font-mono">{{ statusData.env.nodeVersion }}</span>
                      </div>
                      <div class="flex justify-between">
                        <span>{{ $t('redisVersion') }}:</span>
                        <span class="font-mono">{{ statusData.redis?.server?.redis_version || 'N/A' }}</span>
                      </div>
                      <div class="flex justify-between">
                        <span>{{ $t('redisMemory') }}:</span>
                        <span class="font-mono">{{ formatBytes(statusData.redis?.memory?.used_memory) }}</span>
                      </div>
                      <div class="flex justify-between">
                        <span>{{ $t('redisClients') }}:</span>
                        <span class="font-mono">{{ formatNumber(statusData.redis?.clients?.connected_clients) }}</span>
                      </div>
                      <div class="flex justify-between">
                        <span>{{ $t('hitRatio') }}:</span>
                        <span class="font-mono">{{ calculateHitRatio(statusData.redis?.stats?.keyspace_hits,
                          statusData.redis?.stats?.keyspace_misses) }}%</span>
                      </div>
                      <div class="flex justify-between">
                        <span>{{ $t('totalKeys') }}:</span>
                        <span class="font-mono">{{
                          statusData.redis?.keyspace ?
                            formatNumber(Object.values(statusData.redis.keyspace).reduce((total, info) => total +
                              parseKeyspaceInfo(info as string).keys, 0)) : 'N/A'
                        }}</span>
                      </div>
                    </div>
                  </UCard>

                  <!-- Processing Stats - Using overview-specific keys -->
                  <UCard>
                    <template #header>
                      <div class="flex items-center">
                        <UIcon name="lucide:bar-chart-2" class="mr-2" />
                        <h3 class="font-bold">{{ $t('processing') }}</h3>
                      </div>
                    </template>
                    <div class="space-y-2 text-sm">
                      <!-- Top 3 processed items in 5min -->
                      <div
                        v-for="(queue, index) in Object.keys(statusData.processedCounts).sort((a, b) => (statusData.processedCounts[b]['5min'] || 0) - (statusData.processedCounts[a]['5min'] || 0))"
                        :key="queue" class="flex justify-between">
                        <span class="capitalize">{{ queue }}:</span>
                        <span class="font-mono">{{ formatNumber(statusData.processedCounts[queue]['5min'] || 0)
                        }}</span>
                      </div>
                    </div>
                  </UCard>

                  <!-- Queue Counts - Using overview-specific keys -->
                  <UCard>
                    <template #header>
                      <div class="flex items-center">
                        <UIcon name="lucide:list" class="mr-2" />
                        <h3 class="font-bold">{{ $t('queueCounts') }}</h3>
                      </div>
                    </template>

                    <div class="space-y-2 text-sm">
                      <!-- Top 5 queues -->
                      <div
                        v-for="(queue, index) in Object.entries(statusData.queueCounts || {}).sort(([, a], [, b]) => Number(b) - Number(a))"
                        :key="queue[0]" class="flex justify-between">
                        <span class="capitalize">{{ queue[0] }}:</span>
                        <span class="font-mono">{{ formatNumber(queue[1]) }}</span>
                      </div>
                    </div>
                  </UCard>
                </div>

                <!-- Bottom row: 1 card (cache info only) -->
                <div class="grid grid-cols-1 md:grid-cols-1 gap-4">
                  <!-- Cache Overview - Using overview-specific keys -->
                  <UCard>
                    <template #header>
                      <div class="flex items-center">
                        <UIcon name="lucide:zap" class="mr-2" />
                        <h3 class="font-bold">{{ $t('cache') }}</h3>
                      </div>
                    </template>
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <!-- Cache stats -->
                      <div class="space-y-2 text-sm">
                        <div class="overflow-y-auto">
                          <div v-for="cacheName in Object.keys(statusData.cacheSizes || {}).splice(0, 6)"
                            :key="cacheName" class="flex justify-between py-1">
                            <span class="truncate" :title="cacheName">{{ cacheName }}:</span>
                            <span class="font-mono">
                              {{ formatNumber(statusData.cacheSizes[cacheName]) }} /
                              <!-- cacheName below should have Cache stripped from the end of the string -->
                              {{ formatNumber(statusData.cacheHits[cacheName.endsWith('Cache') ? cacheName.slice(0, -5)
                                : cacheName] ||
                                0) }}
                            </span>
                          </div>
                        </div>
                      </div>

                      <!-- Additional cache stats or chart could go here -->
                      <div class="space-y-2 text-sm">
                        <div class="overflow-y-auto">
                          <div v-for="cacheName in Object.keys(statusData.cacheSizes || {}).splice(6)" :key="cacheName"
                            class="flex justify-between py-1">
                            <span class="truncate" :title="cacheName">{{ cacheName }}:</span>
                            <span class="font-mono">
                              {{ formatNumber(statusData.cacheSizes[cacheName]) }} /
                              <!-- cacheName below should have Cache stripped from the end of the string -->
                              {{ formatNumber(statusData.cacheHits[cacheName.endsWith('Cache') ? cacheName.slice(0, -5)
                                : cacheName] ||
                                0) }}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </UCard>
                </div>
              </div>
            </template>

            <template #processing>
              <UCard>
                <template #header>
                  <div class="flex justify-between items-center">
                    <div class="flex items-center">
                      <UIcon name="lucide:bar-chart-2" class="mr-2" />
                      <h3 class="font-bold">{{ $t('processingStatisticsTitle') }}</h3>
                    </div>
                    <div class="flex items-center gap-2">
                      <USwitch v-model="detailed" size="sm" />
                      <span class="text-xs">{{ detailed ? $t('detailed') : $t('simplified') }}</span>
                    </div>
                  </div>
                </template>

                <div class="mb-4">
                  <label for="timePeriod" class="block text-xs font-medium mb-1">{{ $t('selectTimePeriod') }}:</label>
                  <USelect id="timePeriod" v-model="selectedTimePeriod" :items="timePeriods" size="sm"
                    placeholder="Select time period" icon="lucide:clock" />
                </div>

                <div class="h-64 relative mb-4">
                  <div v-if="loading"
                    class="absolute inset-0 flex items-center justify-center bg-gray-50/50 dark:bg-gray-800/50 backdrop-blur-sm z-10">
                    <UIcon name="lucide:loader" class="animate-spin h-6 w-6" />
                  </div>
                  <v-chart class="w-full h-full" :option="chartOptions" autoresize />
                </div>

                <!-- Show detailed stats directly when detailed is true -->
                <div v-if="detailed" class="mt-4">
                  <h4 class="font-medium text-sm mb-2">{{ $t('detailedStats') }}</h4>
                  <div class="overflow-x-auto">
                    <!-- This table should automatically update when statusData changes -->
                    <table class="min-w-full text-xs">
                      <thead>
                        <tr>
                          <th class="py-1 text-left">{{ $t('queue') }}</th>
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
                    <h3 class="font-bold">{{ $t('databaseCountsTitle') }}</h3>
                  </div>
                </template>

                <div class="overflow-x-auto">
                  <table class="min-w-full">
                    <thead>
                      <tr>
                        <th class="text-left text-xs">{{ $t('collection') }}</th>
                        <th class="text-right text-xs">{{ $t('count') }}</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr v-for="(count, collection) in statusData.databaseCounts" :key="collection"
                        class="border-t border-gray-200 dark:border-gray-700"
                        :class="{ 'bg-amber-100 dark:bg-amber-900/50': collection === 'unprocessedCount' }">
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
                      <h3 class="font-bold">{{ $t('cacheSizesTitle') }}</h3>
                    </div>
                  </template>

                  <div class="overflow-x-auto">
                    <table class="min-w-full">
                      <thead>
                        <tr>
                          <th class="text-left text-xs">{{ $t('cache') }}</th>
                          <th class="text-right text-xs">{{ $t('size') }}</th>
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
                      <h3 class="font-bold">{{ $t('cacheHitsTitle') }}</h3>
                    </div>
                  </template>

                  <div class="overflow-x-auto">
                    <table class="min-w-full">
                      <thead>
                        <tr>
                          <th class="text-left text-xs">{{ $t('cache') }}</th>
                          <th class="text-right text-xs">{{ $t('hits') }}</th>
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

            <template #redis>
              <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <!-- Redis Server Information -->
                <UCard>
                  <template #header>
                    <div class="flex items-center">
                      <UIcon name="lucide:server" class="mr-2" />
                      <h3 class="font-bold">{{ $t('redisServer') }}</h3>
                    </div>
                  </template>

                  <div class="overflow-x-auto">
                    <table class="min-w-full">
                      <tbody>
                        <tr class="border-t border-gray-200 dark:border-gray-700">
                          <td class="py-1 text-sm">{{ $t('version') }}</td>
                          <td class="py-1 text-right font-mono text-sm">{{ statusData.redis.server.redis_version ||
                            'N/A' }}</td>
                        </tr>
                        <tr class="border-t border-gray-200 dark:border-gray-700">
                          <td class="py-1 text-sm">{{ $t('mode') }}</td>
                          <td class="py-1 text-right font-mono text-sm">{{ statusData.redis.server.redis_mode || 'N/A'
                          }}</td>
                        </tr>
                        <tr class="border-t border-gray-200 dark:border-gray-700">
                          <td class="py-1 text-sm">{{ $t('os') }}</td>
                          <td class="py-1 text-right font-mono text-sm">{{ statusData.redis.server.os || 'N/A' }}</td>
                        </tr>
                        <tr class="border-t border-gray-200 dark:border-gray-700">
                          <td class="py-1 text-sm">{{ $t('uptime') }}</td>
                          <td class="py-1 text-right font-mono text-sm">{{
                            formatRedisUptime(statusData.redis.server.uptime_in_seconds) }}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </UCard>

                <!-- Redis Memory Information -->
                <UCard>
                  <template #header>
                    <div class="flex items-center">
                      <UIcon name="lucide:memory-stick" class="mr-2" />
                      <h3 class="font-bold">{{ $t('memory') }}</h3>
                    </div>
                  </template>

                  <div class="overflow-x-auto">
                    <table class="min-w-full">
                      <tbody>
                        <tr class="border-t border-gray-200 dark:border-gray-700">
                          <td class="py-1 text-sm">{{ $t('usedMemory') }}</td>
                          <td class="py-1 text-right font-mono text-sm">{{
                            formatBytes(statusData.redis.memory.used_memory) }}</td>
                        </tr>
                        <tr class="border-t border-gray-200 dark:border-gray-700">
                          <td class="py-1 text-sm">{{ $t('usedMemoryPeak') }}</td>
                          <td class="py-1 text-right font-mono text-sm">{{
                            formatBytes(statusData.redis.memory.used_memory_peak) }}</td>
                        </tr>
                        <tr class="border-t border-gray-200 dark:border-gray-700">
                          <td class="py-1 text-sm">{{ $t('memFragmentationRatio') }}</td>
                          <td class="py-1 text-right font-mono text-sm">{{
                            formatNumber(statusData.redis.memory.mem_fragmentation_ratio)
                          }}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </UCard>

                <!-- Redis Statistics -->
                <UCard>
                  <template #header>
                    <div class="flex items-center">
                      <UIcon name="lucide:bar-chart" class="mr-2" />
                      <h3 class="font-bold">{{ $t('stats') }}</h3>
                    </div>
                  </template>

                  <div class="overflow-x-auto">
                    <table class="min-w-full">
                      <tbody>
                        <tr class="border-t border-gray-200 dark:border-gray-700">
                          <td class="py-1 text-sm">{{ $t('connectedClients') }}</td>
                          <td class="py-1 text-right font-mono text-sm">{{
                            formatNumber(statusData.redis.clients.connected_clients) }}
                          </td>
                        </tr>
                        <tr class="border-t border-gray-200 dark:border-gray-700">
                          <td class="py-1 text-sm">{{ $t('totalConnections') }}</td>
                          <td class="py-1 text-right font-mono text-sm">{{
                            formatNumber(statusData.redis.stats.total_connections_received) }}</td>
                        </tr>
                        <tr class="border-t border-gray-200 dark:border-gray-700">
                          <td class="py-1 text-sm">{{ $t('totalCommands') }}</td>
                          <td class="py-1 text-right font-mono text-sm">{{
                            formatNumber(statusData.redis.stats.total_commands_processed)
                          }}</td>
                        </tr>
                        <tr class="border-t border-gray-200 dark:border-gray-700">
                          <td class="py-1 text-sm">{{ $t('keyspaceHits') }}</td>
                          <td class="py-1 text-right font-mono text-sm">{{
                            formatNumber(statusData.redis.stats.keyspace_hits) }}</td>
                        </tr>
                        <tr class="border-t border-gray-200 dark:border-gray-700">
                          <td class="py-1 text-sm">{{ $t('keyspaceMisses') }}</td>
                          <td class="py-1 text-right font-mono text-sm">{{
                            formatNumber(statusData.redis.stats.keyspace_misses) }}</td>
                        </tr>
                        <tr class="border-t border-gray-200 dark:border-gray-700">
                          <td class="py-1 text-sm">{{ $t('hitRatio') }}</td>
                          <td class="py-1 text-right font-mono text-sm">
                            {{ calculateHitRatio(statusData.redis.stats.keyspace_hits,
                              statusData.redis.stats.keyspace_misses) }}%
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </UCard>

                <!-- Redis Keyspace -->
                <UCard v-if="hasKeyspaceInfo">
                  <template #header>
                    <div class="flex items-center">
                      <UIcon name="lucide:key" class="mr-2" />
                      <h3 class="font-bold">{{ $t('keyspace') }}</h3>
                    </div>
                  </template>

                  <div class="overflow-x-auto">
                    <table class="min-w-full">
                      <thead>
                        <tr>
                          <th class="text-left text-xs">{{ $t('database') }}</th>
                          <th class="text-right text-xs">{{ $t('keys') }}</th>
                          <th class="text-right text-xs">{{ $t('expires') }}</th>
                          <th class="text-right text-xs">{{ $t('avgTtl') }}</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr v-for="(info, db) in statusData.redis.keyspace" :key="db"
                          class="border-t border-gray-200 dark:border-gray-700">
                          <td class="py-1 text-sm">{{ db }}</td>
                          <td class="py-1 text-right font-mono text-sm">{{ formatNumber(parseKeyspaceInfo(info).keys) }}
                          </td>
                          <td class="py-1 text-right font-mono text-sm">{{ formatNumber(parseKeyspaceInfo(info).expires)
                          }}</td>
                          <td class="py-1 text-right font-mono text-sm">{{ formatTime(parseKeyspaceInfo(info).avg_ttl)
                          }}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </UCard>
              </div>
            </template>
          </Tabs>

          <!-- Last update indicator -->
          <div class="text-center text-xs text-gray-500 dark:text-gray-400 mt-4">
            <span>{{ $t('lastUpdated', { time: formatDate(new Date()) }) }}</span>
            <span v-if="autoRefresh"> · {{ $t('autoRefreshing', { seconds: autoRefreshInterval }) }}</span>
          </div>
        </div>
      </ClientOnly>
    </div>
  </div>
</template>

<style scoped>
/* No custom classes needed anymore */
</style>
