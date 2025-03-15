<script lang="ts" setup>
// Import the Navbar components
import NavbarDesktop from './Navbar/Desktop.vue'
import NavbarMobile from './Navbar/Mobile.vue'

// Import the theme and background handlers
const { themeIcon, themeAriaLabel, toggleTheme } = useThemeMode()
const { availableBackgrounds, setBackground, isCurrentBackground, setRandomRedditBackground } = useBackgroundImage()

// Load i18n
const { t } = useI18n()

// Create a reactive variable to track screen size
const isMobile = ref(false)

// Define dropdown menu items
const userDropdown = computed(() => [
  {
    label: t('user.profile'),
    icon: 'i-heroicons-user-circle',
    to: '/profile'
  },
  {
    label: t('user.settings'),
    icon: 'i-heroicons-cog-6-tooth',
    to: '/settings'
  },
  {
    label: t('user.documentation'),
    icon: 'i-heroicons-document-text',
    to: '/docs'
  },
  {
    label: t('user.apiAccess'),
    icon: 'i-heroicons-code-bracket',
    to: '/api'
  },
  {
    label: t('user.discord'),
    icon: 'i-simple-icons-discord',
    to: 'https://discord.gg/example',
    target: '_blank'
  },
  {
    type: 'divider'
  },
  {
    label: t('user.logout'),
    icon: 'i-heroicons-arrow-right-on-rectangle',
    to: '/logout',
    color: 'red'
  }
])

// Information dropdown items
const informationDropdown = computed(() => [
  {
    label: t('navbar.faq'),
    icon: 'i-heroicons-question-mark-circle',
    to: '/faq'
  },
  {
    label: t('navbar.status'),
    icon: 'i-heroicons-server',
    to: '/status'
  },
  {
    label: t('navbar.about'),
    icon: 'i-heroicons-information-circle',
    to: '/about'
  }
])

// Navigation menu items - Remove Information from the left navigation
const navigationItems = computed(() => [
  {
    label: t('navbar.home'),
    to: '/'
  },
  {
    label: t('navbar.kills'),
    children: userDropdown.value
  }
  // Information dropdown removed from here
])

// Function to check if path is a video file
const isVideoFile = (path: string): boolean => {
  return path.toLowerCase().endsWith('.mp4') ||
         path.toLowerCase().endsWith('.webm') ||
         path.toLowerCase().endsWith('.ogg')
}

// Check screen size on client side
onMounted(() => {
  if (process.client) {
    const checkScreenSize = () => {
      isMobile.value = window.innerWidth < 768 // md breakpoint in Tailwind
    }

    // Initial check
    checkScreenSize()

    // Add event listener for resize
    window.addEventListener('resize', checkScreenSize)

    // Clean up
    onUnmounted(() => {
      window.removeEventListener('resize', checkScreenSize)
    })
  }
})
</script>

<template>
  <ClientOnly>
    <!-- Conditionally render desktop or mobile navbar -->
    <NavbarDesktop
      v-if="!isMobile"
      :theme-icon="themeIcon"
      :theme-aria-label="themeAriaLabel"
      :toggle-theme="toggleTheme"
      :available-backgrounds="availableBackgrounds"
      :set-background="setBackground"
      :is-current-background="isCurrentBackground"
      :set-random-reddit-background="setRandomRedditBackground"
      :user-dropdown="userDropdown"
      :navigation-items="navigationItems"
      :information-dropdown="informationDropdown"
      :is-video-file="isVideoFile"
    />
    <NavbarMobile
      v-else
      :theme-icon="themeIcon"
      :theme-aria-label="themeAriaLabel"
      :toggle-theme="toggleTheme"
      :available-backgrounds="availableBackgrounds"
      :set-background="setBackground"
      :is-current-background="isCurrentBackground"
      :set-random-reddit-background="setRandomRedditBackground"
      :user-dropdown="userDropdown"
      :navigation-items="navigationItems"
      :information-dropdown="informationDropdown"
      :is-video-file="isVideoFile"
    />
    <!-- Fallback for SSR -->
    <template #fallback>
      <div class="w-full bg-white bg-opacity-60 dark:bg-black dark:bg-opacity-40 backdrop-blur-sm border-b border-zinc-300 dark:border-zinc-800 sticky top-0 z-50">
        <div class="max-w-[90rem] mx-auto">
          <nav class="px-4 py-3">
            <div class="flex justify-between items-center">
              <!-- Simplified fallback navbar -->
              <NuxtLink to="/" class="text-black dark:text-white text-2xl font-bold">
                {{ $t('navbar.home') }}
              </NuxtLink>
            </div>
          </nav>
        </div>
      </div>
    </template>
  </ClientOnly>
</template>
