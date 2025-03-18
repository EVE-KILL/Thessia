<template>
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
</template>

<script setup lang="ts">
const isViewingBackground = ref(false)

// Toggle background view function
const toggleBackgroundView = () => {
  if (!process.client) return

  isViewingBackground.value = !isViewingBackground.value

  if (isViewingBackground.value) {
    // Create and inject style for background viewing mode
    const styleElement = document.createElement('style')
    styleElement.id = 'background-view-styles'
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
    `
    document.head.appendChild(styleElement)
  } else {
    // Remove the injected style
    const styleElement = document.getElementById('background-view-styles')
    if (styleElement) {
      document.head.removeChild(styleElement)
    }
  }
}

// Clean up event listeners
onUnmounted(() => {
  if (process.client) {
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
  transition: opacity 0.2s ease;
}

.background-view-button:hover {
  opacity: 1;
}

/* Add an inset shadow to make the button visible on all backgrounds */
.background-view-button .u-button {
  box-shadow: 0 0 10px rgba(0, 0, 0, 0.3);
}
</style>
