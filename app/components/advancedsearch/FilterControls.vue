<template>
    <div class="space-y-6">
        <!-- Location Filter -->
        <div>
            <h4 class="text-sm font-semibold text-zinc-300 mb-3">Location</h4>
            <LocationFilter v-model="filters.location" />
        </div>

        <!-- Security Space Filter -->
        <div>
            <h4 class="text-sm font-semibold text-zinc-300 mb-3">Security Space</h4>
            <ButtonGroup v-model="filters.securitySpace" :options="securityOptions" multiple
                class="grid grid-cols-2 gap-2" />
        </div>

        <!-- Kill Type Filter -->
        <div>
            <h4 class="text-sm font-semibold text-zinc-300 mb-3">Kill Type</h4>
            <ButtonGroup v-model="filters.killType" :options="killTypeOptions" multiple
                class="grid grid-cols-2 gap-2" />
        </div>

        <!-- ISK Value Filter -->
        <div>
            <h4 class="text-sm font-semibold text-zinc-300 mb-3">ISK Value</h4>
            <ButtonGroup v-model="filters.iskValue" :options="iskValueOptions" multiple
                class="grid grid-cols-2 gap-2" />
        </div>

        <!-- Ship Category Filter -->
        <div>
            <h4 class="text-sm font-semibold text-zinc-300 mb-3">Ship Category</h4>
            <ButtonGroup v-model="filters.shipCategory" :options="shipCategoryOptions" multiple
                class="grid grid-cols-3 gap-2" />
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'

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

// Options for button groups
const securityOptions = SECURITY_OPTIONS
const killTypeOptions = KILL_TYPE_OPTIONS
const iskValueOptions = ISK_VALUE_OPTIONS
const shipCategoryOptions = SHIP_CATEGORY_OPTIONS
</script>
