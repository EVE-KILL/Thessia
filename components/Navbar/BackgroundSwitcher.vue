<script setup lang="ts">
import { ref, computed } from 'vue';
import CustomDropdown from './CustomDropdown.vue';
import MobileFullscreenModal from '../Modal/MobileFullscreenModal.vue';

// Use the background image composable
const {
  availableBackgrounds,
  setBackground,
  isCurrentBackground,
  setRandomRedditBackground,
  isRedditBackground,
  currentRedditSource
} = useBackgroundImage();

// Track dropdown state
const isDropdownOpen = ref(false);

// Track loading state for Reddit background
const isLoadingRandomBg = ref(false);

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

// Function to check if path is a video file
const isVideoFile = (path: string): boolean => {
  return path.toLowerCase().endsWith('.mp4') ||
         path.toLowerCase().endsWith('.webm') ||
         path.toLowerCase().endsWith('.ogg');
};

// Handle background selection
const selectBackground = async (path: string) => {
  setBackground(path);

  // Close dropdown or fullscreen mode
  isDropdownOpen.value = false;

  if (isFullscreen.value) {
    emit('background-selected', path);
    emit('fullscreen-closed');
    isFullscreen.value = false;
  }
};

// Handle random Reddit background
const selectRandomReddit = async () => {
  isLoadingRandomBg.value = true;
  await setRandomRedditBackground();
  isLoadingRandomBg.value = false;

  // Close dropdown or fullscreen mode
  isDropdownOpen.value = false;

  if (isFullscreen.value) {
    emit('background-selected', 'reddit');
    emit('fullscreen-closed');
    isFullscreen.value = false;
  }
};

// Format Reddit source URL
const getRedditSourceUrl = computed(() => {
  if (!currentRedditSource.value) {
    return 'https://www.reddit.com/r/eveporn';
  }
  return `${currentRedditSource.value.permalink}`;
});

// Get title for Reddit source
const getRedditSourceTitle = computed(() => {
  if (!currentRedditSource.value) {
    return 'View on Reddit';
  }
  return `Source: ${currentRedditSource.value.title}`;
});

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
          >
            <UIcon name="i-heroicons-photo" class="text-xl text-black dark:text-white" />
          </UButton>
        </template>

        <!-- Dropdown Content -->
        <div class="p-2">
          <div class="flex items-center justify-between mb-4">
            <h3 class="text-base font-medium">
              {{ $t('background.title') }}
            </h3>
            <!-- Background view button removed -->
          </div>

          <!-- Background Grid - without random button -->
          <div class="grid grid-cols-2 gap-2">
            <button
              v-for="bg in availableBackgrounds"
              :key="bg.path"
              @click="selectBackground(bg.path)"
              class="bg-thumb-btn relative overflow-hidden rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-(--ui-focus-ring)"
              :class="{'ring-2 ring-(--ui-focus-ring)': isCurrentBackground(bg.path)}"
            >
              <!-- Image or Video Thumbnail -->
              <div class="aspect-video bg-(--ui-bg-muted) overflow-hidden">
                <!-- For Images -->
                <template v-if="!isVideoFile(bg.path)">
                  <NuxtImg
                      :src="bg.path"
                      width="180"
                      loading="lazy"
                      format="webp"
                      fit="cover"
                      quality="80"
                      class="w-full h-full object-cover"
                  />
                </template>

                <!-- For Videos -->
                <template v-else>
                  <div class="w-full h-full flex items-center justify-center">
                    <UIcon name="i-heroicons-film" class="text-2xl" />
                  </div>
                </template>
              </div>

              <!-- Image Name Overlay -->
              <div class="absolute bottom-0 left-0 right-0 bg-black/70 py-1 px-2">
                <div class="flex items-center justify-between">
                  <span class="text-xs text-white truncate">{{ bg.name }}</span>
                  <UIcon
                    v-if="isCurrentBackground(bg.path)"
                    name="i-heroicons-check"
                    class="text-(--ui-primary) text-xs"
                  />
                </div>
              </div>
            </button>
          </div>

          <!-- Random Reddit Option with consistent styling -->
          <div class="mt-2 px-3 py-2 border-t border-(--ui-border)">
            <button
              @click="selectRandomReddit"
              class="w-full flex items-center text-(--ui-text-subtle) hover:text-(--ui-primary) transition-colors"
              :disabled="isLoadingRandomBg"
            >
              <UIcon
                :name="isLoadingRandomBg ? 'i-heroicons-arrow-path' : 'i-heroicons-photo'"
                class="mr-2 text-[#FF4500]"
                :class="{'animate-spin': isLoadingRandomBg}"
              />
              <span class="truncate">
                {{ isLoadingRandomBg ? $t('background.loading') : $t('background.randomReddit') }}
              </span>
            </button>
          </div>

          <!-- Reddit Source Link (if applicable) -->
          <div v-if="isRedditBackground" class="mt-2 px-3 py-2 border-t border-(--ui-border)">
            <a
              :href="getRedditSourceUrl"
              target="_blank"
              rel="noopener noreferrer"
              class="flex items-center text-sm text-(--ui-text-subtle) hover:text-(--ui-primary)"
              :title="getRedditSourceTitle"
            >
              <UIcon name="i-simple-icons-reddit" class="mr-2 text-[#FF4500]" />
              <span class="truncate">{{ $t('background.viewSource') }}</span>
            </a>
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
      >
        <UIcon name="i-heroicons-photo" class="text-xl text-black dark:text-white" />
      </UButton>
    </div>

    <!-- Using the new MobileFullscreenModal component -->
    <MobileFullscreenModal
      :open="isFullscreen"
      :title="$t('background.title')"
      @close="closeFullscreen"
    >
      <!-- Header controls slot - removed background viewing button -->
      <template #header-controls>
        <!-- Background view button removed -->
      </template>

      <!-- Main content slot -->
      <div class="grid grid-cols-2 gap-4">
        <button
          v-for="bg in availableBackgrounds"
          :key="bg.path"
          @click="selectBackground(bg.path)"
          class="bg-thumb-btn relative overflow-hidden rounded-lg focus:outline-none shadow-sm"
          :class="{'ring-2 ring-primary-500': isCurrentBackground(bg.path)}"
        >
          <!-- Image or Video Thumbnail -->
          <div class="aspect-video bg-(--ui-bg-muted) overflow-hidden">
            <!-- For Images -->
            <template v-if="!isVideoFile(bg.path)">
              <NuxtImg
                  :src="bg.path"
                  loading="lazy"
                  format="webp"
                  fit="cover"
                  quality="80"
                  class="w-full h-full object-cover"
              />
            </template>

            <!-- For Videos -->
            <template v-else>
              <div class="w-full h-full flex items-center justify-center bg-black/20 dark:bg.white/10">
                <UIcon name="i-heroicons-film" class="text-3xl" />
              </div>
            </template>
          </div>

          <!-- Image Name Overlay -->
          <div class="absolute bottom-0 left-0 right-0 bg-black/70 py-2 px-3">
            <div class="flex items-center justify-between">
              <span class="text-sm text-white truncate">{{ bg.name }}</span>
              <UIcon
                v-if="isCurrentBackground(bg.path)"
                name="i-heroicons-check"
                class="text-primary-500"
              />
            </div>
          </div>
        </button>
      </div>

      <!-- Footer slot for fixed button at bottom -->
      <template #footer>
        <div class="fixed-bottom-button">
          <button
            @click="selectRandomReddit"
            class="w-full flex items-center justify-center py-3 px-4 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-md transition-colors text-gray-900 dark:text-white"
            :disabled="isLoadingRandomBg"
          >
            <UIcon
              :name="isLoadingRandomBg ? 'i-heroicons-arrow-path' : 'i-heroicons-photo'"
              class="mr-3 text-xl"
              :class="{'animate-spin': isLoadingRandomBg}"
              :style="isLoadingRandomBg ? '' : 'color: #FF4500;'"
            />
            <span class="font-medium">
              {{ isLoadingRandomBg ? $t('background.loading') : $t('background.randomReddit') }}
            </span>
          </button>

          <!-- Reddit Source Link (if applicable) -->
          <a
            v-if="isRedditBackground"
            :href="getRedditSourceUrl"
            target="_blank"
            rel="noopener noreferrer"
            class="mt-2 w-full flex items-center justify-center py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
            :title="getRedditSourceTitle"
          >
            <UIcon name="i-simple-icons-reddit" class="mr-2" style="color: #FF4500;" />
            <span>{{ $t('background.viewSource') }}</span>
          </a>
        </div>
      </template>
    </MobileFullscreenModal>
  </div>
</template>

<style scoped>
.aspect-video {
  aspect-ratio: 16/9;
}

.bg-thumb-btn {
  transition: all 0.2s ease;
}

.bg-thumb-btn:hover {
  transform: scale(1.02);
}

/* Fixed bottom button styling */
.fixed-bottom-button {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 0.5rem;
  background-color: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  border-top: 1px solid rgba(229, 231, 235);
  z-index: 10;
}

:root.dark .fixed-bottom-button {
  background-color: rgba(0, 0, 0, 0.9);
  border-top-color: rgba(55, 65, 81);
}

/* Enhanced shadow for buttons in grid */
.shadow-sm {
  box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
}

:root.dark .shadow-sm {
  box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.3);
}

/* Safari fix for backdrop-filter */
@supports not ((backdrop-filter: blur(8px)) or (-webkit-backdrop-filter: blur(8px))) {
  .fixed-bottom-button {
    background-color: rgba(255, 255, 255, 0.98);
  }

  :root.dark .fixed-bottom-button {
    background-color: rgba(15, 15, 15, 0.98);
  }
}
</style>
