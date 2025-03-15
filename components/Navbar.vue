<script lang="ts" setup>
// Import the theme and background handlers
const { themeIcon, themeAriaLabel, toggleTheme } = useThemeMode()
const { availableBackgrounds, setBackground, isCurrentBackground, setRandomRedditBackground } = useBackgroundImage()

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

// Function to check if path is a video file
const isVideoFile = (path: string): boolean => {
  return path.toLowerCase().endsWith('.mp4') ||
         path.toLowerCase().endsWith('.webm') ||
         path.toLowerCase().endsWith('.ogg')
}

// Toggle search visibility
const toggleSearch = () => {
  isSearchVisible.value = !isSearchVisible.value
  // Focus the search input when it becomes visible
  if (isSearchVisible.value) {
    nextTick(() => {
      const searchInput = document.querySelector('#mobileSearch') as HTMLInputElement
      if (searchInput) searchInput.focus()
    })
  }
}

// Enhanced background changing function with proper cleanup
const changeBackground = (path) => {
  // Apply the background immediately
  setBackground(path)

  // Close mobile menu if open
  if (isMobileMenuOpen.value) {
    isMobileMenuOpen.value = false
  }
}

// Create background items for the dropdown menu with thumbnails
const backgroundItems = computed(() => {
  const items = availableBackgrounds.map(bg => ({
    label: bg.name,
    // Add thumbnail component as a custom slot
    slot: 'custom',
    // Add props for the custom slot
    bgPath: bg.path,
    isVideo: isVideoFile(bg.path),
    onSelect: () => changeBackground(bg.path),
    trailing: isCurrentBackground(bg.path) ? { name: 'i-heroicons-check', color: 'primary' } : undefined
  }));

  // Add divider and Random EVEPorn option
  items.push({ type: 'divider' });
  items.push({
    label: 'EVEPorn',
    icon: 'i-heroicons-photo',
    onSelect: async () => {
      isLoadingRandomBg.value = true;
      await setRandomRedditBackground();
      isLoadingRandomBg.value = false;
    }
  });

  return items;
})

// Define dropdown menu items
const userDropdown = [
  {
    label: 'Profile',
    icon: 'i-heroicons-user-circle',
    to: '/profile'
  },
  {
    label: 'Settings',
    icon: 'i-heroicons-cog-6-tooth',
    to: '/settings'
  },
  {
    label: 'Documentation',
    icon: 'i-heroicons-document-text',
    to: '/docs'
  },
  {
    label: 'API Access',
    icon: 'i-heroicons-code-bracket',
    to: '/api'
  },
  {
    label: 'Discord',
    icon: 'i-simple-icons-discord',
    to: 'https://discord.gg/example',
    target: '_blank'
  },
  {
    type: 'divider'
  },
  {
    label: 'Logout',
    icon: 'i-heroicons-arrow-right-on-rectangle',
    to: '/logout',
    color: 'red'
  }
];

// Navigation menu items
const navigationItems = [
  {
    label: 'Home',
    to: '/'
  },
  {
    label: 'Kills',
    children: userDropdown
  },
  {
    label: 'About',
    to: '/about'
  }
]

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
</script>

<template>
  <div class="w-full bg-white bg-opacity-60 dark:bg-black dark:bg-opacity-40 backdrop-blur-sm border-b border-zinc-300 dark:border-zinc-800 sticky top-0 z-50">
    <div class="max-w-[90rem] mx-auto">
      <nav class="px-4 py-3">
        <div class="flex justify-between items-center">
          <!-- Left: Logo & Navigation (Desktop) -->
          <div class="flex items-center space-x-6">
            <NuxtLink to="/" class="text-black dark:text-white text-2xl font-bold hover:text-gray-600 dark:hover:text-gray-300 transition">
              Home
            </NuxtLink>

            <!-- Desktop Navigation -->
            <div class="hidden md:flex items-center space-x-4">
              <UDropdownMenu :items="userDropdown">
                <UButton>Kills</UButton>
              </UDropdownMenu>
              <NuxtLink
                v-for="item in navigationItems.slice(2)"
                :key="item.label"
                :to="item.to"
                class="text-black dark:text-white hover:text-gray-600 dark:hover:text-gray-300 transition">
                {{ item.label }}
              </NuxtLink>
            </div>
          </div>

          <!-- Center: Search (Desktop) -->
          <div class="hidden md:block absolute left-1/2 transform -translate-x-1/2">
            <UInput
              placeholder="Search kills, players, corps..."
              icon="i-heroicons-magnifying-glass"
              color="white"
              variant="outline"
              trailing
              size="sm"
              class="w-[320px] no-zoom-input"
            />
          </div>

          <!-- Right: User menu and theme toggle -->
          <div class="flex items-center gap-3">
            <!-- Mobile search button -->
            <UButton
              icon="i-heroicons-magnifying-glass"
              color="gray"
              variant="ghost"
              class="md:hidden text-black dark:text-white hover:bg-black hover:bg-opacity-10 dark:hover:bg-white dark:hover:bg-opacity-10"
              @click="toggleSearch"
            />

            <!-- Background selector - desktop: dropdown with thumbnails / mobile: fullscreen -->
            <div class="hidden md:block">
              <UDropdownMenu :items="backgroundItems" class="background-dropdown">
                <UButton
                  icon="i-heroicons-photo"
                  color="gray"
                  variant="ghost"
                  class="text-black dark:text-white hover:bg-black hover:bg-opacity-10 dark:hover:bg-white dark:hover:bg-opacity-10"
                  aria-label="Change background image"
                />

                <!-- Custom template for background items with thumbnails -->
                <template #custom="{ item }">
                  <button
                    @click="item.onSelect"
                    class="w-full flex flex-col border-0 bg-transparent cursor-pointer p-1 hover:opacity-90"
                    :class="{'ring-1 ring-primary-500': isCurrentBackground(item.bgPath)}"
                  >
                    <!-- Thumbnail container -->
                    <div class="w-full max-w-[160px] mx-auto aspect-video rounded overflow-hidden relative">
                      <!-- For images -->
                      <template v-if="!item.isVideo">
                        <NuxtImg
                          :src="item.bgPath"
                          width="160"
                          height="90"
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
                          <UIcon name="i-heroicons-film" class="text-lg" />
                        </div>
                      </template>

                      <!-- Background name overlay at bottom - text smaller to match -->
                      <div class="absolute bottom-0 left-0 right-0 bg-black/40 py-0.5 px-2 text-white text-xs flex justify-between items-center">
                        <span class="text-xs">{{ item.label }}</span>
                        <UIcon
                          v-if="isCurrentBackground(item.bgPath)"
                          name="i-heroicons-check"
                          class="text-primary-500 text-xs"
                        />
                      </div>
                    </div>
                  </button>
                </template>
              </UDropdownMenu>
            </div>

            <!-- Mobile background button - opens full-screen selector -->
            <UButton
              icon="i-heroicons-photo"
              color="gray"
              variant="ghost"
              class="md:hidden text-black dark:text-white hover:bg-black hover:bg-opacity-10 dark:hover:bg-white dark:hover:bg-opacity-10"
              @click="openMobileBgSelector"
              aria-label="Change background image"
            />

            <!-- Theme toggle button -->
            <ClientOnly>
              <UButton
                :icon="themeIcon"
                color="gray"
                variant="ghost"
                @click="toggleTheme"
                class="text-black dark:text-white hover:bg-black hover:bg-opacity-10 dark:hover:bg-white dark:hover:bg-opacity-10"
                :aria-label="themeAriaLabel"
              />
              <!-- Fallback for SSR -->
              <template #fallback>
                <UButton
                  icon="i-heroicons-sun"
                  color="gray"
                  variant="ghost"
                  class="text-black dark:text-white hover:bg-black hover:bg-opacity-10 dark:hover:bg-white dark:hover:bg-opacity-10"
                />
              </template>
            </ClientOnly>

            <!-- User menu dropdown -->
            <div class="hidden md:flex items-center">
              <UDropdownMenu :items="userDropdown">
                <UButton
                  color="gray"
                  variant="ghost"
                  icon="i-heroicons-user-circle"
                  class="text-black dark:text-white hover:bg-black hover:bg-opacity-10 dark:hover:bg-white dark:hover:bg-opacity-10 flex items-center justify-center"
                  aria-label="User menu"
                />
              </UDropdownMenu>
            </div>

            <!-- Mobile hamburger menu -->
            <UButton
              icon="i-heroicons-bars-3"
              color="gray"
              variant="ghost"
              class="md:hidden text-black dark:text-white hover:bg-black hover:bg-opacity-10 dark:hover:bg-white dark:hover:bg-opacity-10"
              @click="isMobileMenuOpen = true"
            />
          </div>
        </div>

        <!-- Mobile search -->
        <div v-if="isSearchVisible" class="mt-2 md:hidden">
          <UInput
            id="mobileSearch"
            placeholder="Search kills, players, corps..."
            icon="i-heroicons-magnifying-glass"
            color="white"
            variant="outline"
            trailing
            size="sm"
            class="w-full no-zoom-input"
          />
        </div>
      </nav>
    </div>
  </div>

  <!-- Mobile navigation overlay -->
  <Teleport to="body">
    <div
      v-if="isMobileMenuOpen"
      class="fixed inset-0 w-full h-full z-[9999] md:hidden flex flex-col"
    >
      <!-- Background layers with improved opacity -->
      <div class="absolute inset-0 bg-white bg-opacity-85 dark:bg-black dark:bg-opacity-85 backdrop-blur-md"></div>

      <!-- Content container -->
      <div class="relative z-10 flex-1 overflow-y-auto">
        <div class="container mx-auto px-4 py-8">
          <!-- Close button -->
          <div class="flex justify-between items-center mb-6 sticky top-0 bg-transparent backdrop-blur-md py-4">
            <h2 class="text-2xl font-bold text-black dark:text-white">Menu</h2>
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
            <h3 class="text-xl font-bold mb-4 text-black dark:text-white">Navigation</h3>
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
            <h3 class="text-xl font-bold mb-2 text-black dark:text-white">Kills</h3>
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

          <!-- User Account section -->
          <div class="mb-20">
            <h3 class="text-xl font-bold mb-2 text-black dark:text-white">User Account</h3>
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
                <span>Settings</span>
              </NuxtLink>
              <NuxtLink
                to="/logout"
                class="flex items-center px-4 py-2 text-red-500 dark:text-red-400 hover:bg-black hover:bg-opacity-10 dark:hover:bg-white dark:hover:bg-opacity-10 rounded-md"
                @click="isMobileMenuOpen = false"
              >
                <UIcon name="i-heroicons-arrow-right-on-rectangle" class="mr-3 flex-shrink-0" />
                <span>Logout</span>
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
      class="fixed inset-0 w-full h-full z-[9999] md:hidden flex flex-col"
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
