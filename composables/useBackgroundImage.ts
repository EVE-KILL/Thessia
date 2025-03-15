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
  { name: 'Background 7', path: '/images/bg7.jpg' },
  { name: 'Background 8', path: '/images/bg8.mp4' }
]

// Module scope reference for sharing state between calls
const sharedBackgroundRef = ref(DEFAULT_BACKGROUND)
const sharedOptimizedUrlRef = ref('')
const optimizedUrlCache = new Map()
const isVideoBackground = ref(false)

export const useBackgroundImage = () => {
  // Create a cookie with appropriate settings
  const backgroundCookie = useCookie(BACKGROUND_COOKIE, {
    default: () => DEFAULT_BACKGROUND,
    watch: true,
    maxAge: 60 * 60 * 24 * 30, // 30 days
    path: '/'
  })

  // Initialize the shared reference from cookie
  if (backgroundCookie.value && backgroundCookie.value !== sharedBackgroundRef.value) {
    sharedBackgroundRef.value = backgroundCookie.value
  }

  // Get nuxt/image composable
  const nuxtImg = useImage()

  // Function to check if path is a video file
  const isVideoFile = (path: string): boolean => {
    return path.toLowerCase().endsWith('.mp4') ||
           path.toLowerCase().endsWith('.webm') ||
           path.toLowerCase().endsWith('.ogg')
  }

  // Get optimized background URL with caching
  const getOptimizedBackgroundUrl = (path: string) => {
    if (!path) return ''

    // Don't process video files with nuxt/image
    if (isVideoFile(path)) {
      isVideoBackground.value = true
      return path
    }

    isVideoBackground.value = false

    // Check cache first
    if (optimizedUrlCache.has(path)) {
      return optimizedUrlCache.get(path)
    }

    try {
      // Generate responsive image URL with webp format
      const optimizedUrl = nuxtImg(path, {
        width: 1920,
        format: 'webp',
        quality: 80,
        fit: 'cover',
      })

      // Cache the result
      optimizedUrlCache.set(path, optimizedUrl)
      sharedOptimizedUrlRef.value = optimizedUrl
      return optimizedUrl
    } catch (error) {
      console.error('Error optimizing image:', error)
      sharedOptimizedUrlRef.value = path
      return path // Fallback to original path
    }
  }

  // Computed property for current optimized URL
  const currentOptimizedUrl = computed(() => {
    if (sharedOptimizedUrlRef.value && optimizedUrlCache.has(sharedBackgroundRef.value)) {
      return sharedOptimizedUrlRef.value
    }
    return getOptimizedBackgroundUrl(sharedBackgroundRef.value)
  })

  // Apply background with improved performance and reliability
  const applyBackground = (path: string) => {
    if (!path) return

    try {
      // Update cookie and shared reference
      backgroundCookie.value = path
      sharedBackgroundRef.value = path

      if (process.client) {
        // Get optimized URL immediately
        const optimizedUrl = getOptimizedBackgroundUrl(path)
        sharedOptimizedUrlRef.value = optimizedUrl

        if (isVideoFile(path)) {
          // For video backgrounds, apply directly without preloading
          document.documentElement.style.setProperty('background-image', `url('${optimizedUrl}')`, 'important')
        } else {
          // Preload image
          const img = new Image()
          img.onload = () => {
            // Apply background with important flag to override any other styles
            document.documentElement.style.setProperty('background-image', `url('${optimizedUrl}')`, 'important')

            // Trigger reflow for immediate update
            void document.documentElement.offsetHeight
          }
          img.src = optimizedUrl
        }
      }
    } catch (e) {
      console.error('Error applying background:', e)
    }
  }

  // Check if a path matches the current background
  const isCurrentBackground = (path: string) => sharedBackgroundRef.value === path

  return {
    selectedBackground: sharedBackgroundRef,
    optimizedBackground: sharedOptimizedUrlRef,
    availableBackgrounds,
    setBackground: applyBackground,
    isCurrentBackground,
    getOptimizedBackgroundUrl,
    currentOptimizedUrl,
    isVideoBackground // Expose this to let UI components know if the background is a video
  }
}
