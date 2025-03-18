<script setup lang="ts">
import * as locales from '@nuxt/ui/locale';

// Get the error that was thrown
const props = defineProps({
  error: Object
})

// Load i18n
const { locale, t } = useI18n();

// Clear error state on button click
const handleError = () => clearError({ redirect: '/' })

// Get appropriate error message based on status code
const errorMessage = computed(() => {
  const statusCode = props.error?.statusCode || 404;

  switch (statusCode) {
    case 404:
      return t('error.notFound');
    case 403:
      return t('error.forbidden');
    case 500:
      return t('error.serverError');
    default:
      return props.error?.message || t('error.generic');
  }
})

// Get appropriate image based on status code
const errorImage = computed(() => {
  const statusCode = props.error?.statusCode || 404;
  // For now we only have 404 image, but structure allows for additional images
  switch (statusCode) {
    case 404:
      return '/images/404.png';
    default:
      return '/images/404.png'; // fallback to 404 image
  }
})

// Apply theme class when component mounts
onMounted(() => {
  if (import.meta.client) {
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
      <div class="flex flex-col items-center justify-center min-h-screen p-4 text-center">
        <!-- Error image -->
        <NuxtImg
          :src="errorImage"
          :alt="`Error ${props.error?.statusCode || 404}`"
          class="h-auto max-w-2xl mx-auto mb-8"
          width="80%"
          height="auto"
          loading="lazy"
        />

        <!-- Error description -->
        <h1 class="text-4xl font-bold mb-4">
          {{ props.error?.statusCode || 404 }}
        </h1>
        <p class="text-xl mb-8">{{ errorMessage }}</p>

        <!-- Return to home button -->
        <UButton color="primary" @click="handleError">
          {{ t('common.backToHome') }}
        </UButton>
      </div>
    </NuxtLayout>
  </UApp>
</template>
