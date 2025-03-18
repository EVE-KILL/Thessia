<script setup lang="ts">
import { useUserStore } from '~/stores/userStore';

definePageMeta({
  title: 'Profile',
  layout: 'default',
  requiresAuth: true
});

const userStore = useUserStore();
const { t } = useI18n();

// Get user profile data
const { data: profileData, pending, error, refresh } = await useFetch('/api/user/profile');

// Character portrait URL from EVE Image Server
const characterPortraitUrl = computed(() => {
  if (!userStore.user.characterId) return null;
  return `https://images.evetech.net/characters/${userStore.user.characterId}/portrait?size=256`;
});
</script>

<template>
  <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
    <div class="mb-8">
      <h1 class="text-3xl font-bold text-gray-900 dark:text-white">
        {{ $t('user.profile') }}
      </h1>
      <p class="mt-2 text-sm text-gray-600 dark:text-gray-400">
        {{ $t('user.profileDescription') }}
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

    <!-- Profile content -->
    <div v-else-if="profileData" class="bg-white dark:bg-gray-800 shadow-md rounded-lg overflow-hidden">
      <div class="md:flex">
        <!-- Character portrait section -->
        <div class="md:w-1/3 p-6 flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-900">
          <img
            v-if="characterPortraitUrl"
            :src="characterPortraitUrl"
            :alt="profileData.characterName"
            class="w-40 h-40 rounded-full object-cover shadow-lg"
          />
          <div v-else class="w-40 h-40 rounded-full bg-primary-100 dark:bg-primary-900 flex items-center justify-center text-primary-700 dark:text-primary-300 text-4xl font-medium">
            {{ profileData.characterName.substring(0, 2).toUpperCase() }}
          </div>

          <h2 class="mt-4 text-xl font-bold text-gray-900 dark:text-white text-center">
            {{ profileData.characterName }}
          </h2>
          <p class="text-sm text-gray-500 dark:text-gray-400 text-center">
            EVE Online Character
          </p>
        </div>

        <!-- Character details section -->
        <div class="md:w-2/3 p-6">
          <h3 class="text-lg font-medium text-gray-900 dark:text-white mb-4">
            {{ $t('user.characterDetails') }}
          </h3>

          <dl class="space-y-4">
            <div>
              <dt class="text-sm font-medium text-gray-500 dark:text-gray-400">
                {{ $t('user.characterId') }}
              </dt>
              <dd class="mt-1 text-sm text-gray-900 dark:text-white">
                {{ profileData.characterId }}
              </dd>
            </div>

            <div>
              <dt class="text-sm font-medium text-gray-500 dark:text-gray-400">
                {{ $t('user.registeredSince') }}
              </dt>
              <dd class="mt-1 text-sm text-gray-900 dark:text-white">
                {{ new Date(profileData.createdAt).toLocaleString() }}
              </dd>
            </div>

            <div>
              <dt class="text-sm font-medium text-gray-500 dark:text-gray-400">
                {{ $t('user.tokenExpires') }}
              </dt>
              <dd class="mt-1 text-sm text-gray-900 dark:text-white">
                {{ new Date(profileData.dateExpiration).toLocaleString() }}
              </dd>
            </div>

            <div>
              <dt class="text-sm font-medium text-gray-500 dark:text-gray-400">
                {{ $t('user.permissions') }}
              </dt>
              <dd class="mt-1 space-y-1">
                <div v-for="(scope, index) in profileData.scopes" :key="index" class="flex items-center">
                  <UIcon name="lucide:check-circle" class="h-4 w-4 text-green-500 dark:text-green-400 mr-2" />
                  <span class="text-sm text-gray-900 dark:text-white">{{ scope }}</span>
                </div>
              </dd>
            </div>
          </dl>
        </div>
      </div>

      <div class="px-6 py-4 bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700">
        <div class="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
          <div class="text-sm text-gray-500 dark:text-gray-400">
            {{ $t('user.needHelp') }}
          </div>
          <UButton color="red" @click="userStore.logout">
            {{ $t('user.logout') }}
          </UButton>
        </div>
      </div>
    </div>
  </div>
</template>
