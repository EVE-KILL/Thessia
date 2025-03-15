import { ref, computed } from 'vue'
import { getRandomSubredditImage, type RedditPostInfo } from '~/utils/reddit'

// Define the cookie name and default background
const BACKGROUND_COOKIE = 'selected-background'
const DEFAULT_BACKGROUND = '/images/bg2.png'
const REDDIT_SOURCE_STORAGE_KEY = 'reddit-source-info'
const PROCESSED_REDDIT_URLS_KEY = 'processed-reddit-urls'

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
const currentRedditSource = ref<RedditPostInfo | null>(null)
const processedRedditUrls = ref<Record<string, string>>({})

export const useBackgroundImage = () => {
  // Create cookies with appropriate settings
  const backgroundCookie = useCookie(BACKGROUND_COOKIE, {
    default: () => DEFAULT_BACKGROUND,
    watch: true,
    maxAge: 60 * 60 * 24 * 30, // 30 days
    path: '/'
  })

  // Load processed Reddit URLs from localStorage
  if (process.client && Object.keys(processedRedditUrls.value).length === 0) {
    try {
      const storedUrls = localStorage.getItem(PROCESSED_REDDIT_URLS_KEY)
      if (storedUrls) {
        processedRedditUrls.value = JSON.parse(storedUrls)
      }
    } catch (error) {
      console.error('Error loading processed Reddit URLs:', error)
      // Reset if corrupted
      localStorage.removeItem(PROCESSED_REDDIT_URLS_KEY)
    }
  }

  // Validate background value - only accept known backgrounds or properly formatted URLs
  const isValidBackground = (path: string): boolean => {
    // Check if it's one of our predefined backgrounds
    if (availableBackgrounds.some(bg => bg.path === path)) {
      return true
    }

    // Check if it's a well-formed URL (could be from Reddit)
    try {
      new URL(path)
      return true
    } catch {
      return false
    }
  }

  // Get nuxt/image composable
  const nuxtImg = useImage()

  // Function to check if path is a video file
  const isVideoFile = (path: string): boolean => {
    return path.toLowerCase().endsWith('.mp4') ||
           path.toLowerCase().endsWith('.webm') ||
           path.toLowerCase().endsWith('.ogg')
  }

  // Process external URL through Nuxt Image
  const processExternalUrl = (url: string): string => {
    // First check if we've already processed this URL
    if (processedRedditUrls.value[url]) {
      return processedRedditUrls.value[url]
    }

    try {
      // Use Nuxt Image to process the external URL
      // With ipx provider, we can pass the URL directly
      const processedUrl = nuxtImg(url, {
        width: 1920,
        format: 'webp',
        quality: 80,
        fit: 'cover'
      })

      // Cache the processed URL
      if (processedUrl && processedUrl !== url) {
        processedRedditUrls.value[url] = processedUrl
        // Save to localStorage for persistence
        if (process.client) {
          localStorage.setItem(PROCESSED_REDDIT_URLS_KEY, JSON.stringify(processedRedditUrls.value))
        }
      }
      return processedUrl
    } catch (error) {
      console.error('Error processing external URL:', error)
      return url // Fallback to original URL if processing fails
    }
  }

  // Get optimized background URL with caching
  const getOptimizedBackgroundUrl = (path: string) => {
    if (!path) return getOptimizedBackgroundUrl(DEFAULT_BACKGROUND)

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
      let optimizedUrl: string;

      // We can use nuxtImg for both local and remote URLs with ipx
      optimizedUrl = nuxtImg(path, {
        width: 1920,
        format: 'webp',
        quality: 80,
        fit: 'cover',
        preset: 'background'
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

  // Clean up any invalid background values and reset to default
  const resetToDefaultIfInvalid = () => {
    if (!backgroundCookie.value || !isValidBackground(backgroundCookie.value)) {
      backgroundCookie.value = DEFAULT_BACKGROUND
      sharedBackgroundRef.value = DEFAULT_BACKGROUND

      // Clear any Reddit source data that might be incorrect
      if (process.client) {
        localStorage.removeItem(REDDIT_SOURCE_STORAGE_KEY)
        currentRedditSource.value = null
      }

      // Apply the default background immediately
      if (process.client) {
        const optimizedUrl = getOptimizedBackgroundUrl(DEFAULT_BACKGROUND)
        document.documentElement.style.setProperty('background-image', `url('${optimizedUrl}')`, 'important')
      }
    }
  }

  // Apply background with improved performance and reliability
  function applyBackground(path: string) {
    if (!path) {
      path = DEFAULT_BACKGROUND
    }

    // Validate background value
    if (!isValidBackground(path)) {
      console.warn('Invalid background path detected, resetting to default:', path)
      path = DEFAULT_BACKGROUND
    }

    // Clear Reddit source info if setting a non-Reddit background
    if (path.startsWith('/images/') && process.client) {
      currentRedditSource.value = null
      localStorage.removeItem(REDDIT_SOURCE_STORAGE_KEY)
    }

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
      // Reset to default on error
      resetToDefaultIfInvalid()
    }
  }

  // Initialize the shared reference from cookie, with validation
  if (!backgroundCookie.value || backgroundCookie.value !== sharedBackgroundRef.value) {
    // Ensure we have a valid background
    resetToDefaultIfInvalid()
    sharedBackgroundRef.value = backgroundCookie.value || DEFAULT_BACKGROUND
  }

  // Apply default background immediately on first load
  if (process.client && document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      // Force apply the current background to ensure it's set correctly
      applyBackground(sharedBackgroundRef.value)
    })
  } else if (process.client) {
    // If document already loaded, apply background now
    applyBackground(sharedBackgroundRef.value)
  }

  // Initialize Reddit source from localStorage on load
  if (process.client && !currentRedditSource.value) {
    try {
      const storedData = localStorage.getItem(REDDIT_SOURCE_STORAGE_KEY)
      if (storedData) {
        const parsedSource = JSON.parse(storedData) as RedditPostInfo
        if (parsedSource && parsedSource.imageUrl) {
          // Check if the current background is from the saved Reddit source
          if (backgroundCookie.value === parsedSource.imageUrl) {
            currentRedditSource.value = parsedSource
          } else {
            // If background doesn't match, clear the Reddit source in localStorage
            localStorage.removeItem(REDDIT_SOURCE_STORAGE_KEY)
          }
        }
      }
    } catch (error) {
      localStorage.removeItem(REDDIT_SOURCE_STORAGE_KEY)
    }
  }

  // Computed property for current optimized URL
  const currentOptimizedUrl = computed(() => {
    if (sharedOptimizedUrlRef.value && optimizedUrlCache.has(sharedBackgroundRef.value)) {
      return sharedOptimizedUrlRef.value
    }
    return getOptimizedBackgroundUrl(sharedBackgroundRef.value)
  })

  // Check if a path matches the current background
  const isCurrentBackground = (path: string) => sharedBackgroundRef.value === path

  // Add a new method to set a random Reddit background
  const setRandomRedditBackground = async () => {
    const loading = ref(true)

    try {
      const postInfo = await getRandomSubredditImage('eveporn')

      if (postInfo && postInfo.imageUrl) {
        // Save the post info first
        currentRedditSource.value = postInfo

        // Store in localStorage instead of cookie
        if (process.client) {
          localStorage.setItem(REDDIT_SOURCE_STORAGE_KEY, JSON.stringify(postInfo))
        }

        // Process the Reddit URL through Nuxt Image optimization
        const optimizedUrl = processExternalUrl(postInfo.imageUrl)

        // Update background path - we still store the original URL
        // but we'll display the optimized version
        backgroundCookie.value = postInfo.imageUrl
        sharedBackgroundRef.value = postInfo.imageUrl

        // Reset video flag if it was previously a video background
        if (isVideoBackground.value) {
          isVideoBackground.value = false
        }

        // Apply the background with the optimized URL
        if (process.client) {
          // Preload the image to ensure it's ready
          const img = new Image()
          img.onload = () => {
            document.documentElement.style.setProperty('background-image', `url('${optimizedUrl}')`, 'important')
            // Cache the optimized URL
            optimizedUrlCache.set(postInfo.imageUrl, optimizedUrl)
            sharedOptimizedUrlRef.value = optimizedUrl
          }
          img.onerror = () => {
            console.error('Failed to load optimized Reddit image, falling back to original')
            document.documentElement.style.setProperty('background-image', `url('${postInfo.imageUrl}')`, 'important')
          }
          img.src = optimizedUrl
        }
      } else {
        console.error('No images found from r/eveporn')
        resetToDefaultIfInvalid()
      }
    } catch (error) {
      console.error('Failed to fetch random EVEporn image:', error)
      // On failure, reset to default
      resetToDefaultIfInvalid()
    } finally {
      loading.value = false
    }
  }

  // Check if current background is from Reddit - improved check
  const isRedditBackground = computed(() => {
    // First check if we have Reddit source info
    if (!currentRedditSource.value) return false

    // Then verify that current background matches the Reddit image URL
    return sharedBackgroundRef.value === currentRedditSource.value.imageUrl;
  })

  // Initialize - ensure we have a valid background
  resetToDefaultIfInvalid()

  return {
    selectedBackground: sharedBackgroundRef,
    optimizedBackground: sharedOptimizedUrlRef,
    availableBackgrounds,
    setBackground: applyBackground,
    isCurrentBackground,
    getOptimizedBackgroundUrl,
    currentOptimizedUrl,
    isVideoBackground,
    setRandomRedditBackground,
    currentRedditSource,
    isRedditBackground,
    resetToDefaultIfInvalid
  }
}
