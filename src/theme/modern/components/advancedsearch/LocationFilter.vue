<template>
  <div>
    <!-- Location Type Selection -->
    <div class="mb-4">
      <ButtonGroup
        v-model="locationTypeArray"
        :options="locationTypeOptions"
        class="flex gap-2"
        @update:model-value="onLocationTypeChange"
      />
    </div>

    <!-- Location Search -->
    <div v-if="location.type" class="relative">
      <input
        v-model="searchTerm"
        type="text"
        :placeholder="`Search for ${location.type}...`"
        class="w-full px-3 py-2 bg-zinc-800 border border-zinc-600 rounded-lg text-zinc-100 placeholder-zinc-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
        @input="onSearchInput"
      />

      <!-- Search Results -->
      <div
        v-if="searchResults.length > 0"
        class="absolute z-50 w-full mt-1 bg-zinc-800 border border-zinc-600 rounded-lg shadow-lg max-h-60 overflow-y-auto"
      >
        <div
          v-for="result in searchResults"
          :key="result.id"
          class="px-3 py-2 hover:bg-zinc-700 cursor-pointer text-zinc-100"
          @click="selectLocation(result)"
        >
          {{ result.name }}
        </div>
      </div>
    </div>

    <!-- Selected Location Display -->
    <div v-if="location.name" class="mt-3 p-3 bg-zinc-800 border border-zinc-600 rounded-lg">
      <div class="flex items-center justify-between">
        <div>
          <div class="text-zinc-100 font-medium">{{ location.name }}</div>
          <div class="text-zinc-400 text-sm capitalize">{{ location.type }}</div>
        </div>
        <button
          @click="clearLocation"
          class="text-zinc-400 hover:text-zinc-200"
        >
          <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <!-- Security Types for Location -->
      <div v-if="location.type" class="mt-3">
        <div class="text-sm text-zinc-300 mb-2">Security Space (for this {{ location.type }})</div>
        <ButtonGroup
          v-model="location.securityTypes"
          :options="securityOptions"
          multiple
          class="flex flex-wrap gap-2"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import type { LocationFilter } from '~/src/theme/modern/helpers/advancedsearch'
import { SECURITY_OPTIONS } from '~/src/theme/modern/helpers/advancedsearch'
import ButtonGroup from './ButtonGroup.vue'

// Props
interface Props {
  modelValue: LocationFilter
}

// Emits
interface Emits {
  (e: 'update:modelValue', value: LocationFilter): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

// Reactive data
const location = ref<LocationFilter>(props.modelValue)
const searchTerm = ref('')
const searchResults = ref<{ id: number; name: string }[]>([])

// Watch for external changes to modelValue
watch(() => props.modelValue, (newValue) => {
  location.value = newValue
}, { deep: true })

// Watch for changes to location and emit updates
watch(location, (newValue) => {
  emit('update:modelValue', newValue)
}, { deep: true })

// Location type options
const locationTypeOptions = [
  { value: 'system', label: 'System' },
  { value: 'region', label: 'Region' },
  { value: 'constellation', label: 'Constellation' }
]

const securityOptions = SECURITY_OPTIONS

// Computed for managing location type as array for ButtonGroup
const locationTypeArray = computed({
  get: () => location.value.type ? [location.value.type] : [],
  set: (value: string[]) => {
    // ButtonGroup will handle the single selection logic
  }
})

// Search functionality
let searchTimeout: NodeJS.Timeout | null = null

const onLocationTypeChange = (types: string[]) => {
  const newType = types[0] || null
  if (newType !== location.value.type) {
    location.value = {
      type: newType as 'system' | 'region' | 'constellation' | null,
      id: null,
      name: null,
      securityTypes: []
    }
    searchTerm.value = ''
    searchResults.value = []
  }
}

const onSearchInput = () => {
  if (searchTimeout) {
    clearTimeout(searchTimeout)
  }

  searchTimeout = setTimeout(() => {
    performLocationSearch()
  }, 300)
}

const performLocationSearch = async () => {
  if (!searchTerm.value.trim() || !location.value.type) {
    searchResults.value = []
    return
  }

  try {
    // This would need to be implemented - searching for systems/regions/constellations
    // For now, mock some results
    searchResults.value = [
      { id: 30000142, name: 'Jita' },
      { id: 30002187, name: 'Amarr' },
      { id: 30002659, name: 'Dodixie' }
    ].filter(item =>
      item.name.toLowerCase().includes(searchTerm.value.toLowerCase())
    )
  } catch (error) {
    console.error('Location search error:', error)
    searchResults.value = []
  }
}

const selectLocation = (result: { id: number; name: string }) => {
  location.value.id = result.id
  location.value.name = result.name
  searchTerm.value = ''
  searchResults.value = []
}

const clearLocation = () => {
  location.value = {
    type: location.value.type,
    id: null,
    name: null,
    securityTypes: []
  }
  searchTerm.value = ''
  searchResults.value = []
}
</script>
