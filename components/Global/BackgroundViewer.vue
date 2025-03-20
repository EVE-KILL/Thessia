<template>
  <div class="background-view-button">
    <UButton
      :icon="isViewingBackground ? 'lucide:eye-off' : 'lucide:eye'"
      color="neutral"
      variant="solid"
      size="sm"
      aria-label="View background"
      :title="$t('background.toggleVisibility')"
      @click="toggleBackgroundView"
    />
  </div>
</template>

<script setup lang="ts">
const isViewingBackground = ref(false)

// Toggle background view function
const toggleBackgroundView = () => {
  if (!import.meta.client) return

  isViewingBackground.value = !isViewingBackground.value

  // Initialize the style element if it doesn't exist yet
  if (!document.getElementById('background-view-styles')) {
    const styleElement = document.createElement('style')
    styleElement.id = 'background-view-styles'
    document.head.appendChild(styleElement)
  }

  const styleElement = document.getElementById('background-view-styles')

  // Set base CSS that applies regardless of view state
  let baseCSS = `
    /* Set up smooth transitions for all affected elements */
    .vignette-overlay,
    html::before,
    #content,
    #inner-content {
      transition: opacity 0.6s cubic-bezier(0.4, 0, 0.2, 1),
                  background 0.6s cubic-bezier(0.4, 0, 0.2, 1) !important;
    }

    /* Default state (visible vignette) */
    html::before {
      opacity: 1 !important;
    }

    .vignette-overlay {
      opacity: 1 !important;
    }

    /* Background view state - hide content and vignette */
    body.viewing-background #content,
    body.viewing-background #inner-content {
      opacity: 0 !important;
    }

    body.viewing-background html::before,
    body.viewing-background .vignette-overlay {
      opacity: 0 !important;
      background: none !important;
    }

    /* Button styling */
    .background-view-button {
      transition: transform 0.3s ease, opacity 0.3s ease !important;
    }

    body.viewing-background .background-view-button {
      opacity: 1 !important;
      z-index: 9999 !important;
      transform: scale(1.1) !important;
    }

    /* Pointer events */
    body.viewing-background {
      pointer-events: none !important;
    }

    body.viewing-background .background-view-button {
      pointer-events: auto !important;
    }
  `

  // Apply styles
  styleElement.innerHTML = baseCSS

  // Toggle body class for the view state
  if (isViewingBackground.value) {
    document.body.classList.add('viewing-background')
  } else {
    document.body.classList.remove('viewing-background')
  }
}

// Clean up on component unmount
onUnmounted(() => {
  if (import.meta.client) {
    // Remove any styles we added
    const styleElement = document.getElementById('background-view-styles')
    if (styleElement) {
      document.head.removeChild(styleElement)
    }

    // Remove any class we added
    document.body.classList.remove('viewing-background')
  }
})
</script>

<style scoped>
.background-view-button {
  position: fixed;
  bottom: 20px;
  left: 20px;
  z-index: 40;
  opacity: 0.6;
  transition: opacity 0.3s ease, transform 0.3s ease;
}

.background-view-button:hover {
  opacity: 1;
  transform: scale(1.05);
}

/* Add an inset shadow to make the button visible on all backgrounds */
.background-view-button .u-button {
  box-shadow: 0 0 10px rgba(0, 0, 0, 0.3);
}
</style>
