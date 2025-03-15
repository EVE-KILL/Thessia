<template>
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
</template>

<script setup>
// Import the theme mode composable
const { currentTheme, isUserSelected } = useThemeMode()

// Get color mode from Nuxt
const colorMode = useColorMode()

// Use cookie for color mode instead of localStorage - now stores an object with user preference flag
const colorModeCookie = useCookie('nuxt-color-mode')

// Set initial preference based on cookie if user has made an explicit choice
if (process.client) {
  // Parse the cookie value, handling both old and new formats
  const parseCookieData = () => {
    try {
      if (!colorModeCookie.value) return { value: 'system', userSelected: false }

      // If it's already an object with the right structure
      if (typeof colorModeCookie.value === 'object' && 'value' in colorModeCookie.value) {
        return colorModeCookie.value
      }

      // If it's a stringified object
      if (typeof colorModeCookie.value === 'string' && colorModeCookie.value.startsWith('{')) {
        return JSON.parse(colorModeCookie.value)
      }

      // Legacy format - just the theme value as a string
      return { value: colorModeCookie.value, userSelected: true }
    } catch (e) {
      console.error('Error parsing theme cookie:', e)
      return { value: 'system', userSelected: false }
    }
  }

  const cookieData = parseCookieData()

  // Only set the preference if user has explicitly chosen one
  if (cookieData.userSelected) {
    colorMode.preference = cookieData.value
  } else {
    // Default to system preference
    colorMode.preference = 'system'
  }

  // Add a function to apply the appropriate class based on current theme
  const applyThemeClass = () => {
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

// Watch for changes to colorMode and sync back to cookie if it's a user selection
watch(() => colorMode.preference, (newVal) => {
  if (newVal !== 'system') {
    // Only update cookie if this is a user-initiated change
    colorModeCookie.value = JSON.stringify({ value: newVal, userSelected: true })
  }
})
</script>
