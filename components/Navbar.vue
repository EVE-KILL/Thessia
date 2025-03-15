<script lang="ts" setup>
// Import the more robust theme handler
const { themeIcon, themeAriaLabel, toggleTheme } = useThemeMode()
const { availableBackgrounds, setBackground, isCurrentBackground } = useBackgroundImage()

// Use cookie for color mode
const colorMode = useColorMode()
const colorModeCookie = useCookie('nuxt-color-mode', {
  default: () => 'dark'
})

// Use a static rather than computed approach for fallback icon to avoid hydration mismatch
const staticThemeIcon = ref(colorModeCookie.value === 'dark' ? 'i-heroicons-sun' : 'i-heroicons-moon')

// Mobile menu state
const isMobileMenuOpen = ref(false)

// Mobile search state
const isSearchVisible = ref(false)

// Toggle search visibility
const toggleSearch = () => {
  isSearchVisible.value = !isSearchVisible.value
  // Focus the search input when it becomes visible
  if (isSearchVisible.value) {
    // Use nextTick to ensure the element is in the DOM before focusing
    nextTick(() => {
      const searchInput = document.querySelector('#mobileSearch') as HTMLInputElement
      if (searchInput) searchInput.focus()
    })
  }
}

// Enhanced background changing function with additional feedback
const changeBackground = (path) => {
  // Apply the background immediately
  setBackground(path)

  // Create an image to pre-load
  const img = new Image()

  // Start loading the image
  img.src = path
}

// Create background items for the UDropdownMenu
const backgroundItems = computed(() => {
  return availableBackgrounds.map(bg => ({
    label: bg.name,
    onSelect: (e: Event) => changeBackground(bg.path),
    trailing: isCurrentBackground(bg.path) ? { name: 'i-heroicons-check', color: 'primary' } : undefined
  }))
})

// Show background dropdown state - revert to our working version
const showBgOptions = ref(false)
const toggleBgOptions = () => {
  showBgOptions.value = !showBgOptions.value
}

// Reference to the dropdown element
const bgDropdownRef = ref(null)

// Remove click outside listener when component is unmounted
onUnmounted(() => {
  if (process.client) {
    document.body.style.overflow = ''
    document.body.classList.remove('menu-open')
  }
})

// Make sure colorMode reactive state is always updated from cookie on component render
onMounted(() => {
  // Ensure colorMode preference is always in sync with cookie
  if (colorModeCookie.value) {
    colorMode.preference = colorModeCookie.value
  }

  // Force the component to update
  nextTick(() => {
    // This will trigger reactivity
  })
})

// Watch for changes in color mode
watch(() => colorMode.preference, (newValue) => {
  // Update cookie when preference changes
  colorModeCookie.value = newValue
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
    children: userDropdown // Reusing the same dropdown items as requested
  },
  {
    label: 'Example Page',
    to: '/example'
  }
]

// Prevent body scrolling when menu is open
watch(isMobileMenuOpen, (isOpen) => {
  if (process.client) {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
      // Add class for styling
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
  <div class="w-full bg-white/60 dark:bg-black/40 backdrop-blur-sm border-b border-zinc-300 dark:border-zinc-800 sticky top-0 z-50">
    <div class="max-w-[90rem] mx-auto">
      <nav class="px-4 py-3">
        <div class="flex justify-between items-center">
          <!-- Left: Logo & Navigation (Desktop) -->
          <div class="flex items-center space-x-6">
            <NuxtLink to="/" class="text-black dark:text-white text-2xl font-bold hover:text-gray-600 dark:hover:text-gray-300 transition">
              Home
            </NuxtLink>

            <!-- Desktop Navigation - Only visible on md screens and up -->
            <div class="hidden md:flex items-center space-x-4">
              <UDropdownMenu :items="userDropdown">
                <UButton>Kills</UButton>
              </UDropdownMenu>
              <NuxtLink to="/example" class="text-black dark:text-white hover:text-gray-600 dark:hover:text-gray-300 transition">
                Example Page
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
              class="w-[320px]"
            />
          </div>

          <!-- Right: User menu and theme toggle -->
          <div class="flex items-center gap-3">
            <!-- Mobile search button - Only visible on small screens -->
            <UButton
              icon="i-heroicons-magnifying-glass"
              color="gray"
              variant="ghost"
              class="md:hidden text-black dark:text-white hover:bg-black/10 dark:hover:bg-white/10"
              @click="toggleSearch"
            />

            <!-- Background selector - Using UDropdownMenu -->
            <UDropdownMenu :items="backgroundItems">
              <UButton
                icon="i-heroicons-photo"
                color="gray"
                variant="ghost"
                class="text-black dark:text-white hover:bg-black/10 dark:hover:bg-white/10"
                aria-label="Change background image"
              />
            </UDropdownMenu>

            <!-- Theme toggle button with improved reliability -->
            <ClientOnly>
              <UButton
                :icon="themeIcon"
                color="gray"
                variant="ghost"
                @click.prevent="toggleTheme"
                class="text-black dark:text-white hover:bg-black/10 dark:hover:bg-white/10"
                :aria-label="themeAriaLabel"
              />
              <!-- Production-safe fallback -->
              <template #fallback>
                <UButton
                  icon="i-heroicons-sun"
                  color="gray"
                  variant="ghost"
                  class="text-black dark:text-white hover:bg-black/10 dark:hover:bg-white/10"
                />
              </template>
            </ClientOnly>

            <!-- User menu dropdown - Only visible on md screens and up - Fixed vertical alignment -->
            <div class="hidden md:flex items-center">
              <UDropdownMenu :items="userDropdown">
                <UButton
                  color="gray"
                  variant="ghost"
                  icon="i-heroicons-user-circle"
                  class="text-black dark:text-white hover:bg-black/10 dark:hover:bg-white/10 flex items-center justify-center"
                  aria-label="User menu"
                />
              </UDropdownMenu>
            </div>

            <!-- Mobile hamburger menu - Only visible on small screens -->
            <UButton
              icon="i-heroicons-bars-3"
              color="gray"
              variant="ghost"
              class="md:hidden text-black dark:text-white hover:bg-black/10 dark:hover:bg-white/10"
              @click="isMobileMenuOpen = true"
            />
          </div>
        </div>

        <!-- Mobile search (full width under navbar) - Only visible on small screens when search is toggled -->
        <div v-if="isSearchVisible" class="mt-2 md:hidden">
          <UInput
            id="mobileSearch"
            placeholder="Search kills, players, corps..."
            icon="i-heroicons-magnifying-glass"
            color="white"
            variant="outline"
            trailing
            size="sm"
            class="w-full"
          />
        </div>
      </nav>
    </div>
  </div>

  <!-- Mobile navigation overlay - Moved outside of the navbar container to allow full-screen coverage -->
  <Teleport to="body">
    <div
      v-if="isMobileMenuOpen"
      class="fixed inset-0 w-full h-full z-[9999] md:hidden flex flex-col"
    >
      <!-- Background layers with darker opacity -->
      <!-- Light mode background layer -->
      <div class="absolute inset-0 bg-white dark:hidden" style="opacity: 0.85; backdrop-filter: blur(12px);"></div>

      <!-- Dark mode background layer -->
      <div class="absolute inset-0 hidden dark:block" style="background-color: rgba(0, 0, 0, 0.65); backdrop-filter: blur(12px);"></div>

      <!-- Content container - With its own scrollbar -->
      <div class="relative z-10 flex-1 overflow-y-auto">
        <div class="container mx-auto px-4 py-8">
          <!-- Close button -->
            <div class="flex justify-between items-center mb-6 sticky top-0 bg-transparent backdrop-blur-md py-4 px-4">
            <h2 class="text-2xl font-bold text-black dark:text-white">Menu</h2>
            <UButton
              icon="i-heroicons-x-mark"
              color="gray"
              variant="ghost"
              class="text-black dark:text-white hover:bg-black/10 dark:hover:bg-white/10"
              @click="isMobileMenuOpen = false"
            />
          </div>

          <!-- Menu content -->
          <div class="mb-8">
            <h3 class="text-xl font-bold mb-4 text-black dark:text-white">Navigation</h3>
            <div class="space-y-4">
              <NuxtLink
                to="/"
                class="block px-4 py-2 text-lg text-black dark:text-white hover:bg-black/10 dark:hover:bg-white/10 rounded-md"
                @click="isMobileMenuOpen = false"
              >
                Home
              </NuxtLink>
              <NuxtLink
                to="/example"
                class="block px-4 py-2 text-lg text-black dark:text-white hover:bg-black/10 dark:hover:bg-white/10 rounded-md"
                @click="isMobileMenuOpen = false"
              >
                Example Page
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
                class="flex items-center px-4 py-2 text-black dark:text-white hover:bg-black/10 dark:hover:bg-white/10 rounded-md"
                :class="{'text-red-500 dark:text-red-400': item.color === 'red'}"
                @click="isMobileMenuOpen = false"
              >
                <UIcon v-if="item.icon" :name="item.icon" class="mr-3 flex-shrink-0" />
                <span>{{ item.label }}</span>
              </NuxtLink>
            </div>
          </div>

          <!-- Add Background selector to mobile menu -->
          <div class="mb-8">
            <h3 class="text-xl font-bold mb-2 text-black dark:text-white">Background</h3>
            <div class="border-b border-gray-200 dark:border-gray-700 mb-4"></div>
            <div class="space-y-4">
              <button
                v-for="bg in availableBackgrounds"
                :key="bg.path"
                @click="changeBackground(bg.path); isMobileMenuOpen = false"
                class="flex items-center justify-between px-4 py-2 text-black dark:text-white hover:bg-black/10 dark:hover:bg-white/10 rounded-md w-full text-left"
              >
                <div class="flex items-center">
                  <UIcon name="i-heroicons-photo" class="mr-3 flex-shrink-0" />
                  <span>{{ bg.name }}</span>
                </div>
                <UIcon v-if="isCurrentBackground(bg.path)" name="i-heroicons-check" class="text-primary-500" />
              </button>
            </div>
          </div>

          <!-- User Account section -->
          <div class="mb-20"> <!-- Added bottom margin for space at the end -->
            <h3 class="text-xl font-bold mb-2 text-black dark:text-white">User Account</h3>
            <div class="border-b border-gray-200 dark:border-gray-700 mb-4"></div>
            <div class="space-y-4">
              <div class="px-4 py-2 flex items-center">
                <UIcon name="i-heroicons-user-circle" class="mr-3 flex-shrink-0 text-2xl text-black dark:text-white" />
                <span class="text-lg font-medium text-black dark:text-white">John Doe</span>
              </div>
              <NuxtLink
                to="/profile"
                class="flex items-center px-4 py-2 text-black dark:text-white hover:bg-black/10 dark:hover:bg-white/10 rounded-md"
                @click="isMobileMenuOpen = false"
              >
                <UIcon name="i-heroicons-cog-6-tooth" class="mr-3 flex-shrink-0" />
                <span>Settings</span>
              </NuxtLink>
              <NuxtLink
                to="/logout"
                class="flex items-center px-4 py-2 text-red-500 dark:text-red-400 hover:bg-black/10 dark:hover:bg-white/10 rounded-md"
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
</template>

<style scoped>
/* Override the app.css transparency settings specifically for the mobile menu */
.dark .dark\:bg-gray-900 {
  background-color: rgba(17, 24, 39, 0.98) !important;
}

/* Ensuring menu backgrounds don't inherit transparency */
.bg-opacity-98 {
  --tw-bg-opacity: 0.98 !important;
}

/* Ensure blur effect extends to the full height */
.fixed.inset-0 {
  min-height: 100vh;
  height: auto !important;
}

/* Ensure content inside menu is visible */
.relative.z-10 {
  min-height: 100%;
}

/* Sticky header adjustments */
.sticky.top-0 {
  z-index: 5;
  margin-top: -8px;
  padding-top: 8px;
}

/* Add padding to prevent content from being hidden under sticky header */
.relative.z-10 > .container {
  padding-bottom: 40px;
}

/* Ensure consistent icon vertical alignment */
.UButton {
  display: flex;
  align-items: center;
  justify-content: center;
}

/* Make sure all icons are perfectly centered */
:deep(.UButton__icon) {
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
