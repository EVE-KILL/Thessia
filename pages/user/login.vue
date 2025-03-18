<script setup lang="ts">
import { useUserStore } from '~/stores/userStore';

definePageMeta({
  title: 'Login',
  layout: 'default'
});

const userStore = useUserStore();
const { t } = useI18n();
const route = useRoute();
const colorMode = useColorMode();

// Check if the user was redirected with an error
onMounted(() => {
  // Check for auth error from redirect
  const authError = route.query.auth_error;
  if (authError) {
    userStore.authError = t('auth.error.general', 'Authentication failed. Please try again.');
  }
});

// Determine which EVE SSO image to use
const ssoImageSrc = computed(() => {
  const isDark = colorMode.value === 'dark';
  return isDark ? '/images/sso-light-large.png' : '/images/sso-dark-large.png';
});

// Handle login button click
const handleLogin = () => {
  userStore.login();
};

// Clear errors when leaving the page
onBeforeUnmount(() => {
  userStore.clearError();
});
</script>

<template>
  <div class="min-h-[calc(100vh-theme(spacing.16))] flex flex-col items-center justify-center px-4 sm:px-6 lg:px-8">
    <div class="w-full max-w-md space-y-8">
      <div class="text-center">
        <h1 class="text-3xl font-bold text-gray-900 dark:text-white">
          {{ $t('auth.signIn') }}
        </h1>
        <p class="mt-2 text-sm text-gray-600 dark:text-gray-400">
          {{ $t('auth.signInWithEve') }}
        </p>
      </div>

      <div class="bg-white dark:bg-gray-800 py-8 px-4 shadow-md rounded-lg sm:px-10">
        <div v-if="userStore.hasError" class="mb-4 text-sm text-center p-3 bg-red-100 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-md">
          {{ userStore.errorMessage }}
        </div>

        <!-- If already authenticated -->
        <div v-if="userStore.isAuthenticated" class="space-y-6">
          <div class="text-center space-y-3">
            <div class="text-gray-900 dark:text-white font-medium">
              {{ $t('auth.alreadySignedIn') }}
            </div>
            <div class="text-sm text-gray-600 dark:text-gray-400">
              {{ $t('auth.signedInAs', { name: userStore.user.characterName }) }}
            </div>
          </div>

          <div class="flex space-x-3">
            <UButton
              to="/"
              color="primary"
              class="w-full"
            >
              {{ $t('common.goHome') }}
            </UButton>
            <UButton
              color="gray"
              class="w-full"
              @click="userStore.logout"
            >
              {{ $t('user.logout') }}
            </UButton>
          </div>
        </div>

        <!-- If not authenticated -->
        <div v-else class="space-y-6">
          <div class="text-center flex flex-col items-center space-y-4">
            <p class="text-sm text-gray-600 dark:text-gray-400">
              {{ $t('auth.useEveSSOToLogin') }}
            </p>

            <button
              @click="handleLogin"
              :disabled="userStore.isLoading"
              class="w-full max-w-xs transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              <div v-if="userStore.isLoading" class="flex items-center justify-center p-4">
                <UIcon name="lucide:loader" class="animate-spin mr-2" />
                {{ $t('auth.loading') }}
              </div>
              <img
                v-else
                :src="ssoImageSrc"
                alt="Login with EVE Online"
                class="max-w-full h-auto"
                width="270"
                height="45"
              />
            </button>
          </div>

          <div class="text-xs text-center text-gray-500 dark:text-gray-500">
            {{ $t('auth.privacyNote') }}
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
