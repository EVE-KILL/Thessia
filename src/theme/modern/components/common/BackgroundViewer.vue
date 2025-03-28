<template>
  <div class="background-view-button">
    <UButton
      :icon="isViewingBackground ? 'lucide:eye-off' : 'lucide:eye'"
      color="neutral"
      variant="solid"
      size="sm"
      aria-label="View background"
      :title="$t('toggleVisibility')"
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

  if (isViewingBackground.value) {
    // Create and inject style for background viewing mode
    const styleElement = document.createElement('style')
    styleElement.id = 'background-view-styles'
    styleElement.innerHTML = `
      /* Set up transition properties for all elements */
      #content,
      #inner-content,
      html::before,
      .vignette-overlay {
        transition: opacity 0.6s cubic-bezier(0.4, 0, 0.2, 1),
                    background 0.6s cubic-bezier(0.4, 0, 0.2, 1) !important;
      }

      /* Hide all content */
      #content,
      #inner-content {
        opacity: 0 !important;
      }

      /* Remove the vignette effects */
      html::before,
      .vignette-overlay {
        opacity: 0 !important;
        background: none !important;
      }

      /* Keep the button visible with a nice transition */
      .background-view-button {
        opacity: 1 !important;
        z-index: 9999 !important;
        transition: transform 0.3s ease, opacity 0.3s ease !important;
        transform: scale(1.1) !important;
      }

      /* Disable pointer events except for our button */
      body {
        pointer-events: none !important;
        overflow: hidden !important;
      }

      .background-view-button {
        pointer-events: auto !important;
      }
    `
    document.head.appendChild(styleElement)
  } else {
    // Add a short delay before removing styles for a smooth transition back
    setTimeout(() => {
      const styleElement = document.getElementById('background-view-styles')
      if (styleElement) {
        document.head.removeChild(styleElement)
      }
    }, 100) // Short delay to allow transitions to complete more naturally
  }
}

// Clean up event listeners
onUnmounted(() => {
  if (import.meta.client) {
    // Remove any styles we added
    const styleElement = document.getElementById('background-view-styles')
    if (styleElement) {
      document.head.removeChild(styleElement)
    }
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
