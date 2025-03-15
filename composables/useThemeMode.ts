import { ref, computed } from 'vue'

// Module scope references to maintain state across components
const currentThemeRef = ref('system') // Default to system

export function useThemeMode() {
  // Get the built-in color mode from Nuxt
  const colorMode = useColorMode()

  // Use cookie with consistent naming across the app
  const colorModeCookie = useCookie('nuxt-color-mode', {
    default: () => JSON.stringify({ value: 'system', userSelected: false }),
    watch: true,
    maxAge: 60 * 60 * 24 * 365, // Valid for 1 year
    path: '/'
  })

  // Parse cookie data - handle both old string format and new object format
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

  // Get current cookie data
  const cookieData = parseCookieData()

  // Initialize the current theme based on cookie data
  if (cookieData.userSelected) {
    // User has made an explicit choice, use it
    currentThemeRef.value = cookieData.value
    colorMode.preference = cookieData.value
  } else {
    // No user choice, default to system
    currentThemeRef.value = 'system'
    colorMode.preference = 'system'
  }

  // Update cookie with the structured format
  const updateCookie = (value, userSelected = true) => {
    colorModeCookie.value = JSON.stringify({ value, userSelected })
  }

  // Toggle theme with improved reliability
  const toggleTheme = () => {
    try {
      const newMode = currentThemeRef.value === 'dark' ? 'light' : 'dark'

      // Update all references for consistency
      currentThemeRef.value = newMode
      colorMode.preference = newMode

      // Mark this as a user selection and update cookie
      updateCookie(newMode, true)

      // Direct DOM manipulation for immediate feedback
      if (process.client) {
        if (newMode === 'dark') {
          document.documentElement.classList.add('dark')
        } else {
          document.documentElement.classList.remove('dark')
        }

        // Force CSS re-evaluation
        const scrollPos = window.scrollY
        document.body.style.display = 'none'
        void document.body.offsetHeight
        document.body.style.display = ''
        window.scrollTo(0, scrollPos)
      }

      return true
    } catch (error) {
      console.error('Error toggling theme:', error)
      return false
    }
  }

  // Computed properties for theme state
  const currentTheme = computed(() => {
    return currentThemeRef.value || 'system' // Fallback to system if undefined
  })

  const themeIcon = computed(() => {
    const theme = currentTheme.value === 'system'
      ? (colorMode.value === 'dark' ? 'dark' : 'light')
      : currentTheme.value
    return theme === 'dark' ? 'i-heroicons-sun' : 'i-heroicons-moon'
  })

  const themeAriaLabel = computed(() => {
    const theme = currentTheme.value === 'system'
      ? (colorMode.value === 'dark' ? 'dark' : 'light')
      : currentTheme.value
    return theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'
  })

  // Whether the user has explicitly chosen a theme
  const isUserSelected = computed(() => {
    return parseCookieData().userSelected
  })

  return {
    currentTheme,
    themeIcon,
    themeAriaLabel,
    toggleTheme,
    isUserSelected
  }
}
