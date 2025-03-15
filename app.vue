<template>
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
</template>

<script setup>
// Use background image composable to get the optimized URL directly
const { currentOptimizedUrl, getOptimizedBackgroundUrl } = useBackgroundImage()

// Use useCookie for background
const bgCookie = useCookie('selected-background', {
  default: () => '/images/bg2.png'
})

// Always optimize the background URL from cookie
const initialOptimizedUrl = getOptimizedBackgroundUrl(bgCookie.value)

// Use cookie for color mode instead of localStorage
const colorModeCookie = useCookie('nuxt-color-mode', {
  default: () => 'dark', // Default to dark mode
  watch: true,           // Update the cookie when the value changes
  maxAge: 60 * 60 * 24 * 365 // Valid for 1 year
})

// Ensure color mode is set as early as possible in SSR and client
const colorMode = useColorMode()

// Force color mode to match cookie before anything renders
colorMode.preference = colorModeCookie.value || 'dark'
colorMode.value = colorModeCookie.value || 'dark'  // Also set value directly for immediate effect

// Add a function to ensure dark class is applied to html element immediately
if (process.client) {
  const setInitialColorMode = () => {
    // Apply dark class directly to html element if in dark mode
    if (colorModeCookie.value === 'dark') {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }

  // Run immediately
  setInitialColorMode()

  // Also run on DOMContentLoaded to be safe
  document.addEventListener('DOMContentLoaded', setInitialColorMode)
}

// Sync changes back to the cookie
watch(() => colorMode.preference, (newVal) => {
  colorModeCookie.value = newVal
})

// Use our more robust theme mode handler
const { currentTheme } = useThemeMode()

// Use the optimized image URL consistently
useHead({
  // This will be rendered in the <head> during SSR
  script: [{
    innerHTML: `
      document.documentElement.style.backgroundColor = 'black';
      document.documentElement.style.backgroundImage = 'url("${initialOptimizedUrl}")';
      document.documentElement.style.backgroundRepeat = 'no-repeat';
      document.documentElement.style.backgroundPosition = 'center';
      document.documentElement.style.backgroundAttachment = 'fixed';
      document.documentElement.style.backgroundSize = 'cover';
    `,
    type: 'text/javascript'
  },
  {
    innerHTML: `
      // Immediately apply theme class before any rendering
      (function() {
        try {
          var theme = localStorage.getItem('nuxt-color-mode') ||
                      document.cookie.match(/nuxt-color-mode=(light|dark)/)?.[1] ||
                      'dark';
          if (theme === 'dark') document.documentElement.classList.add('dark');
          else document.documentElement.classList.remove('dark');
        } catch(e) {}
      })();
    `,
    type: 'text/javascript'
  }],
  // Add a stylesheet with high priority and important rules
  style: [{
    innerHTML: `
      html {
        background-color: black !important;
        background-image: url('${initialOptimizedUrl}') !important;
        background-repeat: no-repeat !important;
        background-position: center !important;
        background-attachment: fixed !important;
        background-size: cover !important;
      }
    `,
    id: 'critical-background',
  }]
})
</script>
