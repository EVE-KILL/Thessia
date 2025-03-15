import { ref, computed } from 'vue'

// Module scope references to maintain state across components
const currentThemeRef = ref('')

export function useThemeMode() {
  // Get the built-in color mode from Nuxt
  const colorMode = useColorMode()

  // Use cookie for color mode with production-safe defaults
  const colorModeCookie = useCookie('nuxt-color-mode', {
    default: () => 'dark',
    watch: true,
    maxAge: 60 * 60 * 24 * 365, // Valid for 1 year
    path: '/'
  })

  // Initialize the current theme from cookie or localStorage
  if (!currentThemeRef.value) {
    // Try to get from cookie first
    if (colorModeCookie.value) {
      currentThemeRef.value = colorModeCookie.value
    }
    // Fallback to the Nuxt colorMode
    else {
      currentThemeRef.value = colorMode.preference || 'dark'
    }

    // Ensure colorMode is synced
    colorMode.preference = currentThemeRef.value
  }

  // Define the toggle function with better error handling
  const toggleTheme = () => {
    try {
      // Get current mode, with fallbacks
      const currentMode = currentThemeRef.value || colorMode.value || 'dark'
      // Calculate the new mode
      const newMode = currentMode === 'dark' ? 'light' : 'dark'

      console.log(`Toggling theme from ${currentMode} to ${newMode}`)

      // Update all possible references
      currentThemeRef.value = newMode
      colorMode.preference = newMode
      colorModeCookie.value = newMode

      // Directly manipulate DOM for immediate visual change
      if (process.client) {
        if (newMode === 'dark') {
          document.documentElement.classList.add('dark')
        } else {
          document.documentElement.classList.remove('dark')
        }

        // Force re-evaluation of any CSS that depends on the theme
        document.documentElement.style.display = 'none'
        void document.documentElement.offsetHeight
        document.documentElement.style.display = ''
      }

      return true
    } catch (error) {
      console.error('Error toggling theme:', error)
      return false
    }
  }

  // Current theme as a computed property
  const currentTheme = computed(() => {
    return currentThemeRef.value || colorMode.value || 'dark'
  })

  // Icon to display based on the current theme
  const themeIcon = computed(() => {
    return currentTheme.value === 'dark' ? 'i-heroicons-sun' : 'i-heroicons-moon'
  })

  // Aria label for the theme toggle button
  const themeAriaLabel = computed(() => {
    return currentTheme.value === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'
  })

  // Initialize theme class on client
  if (process.client) {
    // Apply theme class on initial load
    const applyThemeClass = () => {
      const isDark = currentTheme.value === 'dark'
      if (isDark) {
        document.documentElement.classList.add('dark')
      } else {
        document.documentElement.classList.remove('dark')
      }
    }

    // Execute immediately if document is ready
    if (document.readyState !== 'loading') {
      applyThemeClass()
    }
    // Or wait for DOM to be fully loaded
    else {
      document.addEventListener('DOMContentLoaded', applyThemeClass)
    }
  }

  return {
    currentTheme,
    themeIcon,
    themeAriaLabel,
    toggleTheme
  }
}
