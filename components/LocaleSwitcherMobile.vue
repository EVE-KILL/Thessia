<script setup lang="ts">
const { locale, locales, setLocale } = useI18n()

// Change locale when a locale button is clicked
const switchLocale = (newLocale) => {
  setLocale(newLocale)
}
</script>

<template>
  <div class="flex items-center gap-1">
    <button
      v-for="loc in locales"
      :key="loc.code"
      @click="switchLocale(loc.code)"
      class="w-7 h-7 flex items-center justify-center rounded-full text-xs font-medium transition-all"
      :class="[
        locale === loc.code
          ? 'bg-primary-500 text-white'
          : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
      ]"
      :title="loc.name"
    >
      {{ loc.code.toUpperCase() }}
    </button>
  </div>
</template>

<style scoped>
button {
  transform-origin: center;
  transition: all 0.2s ease;
}
</style>
