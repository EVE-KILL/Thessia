<template>
  <div class="container mx-auto px-4 py-8">
    <div class="max-w-7xl mx-auto">
      <!-- Coming Soon Section -->
      <div v-if="hasFilter" class="text-center py-16">
        <div class="mb-8">
          <Icon name="lucide:construction" class="w-24 h-24 mx-auto text-blue-500 mb-6" />
          <h1 class="text-4xl font-bold text-zinc-100 mb-4">Advanced View</h1>
          <p class="text-xl text-zinc-400 mb-8">Coming Soon!</p>
        </div>
        
        <!-- Filter Information -->
        <div class="bg-zinc-900 border border-zinc-700 rounded-lg p-6 mb-8 text-left max-w-4xl mx-auto">
          <h2 class="text-lg font-semibold text-zinc-100 mb-4">Your Filter Configuration</h2>
          <div class="bg-zinc-800 border border-zinc-600 rounded-lg p-4">
            <pre class="text-sm text-zinc-200 font-mono whitespace-pre-wrap overflow-x-auto">{{ formattedFilter }}</pre>
          </div>
        </div>

        <!-- Back Button -->
        <div class="flex justify-center gap-4">
          <button
            @click="goBackToSearch"
            class="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
          >
            <Icon name="lucide:arrow-left" class="w-5 h-5" />
            Back to Advanced Search
          </button>
          
          <button
            @click="previewFilter"
            class="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
          >
            <Icon name="lucide:eye" class="w-5 h-5" />
            Preview This Filter
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const route = useRoute()
const router = useRouter()

// Check if we have a filter parameter
const hasFilter = computed(() => {
  return typeof route.query.filter === 'string' && route.query.filter.length > 0
})

// Parse and format the filter for display
const formattedFilter = computed(() => {
  if (!hasFilter.value) return ''
  
  try {
    const filterString = route.query.filter as string
    const decoded = decodeURIComponent(filterString)
    const parsed = JSON.parse(decoded)
    return JSON.stringify(parsed, null, 2)
  } catch (error) {
    return 'Invalid filter format'
  }
})

// Redirect to advanced search if no filter
onMounted(() => {
  if (!hasFilter.value) {
    router.push('/advancedsearch')
  }
})

// Navigation functions
const goBackToSearch = () => {
  router.push('/advancedsearch')
}

const previewFilter = () => {
  // Navigate back to advanced search with the filter applied
  // We could potentially restore the filter state here in the future
  router.push('/advancedsearch')
}

// SEO Meta
useSeoMeta({
  title: 'Advanced View - Coming Soon',
  description: 'Advanced killmail view with enhanced filtering and analysis capabilities. Coming soon to EVE-KILL.',
})
</script>
