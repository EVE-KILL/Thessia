<script lang="ts" setup>
import { markRaw } from 'vue';
const { t } = useI18n();
const colorMode = useColorMode();

import SearchComponent from './Navbar/Search.vue';
import CustomDropdown from './Navbar/CustomDropdown.vue';
import MobileFullscreenModal from './Modal/MobileFullscreenModal.vue';
import NavbarUser from './Navbar/User.vue';
import LanguageSelector from './Navbar/LanguageSelector.vue';
import BackgroundSwitcher from './Navbar/BackgroundSwitcher.vue';

const Search = markRaw(SearchComponent);

// Mobile menu state
const isMobileMenuOpen = ref(false);

// Track dropdown states for menus with children
const dropdownStates = ref<Record<string, boolean>>({});

// Track which menu sections are expanded on mobile
const expandedMobileMenus = ref<Record<string, boolean>>({});

// Initialize expanded menus based on collapse property
onMounted(() => {
  // We now only track collapsible items
  navbarLinks.value.forEach(link => {
    // Only set initial state for collapsible items (those without collapse: false)
    if (link.children && link.collapse !== false) {
      expandedMobileMenus.value[link.name || link.label] = false; // Start collapsed by default
    }
  });
});

// Toggle mobile menu section expansion
const toggleMobileMenuSection = (menuName: string) => {
  expandedMobileMenus.value[menuName] = !expandedMobileMenus.value[menuName];
};

// Close the mobile menu
const closeMobileMenu = () => {
  isMobileMenuOpen.value = false;
};

// Convert navbarLinks to a computed property to make it reactive to language changes
const navbarLinks = computed(() => {
  // This computed property will re-evaluate whenever locale changes
  return [
    {
      name: t('navbar.home.text'),
      label: t('navbar.home.label'),
      icon: 'lucide:house',
      to: '/',
      position: 'left'
    },
    {
      name: t('navbar.kills.text'),
      label: t('navbar.kills.label'),
      position: 'left',
      children: [
        {
          name: t('navbar.kills.latest'),
          label: t('navbar.kills.latestLabel'),
          to: '/kills/latest'
        },
        {
          name: t('navbar.kills.abyssal'),
          label: t('navbar.kills.abyssalLabel'),
          to: '/kills/abyssal'
        },
        {
          name: t('navbar.kills.wspace'),
          label: t('navbar.kills.wspaceLabel'),
          to: '/kills/wspace'
        },
        {
          name: t('navbar.kills.highsec'),
          label: t('navbar.kills.highsecLabel'),
          to: '/kills/highsec'
        },
        {
          name: t('navbar.kills.lowsec'),
          label: t('navbar.kills.lowsecLabel'),
          to: '/kills/lowsec'
        },
        {
          name: t('navbar.kills.nullsec'),
          label: t('navbar.kills.nullsecLabel'),
          to: '/kills/nullsec'
        },
        {
          name: t('navbar.kills.big'),
          label: t('navbar.kills.bigLabel'),
          to: '/kills/big'
        },
        {
          name: t('navbar.kills.solo'),
          label: t('navbar.kills.soloLabel'),
          to: '/kills/solo'
        },
        {
          name: t('navbar.kills.npc'),
          label: t('navbar.kills.npcLabel'),
          to: '/kills/npc'
        },
        {
          name: t('navbar.kills.5b'),
          label: t('navbar.kills.5bLabel'),
          to: '/kills/5b'
        },
        {
          name: t('navbar.kills.10b'),
          label: t('navbar.kills.10bLabel'),
          to: '/kills/10b'
        },
        {
          name: t('navbar.kills.citadels'),
          label: t('navbar.kills.citadelsLabel'),
          to: '/kills/citadels'
        },
        {
          name: t('navbar.kills.t1'),
          label: t('navbar.kills.t1Label'),
          to: '/kills/t1'
        },
        {
          name: t('navbar.kills.t2'),
          label: t('navbar.kills.t2Label'),
          to: '/kills/t2'
        },
        {
          name: t('navbar.kills.t3'),
          label: t('navbar.kills.t3Label'),
          to: '/kills/t3'
        },
        {
          name: t('navbar.kills.frigates'),
          label: t('navbar.kills.frigatesLabel'),
          to: '/kills/frigates'
        },
        {
          name: t('navbar.kills.destroyers'),
          label: t('navbar.kills.destroyersLabel'),
          to: '/kills/destroyers'
        },
        {
          name: t('navbar.kills.cruisers'),
          label: t('navbar.kills.cruisersLabel'),
          to: '/kills/cruisers'
        },
        {
          name: t('navbar.kills.battlecruisers'),
          label: t('navbar.kills.battlecruisersLabel'),
          to: '/kills/battlecruisers'
        },
        {
          name: t('navbar.kills.battleships'),
          label: t('navbar.kills.battleshipsLabel'),
          to: '/kills/battleships'
        },
        {
          name: t('navbar.kills.capitals'),
          label: t('navbar.kills.capitalsLabel'),
          to: '/kills/capitals'
        },
        {
          name: t('navbar.kills.freighters'),
          label: t('navbar.kills.freightersLabel'),
          to: '/kills/freighters'
        },
        {
          name: t('navbar.kills.supercarriers'),
          label: t('navbar.kills.supercarriersLabel'),
          to: '/kills/supercarriers'
        },
        {
          name: t('navbar.kills.titans'),
          label: t('navbar.kills.titansLabel'),
          to: '/kills/titans'
        }
      ]
    },
    {
      component: Search,
      inline: true,
      position: 'center',
    },
    {
      position: 'right',
      component: LanguageSelector,
      mobile: true,
    },
    {
      icon: 'lucide:sun-moon',
      position: 'right',
      mobile: true,
      onClick: () => {
        colorMode.preference = colorMode.preference === 'dark' ? 'light' : 'dark';
      },
    },
    {
      label: t('navbar.backgroundSelector.label'),
      icon: 'lucide:book-image',
      component: BackgroundSwitcher,
      position: 'right',
      mobile: true,
    },
    {
      label: t('navbar.information.label'),
      icon: 'lucide:info',
      position: 'right',
      collapse: false,
      children: [
        {
          name: t('navbar.faq.text'),
          label: t('navbar.faq.label'),
          to: '/faq'
        },
        {
          name: t('navbar.status.text'),
          label: t('navbar.status.label'),
          to: '/status'
        },
        {
          name: t('navbar.about.text'),
          label: t('navbar.about.label'),
          to: '/about'
        }
      ],
    },
    {
      component: NavbarUser,
      position: 'right',
    }
  ];
});
</script>

<template>
  <!-- Desktop Navbar -->
  <nav class="hidden md:flex h-16 items-center justify-between sticky top-0 z-50 bg-white bg-opacity-90 dark:bg-black dark:bg-opacity-90 backdrop-blur-sm shadow-sm">
    <!-- Left items -->
    <div class="flex items-center space-x-4">
      <div class="flex items-center space-x-2">
        <template v-for="(link, index) in navbarLinks.filter(l => l.position === 'left')" :key="index">
          <!-- Regular links -->
          <NuxtLink v-if="link.to && !link.children" :to="link.to"
            class="flex items-center px-3 py-2 rounded-md text-sm font-medium hover:bg-gray-700 dark:hover:bg-gray-700"
            :aria-label="link.label" color="neutral" variant="ghost">
            <UIcon v-if="link.icon" :name="link.icon" class="mr-2 text-lg" />
            <span class="text-lg">{{ link.name }}</span>
          </NuxtLink>

          <!-- Dropdown menus with column distribution -->
          <CustomDropdown
            v-else-if="link.children"
            v-model="dropdownStates[link.name || link.label || '']"
            :use-column-distribution="true"
            :items="link.children"
            :items-per-column="10"
            :max-height="70"
            position="bottom"
            align="start"
            :smart-position="true"
          >
            <template #trigger>
              <UButton color="neutral" variant="ghost" class="flex items-center" :aria-label="link.label">
                <UIcon v-if="link.icon" :name="link.icon" class="mr-2 text-m" />
                <span class="text-lg">{{ link.name }}</span>
                <UIcon name="lucide:chevron-down" class="ml-1 text-lg" />
              </UButton>
            </template>

            <!-- Column item slot for menu items -->
            <template #column-item="{ item }">
              <NuxtLink
                :to="item.to"
                class="block px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md"
                :aria-label="item.label"
                @click="dropdownStates[link.name || link.label || ''] = false"
              >
                {{ item.name }}
              </NuxtLink>
            </template>
          </CustomDropdown>

          <!-- Inline components -->
          <component v-else-if="link.component && link.inline" :is="link.component" />

          <!-- Buttons with click handlers -->
          <UButton v-else-if="link.onClick" color="neutral" variant="ghost" class="flex items-center"
            :aria-label="link.label" @click="link.onClick">
            <UIcon v-if="link.icon" :name="link.icon" class="mr-2 text-lg" />
            <span class="text-lg">{{ link.name }}</span>
          </UButton>
        </template>
      </div>
    </div>

    <!-- Center items -->
    <div class="flex items-center">
      <template v-for="(link, index) in navbarLinks.filter(l => l.position === 'center')" :key="index">
        <component v-if="link.component && link.inline" :is="link.component" />
        <UButton v-else-if="link.onClick" color="neutral" variant="ghost" :aria-label="link.label"
          @click="link.onClick">
          <UIcon v-if="link.icon" :name="link.icon" class="mr-2 text-lg" />
          <span class="text-lg">{{ link.name }}</span>
        </UButton>
      </template>
    </div>

    <!-- Right items -->
    <div class="flex items-center space-x-2">
      <template v-for="(link, index) in navbarLinks.filter(l => l.position === 'right')" :key="index">
        <!-- Inline components -->
        <component v-if="link.component && link.inline" :is="link.component" />

        <!-- Component buttons without dropdown -->
        <component v-else-if="link.component" :is="link.component" />

        <!-- Dropdown menus for right side -->
        <CustomDropdown
          v-else-if="link.children"
          v-model="dropdownStates[link.label]"
          position="bottom"
          align="end"
          :smart-position="true"
        >
          <template #trigger>
            <UButton color="neutral" variant="ghost" class="flex items-center" :aria-label="link.label">
              <UIcon v-if="link.icon" :name="link.icon" class="text-lg" />
              <span v-if="link.name" class="text-lg ml-2">{{ link.name }}</span>
            </UButton>
          </template>

          <!-- Render dropdown items -->
          <template v-for="(item, itemIndex) in link.children" :key="itemIndex">
            <NuxtLink
              :to="item.to"
              class="block px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md"
              :aria-label="item.label"
              @click="dropdownStates[link.label] = false"
            >
              <div class="flex items-center">
                <UIcon v-if="item.icon" :name="item.icon" class="mr-2 text-sm" />
                {{ item.name }}
              </div>
            </NuxtLink>
          </template>
        </CustomDropdown>

        <!-- Buttons with click handlers -->
        <UButton
          v-else-if="link.onClick"
          color="neutral"
          variant="ghost"
          class="flex items-center"
          :aria-label="link.label"
          @click="link.onClick"
        >
          <UIcon v-if="link.icon" :name="link.icon" class="text-lg" />
          <span v-if="link.name" class="text-lg ml-2">{{ link.name }}</span>
        </UButton>
      </template>
    </div>
  </nav>

  <!-- Mobile Navbar -->
  <nav class="md:hidden sticky top-0 z-50 bg-white bg-opacity-90 dark:bg-black dark:bg-opacity-90 backdrop-blur-sm shadow-sm">
    <div class="flex items-center justify-between h-16 p-4">
      <!-- Logo/Home link -->
      <NuxtLink to="/" class="flex items-center">
        <Icon name="lucide:house" class="text-2xl text-gray-900 text-black dark:text-white" />
      </NuxtLink>

      <!-- Center mobile items (typically search) -->
      <div class="flex items-center mx-2 flex-grow">
        <template v-for="(link, index) in navbarLinks.filter(l => l.position === 'center')" :key="index">
          <component
            v-if="link.component && link.inline"
            :is="link.component"
            class="w-full"
          />
        </template>
      </div>

      <!-- Mobile header actions for items marked with mobile: true -->
      <div class="flex items-center gap-3">
        <template v-for="(link, index) in navbarLinks.filter(l => l.mobile === true)" :key="index">
          <!-- Regular component buttons -->
          <component
            v-if="link.component"
            :is="link.component"
          />

          <!-- Click handlers -->
          <UButton
            v-else-if="link.onClick"
            color="neutral"
            variant="ghost"
            :aria-label="link.label"
            @click="link.onClick"
          >
            <UIcon v-if="link.icon" :name="link.icon" class="text-xl text-black dark:text-white" />
          </UButton>
        </template>

        <!-- Mobile menu toggle button -->
        <UButton
          color="neutral"
          variant="ghost"
          aria-label="Menu"
          @click="isMobileMenuOpen = true"
        >
          <UIcon name="lucide:menu" class="text-xl text-black dark:text-white" />
        </UButton>
      </div>
    </div>
  </nav>

  <!-- Mobile Fullscreen Menu Modal -->
  <MobileFullscreenModal
    :open="isMobileMenuOpen"
    :title="t('navbar.menuTitle')"
    @close="closeMobileMenu"
  >
    <!-- Main menu content -->
    <div class="h-full pb-20">
      <!-- Navigation section with collapsible items -->
      <div class="mb-8">
        <h3 class="text-lg font-bold mb-4 text-gray-900 dark:text-gray-100">{{ t('navbar.menuNavigation') }}</h3>
        <div class="space-y-3">
          <!-- Left positioned links - typically navigation -->
          <template v-for="(link, index) in navbarLinks.filter(l => l.position === 'left')" :key="`left-${index}`">
            <!-- Regular links -->
            <NuxtLink
              v-if="link.to && !link.children"
              :to="link.to"
              class="flex items-center px-4 py-3 rounded-lg text-base font-medium bg-gray-50/70 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-700/70 text-gray-900 dark:text-gray-100 shadow-sm transition-colors"
              :aria-label="link.label"
              @click="isMobileMenuOpen = false"
            >
              <UIcon v-if="link.icon" :name="link.icon" class="mr-3 text-xl text-gray-700 dark:text-gray-300" />
              {{ link.name }}
            </NuxtLink>

            <!-- Non-collapsible links with children -->
            <div v-else-if="link.children && link.collapse === false" class="mb-4 space-y-2">
              <!-- Static header - no toggle button -->
              <div class="px-4 py-3 text-base font-medium text-gray-900 dark:text-gray-100 bg-gray-50/70 dark:bg-gray-800/50 rounded-lg shadow-sm">
                <div class="flex items-center">
                  <UIcon v-if="link.icon" :name="link.icon" class="mr-3 text-xl text-gray-700 dark:text-gray-300" />
                  {{ link.name }}
                </div>
              </div>

              <!-- Direct list of children without collapsible container -->
              <div class="pl-4 space-y-1">
                <NuxtLink
                  v-for="(child, childIndex) in link.children"
                  :key="childIndex"
                  :to="child.to"
                  class="flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700/70 rounded-md"
                  :aria-label="child.label"
                  @click="isMobileMenuOpen = false"
                >
                  <UIcon v-if="child.icon" :name="child.icon" class="mr-2" />
                  {{ child.name }}
                </NuxtLink>
              </div>
            </div>

            <!-- Standard collapsible links with children -->
            <div v-else-if="link.children" class="text-base font-medium text-gray-900 dark:text-gray-100 bg-gray-50/70 dark:bg-gray-800/50 rounded-lg shadow-sm">
              <!-- Collapsible header with toggle button -->
              <button
                class="w-full flex items-center justify-between px-4 py-3 text-gray-700 dark:text-gray-300 transition-colors"
                @click="toggleMobileMenuSection(link.name)"
              >
                <div class="flex items-center">
                  <UIcon v-if="link.icon" :name="link.icon" class="mr-3 text-xl text-gray-700 dark:text-gray-300" />
                  {{ link.name }}
                </div>
                <UIcon
                  :name="expandedMobileMenus[link.name] ? 'lucide:chevron-up' : 'lucide:chevron-down'"
                  class="text-lg text-gray-700 dark:text-gray-300"
                />
              </button>

              <!-- Collapsible content -->
              <div v-show="expandedMobileMenus[link.name]" class="border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/70">
                <div class="py-2 space-y-1">
                  <NuxtLink
                    v-for="(child, childIndex) in link.children"
                    :key="childIndex"
                    :to="child.to"
                    class="flex items-center px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700/70"
                    :aria-label="child.label"
                    @click="isMobileMenuOpen = false"
                  >
                    {{ child.name }}
                  </NuxtLink>
                </div>
              </div>
            </div>
          </template>
        </div>
      </div>

      <!-- Tools Section -->
      <div class="mb-8">
        <h3 class="text-lg font-bold mb-4 text-gray-900 dark:text-gray-100">{{ t('navbar.menuTools') }}</h3>
        <div class="space-y-3">
          <!-- Information dropdown items in mobile view -->
          <template v-for="(link, index) in navbarLinks.filter(l => l.position === 'right' && l.children)" :key="`info-${index}`">
            <!-- Non-collapsible links with children -->
            <div v-if="link.collapse === false" class="mb-4 space-y-2">
              <!-- Static header -->
              <div class="px-4 py-3 text-base font-medium text-gray-900 dark:text-gray-100 bg-gray-50/70 dark:bg-gray-800/50 rounded-lg shadow-sm">
                <div class="flex items-center">
                  <UIcon v-if="link.icon" :name="link.icon" class="mr-3 text-xl text-gray-700 dark:text-gray-300" />
                  <span>{{ link.label }}</span>
                </div>
              </div>

              <!-- Direct list of children -->
              <div class="pl-4 space-y-1">
                <NuxtLink
                  v-for="(child, childIndex) in link.children"
                  :key="childIndex"
                  :to="child.to"
                  class="flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700/70 rounded-md"
                  :aria-label="child.label"
                  @click="isMobileMenuOpen = false"
                >
                  <UIcon v-if="child.icon" :name="child.icon" class="mr-2 text-lg" />
                  {{ child.name }}
                </NuxtLink>
              </div>
            </div>

            <!-- Standard collapsible links -->
            <div v-else class="mb-4 overflow-hidden rounded-lg shadow-sm bg-white/50 dark:bg-black/30">
              <!-- Collapsible header with toggle button -->
              <button
                class="w-full flex items-center justify-between px-4 py-3 text-base font-medium text-gray-900 dark:text-gray-100 hover:bg-gray-100/50 dark:hover:bg-gray-800/50 transition-colors"
                @click="toggleMobileMenuSection(link.label)"
              >
                <div class="flex items-center">
                  <UIcon v-if="link.icon" :name="link.icon" class="mr-3 text-xl text-gray-700 dark:text-gray-300" />
                  <span>{{ link.label }}</span>
                </div>
                <UIcon
                  :name="expandedMobileMenus[link.label] ? 'lucide:chevron-up' : 'lucide:chevron-down'"
                  class="text-lg text-gray-500 dark:text-gray-400"
                />
              </button>

              <!-- Collapsible content -->
              <div v-show="expandedMobileMenus[link.label]" class="bg-gray-50 dark:bg-gray-800/70">
                <div class="py-2 space-y-1">
                  <NuxtLink
                    v-for="(child, childIndex) in link.children"
                    :key="childIndex"
                    :to="child.to"
                    class="flex items-center px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700/70"
                    :aria-label="child.label"
                    @click="isMobileMenuOpen = false"
                  >
                    <UIcon v-if="child.icon" :name="child.icon" class="mr-2 text-lg" />
                    {{ child.name }}
                  </NuxtLink>
                </div>
              </div>
            </div>
          </template>
        </div>
      </div>

      <!-- Account Section -->
      <div class="mb-8">
        <h3 class="text-lg font-bold mb-4 text-gray-900 dark:text-gray-100">{{ t('navbar.menuAccount', 'Account') }}</h3>
        <div class="space-y-3">
          <!-- Use NavbarUser component with mobile flag -->
          <NavbarUser
            :is-mobile-view="true"
            @login-action="closeMobileMenu"
            @logout-action="closeMobileMenu"
          />
        </div>
      </div>
    </div>
  </MobileFullscreenModal>
</template>

<style scoped>
/* Sticky header adjustments */
.sticky.top-0 {
  z-index: 5;
}

/* Animation for collapsible sections */
.collapsible-enter-active,
.collapsible-leave-active {
  transition: max-height 0.3s ease;
  overflow: hidden;
}

.collapsible-enter-from,
.collapsible-leave-to {
  max-height: 0;
}

.collapsible-enter-to,
.collapsible-leave-from {
  max-height: 500px;
}

/* Ensure navbar stays on top */
nav.sticky {
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  transition: background-color 0.3s ease;
}

/* Safari fix for backdrop-filter */
@supports not (backdrop-filter: blur(8px)) {
  nav.sticky {
    background-color: rgba(255, 255, 255, 0.98);
  }

  :root.dark nav.sticky {
    background-color: rgba(0, 0, 0, 0.98);
  }
}

/* Glass effect */
.bg-white\/50, .dark\:bg-black\/30, .bg-gray-50\/70, .dark\:bg-gray-800\/50 {
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
}

/* Improved hover and active states */
.hover\:bg-gray-100:hover, .dark .hover\:bg-gray-700\/70:hover {
  transition: background-color 0.2s ease;
}

/* Safari fixes for backdrop-filter */
@supports not ((backdrop-filter: blur(8px)) or (-webkit-backdrop-filter: blur(8px))) {
  .bg-white\/50, .dark\:bg-black\/30, .bg-gray-50\/70, .dark\:bg-gray-800\/50 {
    background-color: rgba(255, 255, 255, 0.95) !important;
  }

  :root.dark .bg-white\/50,
  :root.dark .dark\:bg-black\/30,
  :root.dark .bg-gray-50\/70,
  :root.dark .dark\:bg-gray-800\/50 {
    background-color: rgba(15, 15, 15, 0.95) !important;
  }
}

/* Better shadows */
.shadow-sm {
  box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
}

:root.dark .shadow-sm {
  box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.3);
}

/* Enhanced animations for menu items */
@keyframes slideIn {
  from {
    transform: translateY(10px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

/* Apply animation to content */
h3, .space-y-3 > div {
  animation: slideIn 0.3s ease forwards;
  animation-delay: calc(var(--index, 0) * 0.05s);
}
</style>
