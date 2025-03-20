<script setup lang="ts">
definePageMeta({
    title: 'Settings',
    layout: 'default',
    requiresAuth: true
});

// Add active tab tracking
const activeTab = ref('profile');

const auth = useAuth();
const { t } = useI18n();
const router = useRouter();

// Get user profile data directly from auth/me
const { data: profileData, pending, error, refresh } = await useFetch('/api/auth/me');

// Format expiration date
const formattedExpirationDate = computed(() => {
    if (!profileData.value?.user?.dateExpiration) return '';

    const date = new Date(profileData.value.user.dateExpiration);
    return new Intl.DateTimeFormat(undefined, {
        dateStyle: 'medium',
        timeStyle: 'short',
        timeZone: 'UTC',
        hour12: false
    }).format(date) + ' UTC';
});

// Calculate if token will expire soon (within 48 hours)
const tokenExpiresSoon = computed(() => {
    if (!profileData.value?.user?.dateExpiration) return false;

    const expirationDate = new Date(profileData.value.user.dateExpiration);
    const now = new Date();
    const hoursDiff = (expirationDate.getTime() - now.getTime()) / (1000 * 60 * 60);

    return hoursDiff < 48;
});

// Handle logout
const handleLogout = async () => {
    await auth.logout();
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
    try {
        const { data, error } = await useFetch('/api/auth/refresh', {
            method: 'POST'
        });

        if (error.value) {
            throw new Error(error.value.message);
        }

        // Refresh auth state and profile data
        await auth.checkAuth();
        await refresh();
    } catch (err) {
        console.debug('Error refreshing token:', err);
    }
};

// Handle re-authentication
const handleReauthenticate = async () => {
    auth.login('/user/settings');
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
            // Reset auth state
            await auth.logout();

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

// Check if we're on mobile
const isMobile = ref(false);

onMounted(() => {
    checkIfMobile();
    window.addEventListener('resize', checkIfMobile);
});

onUnmounted(() => {
    window.removeEventListener('resize', checkIfMobile);
});

// Check if we're on mobile
const checkIfMobile = () => {
    isMobile.value = window.innerWidth < 768;
};
</script>

<template>
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <!-- Profile Header with Character Info -->
        <div
            class="mb-6 bg-gradient-to-r from-primary-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 rounded-lg p-4 sm:p-6">
            <div class="flex flex-col sm:flex-row items-center sm:items-start gap-4">
                <!-- Character Avatar -->
                <div class="relative">
                    <div class="w-20 h-20 sm:w-24 sm:h-24 rounded-lg overflow-hidden shadow-lg">
                        <NuxtLink
                            v-if="auth.user.value.characterId"
                            :to="`/characters/${auth.user.value.characterId}`"
                            class="block w-full h-full">
                            <EveImage
                                type="character"
                                :id="auth.user.value.characterId"
                                :alt="auth.user.value.characterName"
                                :size="128"
                                class="w-full h-full"
                                :quality="90"
                            />
                        </NuxtLink>
                    </div>

                    <!-- Admin badge for admin users -->
                    <UBadge v-if="auth.user.value.administrator" color="error" variant="solid"
                        class="absolute -bottom-1 -right-1">
                        {{ $t('user.administrator', 'Admin') }}
                    </UBadge>
                </div>

                <!-- Character Info -->
                <div class="text-center sm:text-left flex-1">
                    <h1 class="text-2xl font-bold text-gray-900 dark:text-white">
                        <NuxtLink
                            :to="`/characters/${auth.user.value.characterId}`"
                            class="hover:underline">
                            {{ auth.user.value.characterName }}
                        </NuxtLink>
                    </h1>

                    <div class="flex flex-wrap items-center justify-center sm:justify-start gap-x-4 mt-2">
                        <!-- Corporation info -->
                        <NuxtLink v-if="auth.user.value.corporationName" class="flex items-center hover:underline"
                            :to="`/corporations/${auth.user.value.corporationId}`"
                            :class="auth.user.value.allianceName ? 'text-gray-700 dark:text-gray-300' : 'hidden'">
                            <EveImage
                                type="corporation"
                                :id="auth.user.value.corporationId"
                                :alt="auth.user.value.corporationName"
                                :size="20"
                                class="w-5 h-5 mr-1"
                            />
                            <span class="text-sm text-gray-700 dark:text-gray-300">
                                {{ auth.user.value.corporationName }}
                            </span>
                        </NuxtLink>

                        <!-- Alliance info -->
                        <NuxtLink v-if="auth.user.value.allianceId" :to="`/alliances/${auth.user.value.allianceId}`"
                            class="flex items-center hover:underline"
                            :class="auth.user.value.allianceName ? 'text-gray-700 dark:text-gray-300' : 'hidden'">
                            <EveImage
                                type="alliance"
                                :id="auth.user.value.allianceId"
                                :alt="auth.user.value.allianceName"
                                :size="20"
                                class="w-5 h-5 mr-1"
                            />
                            <span class="text-sm text-gray-700 dark:text-gray-300">
                                {{ auth.user.value.allianceName }}
                            </span>
                        </NuxtLink>
                    </div>
                </div>

                <!-- Quick Actions Buttons -->
                <div class="flex flex-col gap-2">
                    <UButton color="secondary" variant="soft" size="sm" icon="lucide:log-out" @click="handleLogout">
                        {{ $t('user.logout') }}
                    </UButton>

                    <!-- Delete Account Modal -->
                    <UModal v-model="isDeleteModalOpen">
                        <!-- Delete button that triggers modal -->
                        <UButton color="warning" variant="soft" size="sm" icon="lucide:trash-2">
                            {{ $t('settings.deleteData') }}
                        </UButton>

                        <template #content>
                            <UCard :ui="{ ring: '', divide: 'divide-y divide-gray-100 dark:divide-gray-800' }">
                                <template #header>
                                    <div class="flex items-center gap-2 text-red-500 dark:text-red-400">
                                        <UIcon name="lucide:alert-triangle" class="h-5 w-5" />
                                        <h3 class="text-lg font-semibold">{{ $t('settings.deleteAccountConfirmTitle') }}
                                        </h3>
                                    </div>
                                </template>

                                <div class="space-y-4">
                                    <p class="text-sm text-gray-600 dark:text-gray-300">
                                        {{ $t('settings.deleteAccountConfirmMessage') }}
                                    </p>

                                    <UAlert color="warning" icon="lucide:alert-circle" variant="soft"
                                        :title="$t('settings.permanentActionWarning')" />

                                    <UAlert v-if="deleteError" color="warning" :description="deleteError" />
                                </div>

                                <template #footer>
                                    <div class="flex justify-between gap-3">
                                        <UButton color="warning" icon="lucide:trash-2" :loading="isDeletingAccount"
                                            :disabled="isDeletingAccount" @click="handleDeleteAccount">
                                            {{ $t('settings.confirmDelete') }}
                                        </UButton>
                                    </div>
                                </template>
                            </UCard>
                        </template>
                    </UModal>
                </div>
            </div>
        </div>

        <!-- Error Alert -->
        <UAlert v-if="error" color="red" icon="lucide:alert-circle" :title="$t('common.error')"
            :description="error.message">
            <template #actions>
                <UButton size="sm" @click="refresh">{{ $t('common.tryAgain') }}</UButton>
            </template>
        </UAlert>

        <!-- Settings Tabs -->
        <UTabs v-else-if="profileData && profileData.authenticated" :items="[
            { label: isMobile ? '' : $t('user.profile'), icon: 'lucide:user', slot: 'profile', defaultSelected: true },
            { label: isMobile ? '' : $t('user.permissions'), icon: 'lucide:shield', slot: 'permissions' },
            { label: isMobile ? '' : $t('settings.dataPrivacy'), icon: 'lucide:lock', slot: 'privacy' },
        ]" class="mb-6">
            <!-- Account Tab -->
            <template #profile>
                <UCard>
                    <template #header>
                        <div class="flex items-center">
                            <UIcon name="lucide:user" class="mr-2" />
                            <h2 class="text-xl font-semibold">{{ $t('settings.accountSettings') }}</h2>
                        </div>
                    </template>

                    <!-- Authentication Status Panel -->
                    <div class="space-y-4">
                        <!-- Status badges -->
                        <div class="flex items-center justify-between">
                            <div class="font-medium">{{ $t('settings.authenticationStatus') }}</div>
                            <div>
                                <UBadge v-if="!tokenExpiresSoon" color="green" variant="subtle" class="ml-2">
                                    <template #leading>
                                        <UIcon name="lucide:shield-check" class="mr-1" />
                                    </template>
                                    {{ $t('settings.authenticated') }}
                                </UBadge>
                                <UBadge v-else color="amber" variant="subtle" class="ml-2">
                                    <template #leading>
                                        <UIcon name="lucide:clock" class="mr-1" />
                                    </template>
                                    {{ $t('settings.expiringToken') }}
                                </UBadge>
                            </div>
                        </div>

                        <!-- Expiration information -->
                        <div class="p-3 bg-gray-50 dark:bg-gray-800 rounded-md">
                            <div class="flex items-center justify-between">
                                <div class="text-sm font-medium">{{ $t('user.tokenExpires') }}</div>
                                <div class="text-sm font-mono">{{ formattedExpirationDate }}</div>
                            </div>
                        </div>

                        <!-- Token management buttons -->
                        <div class="flex flex-wrap gap-2 mt-4">
                            <UTooltip text="Silently refresh your authentication token">
                                <UButton color="primary" size="sm" icon="lucide:refresh-cw" @click="handleRefreshToken">
                                    {{ $t('settings.refreshToken') }}
                                </UButton>
                            </UTooltip>

                            <UTooltip text="Re-authenticate through EVE SSO">
                                <UButton color="gray" size="sm" icon="lucide:log-in" @click="handleReauthenticate">
                                    {{ $t('settings.reauthenticate') }}
                                </UButton>
                            </UTooltip>
                        </div>
                    </div>
                </UCard>
            </template>

            <!-- Permissions Tab -->
            <template #permissions>
                <UCard>
                    <template #header>
                        <div class="flex items-center">
                            <UIcon name="lucide:shield" class="mr-2" />
                            <h3 class="font-semibold text-lg">{{ $t('settings.permissions') }}</h3>
                        </div>
                    </template>

                    <div class="space-y-4">
                        <p class="text-sm text-gray-600 dark:text-gray-400">
                            {{ $t('settings.permissionsDescription') }}
                        </p>

                        <!-- Permission list with description -->
                        <div class="space-y-2">
                            <div v-for="(scope, index) in profileData.user.scopes" :key="index"
                                class="p-3 bg-gray-50 dark:bg-gray-800 rounded-md">
                                <div class="flex items-start">
                                    <UIcon name="lucide:check"
                                        class="h-5 w-5 text-green-500 dark:text-green-400 mt-0.5 mr-2 flex-shrink-0" />
                                    <div>
                                        <div class="font-medium text-sm text-primary-600 dark:text-primary-400">
                                            {{ scope }}
                                        </div>
                                        <div class="text-sm text-gray-600 dark:text-gray-300 mt-0.5">
                                            {{ getPermissionDescription(scope) }}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <UAlert color="blue" variant="soft" icon="lucide:info"
                            :title="$t('settings.permissionsNote')" />
                    </div>
                </UCard>
            </template>

            <!-- Data Privacy Tab - Modified to remove duplicate delete button -->
            <template #privacy>
                <UCard>
                    <template #header>
                        <div class="flex items-center">
                            <UIcon name="lucide:lock" class="mr-2" />
                            <h3 class="font-semibold text-lg">{{ $t('settings.dataPrivacy') }}</h3>
                        </div>
                    </template>

                    <div class="space-y-4">
                        <p class="text-sm text-gray-600 dark:text-gray-400">
                            {{ $t('settings.dataPrivacyDescription') }}
                        </p>

                        <!-- Data privacy details -->
                        <div class="grid grid-cols-1 gap-3">
                            <div class="p-3 bg-gray-50 dark:bg-gray-800 rounded-md flex items-start">
                                <UIcon name="lucide:database"
                                    class="h-5 w-5 text-blue-500 dark:text-blue-400 mt-0.5 mr-2 flex-shrink-0" />
                                <span class="text-sm">{{ $t('settings.storesCharacterData') }}</span>
                            </div>

                            <div class="p-3 bg-gray-50 dark:bg-gray-800 rounded-md flex items-start">
                                <UIcon name="lucide:shield"
                                    class="h-5 w-5 text-blue-500 dark:text-blue-400 mt-0.5 mr-2 flex-shrink-0" />
                                <span class="text-sm">{{ $t('settings.tokensEncrypted') }}</span>
                            </div>

                            <div class="p-3 bg-gray-50 dark:bg-gray-800 rounded-md flex items-start">
                                <UIcon name="lucide:key"
                                    class="h-5 w-5 text-blue-500 dark:text-blue-400 mt-0.5 mr-2 flex-shrink-0" />
                                <span class="text-sm">{{ $t('settings.removeDataByRevoking') }}</span>
                            </div>
                        </div>

                        <!-- Information about data deletion - keep this but remove the button -->
                        <UAlert color="gray" icon="lucide:info" :description="$t('settings.permanentActionWarning')" />

                        <p class="text-sm text-gray-600 dark:text-gray-400">
                            {{ $t('settings.deleteAccountConfirmMessage') }}
                        </p>
                    </div>
                </UCard>
            </template>
        </UTabs>
    </div>
</template>
