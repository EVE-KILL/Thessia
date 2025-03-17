<script setup lang="ts">
import { ref, computed } from 'vue';
import CustomDropdown from './CustomDropdown.vue';

// Props
const props = defineProps({
  isMobileView: {
    type: Boolean,
    default: false
  }
});

const { t } = useI18n();
const colorMode = useColorMode();

// This is a placeholder for the actual authentication state
// You'll replace this with your authentication implementation later
const isLoggedIn = ref(false);

// Mock user data - replace with actual user data from your auth system
const userData = ref({
  name: 'Demo User',
  avatar: null, // URL to user avatar if available
  email: 'user@example.com'
});

// Toggle login state for demo purposes
const toggleLoginState = () => {
  isLoggedIn.value = !isLoggedIn.value;
};

// Track dropdown state
const isDropdownOpen = ref(false);

// Generate initials for avatar placeholder
const userInitials = computed(() => {
  if (!userData.value.name) return '?';
  return userData.value.name
    .split(' ')
    .map(part => part.charAt(0).toUpperCase())
    .slice(0, 2)
    .join('');
});

// Determine which EVE SSO image to use based on color mode and screen size
const ssoImageSrc = computed(() => {
  const isDark = colorMode.value === 'dark';
  const isSmallScreen = props.isMobileView || window.innerWidth < 768; // md breakpoint in Tailwind

  if (isDark) {
    return isSmallScreen ? '/images/sso-light-small.png' : '/images/sso-light-large.png';
  } else {
    return isSmallScreen ? '/images/sso-dark-small.png' : '/images/sso-dark-large.png';
  }
});

// Handle logout
const handleLogout = () => {
  // Placeholder for actual logout implementation
  isLoggedIn.value = false;
  isDropdownOpen.value = false;
};

// Handle EVE SSO login
const handleEveLogin = () => {
  // This will be implemented later with actual EVE SSO authentication
  console.debug('EVE SSO login clicked');
  // Close dropdown
  isDropdownOpen.value = false;
};

// For mobile view, emit an event when actions are performed
const emit = defineEmits(['loginAction', 'logoutAction']);

// Wrapper functions for mobile view
const handleMobileLogin = () => {
  handleEveLogin();
  emit('loginAction');
};

const handleMobileToggleLogin = () => {
  toggleLoginState();
  emit('loginAction');
};

const handleMobileLogout = () => {
  handleLogout();
  emit('logoutAction');
};
</script>

<template>
  <!-- Desktop View -->
  <div v-if="!isMobileView" class="navbar-user">
    <div class="hidden md:block">
      <!-- Not Logged In State - Now using dropdown for both states -->
      <CustomDropdown
        v-model="isDropdownOpen"
        :smart-position="true"
        position="bottom"
        align="end"
      >
        <template #trigger>
          <!-- Updated button to match navbar style -->
          <UButton
            color="neutral"
            variant="ghost"
            size="sm"
            class="flex items-center"
            aria-label="User menu"
          >
            <!-- Show user icon when not logged in -->
            <UIcon
              v-if="!isLoggedIn"
              name="i-heroicons-user-circle"
              class="text-lg"
            />

            <!-- Show user avatar or initials when logged in - adjusted size -->
            <div
              v-else-if="!userData.avatar"
              class="w-5 h-5 rounded-full bg-primary-100 dark:bg-primary-900 flex items-center justify-center text-primary-700 dark:text-primary-300 text-xs font-medium"
            >
              {{ userInitials }}
            </div>
            <img
              v-else
              :src="userData.avatar"
              :alt="userData.name"
              class="w-5 h-5 rounded-full object-cover"
            />
          </UButton>
        </template>

        <!-- Desktop Dropdown Content -->
        <div class="py-2 w-56">
          <!-- Not Logged In Content -->
          <div v-if="!isLoggedIn">
            <!-- EVE SSO Login Button -->
            <button
              class="w-full px-4 py-2 flex justify-center items-center hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              @click="handleEveLogin"
            >
              <img
                :src="ssoImageSrc"
                alt="Login with EVE Online"
                class="max-w-full h-auto"
              />
            </button>

            <!-- Demo toggle button separated by border -->
            <div class="border-t border-gray-100 dark:border-gray-800 my-1 pt-1">
              <button
                class="w-full text-left px-4 py-2 text-sm text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                @click="toggleLoginState(); isDropdownOpen = false;"
              >
                <div class="flex items-center">
                  <UIcon name="i-heroicons-sparkles" class="mr-2" />
                  {{ t('demo.fakeLogin', 'Fake Login (Demo)') }}
                </div>
              </button>
            </div>
          </div>

          <!-- Logged In Content -->
          <template v-else>
            <!-- User Info Header -->
            <div class="px-4 py-2 border-b border-gray-100 dark:border-gray-800">
              <div class="font-medium text-sm text-gray-900 dark:text-white">{{ userData.name }}</div>
              <div class="text-xs text-gray-500 dark:text-gray-400 truncate">{{ userData.email }}</div>
            </div>

            <!-- Menu Items -->
            <div class="mt-2">
              <NuxtLink
                to="/profile"
                class="block px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                @click="isDropdownOpen = false"
              >
                <div class="flex items-center">
                  <UIcon name="i-heroicons-user-circle" class="mr-2" />
                  {{ t('user.profile') }}
                </div>
              </NuxtLink>

              <NuxtLink
                to="/settings"
                class="block px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                @click="isDropdownOpen = false"
              >
                <div class="flex items-center">
                  <UIcon name="i-heroicons-cog-6-tooth" class="mr-2" />
                  {{ t('user.settings') }}
                </div>
              </NuxtLink>

              <!-- Logout Option -->
              <div class="border-t border-gray-100 dark:border-gray-800 my-1 pt-1">
                <button
                  class="w-full text-left px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  @click="handleLogout"
                >
                  <div class="flex items-center">
                    <UIcon name="i-heroicons-arrow-right-on-rectangle" class="mr-2" />
                    {{ t('user.logout') }}
                  </div>
                </button>
              </div>

              <!-- Toggle button for demo purposes -->
              <div class="border-t border-gray-100 dark:border-gray-800 my-1 pt-1 opacity-30 hover:opacity-100">
                <button
                  class="w-full text-left px-4 py-2 text-xs text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  @click="toggleLoginState"
                >
                  <div class="flex items-center">
                    <UIcon name="i-heroicons-user-circle" class="mr-2" />
                    {{ t('demo.toggleLoginState', 'Fake Logout (Demo)') }}
                  </div>
                </button>
              </div>
            </div>
          </template>
        </div>
      </CustomDropdown>
    </div>

    <!-- Small screen dropdown for top bar -->
    <div class="md:hidden">
      <!-- Both logged in and not logged in states use the same icon approach on mobile -->
      <div class="flex items-center">
        <!-- For not logged in state: icon that links to a dropdown in the mobile menu -->
        <UButton
          v-if="!isLoggedIn"
          color="neutral"
          variant="ghost"
          aria-label="User menu"
          @click="isDropdownOpen = !isDropdownOpen"
        >
          <UIcon name="i-heroicons-user-circle" class="text-lg" />
        </UButton>

        <!-- Dropdown for mobile (simplified, can be expanded) -->
        <div
          v-if="!isLoggedIn && isDropdownOpen"
          class="absolute top-16 right-4 bg-white dark:bg-gray-800 shadow-lg rounded-md py-2 w-48 z-50"
        >
          <!-- EVE SSO Login Button for Mobile -->
          <button
            class="w-full px-4 py-2 flex justify-center items-center hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            @click="handleEveLogin"
          >
            <img
              :src="ssoImageSrc"
              alt="Login with EVE Online"
              class="max-w-full h-auto"
            />
          </button>

          <div class="border-t border-gray-100 dark:border-gray-800 my-1"></div>

          <button
            class="w-full text-left px-4 py-2 text-sm text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
            @click="toggleLoginState(); isDropdownOpen = false;"
          >
            <div class="flex items-center">
              <UIcon name="i-heroicons-sparkles" class="mr-2" />
              {{ t('demo.fakeLogin', 'Fake Login (Demo)') }}
            </div>
          </button>
        </div>

        <!-- For logged in state: link to profile with consistent styling -->
        <NuxtLink v-else to="/profile" class="relative">
          <UButton
            color="neutral"
            variant="ghost"
            size="sm"
            aria-label="User profile"
          >
            <!-- User Avatar or Initials - adjusted size -->
            <div
              class="w-5 h-5 rounded-full bg-primary-100 dark:bg-primary-900 flex items-center justify-center text-primary-700 dark:text-primary-300 text-xs font-medium"
              v-if="!userData.avatar"
            >
              {{ userInitials }}
            </div>
            <img
              v-else
              :src="userData.avatar"
              :alt="userData.name"
              class="w-5 h-5 rounded-full object-cover"
            />
          </UButton>
        </NuxtLink>

        <!-- Demo toggle button - more consistent with navbar styling -->
        <UButton
          color="neutral"
          variant="ghost"
          size="sm"
          @click="toggleLoginState"
          class="ml-1 opacity-30 hover:opacity-100"
          title="Demo: Toggle login state"
        >
          <UIcon name="i-heroicons-sparkles" class="text-sm" />
        </UButton>
      </div>
    </div>
  </div>

  <!-- Mobile Fullscreen Menu View -->
  <div v-else class="p-4 bg-gray-50/70 dark:bg-gray-800/50 rounded-lg shadow-sm">
    <!-- Not logged in content -->
    <div v-if="!isLoggedIn">
      <!-- EVE SSO Login Button -->
      <button
        class="w-full mb-3 px-4 py-2 flex justify-center items-center hover:bg-gray-100 dark:hover:bg-gray-700/70 transition-colors rounded-md"
        @click="handleMobileLogin"
      >
        <img
          :src="ssoImageSrc"
          alt="Login with EVE Online"
          class="max-w-full h-auto"
        />
      </button>

      <!-- Demo toggle button -->
      <div class="border-t border-gray-100 dark:border-gray-800 my-2 pt-2">
        <button
          class="w-full text-left px-2 py-2 text-sm text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700/70 rounded-md transition-colors"
          @click="handleMobileToggleLogin"
        >
          <div class="flex items-center">
            <UIcon name="i-heroicons-sparkles" class="mr-2" />
            {{ t('demo.fakeLogin', 'Fake Login (Demo)') }}
          </div>
        </button>
      </div>
    </div>

    <!-- Logged in content -->
    <div v-else>
      <!-- User Info Header -->
      <div class="px-2 py-2 mb-3 border-b border-gray-100 dark:border-gray-800">
        <div class="font-medium text-base text-gray-900 dark:text-white">{{ userData.name }}</div>
        <div class="text-sm text-gray-500 dark:text-gray-400 truncate">{{ userData.email }}</div>
      </div>

      <!-- Menu Items -->
      <div class="space-y-1">
        <NuxtLink
          to="/profile"
          class="block px-2 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700/70 rounded-md transition-colors"
          @click="emit('loginAction')"
        >
          <div class="flex items-center">
            <UIcon name="i-heroicons-user-circle" class="mr-2" />
            {{ t('user.profile') }}
          </div>
        </NuxtLink>

        <NuxtLink
          to="/settings"
          class="block px-2 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700/70 rounded-md transition-colors"
          @click="emit('loginAction')"
        >
          <div class="flex items-center">
            <UIcon name="i-heroicons-cog-6-tooth" class="mr-2" />
            {{ t('user.settings') }}
          </div>
        </NuxtLink>

        <!-- Logout Option -->
        <div class="border-t border-gray-100 dark:border-gray-800 my-1 pt-1">
          <button
            class="w-full text-left px-2 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-700/70 rounded-md transition-colors"
            @click="handleMobileLogout"
          >
            <div class="flex items-center">
              <UIcon name="i-heroicons-arrow-right-on-rectangle" class="mr-2" />
              {{ t('user.logout') }}
            </div>
          </button>
        </div>

        <!-- Toggle button for demo purposes -->
        <div class="border-t border-gray-100 dark:border-gray-800 my-1 pt-1 opacity-30 hover:opacity-100">
          <button
            class="w-full text-left px-2 py-2 text-xs text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700/70 rounded-md transition-colors"
            @click="handleMobileToggleLogin"
          >
            <div class="flex items-center">
              <UIcon name="i-heroicons-user-circle" class="mr-2" />
              {{ t('demo.toggleLoginState', 'Fake Logout (Demo)') }}
            </div>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.navbar-user {
  display: flex;
  align-items: center;
}

/* Animation for user menu */
.dropdown-enter-active,
.dropdown-leave-active {
  transition: opacity 0.2s, transform 0.2s;
}

.dropdown-enter-from,
.dropdown-leave-to {
  opacity: 0;
  transform: translateY(-0.25rem);
}
</style>
