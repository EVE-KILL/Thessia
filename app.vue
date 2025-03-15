<script setup>
import * as locales from '@nuxt/ui/locale';

// Import the theme mode composable
const { currentTheme } = useThemeMode()

// Load i18n
const { locale } = useI18n();

// Apply theme class when component mounts
onMounted(() => {
  if (process.client) {
    const applyThemeClass = () => {
      const colorMode = useColorMode()
      const isDarkMode = colorMode.value === 'dark'

      if (isDarkMode) {
        document.documentElement.classList.add('dark')
      } else {
        document.documentElement.classList.remove('dark')
      }
    }

    // Apply theme class immediately and on DOM content loaded
    applyThemeClass()
    document.addEventListener('DOMContentLoaded', applyThemeClass)

    // Clean up event listener on unmount
    onUnmounted(() => {
      document.removeEventListener('DOMContentLoaded', applyThemeClass)
    })
  }
})
</script>

<template>
  <UApp :locale="locales[locale]">
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </UApp>
</template>
