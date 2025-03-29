<script setup lang="ts">
definePageMeta({
  layout: "default",
});

// Add SEO meta
const { t } = useI18n();
useSeoMeta({
  title: t("loginPageTitle"),
});

import { onMounted, reactive } from "vue";

// Composables
const auth = useAuth();
const route = useRoute();
const colorMode = useColorMode();

// Get redirect path from query parameter or default to home
const redirectPath = computed(() => {
  return route.query.redirect?.toString() || "/";
});

// Available scopes with descriptions
const availableScopes = reactive([
  {
    id: "publicData",
    name: t("scopes.publicData", "Public Data"),
    description: t("scopes.publicDataDesc", "Basic character information"),
    required: true,
    selected: true,
  },
  {
    id: "esi-killmails.read_killmails.v1",
    name: t("scopes.readKillmails", "Read Killmails"),
    description: t("scopes.readKillmailsDesc", "Access to your character's killmails"),
    required: false,
    selected: true,
  },
  {
    id: "esi-killmails.read_corporation_killmails.v1",
    name: t("scopes.readCorpKillmails", "Read Corporation Killmails"),
    description: t("scopes.readCorpKillmailsDesc", "Access to your corporation's killmails"),
    required: false,
    selected: true,
  },
]);

// Check if customize mode is active
const isCustomizeMode = computed(() => route.query.customize === "true");

// SSO image configuration
const ssoImages = {
  light: {
    large: "/images/sso-light-large.png",
    small: "/images/sso-light-small.png",
  },
  dark: {
    large: "/images/sso-dark-large.png",
    small: "/images/sso-dark-small.png",
  },
};

// Image source based on theme
const ssoImageSrc = computed(() => {
  const theme = colorMode.value === "dark" ? "light" : "dark";
  return ssoImages[theme].large;
});

// Login with selected scopes
const handleCustomLogin = () => {
  const selectedScopes = availableScopes.filter((scope) => scope.selected).map((scope) => scope.id);

  auth.login(redirectPath.value, selectedScopes);
};

// Simple login with default scopes
const handleQuickLogin = () => {
  auth.login(redirectPath.value);
};

// Check if already authenticated
onMounted(async () => {
  // Initialize authentication state
  await auth.checkAuth();

  // Check for auth error from redirect
  const authError = route.query.auth_error;
  if (authError) {
    auth.authError.value = t("auth.error.general", "Authentication failed. Please try again.");
  }

  // Only redirect if authenticated AND not in customize scopes mode
  if (auth.isAuthenticated.value && !isCustomizeMode.value) {
    navigateTo(redirectPath.value);
  }
});

// Clear errors when leaving
onBeforeUnmount(() => {
  auth.authError.value = null;
});
</script>

<template>
  <div class="min-h-[calc(100vh-theme(spacing.16))] flex flex-col items-center justify-center">
    <div class="w-full max-w-md space-y-8 px-4">
      <div class="text-center">
        <h1 class="text-3xl font-bold text-gray-900 dark:text-white">
          {{ isCustomizeMode ? $t('auth.customizeScopes') : $t('auth.signIn') }}
        </h1>
        <p class="mt-2 text-sm text-gray-600 dark:text-gray-400">
          {{ isCustomizeMode ? $t('auth.customizeScopesInfo') : $t('auth.signInWithEve') }}
        </p>
      </div>

      <div class="bg-white dark:bg-gray-800 px-4 shadow-md rounded-lg sm:px-10">
        <!-- CUSTOMIZE MODE: Show scope selection regardless of auth status -->
        <div v-if="isCustomizeMode" class="space-y-6">
          <!-- User Info when authenticated -->
          <div v-if="auth.isAuthenticated.value" class="text-center space-y-3 mb-4">
            <div class="text-sm text-gray-600 dark:text-gray-400">
              {{ $t('auth.signedInAs', { name: auth.user.value.characterName }) }}
            </div>
          </div>

          <!-- Scope selection -->
          <div class="space-y-3">
            <div v-for="scope in availableScopes" :key="scope.id" class="flex items-start">
              <div class="flex items-center h-5">
                <UCheckbox
                  v-model="scope.selected"
                  :disabled="scope.required"
                  :color="scope.required ? 'primary' : 'primary'"
                />
              </div>
              <div class="ml-3 text-sm">
                <label class="font-medium text-gray-700 dark:text-gray-300">
                  {{ scope.name }}
                  <span v-if="scope.required" class="text-xs text-gray-500 dark:text-gray-400">
                    ({{ t('auth.required', 'Required') }})
                  </span>
                </label>
                <p class="text-gray-500 dark:text-gray-400">{{ scope.description }}</p>
              </div>
            </div>
          </div>

          <div class="flex space-x-3">
            <UButton
              color="primary"
              class="flex-1"
              :loading="auth.isLoading.value"
              :disabled="auth.isLoading.value"
              @click="handleCustomLogin"
            >
              {{ $t('auth.loginWithSelectedScopes', 'Login with Selected Scopes') }}
            </UButton>

            <UButton
              color="warning"
              :to="redirectPath"
              :disabled="auth.isLoading.value"
            >
              {{ $t('common.cancel') }}
            </UButton>
          </div>
        </div>

        <!-- STANDARD MODE: Show based on auth status -->
        <template v-else>
          <!-- Regular already authenticated view -->
          <div v-if="auth.isAuthenticated.value" class="space-y-6">
            <div class="text-center space-y-3">
              <div class="text-gray-900 dark:text-white font-medium">
                {{ $t('auth.alreadySignedIn') }}
              </div>
              <div class="text-sm text-gray-600 dark:text-gray-400">
                {{ $t('auth.signedInAs', { name: auth.user.value.characterName }) }}
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
                color="warning"
                class="w-full"
                @click="auth.logout"
              >
                {{ $t('user.logout') }}
              </UButton>
            </div>
          </div>

          <!-- Not authenticated view -->
          <div v-else class="space-y-6">
            <div class="text-center flex flex-col items-center space-y-4">
              <button
                @click="handleQuickLogin"
                :disabled="auth.isLoading.value"
                class="w-full max-w-xs transition-opacity hover:opacity-90 disabled:opacity-50 focus:outline-none"
              >
                <div v-if="auth.isLoading.value" class="flex items-center justify-center p-4">
                  <UIcon name="lucide:loader" class="animate-spin mr-2" />
                  {{ $t('auth.loading') }}
                </div>
                <NuxtImg
                  v-else
                  :src="ssoImageSrc"
                  alt="Login with EVE Online"
                  class="max-w-full h-auto"
                  width="270"
                  height="45"
                  format="webp"
                  quality="95"
                />
              </button>

              <div class="w-full pt-4 text-center">
                <UButton
                  to="/user/login?customize=true"
                  variant="ghost"
                  size="sm"
                  color="primary"
                  class="text-sm"
                >
                  <template #leading>
                    <UIcon name="lucide:shield" />
                  </template>
                  {{ $t('auth.customizeScopes') }}
                </UButton>
              </div>
            </div>

            <div class="text-xs text-center text-gray-500 dark:text-gray-500">
              {{ $t('auth.privacyNote') }}
            </div>
          </div>
        </template>
      </div>
    </div>
  </div>
</template>
