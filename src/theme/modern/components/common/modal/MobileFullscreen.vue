<script setup lang="ts">
import { watch, onUnmounted } from 'vue';

const props = defineProps({
  /**
   * Whether the modal is visible
   */
  open: {
    type: Boolean,
    default: false
  },
  /**
   * Modal title
   */
  title: {
    type: String,
    required: true
  },
  /**
   * Z-index for the modal
   */
  zIndex: {
    type: Number,
    default: 9999
  }
});

const emit = defineEmits(['close']);

// Improved body scroll locking when modal is open
watch(() => props.open, (isOpen) => {
  if (import.meta.client) {
    const body = document.body;

    if (isOpen) {
      // Store current scroll position
      const scrollY = window.scrollY;
      body.style.position = 'fixed';
      body.style.width = '100%';
      body.style.top = `-${scrollY}px`;
      body.style.overflow = 'hidden';
      body.classList.add('modal-open');
      body.dataset.scrollPosition = String(scrollY);

      // Calculate scrollbar width and set custom property
      const scrollbarWidth = window.innerWidth - body.clientWidth;
      document.documentElement.style.setProperty('--scrollbar-width', `${scrollbarWidth}px`);
    } else {
      // Restore scroll position
      const scrollY = body.dataset.scrollPosition || '0';
      body.style.position = '';
      body.style.width = '';
      body.style.top = '';
      body.style.overflow = '';
      body.classList.remove('modal-open');
      delete body.dataset.scrollPosition;
      document.documentElement.style.setProperty('--scrollbar-width', '0px');
      window.scrollTo(0, parseInt(scrollY, 10));
    }
  }
});

// Clean up on unmount
onUnmounted(() => {
  if (import.meta.client && document.body.classList.contains('modal-open')) {
    // Restore scroll if component unmounts while modal is open
    const scrollY = document.body.dataset.scrollPosition || '0';
    document.body.style.position = '';
    document.body.style.width = '';
    document.body.style.top = '';
    document.body.style.overflow = '';
    document.body.classList.remove('modal-open');
    document.documentElement.style.setProperty('--scrollbar-width', '0px');
    delete document.body.dataset.scrollPosition;
    window.scrollTo(0, parseInt(scrollY, 10));
  }
});

const handleClose = () => {
  emit('close');
};
</script>

<template>
  <Teleport to="body">
    <div
      v-if="open"
      class="modal-container"
      :style="`z-index: ${zIndex};`"
    >
      <!-- Background with blur -->
      <div class="modal-backdrop"></div>

      <!-- Content container -->
      <div class="modal-content">
        <!-- Header with close button -->
        <div class="modal-header">
          <div class="flex items-center justify-between w-full h-6 mr-3 ml-3 mt-2">
            <!-- Default header with title - can be overridden -->
            <slot name="header">
              <h2 class="text-xl font-bold text-gray-900 dark:text-white">
                {{ title }}
              </h2>
            </slot>

            <!-- Close button - always present -->
            <UButton
              icon="lucide:x"
              color="neutral"
              variant="ghost"
              @click="handleClose"
            />
          </div>
          <!-- Additional header controls slot -->
          <slot name="header-controls"></slot>
        </div>

        <!-- Main scrollable content area -->
        <div class="modal-body">
          <div class="modal-body-content">
            <slot></slot>
          </div>
        </div>

        <!-- Footer area for buttons/actions (optional) -->
        <slot name="footer"></slot>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
/* Full screen modal container */
.modal-container {
  position: fixed;
  inset: 0;
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  animation: fadeIn 0.3s ease;
  -webkit-overflow-scrolling: touch;
}

/* Backdrop with blur effect */
.modal-backdrop {
  position: absolute;
  inset: 0;
  background-color: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
}

:root.dark .modal-backdrop {
  background-color: rgba(15, 15, 15, 0.95);
}

/* Content container */
.modal-content {
  position: relative;
  z-index: 10;
  display: flex;
  flex-direction: column;
  height: 100%;
  width: 100%;
}

/* Header styles */
.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  border-bottom: 1px solid rgba(229, 231, 235);
  background-color: rgba(255, 255, 255, 0.5);
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
}

:root.dark .modal-header {
  border-bottom-color: rgba(55, 65, 81);
  background-color: rgba(0, 0, 0, 0.5);
}

/* Scrollable body area */
.modal-body {
  flex: 1;
  overflow-y: auto;
  overscroll-behavior: contain;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: thin;
  scrollbar-color: rgba(156, 163, 175, 0.5) transparent;
}

.modal-body-content {
  padding: 1rem;
  height: 100%;
  padding-bottom: calc(3.5rem + env(safe-area-inset-bottom, 0.5rem));
}

/* Scrollbar styling */
.modal-body::-webkit-scrollbar {
  width: 5px;
}

.modal-body::-webkit-scrollbar-track {
  background: transparent;
}

.modal-body::-webkit-scrollbar-thumb {
  background-color: rgba(156, 163, 175, 0.5);
  border-radius: 5px;
}

/* Animation */
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

/* Safari compatibility */
@supports not ((backdrop-filter: blur(8px)) or (-webkit-backdrop-filter: blur(8px))) {
  .modal-backdrop {
    background-color: rgba(255, 255, 255, 0.98) !important;
  }

  :root.dark .modal-backdrop {
    background-color: rgba(15, 15, 15, 0.98) !important;
  }

  .modal-header {
    background-color: rgba(255, 255, 255, 0.98);
  }

  :root.dark .modal-header {
    background-color: rgba(15, 15, 15, 0.98);
  }
}

/* Prevent double scroll bars */
:global(body.modal-open) {
  overflow-y: hidden !important;
  padding-right: var(--scrollbar-width, 15px);
}

@media (max-width: 767px) {
  :global(body.modal-open) {
    position: fixed !important;
    width: 100% !important;
  }
}
</style>
