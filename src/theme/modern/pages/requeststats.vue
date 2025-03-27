<script setup lang="ts">
import { ref, computed, onMounted, watch, onUnmounted } from 'vue';
import { useIntervalFn, useDocumentVisibility } from '@vueuse/core';
import VChart from 'vue-echarts';
import { use } from 'echarts/core';
import { CanvasRenderer } from 'echarts/renderers';
import { BarChart, PieChart, LineChart } from 'echarts/charts';
import {
    TitleComponent,
    TooltipComponent,
    LegendComponent,
    GridComponent,
    DataZoomComponent
} from 'echarts/components';

// Get i18n instance
const { t } = useI18n();
const isMobile = ref(false);

// Get auth state to check if user is administrator
const { isAdministrator } = useAuth();

// Add SEO meta
useSeoMeta({
  title: t('requeststats.pageTitle'),
  description: t('requeststats.pageDescription')
});

// Register ECharts components
use([
  CanvasRenderer,
  BarChart,
  PieChart,
  LineChart,
  TitleComponent,
  TooltipComponent,
  LegendComponent,
  GridComponent,
  DataZoomComponent
]);

// Time period options for chart display
const timePeriods = [
  { value: '5min', label: t('requeststats.timePeriods.5min') },
  { value: '10min', label: t('requeststats.timePeriods.10min') },
  { value: '30min', label: t('requeststats.timePeriods.30min') },
  { value: '1hour', label: t('requeststats.timePeriods.1hour') },
  { value: '6hours', label: t('requeststats.timePeriods.6hours') },
  { value: '12hours', label: t('requeststats.timePeriods.12hours') },
  { value: '24hours', label: t('requeststats.timePeriods.24hours') },
  { value: '7days', label: t('requeststats.timePeriods.7days') },
  { value: '30days', label: t('requeststats.timePeriods.30days') }
];

// Default time period
const selectedTimePeriod = ref('24hours');

// Request type selection (all, web, api)
const requestType = ref('web');

// Chart options
const pageViewsChartOptions = ref({});
const browserChartOptions = ref({});
const osChartOptions = ref({});
const deviceChartOptions = ref({});
const timeSeriesChartOptions = ref({});
const statusCodeChartOptions = ref({});
const apiEndpointsChartOptions = ref({});

// Auto refresh settings
const autoRefresh = ref(true);
const autoRefreshInterval = ref(30); // seconds
const scrollPosition = ref(0);

// Use VueUse to track document visibility
const isVisible = useDocumentVisibility();

// Check if we're on mobile
const checkIfMobile = () => {
  isMobile.value = window.innerWidth < 768;
};

// Create custom tooltip reference
const tooltip = ref({
  visible: false,
  text: '',
  x: 0,
  y: 0
});

// Method to show tooltip on URL hover
const showTooltip = (event, text) => {
  if (!text) return;

  tooltip.value.visible = true;
  tooltip.value.text = text;

  // Position the tooltip near the cursor
  const rect = event.target.getBoundingClientRect();
  tooltip.value.x = rect.left;
  tooltip.value.y = rect.bottom + window.scrollY + 5; // 5px below the element
};

// Method to hide tooltip
const hideTooltip = () => {
  tooltip.value.visible = false;
};

// Fetch request statistics data for the current request type
const fetchRequestStats = () => {
  return useLazyFetch('/api/status/requeststats', {
    server: false, // Only fetch on client-side
    query: {
      period: selectedTimePeriod,
      type: requestType,
      _t: Date.now() // Add timestamp to prevent caching
    }
  });
};

// Initialize data fetch
const { data: statsData, pending: loading, error, refresh: refreshData } = fetchRequestStats();

// Fetch admin data if user is administrator
const { data: adminData, refresh: refreshAdminData } = useLazyFetch('/api/status/requeststats/admin', {
  server: false,
  query: {
    period: selectedTimePeriod,
    _t: Date.now() // Add timestamp to prevent caching
  },
  immediate: false // Don't fetch immediately
});

// Custom refresh function
const refresh = async () => {
  try {
    if (import.meta.client) {
      scrollPosition.value = window.scrollY;
    }

    await refreshData();

    // Refresh admin data if user is administrator
    if (isAdministrator.value) {
      await refreshAdminData();
    }

    if (import.meta.client) {
      nextTick(() => {
        window.scrollTo({
          top: scrollPosition.value,
          behavior: 'instant'
        });
      });
    }
  } catch (err) {
    console.error('Error refreshing data:', err);
  }
};

// Setup auto-refresh
const { pause, resume } = useIntervalFn(() => {
  if (import.meta.client && isVisible.value === 'visible' && autoRefresh.value) {
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

// Format date to locale string
const formatDate = (dateString) => {
  return new Date(dateString).toLocaleString();
};

// Format numbers using locale
const formatNumber = (value: number): string => {
  return value?.toLocaleString("en-US") || "0";
};

// Calculate percentage of API vs Web requests
const apiRequestPercentage = computed(() => {
  if (!statsData.value) return 0;
  const total = statsData.value.totalRequests;
  if (total === 0) return 0;
  return Math.round((statsData.value.totalApiRequests / total) * 100);
});

const webRequestPercentage = computed(() => {
  if (!statsData.value) return 0;
  return 100 - apiRequestPercentage.value;
});

// Function to update chart options - Page Views
const updatePageViewsChart = () => {
  if (!statsData.value?.pageViews) return;

  // Take top 15 page views
  const data = statsData.value.pageViews.slice(0, 15).map(item => ({
    name: item.url,
    value: item.count
  }));

  pageViewsChartOptions.value = {
    title: {
      text: requestType.value === 'api' ? t('requeststats.charts.apiEndpoints') : t('requeststats.charts.pageViews'),
      left: 'center'
    },
    tooltip: {
      trigger: 'item',
      formatter: '{b}: {c} ({d}%)'
    },
    series: [{
      name: requestType.value === 'api' ? t('requeststats.charts.apiEndpoints') : t('requeststats.charts.pageViews'),
      type: 'pie',
      radius: ['40%', '70%'],
      itemStyle: {
        borderRadius: 10,
        borderColor: '#fff',
        borderWidth: 2
      },
      label: {
        show: false
      },
      emphasis: {
        label: {
          show: true,
          fontSize: '14',
          fontWeight: 'bold'
        }
      },
      labelLine: {
        show: false
      },
      data: data
    }]
  };
};

// Function to update API endpoints chart (for overview)
const updateApiEndpointsChart = () => {
  if (!statsData.value?.topApiEndpoints) return;

  // Take top 10 API endpoints
  const data = statsData.value.topApiEndpoints.slice(0, 10).map(item => ({
    name: item.url,
    value: item.count
  }));

  apiEndpointsChartOptions.value = {
    title: {
      text: t('requeststats.charts.topApiEndpoints'),
      left: 'center'
    },
    tooltip: {
      trigger: 'item',
      formatter: '{b}: {c} ({d}%)'
    },
    series: [{
      name: t('requeststats.charts.topApiEndpoints'),
      type: 'pie',
      radius: ['40%', '70%'],
      itemStyle: {
        borderRadius: 10,
        borderColor: '#fff',
        borderWidth: 2
      },
      label: {
        show: false
      },
      emphasis: {
        label: {
          show: true,
          fontSize: '14',
          fontWeight: 'bold'
        }
      },
      labelLine: {
        show: false
      },
      data: data
    }]
  };
};

// Function to update browsers chart
const updateBrowsersChart = () => {
  if (!statsData.value?.browserStats) return;

  const data = statsData.value.browserStats.map(item => ({
    value: item.count,
    name: item.name
  }));

  browserChartOptions.value = {
    title: {
      text: t('requeststats.charts.browsers'),
      left: 'center'
    },
    tooltip: {
      trigger: 'item',
      formatter: '{b}: {c} ({d}%)'
    },
    series: [{
      name: t('requeststats.charts.browsers'),
      type: 'pie',
      radius: '65%',
      data: data,
      emphasis: {
        itemStyle: {
          shadowBlur: 10,
          shadowOffsetX: 0,
          shadowColor: 'rgba(0, 0, 0, 0.5)'
        }
      }
    }]
  };
};

// Function to update OS chart
const updateOsChart = () => {
  if (!statsData.value?.osStats) return;

  const data = statsData.value.osStats.map(item => ({
    value: item.count,
    name: item.name
  }));

  osChartOptions.value = {
    title: {
      text: t('requeststats.charts.operatingSystems'),
      left: 'center'
    },
    tooltip: {
      trigger: 'item',
      formatter: '{b}: {c} ({d}%)'
    },
    series: [{
      name: t('requeststats.charts.operatingSystems'),
      type: 'pie',
      radius: '65%',
      data: data,
      emphasis: {
        itemStyle: {
          shadowBlur: 10,
          shadowOffsetX: 0,
          shadowColor: 'rgba(0, 0, 0, 0.5)'
        }
      }
    }]
  };
};

// Function to update Device chart
const updateDeviceChart = () => {
  if (!statsData.value?.deviceStats) return;

  const data = statsData.value.deviceStats.map(item => ({
    value: item.count,
    name: item.name
  }));

  deviceChartOptions.value = {
    title: {
      text: t('requeststats.charts.devices'),
      left: 'center'
    },
    tooltip: {
      trigger: 'item',
      formatter: '{b}: {c} ({d}%)'
    },
    series: [{
      name: t('requeststats.charts.devices'),
      type: 'pie',
      radius: '65%',
      data: data,
      emphasis: {
        itemStyle: {
          shadowBlur: 10,
          shadowOffsetX: 0,
          shadowColor: 'rgba(0, 0, 0, 0.5)'
        }
      }
    }]
  };
};

// Function to update Status Code chart
const updateStatusCodeChart = () => {
  if (!statsData.value?.statusCodeStats) return;

  const data = statsData.value.statusCodeStats.map(item => ({
    name: `${item.code}`,
    value: item.count
  }));

  statusCodeChartOptions.value = {
    title: {
      text: t('requeststats.charts.statusCodes'),
      left: 'center'
    },
    tooltip: {
      trigger: 'item'
    },
    xAxis: {
      type: 'category',
      data: data.map(item => item.name)
    },
    yAxis: {
      type: 'value'
    },
    series: [{
      data: data.map(item => ({
        value: item.value,
        itemStyle: {
          color: getStatusCodeColor(parseInt(item.name, 10))
        }
      })),
      type: 'bar'
    }]
  };
};

// Function to get color based on status code
const getStatusCodeColor = (statusCode: number): string => {
  if (statusCode < 300) return '#67C23A'; // Success - green
  if (statusCode < 400) return '#E6A23C'; // Redirection - yellow
  if (statusCode < 500) return '#F56C6C'; // Client Error - red
  return '#909399'; // Server Error - gray
};

// Function to update Time Series chart
const updateTimeSeriesChart = () => {
  if (!statsData.value?.timeData) return;

  const data = statsData.value.timeData.map(item => [
    new Date(item.time).getTime(),
    item.count
  ]);

  timeSeriesChartOptions.value = {
    title: {
      text: t('requeststats.charts.requestsOverTime'),
      left: 'center'
    },
    tooltip: {
      trigger: 'axis',
      formatter: function(params) {
        const date = new Date(params[0].value[0]);
        return `${date.toLocaleString()}: ${params[0].value[1]} ${t('requeststats.requests')}`;
      },
      axisPointer: {
        animation: false
      }
    },
    xAxis: {
      type: 'time',
      splitLine: {
        show: false
      }
    },
    yAxis: {
      type: 'value',
      boundaryGap: [0, '100%'],
      splitLine: {
        show: false
      }
    },
    series: [{
      name: t('requeststats.requests'),
      type: 'line',
      showSymbol: false,
      data: data,
      lineStyle: {
        width: 2
      },
      areaStyle: {}
    }],
    dataZoom: [{
      type: 'inside',
      start: 0,
      end: 100
    }, {
      start: 0,
      end: 100
    }]
  };
};

// Tab state
const activeTab = ref('overview');

// Handle request type change
const changeRequestType = (type) => {
  requestType.value = type;
  // Reload data with the new request type
  refreshData();
};

// Watch for data changes and update charts
watch([statsData, selectedTimePeriod], () => {
  if (statsData.value) {
    updatePageViewsChart();
    updateBrowsersChart();
    updateOsChart();
    updateDeviceChart();
    updateStatusCodeChart();
    updateTimeSeriesChart();
    updateApiEndpointsChart();
  }
}, { immediate: true });

// Watch for time period changes
watch(selectedTimePeriod, () => {
  refresh();
});

// Watch for visibility changes
watch(isVisible, (newValue) => {
  if (newValue === 'visible' && autoRefresh.value) {
    resume();
  } else {
    pause();
  }
});

// Watch for administrator status changes
watch(isAdministrator, (isAdmin) => {
  if (isAdmin) {
    refreshAdminData();
  }
});

// Setup when mounted
onMounted(() => {
  if (autoRefresh.value) {
    resume();
  }

  checkIfMobile();
  window.addEventListener('resize', checkIfMobile);

  // Fetch admin data if user is administrator
  if (isAdministrator.value) {
    refreshAdminData();
  }
});

onUnmounted(() => {
  window.removeEventListener('resize', checkIfMobile);
});
</script>

<template>
  <div class="mx-auto">
    <!-- Tooltip element that follows cursor -->
    <Teleport to="body">
      <div v-if="tooltip.visible"
           class="fixed z-50 bg-white dark:bg-gray-800 p-2 rounded shadow-lg border border-gray-200 dark:border-gray-700 text-sm max-w-[90vw] backdrop-blur-md"
           :style="{top: `${tooltip.y}px`, left: `${tooltip.x}px`, backgroundColor: 'var(--color-background)', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)'}">
        {{ tooltip.text }}
      </div>
    </Teleport>

    <div class="bg-gray-100 dark:bg-gray-900 rounded-lg shadow-lg p-4">
      <div class="flex justify-between items-center mb-4">
        <h1 class="text-2xl font-bold">{{ $t('requeststats.pageTitle') }}</h1>
        <div class="flex items-center gap-2">
          <div class="flex items-center">
            <USwitch v-model="autoRefresh" @change="toggleAutoRefresh" />
            <span class="ml-2 text-xs sm:text-sm">{{ $t('requeststats.autoRefresh', { seconds: autoRefreshInterval }) }}</span>
          </div>
          <UButton
            color="primary"
            variant="ghost"
            icon="lucide:refresh-cw"
            size="sm"
            @click="refresh"
            :loading="loading"
            :disabled="loading"
            :title="$t('requeststats.refreshNow')"
          />
        </div>
      </div>

      <div v-if="loading && !statsData" class="flex justify-center my-8">
        <UProgress class="w-1/2" />
      </div>

      <div v-else-if="error" class="bg-red-100 dark:bg-red-900 border border-red-400 text-red-700 dark:text-red-300 px-4 py-3 rounded">
        <p>{{ error }}</p>
        <UButton class="mt-4" @click="refresh">{{ $t('requeststats.retry') }}</UButton>
      </div>

      <ClientOnly fallback-tag="div" :fallback="$t('requeststats.loading')">
        <div v-if="statsData">
          <!-- Time period selector -->
          <div class="mb-6">
            <label for="timePeriod" class="block text-sm font-medium mb-2">{{ $t('requeststats.selectTimePeriod') }}:</label>
            <USelect
              id="timePeriod"
              v-model="selectedTimePeriod"
              :items="timePeriods"
              size="sm"
              placeholder="Select time period"
              icon="lucide:clock"
              class="max-w-xs"
            />
          </div>

          <!-- Summary Cards - Now with Web/API Split -->
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
            <div class="bg-indigo-50 dark:bg-indigo-900/30 rounded-lg shadow p-4">
              <div class="text-xs uppercase text-indigo-700 dark:text-indigo-300">{{ $t('requeststats.totalRequests') }}</div>
              <div class="text-xl font-mono truncate">
                {{ formatNumber(statsData.totalWebRequests + statsData.totalApiRequests) }}
              </div>
              <div class="text-xs mt-1">
                <span class="text-blue-600 dark:text-blue-400">{{ $t('requeststats.webRequests') }}: {{ formatNumber(statsData.totalWebRequests) }} ({{ webRequestPercentage }}%)</span><br>
                <span class="text-green-600 dark:text-green-400">{{ $t('requeststats.apiRequests') }}: {{ formatNumber(statsData.totalApiRequests) }} ({{ apiRequestPercentage }}%)</span>
              </div>
            </div>

            <div class="bg-emerald-50 dark:bg-emerald-900/30 rounded-lg shadow p-4"
                 v-if="statsData.pageViews && statsData.pageViews.length > 0">
              <div class="text-xs uppercase text-emerald-700 dark:text-emerald-300">
                {{ requestType === 'api' ? $t('requeststats.topApiEndpoint') : $t('requeststats.topPage') }}
              </div>
              <div class="text-xl font-mono truncate">
                {{ statsData.pageViews[0].url }} ({{ formatNumber(statsData.pageViews[0].count) }})
              </div>
            </div>

            <div class="bg-amber-50 dark:bg-amber-900/30 rounded-lg shadow p-4"
                 v-if="statsData.browserStats && statsData.browserStats.length > 0">
              <div class="text-xs uppercase text-amber-700 dark:text-amber-300">{{ $t('requeststats.topBrowser') }}</div>
              <div class="text-xl font-mono truncate">
                {{ statsData.browserStats[0].name }} ({{ formatNumber(statsData.browserStats[0].count) }})
              </div>
            </div>

            <div class="bg-blue-50 dark:bg-blue-900/30 rounded-lg shadow p-4"
                 v-if="statsData.osStats && statsData.osStats.length > 0">
              <div class="text-xs uppercase text-blue-700 dark:text-blue-300">{{ $t('requeststats.topOS') }}</div>
              <div class="text-xl font-mono truncate">
                {{ statsData.osStats[0].name }} ({{ formatNumber(statsData.osStats[0].count) }})
              </div>
            </div>
          </div>

          <!-- Request Type Selector -->
          <div class="flex mb-6 border-b border-gray-200 dark:border-gray-700">
            <div class="mr-4">
              <UButton
                :color="requestType === 'web' ? 'primary' : 'gray'"
                variant="ghost"
                @click="changeRequestType('web')"
                class="rounded-b-none border-b-2"
                :class="requestType === 'web' ? 'border-primary-500' : 'border-transparent'"
              >
                {{ $t('requeststats.webRequests') }}
              </UButton>
            </div>
            <div>
              <UButton
                :color="requestType === 'api' ? 'primary' : 'gray'"
                variant="ghost"
                @click="changeRequestType('api')"
                class="rounded-b-none border-b-2"
                :class="requestType === 'api' ? 'border-primary-500' : 'border-transparent'"
              >
                {{ $t('requeststats.apiRequests') }}
              </UButton>
            </div>
          </div>

          <!-- Main Content Tabs -->
          <UTabs
            :items="[
              { label: isMobile ? '' : $t('requeststats.tabs.overview'), icon: 'lucide:layout-dashboard', slot: 'overview', defaultSelected: true },
              { label: isMobile ? '' : $t('requeststats.tabs.pages'), icon: 'lucide:file', slot: 'pages' },
              { label: isMobile ? '' : $t('requeststats.tabs.browsers'), icon: 'lucide:globe', slot: 'browsers' },
              { label: isMobile ? '' : $t('requeststats.tabs.timeline'), icon: 'lucide:trending-up', slot: 'timeline' },
              { label: isMobile ? '' : $t('requeststats.tabs.raw'), icon: 'lucide:database', slot: 'raw',
                disabled: !isAdministrator }
            ]"
            class="mb-6"
            color="neutral"
          >
            <!-- Overview Tab -->
            <template #overview>
              <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <!-- Main content charts -->
                <UCard v-if="requestType === 'web'">
                  <div class="h-64">
                    <v-chart :option="timeSeriesChartOptions" autoresize />
                  </div>
                </UCard>
                <UCard v-else>
                  <div class="h-64">
                    <v-chart :option="timeSeriesChartOptions" autoresize />
                  </div>
                </UCard>

                <UCard>
                  <div class="h-64">
                    <v-chart :option="pageViewsChartOptions" autoresize />
                  </div>
                </UCard>
              </div>

              <!-- If web request type, show both web and API stats on overview -->
              <div v-if="requestType === 'web'" class="mb-6">
                <UCard>
                  <template #header>
                    <div class="flex items-center">
                      <UIcon name="lucide:code" class="mr-2" />
                      <h3 class="font-bold">{{ $t('requeststats.charts.topApiEndpoints') }}</h3>
                    </div>
                  </template>

                  <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <div class="h-64">
                      <v-chart :option="apiEndpointsChartOptions" autoresize />
                    </div>
                    <div class="overflow-x-auto">
                      <table class="min-w-full">
                        <thead>
                          <tr class="bg-gray-50 dark:bg-gray-800">
                            <th class="py-3 px-4 text-left">{{ $t('requeststats.tableHeaders.apiEndpoint') }}</th>
                            <th class="py-3 px-4 text-right">{{ $t('requeststats.tableHeaders.count') }}</th>
                            <th class="py-3 px-4 text-right">{{ $t('requeststats.tableHeaders.percentage') }}</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr v-for="(endpoint, index) in statsData.topApiEndpoints?.slice(0, 10)" :key="index"
                              class="border-t border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                            <td class="py-3 px-4 max-w-xs truncate"
                                @mouseenter="showTooltip($event, endpoint.url)"
                                @mouseleave="hideTooltip">
                              <div class="cursor-help relative">
                                <span>{{ endpoint.url }}</span>
                              </div>
                            </td>
                            <td class="py-3 px-4 text-right font-mono">{{ formatNumber(endpoint.count) }}</td>
                            <td class="py-3 px-4 text-right font-mono">
                              {{ ((endpoint.count / statsData.totalApiRequests) * 100).toFixed(2) }}%
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                </UCard>
              </div>

              <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
                <!-- Bottom row charts -->
                <UCard>
                  <div class="h-64">
                    <v-chart :option="browserChartOptions" autoresize />
                  </div>
                </UCard>

                <UCard>
                  <div class="h-64">
                    <v-chart :option="osChartOptions" autoresize />
                  </div>
                </UCard>

                <UCard>
                  <div class="h-64">
                    <v-chart :option="deviceChartOptions" autoresize />
                  </div>
                </UCard>
              </div>
            </template>

            <!-- Pages Tab -->
            <template #pages>
              <UCard class="mb-6">
                <template #header>
                  <div class="flex items-center">
                    <UIcon name="lucide:file" class="mr-2" />
                    <h3 class="font-bold">
                      {{ requestType === 'api' ? $t('requeststats.charts.topApiEndpoints') : $t('requeststats.charts.topPages') }}
                    </h3>
                  </div>
                </template>

                <div class="overflow-x-auto">
                  <table class="min-w-full">
                    <thead>
                      <tr class="bg-gray-50 dark:bg-gray-800">
                        <th class="py-3 px-4 text-left">
                          {{ requestType === 'api' ? $t('requeststats.tableHeaders.apiEndpoint') : $t('requeststats.tableHeaders.url') }}
                        </th>
                        <th class="py-3 px-4 text-right">{{ $t('requeststats.tableHeaders.count') }}</th>
                        <th class="py-3 px-4 text-right">{{ $t('requeststats.tableHeaders.percentage') }}</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr v-for="(pageView, index) in statsData.pageViews" :key="index"
                          class="border-t border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                        <td class="py-3 px-4 max-w-xs truncate"
                            @mouseenter="showTooltip($event, pageView.url)"
                            @mouseleave="hideTooltip">
                          <div class="cursor-help relative">
                            <span>{{ pageView.url }}</span>
                          </div>
                        </td>
                        <td class="py-3 px-4 text-right font-mono">{{ formatNumber(pageView.count) }}</td>
                        <td class="py-3 px-4 text-right font-mono">
                          {{ ((pageView.count / statsData.totalRequests) * 100).toFixed(2) }}%
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </UCard>
            </template>

            <!-- Browsers Tab -->
            <template #browsers>
              <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <UCard>
                  <template #header>
                    <div class="flex items-center">
                      <UIcon name="lucide:globe" class="mr-2" />
                      <h3 class="font-bold">{{ $t('requeststats.charts.browsers') }}</h3>
                    </div>
                  </template>

                  <div class="overflow-x-auto">
                    <table class="min-w-full">
                      <thead>
                        <tr class="bg-gray-50 dark:bg-gray-800">
                          <th class="py-3 px-4 text-left">{{ $t('requeststats.tableHeaders.browser') }}</th>
                          <th class="py-3 px-4 text-right">{{ $t('requeststats.tableHeaders.count') }}</th>
                          <th class="py-3 px-4 text-right">{{ $t('requeststats.tableHeaders.percentage') }}</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr v-for="(browser, index) in statsData.browserStats" :key="index"
                            class="border-t border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                          <td class="py-3 px-4">{{ browser.name }}</td>
                          <td class="py-3 px-4 text-right font-mono">{{ formatNumber(browser.count) }}</td>
                          <td class="py-3 px-4 text-right font-mono">
                            {{ ((browser.count / statsData.totalRequests) * 100).toFixed(2) }}%
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </UCard>

                <UCard>
                  <template #header>
                    <div class="flex items-center">
                      <UIcon name="lucide:monitor" class="mr-2" />
                      <h3 class="font-bold">{{ $t('requeststats.charts.operatingSystems') }}</h3>
                    </div>
                  </template>

                  <div class="overflow-x-auto">
                    <table class="min-w-full">
                      <thead>
                        <tr class="bg-gray-50 dark:bg-gray-800">
                          <th class="py-3 px-4 text-left">{{ $t('requeststats.tableHeaders.os') }}</th>
                          <th class="py-3 px-4 text-right">{{ $t('requeststats.tableHeaders.count') }}</th>
                          <th class="py-3 px-4 text-right">{{ $t('requeststats.tableHeaders.percentage') }}</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr v-for="(os, index) in statsData.osStats" :key="index"
                            class="border-t border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                          <td class="py-3 px-4">{{ os.name }}</td>
                          <td class="py-3 px-4 text-right font-mono">{{ formatNumber(os.count) }}</td>
                          <td class="py-3 px-4 text-right font-mono">
                            {{ ((os.count / statsData.totalRequests) * 100).toFixed(2) }}%
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </UCard>
              </div>

              <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <UCard>
                  <template #header>
                    <div class="flex items-center">
                      <UIcon name="lucide:smartphone" class="mr-2" />
                      <h3 class="font-bold">{{ $t('requeststats.charts.devices') }}</h3>
                    </div>
                  </template>

                  <div class="overflow-x-auto">
                    <table class="min-w-full">
                      <thead>
                        <tr class="bg-gray-50 dark:bg-gray-800">
                          <th class="py-3 px-4 text-left">{{ $t('requeststats.tableHeaders.device') }}</th>
                          <th class="py-3 px-4 text-right">{{ $t('requeststats.tableHeaders.count') }}</th>
                          <th class="py-3 px-4 text-right">{{ $t('requeststats.tableHeaders.percentage') }}</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr v-for="(device, index) in statsData.deviceStats" :key="index"
                            class="border-t border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                          <td class="py-3 px-4">{{ device.name }}</td>
                          <td class="py-3 px-4 text-right font-mono">{{ formatNumber(device.count) }}</td>
                          <td class="py-3 px-4 text-right font-mono">
                            {{ ((device.count / statsData.totalRequests) * 100).toFixed(2) }}%
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </UCard>

                <UCard>
                  <template #header>
                    <div class="flex items-center">
                      <UIcon name="lucide:check-circle" class="mr-2" />
                      <h3 class="font-bold">{{ $t('requeststats.charts.statusCodes') }}</h3>
                    </div>
                  </template>

                  <div class="h-64">
                    <v-chart :option="statusCodeChartOptions" autoresize />
                  </div>
                </UCard>
              </div>
            </template>

            <!-- Timeline Tab -->
            <template #timeline>
              <UCard>
                <template #header>
                  <div class="flex items-center">
                    <UIcon name="lucide:trending-up" class="mr-2" />
                    <h3 class="font-bold">{{ $t('requeststats.charts.requestsOverTime') }}</h3>
                  </div>
                </template>

                <div class="h-96">
                  <v-chart :option="timeSeriesChartOptions" autoresize />
                </div>
              </UCard>

              <UAlert class="mt-6" color="info">
                <template #icon>
                  <UIcon name="lucide:info" />
                </template>
                {{ $t('requeststats.timelineDescription') }}
              </UAlert>
            </template>

            <!-- Raw Tab (Admin Only) -->
            <template #raw>
              <UCard v-if="isAdministrator">
                <template #header>
                  <div class="flex items-center">
                    <UIcon name="lucide:database" class="mr-2" />
                    <h3 class="font-bold">{{ $t('requeststats.adminView.title') }}</h3>
                  </div>
                </template>

                <p class="mb-4 text-amber-600 dark:text-amber-400">
                  <UIcon name="lucide:alert-triangle" class="inline-block mr-1" />
                  {{ $t('requeststats.adminView.warning') }}
                </p>

                <div class="overflow-x-auto">
                  <table class="min-w-full text-sm">
                    <thead>
                      <tr class="bg-gray-50 dark:bg-gray-800">
                        <th class="py-3 px-4 text-left">{{ $t('requeststats.tableHeaders.timestamp') }}</th>
                        <th class="py-3 px-4 text-left">{{ $t('requeststats.tableHeaders.ip') }}</th>
                        <th class="py-3 px-4 text-left">{{ $t('requeststats.tableHeaders.method') }}</th>
                        <th class="py-3 px-4 text-left">{{ $t('requeststats.tableHeaders.url') }}</th>
                        <th class="py-3 px-4 text-left">{{ $t('requeststats.tableHeaders.statusCode') }}</th>
                        <th class="py-3 px-4 text-left">{{ $t('requeststats.tableHeaders.type') }}</th>
                        <th class="py-3 px-4 text-left">{{ $t('requeststats.tableHeaders.userAgent') }}</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr v-for="(request, index) in adminData?.detailedRequests" :key="index"
                          class="border-t border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                        <td class="py-2 px-4">{{ formatDate(request.timestamp) }}</td>
                        <td class="py-2 px-4">{{ request.ip }}</td>
                        <td class="py-2 px-4">{{ request.method }}</td>
                        <td class="py-2 px-4 max-w-[200px] truncate cursor-help"
                            @mouseenter="showTooltip($event, request.url)"
                            @mouseleave="hideTooltip">
                          {{ request.url }}
                        </td>
                        <td class="py-2 px-4 font-mono">{{ request.statusCode }}</td>
                        <td class="py-2 px-4">
                          <span v-if="request.isApi" class="font-semibold text-green-600 dark:text-green-400">API</span>
                          <span v-else class="font-semibold text-blue-600 dark:text-blue-400">Web</span>
                        </td>
                        <td class="py-2 px-4 max-w-[200px] truncate cursor-help"
                            @mouseenter="showTooltip($event, request.userAgent)"
                            @mouseleave="hideTooltip">
                          {{ request.userAgent }}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </UCard>
              <UCard v-else>
                <div class="text-center p-6">
                  <UIcon name="lucide:lock" class="h-12 w-12 mx-auto mb-4" />
                  <h3 class="text-xl font-bold mb-2">{{ $t('requeststats.adminRequired.title') }}</h3>
                  <p>{{ $t('requeststats.adminRequired.message') }}</p>
                </div>
              </UCard>
            </template>
          </UTabs>

          <!-- Recent requests (non-sensitive data for all users) -->
          <div class="mt-6">
            <UCard>
              <template #header>
                <div class="flex items-center">
                  <UIcon name="lucide:clock" class="mr-2" />
                  <h3 class="font-bold">{{ $t('requeststats.recentRequests') }}</h3>
                </div>
              </template>

              <div class="overflow-x-auto">
                <table class="min-w-full text-sm">
                  <thead>
                    <tr class="bg-gray-50 dark:bg-gray-800">
                      <th class="py-3 px-4 text-left">{{ $t('requeststats.tableHeaders.timestamp') }}</th>
                      <th class="py-3 px-4 text-left">{{ $t('requeststats.tableHeaders.method') }}</th>
                      <th class="py-3 px-4 text-left">{{ $t('requeststats.tableHeaders.url') }}</th>
                      <th class="py-3 px-4 text-left">{{ $t('requeststats.tableHeaders.browser') }}</th>
                      <th class="py-3 px-4 text-left">{{ $t('requeststats.tableHeaders.os') }}</th>
                      <th class="py-3 px-4 text-left">{{ $t('requeststats.tableHeaders.device') }}</th>
                      <th class="py-3 px-4 text-left">{{ $t('requeststats.tableHeaders.statusCode') }}</th>
                      <th class="py-3 px-4 text-left">{{ $t('requeststats.tableHeaders.type') }}</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="(request, index) in statsData.recentRequests" :key="index"
                        class="border-t border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                      <td class="py-2 px-4">{{ formatDate(request.timestamp) }}</td>
                      <td class="py-2 px-4">{{ request.method }}</td>
                      <td class="py-2 px-4 max-w-[200px] truncate cursor-help"
                          @mouseenter="showTooltip($event, request.url)"
                          @mouseleave="hideTooltip">
                        {{ request.url }}
                      </td>
                      <td class="py-2 px-4">{{ request.browser }}</td>
                      <td class="py-2 px-4">{{ request.os }}</td>
                      <td class="py-2 px-4">{{ request.device }}</td>
                      <td class="py-2 px-4 font-mono">{{ request.statusCode }}</td>
                      <td class="py-2 px-4">
                        <span v-if="request.isApi" class="font-semibold text-green-600 dark:text-green-400">API</span>
                        <span v-else class="font-semibold text-blue-600 dark:text-blue-400">Web</span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </UCard>
          </div>

          <!-- Last update indicator -->
          <div class="text-center text-xs text-gray-500 dark:text-gray-400 mt-4">
            <span>{{ $t('requeststats.lastUpdated', { time: formatDate(new Date()) }) }}</span>
            <span v-if="autoRefresh"> · {{ $t('requeststats.autoRefreshing', { seconds: autoRefreshInterval }) }}</span>
          </div>
        </div>
      </ClientOnly>
    </div>
  </div>
</template>

<style scoped>
.cursor-help {
  cursor: help;
}

/* Add these new styles */
:deep(.fixed[v-if="tooltip.visible"]) {
  opacity: 1 !important;
  background-color: var(--color-background) !important;
}

/* Light mode specifics */
:root {
  --color-background: #ffffff;
}

/* Dark mode specifics */
.dark {
  --color-background: #1f2937;
}
</style>
