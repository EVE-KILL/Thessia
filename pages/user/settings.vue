<script setup lang="ts">
import { useUserStore } from '~/stores/userStore';

definePageMeta({
  title: 'Settings',
  layout: 'default',
  requiresAuth: true
});

const userStore = useUserStore();
const { t } = useI18n();
const router = useRouter();

// Get user profile data
const { data: profileData, pending, error, refresh } = await useFetch('/api/user/profile');

// Character portrait URL from EVE Image Server
const characterPortraitUrl = computed(() => {
  if (!userStore.user.characterId) return null;
  return `https://images.evetech.net/characters/${userStore.user.characterId}/portrait?size=128`;
});

// Corporation logo URL
const corporationLogoUrl = computed(() => {
  if (!userStore.user.corporationId) return null;
  return `https://images.evetech.net/corporations/${userStore.user.corporationId}/logo?size=64`;
});

// Alliance logo URL
const allianceLogoUrl = computed(() => {
  if (!userStore.user.allianceId) return null;
  return `https://images.evetech.net/alliances/${userStore.user.allianceId}/logo?size=64`;
});

// Format expiration date
const formattedExpirationDate = computed(() => {
  if (!profileData.value?.dateExpiration) return '';

  const date = new Date(profileData.value.dateExpiration);
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'UTC',
    hour12: false
  }).format(date) + ' UTC';
});

// Calculate if token will expire soon (within 48 hours)
const tokenExpiresSoon = computed(() => {
  if (!profileData.value?.dateExpiration) return false;

  const expirationDate = new Date(profileData.value.dateExpiration);
  const now = new Date();
  const hoursDiff = (expirationDate.getTime() - now.getTime()) / (1000 * 60 * 60);

  return hoursDiff < 48;
});

// Handle logout
const handleLogout = async () => {
  await userStore.logout();
  navigateTo('/');
};

// Permission descriptions
const permissionDescriptions: Record<string, string> = {
  'publicData': t('permissions.publicData', 'Access public character information'),
  'esi-killmails.read_killmails.v1': t('permissions.readKillmails', 'Access your killmails'),
  'esi-killmails.read_corporation_killmails.v1': t('permissions.readCorporationKillmails', 'Access your corporation killmails')
};

// Get more user-friendly permission description
const getPermissionDescription = (scope: string) => {
  return permissionDescriptions[scope] || scope;
};

// Handle refresh token
const handleRefreshToken = async () => {
  await userStore.refreshToken();
  refresh();
};

// Handle re-authentication
const handleReauthenticate = async () => {
  userStore.setRedirectUrl('/user/settings');
  userStore.login();
};

// State for delete confirmation modal
const isDeleteModalOpen = ref(false);
const isDeletingAccount = ref(false);
const deleteError = ref('');

// Handle account deletion
const handleDeleteAccount = async () => {
  try {
    isDeletingAccount.value = true;
    deleteError.value = '';

    const { data, error } = await useFetch('/api/user/delete', {
      method: 'POST'
    });

    if (error.value) {
      deleteError.value = error.value.message || t('settings.deleteError', 'Failed to delete account data');
      return;
    }

    if (data.value?.success) {
      // Reset user state in store
      userStore.authenticated = false;
      userStore.user = {
        characterId: null,
        characterName: null,
        scopes: [],
        canFetchCorporationKillmails: false,
        dateExpiration: null,
      };

      // Close modal first
      isDeleteModalOpen.value = false;

      // Redirect to home page with success message
      router.push('/?deleted=true');
    }
  } catch (err) {
    console.debug('Error deleting account:', err);
    deleteError.value = t('settings.deleteError', 'Failed to delete account data');
  } finally {
    isDeletingAccount.value = false;
  }
};
</script>

<template>
  <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
    <div class="mb-8">
      <h1 class="text-3xl font-bold text-gray-900 dark:text-white">
        {{ $t('user.settings') }}
      </h1>
      <p class="mt-2 text-sm text-gray-600 dark:text-gray-400">
        {{ $t('settings.description', 'Manage your account settings and permissions') }}
      </p>
    </div>

    <!-- Loading state -->
    <div v-if="pending" class="flex justify-center py-12">
      <UIcon name="lucide:loader" class="animate-spin h-8 w-8 text-primary-600 dark:text-primary-400" />
    </div>

    <!-- Error state -->
    <div v-else-if="error" class="bg-red-50 dark:bg-red-900/20 p-4 rounded-md">
      <div class="flex">
        <UIcon name="lucide:alert-triangle" class="h-5 w-5 text-red-500 dark:text-red-400" />
        <div class="ml-3">
          <h3 class="text-sm font-medium text-red-800 dark:text-red-300">
            {{ $t('common.error') }}
          </h3>
          <div class="mt-2 text-sm text-red-700 dark:text-red-200">
            <p>{{ error.message }}</p>
          </div>
          <div class="mt-4">
            <UButton size="sm" @click="refresh">
              {{ $t('common.tryAgain') }}
            </UButton>
          </div>
        </div>
      </div>
    </div>

    <!-- Settings content -->
    <div v-else-if="profileData" class="space-y-6">
      <!-- Account section -->
      <div class="bg-white dark:bg-gray-800 shadow-md rounded-lg overflow-hidden">
        <div class="px-6 py-5 border-b border-gray-200 dark:border-gray-700">
          <h2 class="text-xl font-medium text-gray-900 dark:text-white">
            {{ $t('settings.accountSettings') }}
          </h2>
        </div>

        <div class="p-6">
          <div class="flex items-start space-x-4">
            <!-- Character avatar -->
            <NuxtImg
              v-if="characterPortraitUrl"
              :src="characterPortraitUrl"
              :alt="profileData.characterName"
              class="w-16 h-16 rounded-lg object-cover"
              :width="128" :height="128" format="webp" quality="90"
            />
            <div
              v-else
              class="w-16 h-16 rounded-lg bg-primary-100 dark:bg-primary-900 flex items-center justify-center text-primary-700 dark:text-primary-300 text-2xl font-medium"
            >
              {{ profileData.characterName.substring(0, 2).toUpperCase() }}
            </div>

            <!-- Character info -->
            <div>
              <h3 class="font-medium text-gray-900 dark:text-white">
                {{ profileData.characterName }}
              </h3>
              <p class="text-sm text-gray-500 dark:text-gray-400">
                ID: {{ profileData.characterId }}
              </p>

              <!-- Corporation info -->
              <div v-if="userStore.user.corporationName" class="flex items-center mt-2">
                <NuxtImg v-if="corporationLogoUrl" :src="corporationLogoUrl"
                    :alt="userStore.user.corporationName" class="w-5 h-5 rounded-lg mr-2"
                    :width="20" :height="20" format="webp" quality="80" />
                <span class="text-sm text-gray-700 dark:text-gray-300">{{ userStore.user.corporationName }}</span>
              </div>

              <!-- Alliance info -->
              <div v-if="userStore.user.allianceName" class="flex items-center mt-1">
                <NuxtImg v-if="allianceLogoUrl" :src="allianceLogoUrl"
                    :alt="userStore.user.allianceName" class="w-5 h-5 rounded-lg mr-2"
                    :width="20" :height="20" format="webp" quality="80" />
                <span class="text-sm text-gray-700 dark:text-gray-300">{{ userStore.user.allianceName }}</span>
              </div>

              <!-- Admin badge -->
              <div v-if="userStore.user.administrator" class="mt-2">
                <UBadge color="violet" variant="subtle">
                  {{ $t('user.administrator', 'Administrator') }}
                </UBadge>
              </div>
            </div>
          </div>

          <!-- Authentication status -->
          <div class="mt-6 space-y-4">
            <div class="flex items-center justify-between">
              <div class="text-sm font-medium text-gray-900 dark:text-white">
                {{ $t('settings.authenticationStatus') }}
              </div>
              <UBadge
                v-if="!tokenExpiresSoon"
                color="success"
                variant="subtle"
                class="ml-2"
              >
                {{ $t('settings.authenticated') }}
              </UBadge>
              <UBadge
                v-else
                color="warning"
                variant="subtle"
                class="ml-2"
              >
                {{ $t('settings.expiringToken') }}
              </UBadge>
            </div>

            <div class="flex items-center justify-between">
              <div class="text-sm font-medium text-gray-900 dark:text-white">
                {{ $t('user.tokenExpires') }}
              </div>
              <div class="text-sm text-gray-500 dark:text-gray-400">
                {{ formattedExpirationDate }}
              </div>
            </div>

            <!-- Token management buttons -->
            <div class="flex flex-col sm:flex-row gap-3 mt-4">
              <UButton
                color="primary"
                size="sm"
                icon="lucide:refresh-cw"
                @click="handleRefreshToken"
              >
                {{ $t('settings.refreshToken') }}
              </UButton>

              <UButton
                color="gray"
                size="sm"
                icon="lucide:log-in"
                @click="handleReauthenticate"
              >
                {{ $t('settings.reauthenticate') }}
              </UButton>

              <UButton
                color="red"
                size="sm"
                variant="soft"
                icon="lucide:power"
                @click="handleLogout"
              >
                {{ $t('user.logout') }}
              </UButton>
            </div>
          </div>
        </div>
      </div>

      <!-- Permissions section -->
      <div class="bg-white dark:bg-gray-800 shadow-md rounded-lg overflow-hidden">
        <div class="px-6 py-5 border-b border-gray-200 dark:border-gray-700">
          <h2 class="text-xl font-medium text-gray-900 dark:text-white">
            {{ $t('settings.permissions') }}
          </h2>
        </div>

        <div class="p-6">
          <p class="text-sm text-gray-600 dark:text-gray-400 mb-4">
            {{ $t('settings.permissionsDescription') }}
          </p>

          <ul class="divide-y divide-gray-200 dark:divide-gray-700">
            <li v-for="(scope, index) in profileData.scopes" :key="index" class="py-3">
              <div class="flex items-start">
                <UIcon name="lucide:check-circle" class="h-5 w-5 text-green-500 dark:text-green-400 mt-0.5 mr-3 flex-shrink-0" />
                <div>
                  <div class="text-sm font-medium text-gray-900 dark:text-white">
                    {{ scope }}
                  </div>
                  <div class="text-sm text-gray-500 dark:text-gray-400">
                    {{ getPermissionDescription(scope) }}
                  </div>
                </div>
              </div>
            </li>
          </ul>

          <div class="mt-6 text-xs text-gray-500 dark:text-gray-400">
            {{ $t('settings.permissionsNote') }}
          </div>
        </div>
      </div>

      <!-- Data privacy section -->
      <div class="bg-white dark:bg-gray-800 shadow-md rounded-lg overflow-hidden">
        <div class="px-6 py-5 border-b border-gray-200 dark:border-gray-700">
          <h2 class="text-xl font-medium text-gray-900 dark:text-white">
            {{ $t('settings.dataPrivacy') }}
          </h2>
        </div>

        <div class="p-6">
          <p class="text-sm text-gray-600 dark:text-gray-400">
            {{ $t('settings.dataPrivacyDescription') }}
          </p>

          <ul class="mt-4 space-y-2 text-sm">
            <li class="flex items-start">
              <UIcon name="lucide:info" class="h-5 w-5 text-blue-500 dark:text-blue-400 mt-0.5 mr-2 flex-shrink-0" />
              <span class="text-gray-600 dark:text-gray-300">{{ $t('settings.storesCharacterData') }}</span>
            </li>
            <li class="flex items-start">
              <UIcon name="lucide:info" class="h-5 w-5 text-blue-500 dark:text-blue-400 mt-0.5 mr-2 flex-shrink-0" />
              <span class="text-gray-600 dark:text-gray-300">{{ $t('settings.tokensEncrypted') }}</span>
            </li>
            <li class="flex items-start">
              <UIcon name="lucide:info" class="h-5 w-5 text-blue-500 dark:text-blue-400 mt-0.5 mr-2 flex-shrink-0" />
              <span class="text-gray-600 dark:text-gray-300">{{ $t('settings.removeDataByRevoking') }}</span>
            </li>
          </ul>

          <div class="mt-6">
            <UButton
              color="red"
              size="sm"
              icon="lucide:trash-2"
              @click="isDeleteModalOpen = true"
            >
              {{ $t('settings.deleteData') }}
            </UButton>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- Danger-styled delete confirmation modal -->
  <Teleport to="body">
    <Transition name="modal">
      <div v-if="isDeleteModalOpen" class="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
        <!-- Semi-transparent backdrop -->
        <div class="flex items-end sm:items-center justify-center min-h-full p-4 text-center sm:p-0">
          <!-- Darkened backdrop that's less obtrusive -->
          <div class="fixed inset-0 bg-gray-900 bg-opacity-50 backdrop-blur-sm transition-opacity" aria-hidden="true" @click="isDeleteModalOpen = false"></div>

          <!-- Modal panel with danger styling -->
          <div class="relative bg-white dark:bg-gray-800 rounded-lg text-left overflow-hidden shadow-2xl transform transition-all sm:my-8 sm:max-w-lg sm:w-full border-2 border-red-500 dark:border-red-600">
            <!-- Warning header section -->
            <div class="bg-red-50 dark:bg-red-900/30 px-4 py-3 sm:px-6 border-b-2 border-red-500 dark:border-red-600">
              <div class="sm:flex sm:items-start">
                <div class="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-100 dark:bg-red-800 sm:mx-0 sm:h-10 sm:w-10">
                  <UIcon name="lucide:alert-triangle" class="h-6 w-6 text-red-600 dark:text-red-400" />
                </div>
                <div class="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                  <h3 class="text-lg leading-6 font-bold text-red-700 dark:text-red-400" id="modal-title">
                    {{ $t('settings.deleteAccountConfirmTitle', 'Delete Account Data') }}
                  </h3>
                </div>
              </div>
            </div>

            <!-- Modal body with warning message -->
            <div class="px-4 pt-5 pb-4 sm:p-6">
              <div class="mt-2">
                <p class="text-sm text-gray-600 dark:text-gray-300 mb-4">
                  {{ $t('settings.deleteAccountConfirmMessage', 'Are you sure you want to delete your account data? This action cannot be undone.') }}
                </p>

                <div class="mt-3 p-3 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-md">
                  <div class="flex">
                    <UIcon name="lucide:alert-circle" class="h-5 w-5 text-red-500 dark:text-red-400 mr-2 flex-shrink-0 mt-0.5" />
                    <p class="text-sm text-red-600 dark:text-red-400">
                      {{ $t('settings.permanentActionWarning', 'This will permanently remove all your data from our system, including settings and preferences.') }}
                    </p>
                  </div>
                </div>

                <!-- Error message -->
                <div v-if="deleteError" class="mt-4 p-3 bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 rounded-md text-sm">
                  {{ deleteError }}
                </div>
              </div>
            </div>

            <!-- Modal footer with contrasting buttons -->
            <div class="bg-gray-50 dark:bg-gray-850 px-4 py-4 sm:px-6 sm:flex sm:flex-row-reverse gap-2">
              <UButton
                color="red"
                variant="solid"
                class="w-full sm:w-auto"
                @click="handleDeleteAccount"
                :loading="isDeletingAccount"
                :disabled="isDeletingAccount"
              >
                <UIcon name="lucide:trash-2" class="mr-1" />
                {{ $t('settings.confirmDelete', 'Yes, Delete My Data') }}
              </UButton>
              <UButton
                color="gray"
                variant="outline"
                class="mt-3 w-full sm:mt-0 sm:w-auto"
                @click="isDeleteModalOpen = false"
                :disabled="isDeletingAccount"
              >
                {{ $t('common.cancel') }}
              </UButton>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
/* Enhanced modal transition animations */
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.3s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-active .transform,
.modal-leave-active .transform {
  transition: transform 0.3s ease-out;
}

.modal-enter-from .transform,
.modal-leave-to .transform {
  transform: scale(0.95);
}
</style>
