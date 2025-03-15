<script lang="ts" setup>
import { ref, watch, onUnmounted } from 'vue';
import { useSearch } from '~/composables/useSearch';

// Props for passing data from parent
const props = defineProps({
  themeIcon: String,
  themeAriaLabel: String,
  toggleTheme: Function,
  availableBackgrounds: Array,
  setBackground: Function,
  isCurrentBackground: Function,
  setRandomRedditBackground: Function,
  userDropdown: Array,
  navigationItems: Array,
  informationDropdown: Array,
  isVideoFile: Function,
  // Add class prop to accept CSS classes from parent
  class: {
    type: [String, Object, Array],
    default: ''
  }
})

// Mobile menu state
const isMobileMenuOpen = ref(false)
const isSearchVisible = ref(false)
const isLoadingRandomBg = ref(false)

// Additional state for mobile background selector
const isMobileBgSelectorOpen = ref(false)

// Function to open mobile background selector
const openMobileBgSelector = () => {
  isMobileBgSelectorOpen.value = true
}

// Function to close mobile background selector
const closeMobileBgSelector = () => {
  isMobileBgSelectorOpen.value = false
}

// Toggle search visibility - updated to navigate to search page
const toggleSearch = () => {
  // Navigate to search page instead of showing in-navbar search
  navigateTo('/search')
}

// Enhanced background changing function with proper cleanup
const changeBackground = (path) => {
  // Apply the background immediately
  props.setBackground(path)

  // Close mobile menu if open
  if (isMobileMenuOpen.value) {
    isMobileMenuOpen.value = false
  }
}

// Prevent body scrolling when menu is open
watch(isMobileMenuOpen, (isOpen) => {
  if (process.client) {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
      document.body.classList.add('menu-open')
    } else {
      document.body.style.overflow = ''
      document.body.classList.remove('menu-open')
    }
  }
})

// Clean up when component is unmounted
onUnmounted(() => {
  if (process.client) {
    document.body.style.overflow = ''
    document.body.classList.remove('menu-open')
  }
})

// Search functionality
const { query, navigateToSearch, results, isLoading, setupAutoSearch } = useSearch();

// Set up auto search with debounce
setupAutoSearch(3, 300);

// Handle search submission
const handleSearchSubmit = (e: Event) => {
  e.preventDefault();
  navigateToSearch();
  isSearchVisible.value = false;
}

// Helper functions for entity types
const getIconForEntityType = (type: string) => {
  switch (type.toLowerCase()) {
    case 'character':
      return 'i-heroicons-user';
    case 'corporation':
      return 'i-heroicons-building-office';
    case 'alliance':
      return 'i-heroicons-user-group';
    case 'ship':
      return 'i-heroicons-rocket-launch';
    case 'item':
      return 'i-heroicons-cube';
    case 'system':
      return 'i-heroicons-globe-alt';
    case 'region':
      return 'i-heroicons-map';
    default:
      return 'i-heroicons-question-mark-circle';
  }
};

const getColorForEntityType = (type: string) => {
  switch (type.toLowerCase()) {
    case 'character':
      return 'text-blue-600 dark:text-blue-400';
    case 'corporation':
      return 'text-green-600 dark:text-green-400';
    case 'alliance':
      return 'text-purple-600 dark:text-purple-400';
    case 'ship':
      return 'text-red-600 dark:text-red-400';
    case 'item':
      return 'text-orange-600 dark:text-orange-400';
    case 'system':
      return 'text-teal-600 dark:text-teal-400';
    case 'region':
      return 'text-indigo-600 dark:text-indigo-400';
    default:
      return 'text-gray-600 dark:text-gray-400';
  }
};

// Helper to capitalize first letter of a string
const capitalizeFirstLetter = (string: string) => {
  return string.charAt(0).toUpperCase() + string.slice(1);
};
</script>

<template>
  <!-- Add :class="props.class" to the root element to inherit classes from parent -->
  <div :class="props.class" class="w-full bg-white bg-opacity-60 dark:bg-black dark:bg-opacity-40 backdrop-blur-sm border-b border-zinc-300 dark:border-zinc-800 sticky top-0 z-50">
    <div class="max-w-[90rem] mx-auto">
      <nav class="px-4 py-3">
        <div class="flex justify-between items-center">
          <!-- Left: Logo -->
          <NuxtLink to="/" class="text-black dark:text-white text-2xl font-bold hover:text-gray-600 dark:hover:text-gray-300 transition">
            {{ $t('navbar.home') }}
          </NuxtLink>

          <!-- Right: Controls -->
          <div class="flex items-center gap-3">
            <!-- Mobile search button - updated to navigate directly -->
            <UButton
              icon="i-heroicons-magnifying-glass"
              color="gray"
              variant="ghost"
              class="text-black dark:text-white hover:bg-black hover:bg-opacity-10 dark:hover:bg-white dark:hover:bg-opacity-10"
              @click="toggleSearch"
            />

            <!-- Mobile background button - opens full-screen selector -->
            <UButton
              icon="i-heroicons-photo"
              color="gray"
              variant="ghost"
              class="text-black dark:text-white hover:bg-black hover:bg-opacity-10 dark:hover:bg-white dark:hover:bg-opacity-10"
              @click="openMobileBgSelector"
              aria-label="Change background image"
            />

            <!-- Theme toggle button -->
            <UButton
              :icon="themeIcon"
              color="gray"
              variant="ghost"
              @click="toggleTheme"
              class="text-black dark:text-white hover:bg-black hover:bg-opacity-10 dark:hover:bg-white dark:hover:bg-opacity-10"
              :aria-label="themeAriaLabel"
            />

            <!-- Mobile hamburger menu -->
            <UButton
              icon="i-heroicons-bars-3"
              color="gray"
              variant="ghost"
              class="text-black dark:text-white hover:bg-black hover:bg-opacity-10 dark:hover:bg-white dark:hover:bg-opacity-10"
              @click="isMobileMenuOpen = true"
            />
          </div>
        </div>

        <!-- Remove the mobile search input as we now navigate to search page -->
      </nav>
    </div>
  </div>

  <!-- Mobile navigation overlay -->
  <Teleport to="body">
    <div
      v-if="isMobileMenuOpen"
      class="fixed inset-0 w-full h-full z-[9999] flex flex-col"
    >
      <!-- Background layers with improved opacity -->
      <div class="absolute inset-0 bg-white bg-opacity-85 dark:bg-black dark:bg-opacity-85 backdrop-blur-md"></div>

      <!-- Content container -->
      <div class="relative z-10 flex-1 overflow-y-auto">
        <div class="container mx-auto px-4 py-8">
          <!-- Close button -->
          <div class="flex justify-between items-center mb-6 sticky top-0 bg-transparent backdrop-blur-md py-4">
            <h2 class="text-2xl font-bold text-black dark:text-white">{{ $t('menu.menu') }}</h2>
            <UButton
              icon="i-heroicons-x-mark"
              color="gray"
              variant="ghost"
              class="text-black dark:text-white hover:bg-black hover:bg-opacity-10 dark:hover:bg-white dark:hover:bg-opacity-10"
              @click="isMobileMenuOpen = false"
            />
          </div>

          <!-- Menu content -->
          <div class="mb-8">
            <h3 class="text-xl font-bold mb-4 text-black dark:text-white">{{ $t('menu.navigation') }}</h3>
            <div class="space-y-4">
              <NuxtLink
                v-for="item in navigationItems.filter(item => item.to)"
                :key="item.label"
                :to="item.to"
                class="block px-4 py-2 text-lg text-black dark:text-white hover:bg-black/10 dark:hover:bg-white/10 rounded-md"
                @click="isMobileMenuOpen = false"
              >
                {{ item.label }}
              </NuxtLink>
            </div>
          </div>

          <!-- Kills menu section -->
          <div class="mb-8">
            <h3 class="text-xl font-bold mb-2 text-black dark:text-white">{{ $t('menu.kills') }}</h3>
            <div class="border-b border-gray-200 dark:border-gray-700 mb-4"></div>
            <div class="space-y-4">
              <NuxtLink
                v-for="item in userDropdown.filter(item => item.type !== 'divider')"
                :key="item.label"
                :to="item.to || '#'"
                :target="item.target"
                class="flex items-center px-4 py-2 text-black dark:text-white hover:bg-black hover:bg-opacity-10 dark:hover:bg-white dark:hover:bg-opacity-10 rounded-md"
                :class="{'text-red-500 dark:text-red-400': item.color === 'red'}"
                @click="isMobileMenuOpen = false"
              >
                <UIcon v-if="item.icon" :name="item.icon" class="mr-3 flex-shrink-0" />
                <span>{{ item.label }}</span>
              </NuxtLink>
            </div>
          </div>

          <!-- Information section -->
          <div class="mb-8">
            <h3 class="text-xl font-bold mb-2 text-black dark:text-white">{{ $t('menu.information') }}</h3>
            <div class="border-b border-gray-200 dark:border-gray-700 mb-4"></div>
            <div class="space-y-4">
              <NuxtLink
                v-for="item in informationDropdown"
                :key="item.label"
                :to="item.to || '#'"
                :target="item.target"
                class="flex items-center px-4 py-2 text-black dark:text-white hover:bg-black hover:bg-opacity-10 dark:hover:bg-white dark:hover:bg-opacity-10 rounded-md"
                @click="isMobileMenuOpen = false"
              >
                <UIcon v-if="item.icon" :name="item.icon" class="mr-3 flex-shrink-0" />
                <span>{{ item.label }}</span>
              </NuxtLink>
            </div>
          </div>

          <!-- Language Settings Section - with inline language switcher -->
          <div class="mb-8">
            <h3 class="text-xl font-bold mb-2 text-black dark:text-white">{{ $t('menu.language') }}</h3>
            <div class="border-b border-gray-200 dark:border-gray-700 mb-4"></div>
            <div class="px-4 flex items-center">
              <!-- Language switcher with buttons -->
              <LocaleSwitcherMobile />
            </div>
          </div>

          <!-- User Account section -->
          <div class="mb-20">
            <h3 class="text-xl font-bold mb-2 text-black dark:text-white">{{ $t('menu.userAccount') }}</h3>
            <div class="border-b border-gray-200 dark:border-gray-700 mb-4"></div>
            <div class="space-y-4">
              <div class="px-4 py-2 flex items-center">
                <UIcon name="i-heroicons-user-circle" class="mr-3 flex-shrink-0 text-2xl text-black dark:text-white" />
                <span class="text-lg font-medium text-black dark:text-white">John Doe</span>
              </div>
              <NuxtLink
                to="/profile"
                class="flex items-center px-4 py-2 text-black dark:text-white hover:bg-black hover:bg-opacity-10 dark:hover:bg-white dark:hover:bg-opacity-10 rounded-md"
                @click="isMobileMenuOpen = false"
              >
                <UIcon name="i-heroicons-cog-6-tooth" class="mr-3 flex-shrink-0" />
                <span>{{ $t('user.settings') }}</span>
              </NuxtLink>
              <NuxtLink
                to="/logout"
                class="flex items-center px-4 py-2 text-red-500 dark:text-red-400 hover:bg-black hover:bg-opacity-10 dark:hover:bg-white dark:hover:bg-opacity-10 rounded-md"
                @click="isMobileMenuOpen = false"
              >
                <UIcon name="i-heroicons-arrow-right-on-rectangle" class="mr-3 flex-shrink-0" />
                <span>{{ $t('user.logout') }}</span>
              </NuxtLink>
            </div>
          </div>
        </div>
      </div>
    </div>
  </Teleport>

  <!-- Mobile Background Selector - Full Screen -->
  <Teleport to="body">
    <div
      v-if="isMobileBgSelectorOpen"
      class="fixed inset-0 w-full h-full z-[9999] flex flex-col"
    >
      <!-- Background layers with improved opacity -->
      <div class="absolute inset-0 bg-white bg-opacity-85 dark:bg-black dark:bg-opacity-85 backdrop-blur-md"></div>

      <!-- Content container -->
      <div class="relative z-10 flex-1 overflow-y-auto">
        <div class="container mx-auto px-4 py-8">
          <!-- Header with close button -->
          <div class="flex justify-between items-center mb-6 sticky top-0 bg-transparent backdrop-blur-md py-4">
            <h2 class="text-2xl font-bold text-black dark:text-white">Background Images</h2>
            <UButton
              icon="i-heroicons-x-mark"
              color="gray"
              variant="ghost"
              class="text-black dark:text-white hover:bg-black hover:bg-opacity-10 dark:hover:bg-white dark:hover:bg-opacity-10"
              @click="closeMobileBgSelector"
            />
          </div>

          <!-- Background Grid -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <button
              v-for="bg in availableBackgrounds"
              :key="bg.path"
              @click="changeBackground(bg.path); closeMobileBgSelector();"
              class="flex flex-col bg-transparent cursor-pointer hover:opacity-90 rounded-md overflow-hidden"
              :class="{'ring-2 ring-primary-500': isCurrentBackground(bg.path)}"
            >
              <!-- Thumbnail with NuxtImg -->
              <div class="w-full aspect-video relative">
                <!-- For images -->
                <template v-if="!isVideoFile(bg.path)">
                  <NuxtImg
                    :src="bg.path"
                    width="400"
                    height="225"
                    loading="lazy"
                    format="webp"
                    fit="cover"
                    quality="80"
                    class="w-full h-full object-cover"
                  />
                </template>

                <!-- For videos -->
                <template v-else>
                  <div class="w-full h-full flex items-center justify-center bg-black/20 dark:bg-white/10">
                    <UIcon name="i-heroicons-film" class="text-3xl" />
                  </div>
                </template>

                <!-- Image name overlay -->
                <div class="absolute bottom-0 left-0 right-0 bg-black/50 py-2 px-3 text-white">
                  <div class="flex items-center justify-between">
                    <span class="font-medium">{{ bg.name }}</span>
                    <UIcon v-if="isCurrentBackground(bg.path)" name="i-heroicons-check" class="text-primary-500" />
                  </div>
                </div>
              </div>
            </button>

            <!-- Random EVEPorn button -->
            <button
              @click="async () => { isLoadingRandomBg = true; await setRandomRedditBackground(); isLoadingRandomBg = false; closeMobileBgSelector(); }"
              class="flex flex-col items-center justify-center bg-transparent relative aspect-video rounded-md overflow-hidden"
              :class="{'opacity-50': isLoadingRandomBg}"
              :disabled="isLoadingRandomBg"
            >
              <div class="w-full h-full flex items-center justify-center bg-black/20 dark:bg-white/10">
                <UIcon
                  :name="isLoadingRandomBg ? 'i-heroicons-arrow-path' : 'i-heroicons-photo'"
                  class="text-white text-3xl"
                  :class="{'animate-spin': isLoadingRandomBg}"
                />
              </div>
              <div class="absolute bottom-0 left-0 right-0 bg-black/50 py-2 px-3 text-white">
                <span class="font-medium">{{ isLoadingRandomBg ? 'Loading...' : 'Random EVEPorn' }}</span>
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
/* Ensure fixed elements don't cause unwanted overflow */
.fixed.inset-0 {
  min-height: 100vh;
  height: auto !important;
}

/* Mobile menu styling */
.relative.z-10 {
  min-height: 100%;
}

/* Sticky header adjustments */
.sticky.top-0 {
  z-index: 5;
}

/* Ensure consistent icon vertical alignment */
:deep(.UButton) {
  display: flex;
  align-items: center;
  justify-content: center;
}

/* Fix icon centering */
:deep(.UButton__icon) {
  display: flex;
  align-items: center;
  justify-content: center;
}

/* Aspect ratio class for thumbnails */
.aspect-video {
  aspect-ratio: 16/9;
}

/* Prevent iOS zoom on input focus */
.no-zoom-input :deep(input) {
  font-size: 16px !important; /* Minimum font size to prevent iOS zoom */
}

/* Fix the search box height to maintain consistency */
.no-zoom-input :deep(.UInput) {
  min-height: 40px;
}

/* Ensure consistency in button and input sizes */
:deep(.UButton), :deep(.UInput) {
  touch-action: manipulation;
}
</style>
