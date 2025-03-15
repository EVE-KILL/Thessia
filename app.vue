<template>
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
</template>

<script setup>
// Use cookie for color mode instead of localStorage
const colorModeCookie = useCookie('nuxt-color-mode', {
  default: () => 'dark', // Default to dark mode
  watch: true,           // Update the cookie when the value changes
  maxAge: 60 * 60 * 24 * 365 // Valid for 1 year
})

// Ensure color mode is set as early as possible
const colorMode = useColorMode()
colorMode.preference = colorModeCookie.value || 'dark'
colorMode.value = colorModeCookie.value || 'dark'

// Add a function to ensure dark class is applied to html element immediately
if (process.client) {
  const setInitialColorMode = () => {
    if (colorModeCookie.value === 'dark') {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }

  // Run immediately and on DOMContentLoaded
  setInitialColorMode()
  document.addEventListener('DOMContentLoaded', setInitialColorMode)
}

// Sync changes back to the cookie
watch(() => colorMode.preference, (newVal) => {
  colorModeCookie.value = newVal
})
</script>
