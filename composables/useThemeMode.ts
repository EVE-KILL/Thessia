import { ref, computed } from 'vue'

// Module scope reference for theme preference
const currentThemeRef = ref('system')

export function useThemeMode() {
  // Get the built-in color mode from Nuxt
  const colorMode = useColorMode()

  // Use cookie with consistent format
  const colorModeCookie = useCookie('nuxt-color-mode', {
    default: () => JSON.stringify({ value: 'system', userSelected: false }),
    watch: true,
    maxAge: 60 * 60 * 24 * 365, // Valid for 1 year
    path: '/'
  })

  // Parse cookie data efficiently
  const parseCookieData = () => {
    try {
      if (!colorModeCookie.value) return { value: 'system', userSelected: false }

      // Handle object format
      if (typeof colorModeCookie.value === 'object' && 'value' in colorModeCookie.value) {
        return colorModeCookie.value
      }

      // Handle stringified object
      if (typeof colorModeCookie.value === 'string' && colorModeCookie.value.startsWith('{')) {
        return JSON.parse(colorModeCookie.value)
      }

      // Handle legacy string format
      return { value: colorModeCookie.value, userSelected: true }
    } catch {
      return { value: 'system', userSelected: false }
    }
  }

  // Initialize from cookie
  const cookieData = parseCookieData()
  if (cookieData.userSelected && currentThemeRef.value !== cookieData.value) {
    currentThemeRef.value = cookieData.value
    colorMode.preference = cookieData.value
  }

  // Update cookie helper
  const updateCookie = (value: string, userSelected = true) => {
    colorModeCookie.value = JSON.stringify({ value, userSelected })
  }

  // Toggle theme with improved efficiency
  const toggleTheme = () => {
    const newMode = currentThemeRef.value === 'dark' ? 'light' : 'dark'

    // Update state
    currentThemeRef.value = newMode
    colorMode.preference = newMode
    updateCookie(newMode, true)

    // Apply DOM changes immediately if on client
    if (import.meta.client) {
      document.documentElement.classList.toggle('dark', newMode === 'dark')
    }

    return true
  }

  // Computed properties
  const currentTheme = computed(() => currentThemeRef.value || 'system')

  const themeIcon = computed(() => {
    const effectiveTheme = currentTheme.value === 'system'
      ? (colorMode.value === 'dark' ? 'dark' : 'light')
      : currentTheme.value
    return effectiveTheme === 'dark' ? 'i-heroicons-sun' : 'i-heroicons-moon'
  })

  const themeAriaLabel = computed(() => {
    const effectiveTheme = currentTheme.value === 'system'
      ? (colorMode.value === 'dark' ? 'dark' : 'light')
      : currentTheme.value
    return effectiveTheme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'
  })

  const isUserSelected = computed(() => parseCookieData().userSelected)

  return {
    currentTheme,
    themeIcon,
    themeAriaLabel,
    toggleTheme,
    isUserSelected
  }
}
