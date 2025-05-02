<template>
  <div>
    <div v-if="corporation?.description" class="bg-black bg-opacity-30 dark:bg-gray-900 dark:bg-opacity-30 rounded-lg p-4 mb-4">
      <div class="font-mono whitespace-pre-line text-gray-200" v-html="corporation.description"></div>
    </div>
    <div v-else class="text-gray-400 italic">
      {{ $t('corporation.noDescription') }}
    </div>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  corporation: any
}>()
</script>
