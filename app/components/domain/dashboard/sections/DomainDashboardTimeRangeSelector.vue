<template>
    <div class="flex justify-end mb-6">
        <div class="flex items-center space-x-3">
            <span class="text-sm text-zinc-400">Time period:</span>
            <div class="relative">
                <select v-model="selectedTimeRange"
                    class="custom-select appearance-none rounded-lg border border-gray-600 bg-gray-800/50 backdrop-blur-sm pl-3 pr-8 py-2 text-zinc-100 text-sm font-medium shadow-sm hover:bg-gray-700/50 transition-colors">
                    <option v-for="range in timeRanges" :key="range.value" :value="range.value">
                        {{ range.label }}
                    </option>
                </select>
                <div class="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-zinc-400">
                    <svg class="h-4 w-4 fill-current" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                        <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
                    </svg>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
interface Props {
    /** Currently selected time range */
    modelValue?: '1d' | '7d' | '14d' | '30d';
}

interface Emits {
    (e: 'update:modelValue', value: '1d' | '7d' | '14d' | '30d'): void;
}

const props = withDefaults(defineProps<Props>(), {
    modelValue: '7d'
});

const emit = defineEmits<Emits>();

const selectedTimeRange = computed({
    get: () => props.modelValue,
    set: (value) => emit('update:modelValue', value)
});

const timeRanges = [
    { label: '1d', value: '1d' },
    { label: '7d', value: '7d' },
    { label: '14d', value: '14d' },
    { label: '30d', value: '30d' }
] as const;
</script>

<style scoped>
.custom-select {
    background-image: none;
}

.custom-select:focus {
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.3);
}
</style>
