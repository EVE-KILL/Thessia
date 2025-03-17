<script setup lang="ts">
import { ref, computed } from 'vue';
import CustomDropdown from './CustomDropdown.vue';

const { t } = useI18n();

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

// Handle logout
const handleLogout = () => {
  // Placeholder for actual logout implementation
  isLoggedIn.value = false;
  isDropdownOpen.value = false;
};
</script>

<template>
  <div class="navbar-user">
    <!-- Desktop View -->
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

        <!-- Dropdown Content -->
        <div class="py-2 w-56">
          <!-- Not Logged In Content -->
          <div v-if="!isLoggedIn">
            <NuxtLink
              to="/login"
              class="block px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              @click="isDropdownOpen = false"
            >
              <div class="flex items-center">
                <UIcon name="i-heroicons-arrow-right-on-rectangle" class="mr-2" />
                {{ t('auth.login') }}
              </div>
            </NuxtLink>

            <NuxtLink
              to="/register"
              class="block px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              @click="isDropdownOpen = false"
            >
              <div class="flex items-center">
                <UIcon name="i-heroicons-user-plus" class="mr-2" />
                {{ t('auth.register') }}
              </div>
            </NuxtLink>

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

    <!-- Mobile View - Simplified version -->
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
          <NuxtLink
            to="/login"
            class="block px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
            @click="isDropdownOpen = false"
          >
            <div class="flex items-center">
              <UIcon name="i-heroicons-arrow-right-on-rectangle" class="mr-2" />
              {{ t('auth.login') }}
            </div>
          </NuxtLink>

          <NuxtLink
            to="/register"
            class="block px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
            @click="isDropdownOpen = false"
          >
            <div class="flex items-center">
              <UIcon name="i-heroicons-user-plus" class="mr-2" />
              {{ t('auth.register') }}
            </div>
          </NuxtLink>

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

/* Removed custom rounded styling since we're using UButton now */
</style>
