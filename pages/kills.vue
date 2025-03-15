<script setup lang="ts">
const { t } = useI18n()

// Pagination controls
const currentPage = ref(1)
const itemsPerPage = ref(25)
const totalItems = ref(0)

// Filters
const selectedSystem = ref(null)
const selectedShipType = ref(null)
const selectedFaction = ref(null)
const minimumValue = ref(null)

// Sort options
const sortOptions = [
  { value: 'newest', label: t('kills.sort.newest') },
  { value: 'oldest', label: t('kills.sort.oldest') },
  { value: 'value-high', label: t('kills.sort.valueHighToLow') },
  { value: 'value-low', label: t('kills.sort.valueLowToHigh') }
]
const selectedSort = ref('newest')

// Toggle for showing only big kills
const showBigKillsOnly = ref(false)

// Date range filter
const dateRange = ref({
  start: null,
  end: null
})

// Fetch kills with proper pagination and filters
const { data: kills, pending: loading, error, refresh } = useLazyFetch('/api/kills', {
  query: computed(() => ({
    page: currentPage.value,
    limit: itemsPerPage.value,
    sort: selectedSort.value,
    system: selectedSystem.value,
    shipType: selectedShipType.value,
    faction: selectedFaction.value,
    minValue: minimumValue.value,
    bigKillsOnly: showBigKillsOnly.value,
    dateStart: dateRange.value.start,
    dateEnd: dateRange.value.end
  })),
  server: false,
  watch: false
})

// Refresh data when filters change
watch(
  [
    currentPage,
    itemsPerPage,
    selectedSort,
    selectedSystem,
    selectedShipType,
    selectedFaction,
    minimumValue,
    showBigKillsOnly,
    () => dateRange.value.start,
    () => dateRange.value.end
  ],
  () => refresh(),
  { deep: true }
)

// Reset filters function
const resetFilters = () => {
  selectedSystem.value = null
  selectedShipType.value = null
  selectedFaction.value = null
  minimumValue.value = null
  showBigKillsOnly.value = false
  dateRange.value = { start: null, end: null }
  selectedSort.value = 'newest'
  currentPage.value = 1
}

// Format ISK value
const formatIsk = (value) => {
  if (!value) return '0 ISK'

  if (value >= 1000000000) {
    return `${(value / 1000000000).toFixed(2)}b ISK`
  } else if (value >= 1000000) {
    return `${(value / 1000000).toFixed(2)}m ISK`
  } else if (value >= 1000) {
    return `${(value / 1000).toFixed(2)}k ISK`
  }

  return `${value.toFixed(2)} ISK`
}
</script>

<template>
  <div class="py-8 px-4">
    <div class="mx-auto max-w-7xl">
      <!-- Page header -->
      <div class="bg-mode-dynamic rounded-lg shadow-lg p-6 mb-6">
        <div class="flex justify-between items-center mb-4">
          <h1 class="text-2xl md:text-3xl font-bold">{{ $t('kills.title') }}</h1>

          <!-- Refresh button -->
          <UButton
            color="primary"
            variant="ghost"
            icon="i-heroicons-arrow-path"
            @click="refresh"
            :loading="loading"
          />
        </div>

        <!-- Filters section -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <!-- System filter placeholder -->
          <UInput
            v-model="selectedSystem"
            :placeholder="$t('kills.filters.system')"
            icon="i-heroicons-globe-alt"
            clearable
          />

          <!-- Ship type filter placeholder -->
          <UInput
            v-model="selectedShipType"
            :placeholder="$t('kills.filters.shipType')"
            icon="i-heroicons-rocket-launch"
            clearable
          />

          <!-- Faction filter placeholder -->
          <UInput
            v-model="selectedFaction"
            :placeholder="$t('kills.filters.faction')"
            icon="i-heroicons-flag"
            clearable
          />
        </div>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <!-- Minimum value filter -->
          <UInput
            v-model="minimumValue"
            type="number"
            :placeholder="$t('kills.filters.minimumValue')"
            icon="i-heroicons-currency-dollar"
            clearable
          />

          <!-- Date range filter placeholder -->
          <div>
            <!-- Date filter will go here when implemented -->
            <UInput
              disabled
              :placeholder="$t('kills.filters.dateRange')"
              icon="i-heroicons-calendar"
            />
          </div>

          <!-- Sort option -->
          <USelect
            v-model="selectedSort"
            :options="sortOptions"
            icon="i-heroicons-arrows-up-down"
          />
        </div>

        <div class="flex items-center justify-between">
          <!-- Big kills toggle -->
          <div class="flex items-center">
            <UCheckbox v-model="showBigKillsOnly" />
            <span class="ml-2">{{ $t('kills.filters.bigKillsOnly') }}</span>
          </div>

          <!-- Reset filters button -->
          <UButton
            color="gray"
            @click="resetFilters"
          >
            {{ $t('kills.filters.reset') }}
          </UButton>
        </div>
      </div>

      <!-- Kills list -->
      <div class="bg-mode-dynamic rounded-lg shadow-lg p-6">
        <div v-if="loading" class="flex justify-center py-12">
          <UIcon name="i-heroicons-arrow-path" class="animate-spin text-4xl" />
        </div>

        <div v-else-if="error" class="text-center py-12">
          <p class="text-red-500">{{ $t('kills.error') }}</p>
          <UButton class="mt-4" @click="refresh">{{ $t('kills.retry') }}</UButton>
        </div>

        <div v-else-if="kills && kills.length === 0" class="text-center py-12">
          <p>{{ $t('kills.noResults') }}</p>
        </div>

        <div v-else class="space-y-6">
          <!-- Placeholder for kill list -->
          <div class="text-center py-12">
            <p>{{ $t('kills.implementationNotice') }}</p>
          </div>

          <!-- Pagination -->
          <div class="flex justify-between items-center">
            <div>
              {{ $t('kills.showing', { start: (currentPage - 1) * itemsPerPage + 1, end: Math.min(currentPage * itemsPerPage, totalItems), total: totalItems }) }}
            </div>

            <UPagination
              v-model="currentPage"
              :page-count="Math.ceil(totalItems / itemsPerPage)"
              :total="totalItems"
              :ui="{ wrapper: 'flex items-center gap-1' }"
            />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
