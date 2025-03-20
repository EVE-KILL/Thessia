<script setup lang="ts">
import { ref } from 'vue';
import CustomDropdown from './CustomDropdown.vue';
import MobileFullscreenModal from '../Modal/MobileFullscreenModal.vue';

// Use the composables
const { currentBackground, setSiteBackground } = siteBackground();

// Get the backgrounds that are available from the API
const bgData = await useFetch('/api/site/backgrounds');
const backgrounds = bgData.data;

// Track dropdown state
const isDropdownOpen = ref(false);

// Track if we're displaying in fullscreen mode (for mobile)
const isFullscreen = ref(false);

// Emit events for parent components
const emit = defineEmits(['fullscreen-opened', 'fullscreen-closed', 'background-selected']);

// Props for component
const props = defineProps({
  // Whether the component is being used on mobile
  isMobile: {
    type: Boolean,
    default: false
  },
  // Whether to open in fullscreen mode (controlled by parent)
  fullscreenOpen: {
    type: Boolean,
    default: false
  }
});

// Watch for changes in fullscreen prop from parent
watch(() => props.fullscreenOpen, (value) => {
  isFullscreen.value = value;
});

// Check if a background is the current one - compare directly to the ref value
const isCurrentBackground = (path: string): boolean => {
  return currentBackground.value === path;
};

// Handle background selection
const selectBackground = (path: string) => {
  setSiteBackground(path);

  // Close dropdown or fullscreen mode
  isDropdownOpen.value = false;

  if (isFullscreen.value) {
    emit('background-selected', path);
    emit('fullscreen-closed');
    isFullscreen.value = false;
  }
};

// Open fullscreen mode
const openFullscreen = () => {
  isFullscreen.value = true;
  emit('fullscreen-opened');
};

// Close fullscreen mode
const closeFullscreen = () => {
  isFullscreen.value = false;
  emit('fullscreen-closed');
};

// Improved body scroll locking for mobile fullscreen view
watch(isFullscreen, (isOpen) => {
  if (process.client) {
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
  if (process.client && document.body.classList.contains('modal-open')) {
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
</script>

<template>
  <div class="background-switcher">
    <!-- For desktop: Use CustomDropdown -->
    <div v-if="!isMobile" class="desktop-switcher">
      <CustomDropdown
        v-model="isDropdownOpen"
        width="320px"
        :max-height="80"
        :smart-position="true"
      >
        <!-- Trigger Button -->
        <template #trigger>
          <UButton
            color="primary"
            variant="ghost"
            aria-label="Change background"
            class="cursor-pointer"
          >
            <UIcon name="lucide:book-image" class="text-xl text-black dark:text-white" />
          </UButton>
        </template>

        <!-- Dropdown Content -->
        <div class="p-2">
          <div class="flex items-center justify-between mb-4">
            <h3 class="text-base font-medium">
              {{ $t('background.title', 'Select Background') }}
            </h3>
          </div>

          <!-- Loading state -->
          <div v-if="loading" class="p-4 text-center">
            <UIcon name="lucide:refresh-ccw" class="animate-spin text-xl mb-2" />
            <p class="text-sm text-gray-500 dark:text-gray-400">{{ $t('background.loading', 'Loading backgrounds...') }}</p>
          </div>

          <!-- Background Grid -->
          <div v-else class="grid grid-cols-2 gap-2">
            <button
              v-for="bg in backgrounds"
              :key="bg.path"
              @click="selectBackground(bg.path)"
              class="bg-thumb-btn relative overflow-hidden rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-(--ui-focus-ring) cursor-pointer"
              :class="{'ring-2 ring-(--ui-focus-ring)': isCurrentBackground(bg.path)}"
            >
              <!-- Image Thumbnail -->
              <div class="aspect-video bg-(--ui-bg-muted) overflow-hidden">
                <NuxtImg
                  :src="bg.path"
                  width="180"
                  loading="lazy"
                  format="webp"
                  fit="cover"
                  quality="80"
                  class="w-full h-full object-cover"
                />
              </div>

              <!-- Image Name Overlay -->
              <div class="absolute bottom-0 left-0 right-0 bg-black/70 py-1 px-2">
                <div class="flex items-center justify-between">
                  <UIcon
                    v-if="isCurrentBackground(bg.path)"
                    name="lucide:check"
                    class="text-(--ui-primary) text-xs"
                  />
                </div>
              </div>
            </button>
          </div>
        </div>
      </CustomDropdown>
    </div>

    <!-- For mobile: Just show the button that opens fullscreen view -->
    <div v-else>
      <UButton
        color="primary"
        variant="ghost"
        aria-label="Change background"
        @click="openFullscreen"
        class="cursor-pointer"
      >
        <UIcon name="lucide:book-image" class="text-xl text-black dark:text-white" />
      </UButton>
    </div>

    <!-- Mobile Fullscreen Modal -->
    <MobileFullscreenModal
      :open="isFullscreen"
      :title="$t('background.title', 'Select Background')"
      @close="closeFullscreen"
    >
      <!-- Loading state -->
      <div v-if="loading" class="p-8 text-center">
        <UIcon name="lucide:refresh-ccw" class="animate-spin text-2xl mb-3" />
        <p class="text-gray-500 dark:text-gray-400">{{ $t('background.loading', 'Loading backgrounds...') }}</p>
      </div>

      <!-- Main content slot -->
      <div v-else class="grid grid-cols-2 gap-4">
        <button
          v-for="bg in backgrounds"
          :key="bg.path"
          @click="selectBackground(bg.path)"
          class="bg-thumb-btn relative overflow-hidden rounded-lg focus:outline-none shadow-sm cursor-pointer"
          :class="{'ring-2 ring-primary-500': isCurrentBackground(bg.path)}"
        >
          <!-- Image Thumbnail -->
          <div class="aspect-video bg-(--ui-bg-muted) overflow-hidden">
            <NuxtImg
              :src="bg.path"
              loading="lazy"
              format="webp"
              fit="cover"
              quality="80"
              class="w-full h-full object-cover"
            />
          </div>

          <!-- Image Name Overlay -->
          <div class="absolute bottom-0 left-0 right-0 bg-black/70 py-2 px-3">
            <div class="flex items-center justify-between">
              <span class="text-sm text-white truncate">{{ bg.name }}</span>
              <UIcon
                v-if="isCurrentBackground(bg.path)"
                name="lucide:check"
                class="text-primary-500"
              />
            </div>
          </div>
        </button>
      </div>
    </MobileFullscreenModal>
  </div>
</template>

<style scoped>
.aspect-video {
  aspect-ratio: 16/9;
}

.bg-thumb-btn {
  transition: all 0.2s ease;
  cursor: pointer;
}

.bg-thumb-btn:hover {
  transform: scale(1.02);
}

/* Shadow for buttons in grid */
.shadow-sm {
  box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
}

:root.dark .shadow-sm {
  box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.3);
}
</style>
