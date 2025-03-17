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

  <!-- Background viewer button - changed to toggle on click -->
  <div class="background-view-button">
    <UButton
      :icon="isViewingBackground ? 'i-heroicons-eye-slash' : 'i-heroicons-eye'"
      color="neutral"
      variant="solid"
      size="sm"
      aria-label="View background"
      :title="$t('background.toggleVisibility')"
      @click="toggleBackgroundView"
    />
  </div>

  <!-- Modified container structure to use grid layout -->
  <UContainer id="content" class="content mx-auto">
    <div id="inner-content" class="inner-content">
      <Navbar />
      <main class="main-content">
        <slot />
      </main>
      <Footer />
    </div>
  </UContainer>
</template>

<script setup lang="ts">
// Get background image handling functionality
const {
  currentOptimizedUrl,
  getOptimizedBackgroundUrl,
  isVideoBackground,
} = useBackgroundImage()

// Get theme mode functionality
const { currentTheme } = useThemeMode()

// Track if background is being viewed (content faded out)
const isViewingBackground = ref(false);

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

// Background viewing functions - now toggled with one click
const toggleBackgroundView = () => {
  if (!process.client) return;

  // Toggle the viewing state
  isViewingBackground.value = !isViewingBackground.value;

  if (isViewingBackground.value) {
    // Create and inject global style when turning ON
    const styleElement = document.createElement('style');
    styleElement.id = 'background-view-styles';
    styleElement.innerHTML = `
      /* Hide all content */
      #content,
      #inner-content {
        opacity: 0 !important;
        transition: opacity 0.2s ease-out !important;
      }

      /* Remove the vignette effect */
      html::before {
        opacity: 0 !important;
        background: none !important;
      }

      /* Keep video background visible */
      .video-background {
        opacity: 1 !important;
        z-index: 1 !important;
      }

      /* Keep the button visible */
      .background-view-button {
        opacity: 1 !important;
        z-index: 9999 !important;
      }

      /* Disable pointer events except for our button */
      body {
        pointer-events: none !important;
      }

      .background-view-button {
        pointer-events: auto !important;
      }
    `;

    document.head.appendChild(styleElement);
  } else {
    // Remove the injected style when turning OFF
    const styleElement = document.getElementById('background-view-styles');
    if (styleElement) {
      document.head.removeChild(styleElement);
    }
  }
};

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

// Handle initial video loading
onMounted(() => {
  if (process.client && isVideoBackground.value && videoBackground.value) {
    videoBackground.value.play().catch(e => console.warn('Could not autoplay video:', e))
  }
})

// Clean up event listeners
onUnmounted(() => {
  if (process.client) {
    // Remove any lingering styles
    const styleElement = document.getElementById('background-view-styles');
    if (styleElement) {
      document.head.removeChild(styleElement);
    }
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
  max-width: 80rem;
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
  display: grid; /* Using grid instead of flex */
  grid-template-rows: auto 1fr auto; /* Header, content, footer */
  padding: 5px 5px 0 5px;
  background: rgba(255, 255, 255, 0.25);
  min-height: 100vh;
}

/* Main content area styling */
.main-content {
  padding-bottom: 20px; /* Add space above footer */
}

@media (min-width: 768px) {
  #content>#inner-content {
    padding-right: 5px;
    padding-left: 25px;
  }
}

html.dark #content>#inner-content {
  background: rgba(0, 0, 0, 0.80);
}

html #content>#inner-content {
  background: rgba(255, 255, 255, 0.80);
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

/* Add padding top to content to account for fixed navbar */
#inner-content {
  padding-top: 1rem; /* Reduced padding since sticky takes its own space */
}

/* Background viewer button positioning - updated for better visibility */
.background-view-button {
  position: fixed;
  bottom: 20px;
  left: 20px;
  z-index: 40;
  opacity: 0.6;
  transition: opacity 0.2s ease;
}

.background-view-button:hover {
  opacity: 1;
}

/* Add a inset shadow to the button to make it visible on light and dark backgrounds */
.background-view-button .u-button {
  box-shadow: 0 0 10px rgba(0, 0, 0, 0.3);
}
</style>
