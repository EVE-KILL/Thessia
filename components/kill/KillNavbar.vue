<script setup lang="ts">
const items = ref([
  {
    label: 'External',
    icon: 'i-lucide:external-link',
  }
])
</script>

<template>
  <UNavigationMenu :items="items" class="w-full justify-center z-50" />
</template>
