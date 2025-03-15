import { ref, computed } from 'vue'

// Module scope references to maintain state across components
const currentThemeRef = ref('')

export function useThemeMode() {
  // Get the built-in color mode from Nuxt
  const colorMode = useColorMode()

  // Use cookie with consistent naming across the app
  const colorModeCookie = useCookie('nuxt-color-mode', {
    default: () => 'dark',
    watch: true,
    maxAge: 60 * 60 * 24 * 365, // Valid for 1 year
    path: '/'
  })

  // Initialize the current theme if not already set
  if (!currentThemeRef.value) {
    // Prioritize cookie value
    currentThemeRef.value = colorModeCookie.value || colorMode.preference || 'dark'

    // Ensure colorMode is synced
    colorMode.preference = currentThemeRef.value
    colorMode.value = currentThemeRef.value
  }

  // Toggle theme with improved reliability
  const toggleTheme = () => {
    try {
      const currentMode = currentThemeRef.value || colorMode.value || 'dark'
      const newMode = currentMode === 'dark' ? 'light' : 'dark'

      // Update all references for consistency
      currentThemeRef.value = newMode
      colorMode.preference = newMode
      colorMode.value = newMode
      colorModeCookie.value = newMode

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
    return currentThemeRef.value || colorMode.value || 'dark'
  })

  const themeIcon = computed(() => {
    return currentTheme.value === 'dark' ? 'i-heroicons-sun' : 'i-heroicons-moon'
  })

  const themeAriaLabel = computed(() => {
    return currentTheme.value === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'
  })

  // Initialize theme class on client
  if (process.client) {
    const applyThemeClass = () => {
      const isDark = currentTheme.value === 'dark'
      if (isDark) {
        document.documentElement.classList.add('dark')
      } else {
        document.documentElement.classList.remove('dark')
      }
    }

    // Apply immediately if document is ready
    if (document.readyState !== 'loading') {
      applyThemeClass()
    } else {
      document.addEventListener('DOMContentLoaded', applyThemeClass)
    }

    // Clean up event listener
    onUnmounted(() => {
      document.removeEventListener('DOMContentLoaded', applyThemeClass)
    })
  }

  return {
    currentTheme,
    themeIcon,
    themeAriaLabel,
    toggleTheme
  }
}
