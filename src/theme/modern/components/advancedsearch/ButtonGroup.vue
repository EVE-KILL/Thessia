<template>
  <div :class="wrapperClass">
    <button
      v-for="option in options"
      :key="option.value"
      :class="getButtonClass(option.value)"
      @click="toggleOption(option.value)"
    >
      {{ option.label }}
    </button>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

interface Option {
  value: string
  label: string
}

// Props
interface Props {
  modelValue: string[]
  options: Option[]
  multiple?: boolean
  class?: string
}

// Emits
interface Emits {
  (e: 'update:modelValue', value: string[]): void
}

const props = withDefaults(defineProps<Props>(), {
  multiple: false,
  class: ''
})

const emit = defineEmits<Emits>()

// Computed wrapper class
const wrapperClass = computed(() => props.class)

// Get button styling based on selection state
const getButtonClass = (value: string) => {
  const isSelected = props.modelValue.includes(value)

  const baseClasses = 'px-3 py-2 text-sm font-medium rounded-lg transition-colors duration-200 border'

  if (isSelected) {
    return `${baseClasses} bg-blue-600 text-white border-blue-600 hover:bg-blue-700`
  } else {
    return `${baseClasses} bg-zinc-800 text-zinc-300 border-zinc-600 hover:bg-zinc-700 hover:border-zinc-500`
  }
}

// Toggle option selection
const toggleOption = (value: string) => {
  if (props.multiple) {
    // Multiple selection mode
    if (props.modelValue.includes(value)) {
      // Remove from selection
      emit('update:modelValue', props.modelValue.filter(v => v !== value))
    } else {
      // Add to selection
      emit('update:modelValue', [...props.modelValue, value])
    }
  } else {
    // Single selection mode
    if (props.modelValue.includes(value)) {
      // Deselect if already selected
      emit('update:modelValue', [])
    } else {
      // Select this option only
      emit('update:modelValue', [value])
    }
  }
}
</script>
