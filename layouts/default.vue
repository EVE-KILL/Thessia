<template>
  <!-- Add video background element that shows only when a video is selected -->
  <video
    v-if="isVideoBackground"
    ref="videoBackground"
    class="video-background"
    autoplay
    loop
    muted
    playsinline
  >
    <source :src="currentOptimizedUrl" type="video/mp4">
  </video>

  <UContainer id="content" class="content flex flex-col mx-auto">
    <div id="inner-content" class="inner-content h-full">
      <Navbar />
      <slot />
    </div>
  </UContainer>
</template>

<script setup lang="ts">
// Get background image handling functionality
const { currentOptimizedUrl, getOptimizedBackgroundUrl, isVideoBackground } = useBackgroundImage()

// Get theme mode functionality
const { currentTheme } = useThemeMode()

// Get the background from cookie for SSR
const backgroundCookie = useCookie('selected-background', {
  default: () => '/images/bg2.png'
})

// Always optimize the background image
const initialOptimizedUrl = getOptimizedBackgroundUrl(backgroundCookie.value)

// Video background reference
const videoBackground = ref(null)

// Apply background styles during SSR and CSR
useHead({
  htmlAttrs: {
    style: isVideoBackground.value
      ? 'background-color: black;'
      : `background-color: black; background-image: url('${initialOptimizedUrl}'); background-repeat: no-repeat; background-position: center; background-attachment: fixed; background-size: cover;`
  },
  style: [
    {
      children: `
        html {
          background-color: black !important;
          ${!isVideoBackground.value ? `background-image: url('${currentOptimizedUrl.value}') !important;` : ''}
          background-repeat: no-repeat !important;
          background-position: center !important;
          background-attachment: fixed !important;
          background-size: cover !important;
        }
      `,
      key: 'background-style'
    }
  ]
})

// Update background when optimized URL changes
watch(currentOptimizedUrl, (newUrl) => {
  if (process.client) {
    if (!isVideoBackground.value) {
      document.documentElement.style.setProperty('background-image', `url('${newUrl}')`, 'important')
    } else {
      // Clear background image when using video
      document.documentElement.style.setProperty('background-image', 'none', 'important')

      // If we have a video element, update its source
      if (videoBackground.value) {
        videoBackground.value.querySelector('source').src = newUrl
        videoBackground.value.load()
        videoBackground.value.play().catch(e => console.warn('Could not autoplay video:', e))
      }
    }
  }
})

// Handle initial video loading if needed
onMounted(() => {
  if (isVideoBackground.value && videoBackground.value) {
    videoBackground.value.play().catch(e => console.warn('Could not autoplay video:', e))
  }
})
</script>

<style>
/* Root CSS variables for theme colors */
:root {
  --bg-image-url: none;
}

html,
body {
  height: 100%;
  margin: 0;
  font-family: 'Shentox', sans-serif;
  font-size: 1.1em;
  color: black;
}

html.dark,
html.dark body {
  color: white;
}

/* Video background styling */
.video-background {
  position: fixed;
  top: 0;
  left: 0;
  min-width: 100%;
  min-height: 100%;
  width: auto;
  height: auto;
  z-index: -1;
  object-fit: cover;
}

/* Base background styles */
html {
  background-color: black !important;
  position: relative;
  min-height: 100%;
  overflow-y: scroll;
  scrollbar-gutter: stable;

  /* Use the CSS variable as a backup method */
  background-image: var(--bg-image-url);
  background-repeat: no-repeat;
  background-position: center;
  background-attachment: fixed;
  background-size: cover;
}

/* Dark mode background */
html.dark {
  background-color: black;
}

/* Vignette effect - Light mode version */
html::before {
  content: '';
  position: fixed;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
  background: radial-gradient(circle, transparent, white 95%);
  pointer-events: none;
  z-index: 0;
}

/* Dark mode vignette */
html.dark::before {
  background: radial-gradient(circle, transparent, black 95%);
}

body {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  position: relative;
  z-index: 1;
  background-color: transparent;
  padding-right: 0 !important;
}

*::-webkit-scrollbar {
  width: 10px;
}

*::-webkit-scrollbar-track {
  background-color: transparent;
}

*::-webkit-scrollbar-thumb {
  background-color: var(--color-primary-400);
  border-radius: 10px;
}

.content {
  max-width: 90rem;
  background-color: rgba(245, 245, 245, 0.7) !important;
  border-left: 2px solid #e5e5e5;
  border-right: 2px solid #e5e5e5;
  padding: 5px 5px 0px 5px;
  min-height: 100vh;
  width: 100%;
}

html.dark .content {
  background-color: rgba(21, 21, 21, 0.7) !important;
  border-left: 2px solid #252525;
  border-right: 2px solid #252525;
}

#content>#inner-content {
  display: block;
  padding: 5px 5px 25px 5px;
  background: rgba(255, 255, 255, 0.25);
  min-height: 100vh;
}

@media (min-width: 768px) {
  #content>#inner-content {
    padding: 5px 5px 25px 25px;
  }
}

html.dark #content>#inner-content {
  background: rgba(0, 0, 0, 0.25);
}

/* Mobile-specific adjustments */
@media (max-width: 767px) {
  .content {
    border-left: none;
    border-right: none;
  }

  html.dark .content {
    border-left: none;
    border-right: none;
  }
}
</style>
