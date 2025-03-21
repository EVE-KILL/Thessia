<script setup lang="ts">
definePageMeta({
    title: 'Settings',
    layout: 'default',
    requiresAuth: true
});

// Add active tab tracking
const activeTab = ref('esi');

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

// Split permission into parts for better display
const splitPermission = (permission: string) => {
    return permission.split('.');
};

// Handle re-authentication with current scopes
const handleReauthenticate = async () => {
    // Re-authenticate with existing scopes
    const currentScopes = profileData.value?.user?.scopes || [];
    auth.login('/user/settings', Array.isArray(currentScopes) ? currentScopes : [currentScopes]);
};

// Handle re-authentication with default scopes
const handleDefaultScopes = async () => {
    // Re-authenticate with default scopes (let the API handle defaults)
    auth.login('/user/settings');
};

// Handle customized scope selection
const handleCustomizeScopes = () => {
    // Navigate to login page with customize=true parameter
    navigateTo('/user/login?customize=true&redirect=/user/settings');
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

        const { data, error } = await useFetch('/api/auth/logout', {
            method: 'POST'
        });

        if (error.value) {
            deleteError.value = error.value.message || t('settings.deleteError', 'Failed to delete account data');
            return;
        }

        // Reset auth state
        await auth.logout();

        // Close modal first
        isDeleteModalOpen.value = false;

        // Redirect to home page with success message
        router.push('/?deleted=true');
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

// Define all possible permission scopes
const allPermissionScopes = [
    'publicData',
    'esi-killmails.read_killmails.v1',
    'esi-killmails.read_corporation_killmails.v1'
];

// Check if user has a particular scope
const hasScope = (scope: string) => {
    if (!profileData.value?.user?.scopes) return false;

    // The scopes might be an array with a single string containing space-separated scopes
    // or it might be a single string directly
    const scopesArray = profileData.value.user.scopes;
    const scopesString = Array.isArray(scopesArray) ? scopesArray[0] : String(scopesArray);

    // Check if the scope is in the space-separated string
    return scopesString.includes(scope);
};
</script>

<template>
    <div class="mx-auto">
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
                        <UButton color="warning" variant="soft" size="sm" icon="lucide:trash-2" @click="isDeleteModalOpen = true">
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

        <!-- Settings Tabs - Combined into single ESI tab -->
        <UTabs v-else-if="profileData && profileData.authenticated" :items="[
            { label: isMobile ? '' : $t('settings.esi', 'EVE SSO Authentication'), icon: 'lucide:shield', slot: 'esi', defaultSelected: true },
        ]" class="mb-6">
            <!-- ESI Tab (Combined Profile and Permissions) -->
            <template #esi>
                <UCard>
                    <template #header>
                        <div class="flex items-center">
                            <UIcon name="lucide:shield" class="mr-2" />
                            <h3 class="font-semibold text-lg">{{ $t('settings.esi', 'EVE SSO Authentication') }}</h3>
                        </div>
                    </template>

                    <div class="space-y-6">
                        <!-- Authentication Status Panel -->
                        <div class="space-y-4">
                            <!-- Status badges -->
                            <div class="flex items-center justify-between">
                                <div class="font-medium">{{ $t('settings.authenticationStatus') }}</div>
                                <div>
                                    <UBadge color="green" variant="subtle" class="ml-2">
                                        <template #leading>
                                            <UIcon name="lucide:shield-check" class="mr-1" />
                                        </template>
                                        {{ $t('settings.authenticated') }}
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

                            <!-- Token management buttons - Replace existing reauthenticate button with 3 options -->
                            <div class="flex flex-wrap gap-2 mt-4">
                                <UTooltip text="Re-authenticate with current permissions">
                                    <UButton color="primary" size="sm" icon="lucide:refresh-cw" @click="handleReauthenticate">
                                        {{ $t('settings.reauthenticate') }}
                                    </UButton>
                                </UTooltip>

                                <UTooltip text="Re-authenticate with all default permissions">
                                    <UButton color="secondary" size="sm" icon="lucide:shield" @click="handleDefaultScopes">
                                        {{ $t('settings.defaultScopes', 'Default Scopes') }}
                                    </UButton>
                                </UTooltip>

                                <UTooltip text="Choose which permissions to grant">
                                    <UButton color="gray" size="sm" icon="lucide:settings" @click="handleCustomizeScopes">
                                        {{ $t('settings.customizeScopes', 'Customize Scopes') }}
                                    </UButton>
                                </UTooltip>
                            </div>
                        </div>

                        <!-- Permissions Section -->
                        <div class="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
                            <h4 class="font-semibold text-lg mb-4">{{ $t('user.permissions') }}</h4>

                            <p class="text-sm text-gray-600 dark:text-gray-400 mb-4">
                                {{ $t('settings.permissionsDescription') }}
                            </p>

                            <!-- Improved Permission list with permission status -->
                            <div class="grid grid-cols-1 gap-4">
                                <div v-for="(scope, index) in allPermissionScopes" :key="index"
                                    class="p-4 bg-gray-50 dark:bg-gray-800 rounded-md">

                                    <div class="flex items-start">
                                        <!-- Show checkmark or X based on if the user has the permission -->
                                        <UIcon v-if="hasScope(scope)" name="lucide:check"
                                            class="h-5 w-5 text-green-500 dark:text-green-400 mt-0.5 mr-2 flex-shrink-0" />
                                        <UIcon v-else name="lucide:x"
                                            class="h-5 w-5 text-red-500 dark:text-red-400 mt-0.5 mr-2 flex-shrink-0" />

                                        <div class="w-full">
                                            <!-- Display the permission name -->
                                            <div class="font-medium text-sm mb-1"
                                                 :class="hasScope(scope) ? 'text-primary-600 dark:text-primary-400' : 'text-gray-500 dark:text-gray-400'">
                                                <code class="bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded text-sm">
                                                    {{ scope }}
                                                </code>
                                            </div>

                                            <!-- Permission description -->
                                            <div class="mt-2 text-sm text-gray-600 dark:text-gray-300 pl-2 border-l-2 border-gray-200 dark:border-gray-700">
                                                {{ getPermissionDescription(scope) }}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <UAlert color="blue" variant="soft" icon="lucide:info" class="mt-4"
                                :title="$t('settings.permissionsNote')" />
                        </div>
                    </div>
                </UCard>
            </template>
        </UTabs>
    </div>
</template>
