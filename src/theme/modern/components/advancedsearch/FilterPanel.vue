<template>
  <div class="bg-zinc-900 border border-zinc-700 rounded-lg p-6">
    <div class="flex gap-6">
      <!-- Filter Info Panel (20%) -->
      <div class="w-1/5">
        <FilterInfoPanel :active-filters="activeFilters" />
      </div>

      <!-- Filter Controls (80%) -->
      <div class="w-4/5">
        <FilterControls v-model="filters" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import type { AdvancedSearchFilters } from '~/src/theme/modern/helpers/advancedsearch'
import FilterInfoPanel from './FilterInfoPanel.vue'
import FilterControls from './FilterControls.vue'

// Props
interface Props {
  modelValue: AdvancedSearchFilters
}

// Emits
interface Emits {
  (e: 'update:modelValue', value: AdvancedSearchFilters): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

// Reactive data
const filters = ref<AdvancedSearchFilters>(props.modelValue)

// Watch for external changes to modelValue
watch(() => props.modelValue, (newValue) => {
  filters.value = newValue
}, { deep: true })

// Watch for changes to filters and emit updates
watch(filters, (newValue) => {
  emit('update:modelValue', newValue)
}, { deep: true })

// Computed active filters count for info panel
const activeFilters = computed(() => {
  const counts = {
    location: filters.value.location.type ? 1 : 0,
    security: filters.value.securitySpace.length,
    killType: filters.value.killType.length,
    iskValue: filters.value.iskValue.length,
    shipCategory: filters.value.shipCategory.length,
    facets: filters.value.facets.length,
    total: 0
  }

  counts.total = counts.location + counts.security + counts.killType + counts.iskValue + counts.shipCategory + counts.facets

  return counts
})
</script>
