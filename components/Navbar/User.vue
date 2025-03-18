<script setup lang="ts">
import { computed } from 'vue';
import CustomDropdown from './CustomDropdown.vue';
import { useUserStore } from '~/stores/userStore';

// Props
const props = defineProps({
  isMobileView: {
    type: Boolean,
    default: false
  }
});

// Get translations and color mode
const { t } = useI18n();
const colorMode = useColorMode();

// Use the user store for authentication state
const userStore = useUserStore();

// Track dropdown state
const isDropdownOpen = ref(false);

// Generate character initials for avatar placeholder
const characterInitials = computed(() => {
  if (!userStore.user.characterName) return '?';
  return userStore.user.characterName
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

// Handle EVE SSO login button click
const handleEveLogin = () => {
  userStore.login();
  isDropdownOpen.value = false;
};

// Handle logout button click
const handleLogout = () => {
  userStore.logout();
  isDropdownOpen.value = false;
};

// For mobile view, emit an event when actions are performed
const emit = defineEmits(['loginAction', 'logoutAction']);

// Wrapper functions for mobile view
const handleMobileLogin = () => {
  handleEveLogin();
  emit('loginAction');
};

const handleMobileLogout = () => {
  handleLogout();
  emit('logoutAction');
};

// Character portrait URL from EVE Image Server
const characterPortraitUrl = computed(() => {
  if (!userStore.user.characterId) return null;
  return `https://images.evetech.net/characters/${userStore.user.characterId}/portrait?size=64`;
});

// For demo purposes only - can be removed in production
const toggleLoginState = () => {
  if (userStore.isAuthenticated) {
    userStore.logout();
  } else {
    // Demo login won't work with real EVE auth, this is just for UI testing
    console.debug('Demo login can only be used for UI testing');
  }
};
</script>

<template>
  <!-- Desktop View -->
  <div v-if="!isMobileView" class="navbar-user">
    <div class="hidden md:block">
      <!-- Using dropdown for both logged in and logged out states -->
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
              v-if="!userStore.isAuthenticated"
              name="lucide:user"
              class="text-lg"
            />

            <!-- Show user avatar or initials when logged in -->
            <div
              v-else-if="!characterPortraitUrl"
              class="w-5 h-5 rounded-full bg-primary-100 dark:bg-primary-900 flex items-center justify-center text-primary-700 dark:text-primary-300 text-xs font-medium"
            >
              {{ characterInitials }}
            </div>
            <img
              v-else
              :src="characterPortraitUrl"
              :alt="userStore.user.characterName"
              class="w-5 h-5 rounded-full object-cover"
            />
          </UButton>
        </template>

        <!-- Desktop Dropdown Content -->
        <div class="py-2 w-56">
          <!-- Not Logged In Content -->
          <div v-if="!userStore.isAuthenticated">
            <!-- EVE SSO Login Button -->
            <button
              class="w-full px-4 py-2 flex justify-center items-center hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              @click="handleEveLogin"
              :disabled="userStore.isLoading"
            >
              <div v-if="userStore.isLoading" class="flex items-center justify-center">
                <UIcon name="lucide:loader" class="animate-spin mr-2" />
                {{ t('auth.loading', 'Loading...') }}
              </div>
              <img
                v-else
                :src="ssoImageSrc"
                alt="Login with EVE Online"
                class="max-w-full h-auto"
              />
            </button>

            <!-- Error message if any -->
            <div v-if="userStore.hasError" class="px-4 py-2 text-sm text-red-600 dark:text-red-400">
              {{ userStore.errorMessage }}
            </div>

            <!-- For demo purposes - can be removed in production -->
            <div class="border-t border-gray-100 dark:border-gray-800 my-1 pt-1 opacity-30">
              <div class="px-4 py-2 text-xs text-gray-400 dark:text-gray-500">
                {{ t('auth.ssoRequiredForLogin', 'EVE SSO is required for login') }}
              </div>
            </div>
          </div>

          <!-- Logged In Content -->
          <template v-else>
            <!-- User Info Header -->
            <div class="px-4 py-2 border-b border-gray-100 dark:border-gray-800">
              <div class="font-medium text-sm text-gray-900 dark:text-white">{{ userStore.user.characterName }}</div>
              <div class="text-xs text-gray-500 dark:text-gray-400 truncate">
                EVE Online Character
              </div>
            </div>

            <!-- Menu Items -->
            <div class="mt-2">
              <NuxtLink
                to="/user/profile"
                class="block px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                @click="isDropdownOpen = false"
              >
                <div class="flex items-center">
                  <UIcon name="lucide:user-circle" class="mr-2" />
                  {{ t('user.profile') }}
                </div>
              </NuxtLink>

              <NuxtLink
                to="/user/settings"
                class="block px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                @click="isDropdownOpen = false"
              >
                <div class="flex items-center">
                  <UIcon name="lucide:settings" class="mr-2" />
                  {{ t('user.settings') }}
                </div>
              </NuxtLink>

              <!-- Logout Option -->
              <div class="border-t border-gray-100 dark:border-gray-800 my-1 pt-1">
                <button
                  class="w-full text-left px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  @click="handleLogout"
                  :disabled="userStore.isLoading"
                >
                  <div class="flex items-center">
                    <UIcon
                      :name="userStore.isLoading ? 'lucide:loader' : 'lucide:log-out'"
                      :class="{ 'animate-spin': userStore.isLoading }"
                      class="mr-2"
                    />
                    {{ userStore.isLoading ? t('auth.loggingOut', 'Logging out...') : t('user.logout') }}
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
      <div class="flex items-center">
        <!-- For not logged in state: icon that links to a dropdown in the mobile menu -->
        <UButton
          v-if="!userStore.isAuthenticated"
          color="neutral"
          variant="ghost"
          aria-label="User menu"
          @click="isDropdownOpen = !isDropdownOpen"
        >
          <UIcon name="lucide:user-circle" class="text-lg" />
        </UButton>

        <!-- Dropdown for small screen header -->
        <div
          v-if="!userStore.isAuthenticated && isDropdownOpen"
          class="absolute top-16 right-4 bg-white dark:bg-gray-800 shadow-lg rounded-md py-2 w-48 z-50"
        >
          <!-- EVE SSO Login Button -->
          <button
            class="w-full px-4 py-2 flex justify-center items-center hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            @click="handleEveLogin"
            :disabled="userStore.isLoading"
          >
            <div v-if="userStore.isLoading" class="flex items-center justify-center">
              <UIcon name="lucide:loader" class="animate-spin mr-2" />
              {{ t('auth.loading', 'Loading...') }}
            </div>
            <img
              v-else
              :src="ssoImageSrc"
              alt="Login with EVE Online"
              class="max-w-full h-auto"
            />
          </button>

          <!-- Error message -->
          <div v-if="userStore.hasError" class="px-4 py-2 text-sm text-red-500">
            {{ userStore.errorMessage }}
          </div>
        </div>

        <!-- For logged in state: link to profile -->
        <NuxtLink v-else to="/user/profile" class="relative">
          <UButton
            color="neutral"
            variant="ghost"
            size="sm"
            aria-label="User profile"
          >
            <div
              class="w-5 h-5 rounded-full bg-primary-100 dark:bg-primary-900 flex items-center justify-center text-primary-700 dark:text-primary-300 text-xs font-medium"
              v-if="!characterPortraitUrl"
            >
              {{ characterInitials }}
            </div>
            <img
              v-else
              :src="characterPortraitUrl"
              :alt="userStore.user.characterName"
              class="w-5 h-5 rounded-full object-cover"
            />
          </UButton>
        </NuxtLink>
      </div>
    </div>
  </div>

  <!-- Mobile Fullscreen Menu View -->
  <div v-else class="p-4 bg-gray-50/70 dark:bg-gray-800/50 rounded-lg shadow-sm">
    <!-- Not logged in content -->
    <div v-if="!userStore.isAuthenticated">
      <!-- EVE SSO Login Button -->
      <button
        class="w-full mb-3 px-4 py-2 flex justify-center items-center hover:bg-gray-100 dark:hover:bg-gray-700/70 transition-colors rounded-md"
        @click="handleMobileLogin"
        :disabled="userStore.isLoading"
      >
        <div v-if="userStore.isLoading" class="flex items-center justify-center">
          <UIcon name="lucide:loader" class="animate-spin mr-2" />
          {{ t('auth.loading', 'Loading...') }}
        </div>
        <img
          v-else
          :src="ssoImageSrc"
          alt="Login with EVE Online"
          class="max-w-full h-auto"
        />
      </button>

      <!-- Error message -->
      <div v-if="userStore.hasError" class="px-2 py-2 text-sm text-red-500 mb-3">
        {{ userStore.errorMessage }}
      </div>
    </div>

    <!-- Logged in content -->
    <div v-else>
      <!-- User Info Header -->
      <div class="flex items-center space-x-3 px-2 py-2 mb-3 border-b border-gray-100 dark:border-gray-800">
        <div
          v-if="characterPortraitUrl"
          class="flex-shrink-0"
        >
          <img
            :src="characterPortraitUrl"
            :alt="userStore.user.characterName"
            class="w-10 h-10 rounded-full object-cover"
          />
        </div>
        <div v-else class="w-10 h-10 rounded-full bg-primary-100 dark:bg-primary-900 flex items-center justify-center text-primary-700 dark:text-primary-300 text-sm font-medium">
          {{ characterInitials }}
        </div>
        <div class="flex-grow min-w-0">
          <div class="font-medium text-base text-gray-900 dark:text-white truncate">
            {{ userStore.user.characterName }}
          </div>
          <div class="text-sm text-gray-500 dark:text-gray-400">
            EVE Online Character
          </div>
        </div>
      </div>

      <!-- Menu Items -->
      <div class="space-y-1">
        <NuxtLink
          to="/user/profile"
          class="block px-2 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700/70 rounded-md transition-colors"
          @click="emit('loginAction')"
        >
          <div class="flex items-center">
            <UIcon name="lucide:user-circle" class="mr-2" />
            {{ t('user.profile') }}
          </div>
        </NuxtLink>

        <NuxtLink
          to="/user/settings"
          class="block px-2 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700/70 rounded-md transition-colors"
          @click="emit('loginAction')"
        >
          <div class="flex items-center">
            <UIcon name="lucide:settings" class="mr-2" />
            {{ t('user.settings') }}
          </div>
        </NuxtLink>

        <!-- Logout Option -->
        <div class="border-t border-gray-100 dark:border-gray-800 my-1 pt-1">
          <button
            class="w-full text-left px-2 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-700/70 rounded-md transition-colors"
            @click="handleMobileLogout"
            :disabled="userStore.isLoading"
          >
            <div class="flex items-center">
              <UIcon
                :name="userStore.isLoading ? 'lucide:loader' : 'lucide:log-out'"
                :class="{ 'animate-spin': userStore.isLoading }"
                class="mr-2"
              />
              {{ userStore.isLoading ? t('auth.loggingOut', 'Logging out...') : t('user.logout') }}
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
