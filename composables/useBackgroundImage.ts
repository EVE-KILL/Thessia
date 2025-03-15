import { ref, computed } from 'vue'

// Define the cookie name and default background
const BACKGROUND_COOKIE = 'selected-background'
const DEFAULT_BACKGROUND = '/images/bg2.png'

// Available backgrounds outside the function
const availableBackgrounds = [
  { name: 'Default', path: '/images/bg2.png' },
  { name: 'Background 1', path: '/images/bg1.jpg' },
  { name: 'Background 3', path: '/images/bg3.png' },
  { name: 'Background 4', path: '/images/bg4.png' },
  { name: 'Background 5', path: '/images/bg5.png' },
  { name: 'Background 6', path: '/images/bg6.png' },
]

// Module scope reference for sharing state between calls to useBackgroundImage
const sharedBackgroundRef = ref(DEFAULT_BACKGROUND)
// Store optimized URL directly to avoid double loading
const sharedOptimizedUrlRef = ref('')

// Cache for optimized URLs to avoid regenerating them
const optimizedUrlCache = new Map()

export const useBackgroundImage = () => {
  // Create a cookie when the function is called (in setup or plugin context)
  const backgroundCookie = useCookie(BACKGROUND_COOKIE, {
    default: () => DEFAULT_BACKGROUND,
    watch: true,
    maxAge: 60 * 60 * 24 * 30, // 30 days
    path: '/'
  })

  // Initialize the shared reference if we have a cookie
  if (backgroundCookie.value && backgroundCookie.value !== sharedBackgroundRef.value) {
    sharedBackgroundRef.value = backgroundCookie.value
  }

  // Get nuxt/image composable
  const nuxtImg = useImage()

  // Improved function to get optimized background URL with caching
  const getOptimizedBackgroundUrl = (path: string) => {
    if (!path) return ''

    // Check cache first
    if (optimizedUrlCache.has(path)) {
      return optimizedUrlCache.get(path)
    }

    try {
      // Generate responsive image URL with webp format
      const optimizedUrl = nuxtImg(path, {
        width: 1920, // Use a single size for SSR consistency
        format: 'webp',
        quality: 80,
        fit: 'cover',
      })

      // Cache the result
      optimizedUrlCache.set(path, optimizedUrl)
      sharedOptimizedUrlRef.value = optimizedUrl // Store current optimized URL
      return optimizedUrl
    } catch (error) {
      console.error('Error optimizing image:', error)
      sharedOptimizedUrlRef.value = path // Store fallback
      return path // Fallback to original path
    }
  }

  // Get the currently optimized URL for the selected background
  const currentOptimizedUrl = computed(() => {
    // Use cached optimized URL if available
    if (sharedOptimizedUrlRef.value && optimizedUrlCache.has(sharedBackgroundRef.value)) {
      return sharedOptimizedUrlRef.value
    }
    // Otherwise generate it
    return getOptimizedBackgroundUrl(sharedBackgroundRef.value)
  })

  // Enhanced function to apply the background with immediate visual effect
  const applyBackground = (path: string) => {
    if (!path) return
    try {
      // Update the cookie
      backgroundCookie.value = path

      // Update shared reference
      sharedBackgroundRef.value = path

      if (process.client) {
        // Always use and store the optimized URL
        const optimizedUrl = getOptimizedBackgroundUrl(path)
        sharedOptimizedUrlRef.value = optimizedUrl // Cache this for other components

        // Create and preload the image to ensure it's ready
        const img = new Image()
        img.onload = () => {
          // Apply the optimized background
          document.documentElement.style.setProperty('background-image', `url('${optimizedUrl}')`, 'important')
          document.documentElement.style.setProperty('background-repeat', 'no-repeat', 'important')
          document.documentElement.style.setProperty('background-position', 'center', 'important')
          document.documentElement.style.setProperty('background-attachment', 'fixed', 'important')
          document.documentElement.style.setProperty('background-size', 'cover', 'important')

          // Force a repaint to ensure the background is updated
          const currentScrollPosition = window.pageYOffset
          document.documentElement.style.display = 'none'
          // This will force a repaint
          void document.documentElement.offsetHeight
          document.documentElement.style.display = ''
          window.scrollTo(0, currentScrollPosition)
        }

        // Start loading the optimized image
        img.src = optimizedUrl
      }
    } catch (e) {
      console.error('Error applying background:', e)
    }
  }

  // Check if a path matches the current background
  const isCurrentBackground = (path: string) => sharedBackgroundRef.value === path

  return {
    selectedBackground: sharedBackgroundRef,
    optimizedBackground: sharedOptimizedUrlRef, // Expose the optimized URL directly
    availableBackgrounds,
    setBackground: applyBackground,
    isCurrentBackground,
    getOptimizedBackgroundUrl,
    currentOptimizedUrl // Export the computed optimized URL
  }
}
