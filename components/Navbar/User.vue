<script setup lang="ts">
import { computed } from 'vue';
import CustomDropdown from './CustomDropdown.vue';
import { useUserStore } from '~/stores/userStore';

// Props for component
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
    const isSmallScreen = props.isMobileView ||
        (process.client && window.innerWidth < 768); // md breakpoint in Tailwind

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
</script>

<template>
    <!-- Desktop View -->
    <div v-if="!isMobileView" class="navbar-user">
        <div class="hidden md:block">
            <!-- Using dropdown for both logged in and logged out states -->
            <CustomDropdown v-model="isDropdownOpen" :smart-position="true" position="bottom" align="end">
                <template #trigger>
                    <!-- Button to match navbar style -->
                    <UButton color="neutral" variant="ghost" size="sm" class="flex items-center" aria-label="User menu">
                        <!-- Show user icon when not logged in -->
                        <UIcon v-if="!userStore.isAuthenticated" name="lucide:user" class="text-lg" />

                        <!-- Show user avatar or initials when logged in -->
                        <div v-else-if="!characterPortraitUrl"
                            class="w-5 h-5 rounded-lg bg-primary-100 dark:bg-primary-900 flex items-center justify-center text-primary-700 dark:text-primary-300 text-xs font-medium">
                            {{ characterInitials }}
                        </div>
                        <NuxtImg v-else :src="characterPortraitUrl" :alt="userStore.user.characterName"
                            class="w-5 h-5 rounded-lg object-cover" :width="20" :height="20" format="webp" quality="80" />
                    </UButton>
                </template>

                <!-- Desktop Dropdown Content -->
                <div class="py-2 w-56">
                    <!-- Not Logged In Content -->
                    <div v-if="!userStore.isAuthenticated">
                        <!-- EVE SSO Login Button -->
                        <button
                            class="w-full px-4 py-2 flex justify-center items-center hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                            @click="handleEveLogin" :disabled="userStore.isLoading">
                            <div v-if="userStore.isLoading" class="flex items-center justify-center">
                                <UIcon name="lucide:loader" class="animate-spin mr-2" />
                                {{ t('auth.loading', 'Loading...') }}
                            </div>
                            <NuxtImg v-else :src="ssoImageSrc" alt="Login with EVE Online" class="max-w-full h-auto"
                                format="webp" quality="95" />
                        </button>

                        <!-- Error message if any -->
                        <div v-if="userStore.hasError" class="px-4 py-2 text-sm text-red-600 dark:text-red-400">
                            {{ userStore.errorMessage }}
                        </div>

                        <!-- Info message -->
                        <div class="border-t border-gray-100 dark:border-gray-800 my-1 pt-1 opacity-30">
                            <div class="px-4 py-2 text-xs text-gray-400 dark:text-gray-500">
                                {{ t('auth.ssoRequiredForLogin', 'EVE SSO is required for login') }}
                            </div>
                        </div>
                    </div>

                    <!-- Logged In Content -->
                    <template v-else>
                        <!-- User Info Header -->
                        <div class="px-4 py-3 border-b border-gray-100 dark:border-gray-800">
                            <div class="flex flex-col items-center text-center">
                                <!-- Character Portrait -->
                                <NuxtImg v-if="characterPortraitUrl" :src="characterPortraitUrl"
                                    :alt="userStore.user.characterName" class="w-16 h-16 rounded-lg object-cover mb-2"
                                    :width="64" :height="64" format="webp" quality="90" />

                                <div class="font-medium text-sm text-gray-900 dark:text-white mb-1">
                                    {{ userStore.user.characterName }}
                                </div>

                                <!-- Show corporation info if available -->
                                <div v-if="userStore.user.corporationName"
                                    class="text-xs text-gray-500 dark:text-gray-400 flex items-center mt-1 w-full justify-center">
                                    <NuxtImg v-if="corporationLogoUrl" :src="corporationLogoUrl"
                                        :alt="userStore.user.corporationName" class="w-5 h-5 rounded-lg mr-1"
                                        :width="20" :height="20" format="webp" quality="80" />
                                    {{ userStore.user.corporationName }}
                                </div>

                                <!-- Show alliance info if available -->
                                <div v-if="userStore.user.allianceName"
                                    class="text-xs text-gray-500 dark:text-gray-400 flex items-center mt-1 w-full justify-center">
                                    <NuxtImg v-if="allianceLogoUrl" :src="allianceLogoUrl"
                                        :alt="userStore.user.allianceName" class="w-5 h-5 rounded-lg mr-1"
                                        :width="20" :height="20" format="webp" quality="80" />
                                    {{ userStore.user.allianceName }}
                                </div>
                            </div>
                        </div>

                        <!-- Menu Items -->
                        <div class="mt-2">
                            <!-- Admin Panel link - only visible to administrators -->
                            <NuxtLink v-if="userStore.user.administrator" to="/admin"
                                class="block px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                                @click="isDropdownOpen = false">
                                <div class="flex items-center">
                                    <UIcon name="lucide:shield" class="mr-2" />
                                    {{ t('admin.panel', 'Admin Panel') }}
                                </div>
                            </NuxtLink>

                            <NuxtLink to="/user/settings"
                                class="block px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                                @click="isDropdownOpen = false">
                                <div class="flex items-center">
                                    <UIcon name="lucide:settings" class="mr-2" />
                                    {{ t('user.settings') }}
                                </div>
                            </NuxtLink>

                            <!-- Logout Option -->
                            <div class="border-t border-gray-100 dark:border-gray-800 my-1 pt-1">
                                <button
                                    class="w-full text-left px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                                    @click="handleLogout" :disabled="userStore.isLoading">
                                    <div class="flex items-center">
                                        <UIcon :name="userStore.isLoading ? 'lucide:loader' : 'lucide:log-out'"
                                            :class="{ 'animate-spin': userStore.isLoading }" class="mr-2" />
                                        {{ userStore.isLoading ? t('auth.loggingOut', 'Logging out...') :
                                            t('user.logout') }}
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
                <UButton v-if="!userStore.isAuthenticated" color="neutral" variant="ghost" aria-label="User menu"
                    @click="isDropdownOpen = !isDropdownOpen">
                    <UIcon name="lucide:user-circle" class="text-lg" />
                </UButton>

                <!-- Dropdown for small screen header -->
                <div v-if="!userStore.isAuthenticated && isDropdownOpen"
                    class="absolute top-16 right-4 bg-white dark:bg-gray-800 shadow-lg rounded-md py-2 w-48 z-50">
                    <!-- EVE SSO Login Button -->
                    <button
                        class="w-full px-4 py-2 flex justify-center items-center hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                        @click="handleEveLogin" :disabled="userStore.isLoading">
                        <div v-if="userStore.isLoading" class="flex items-center justify-center">
                            <UIcon name="lucide:loader" class="animate-spin mr-2" />
                            {{ t('auth.loading', 'Loading...') }}
                        </div>
                        <NuxtImg v-else :src="ssoImageSrc" alt="Login with EVE Online" class="max-w-full h-auto"
                            format="webp" quality="95" />
                    </button>

                    <!-- Error message -->
                    <div v-if="userStore.hasError" class="px-4 py-2 text-sm text-red-500">
                        {{ userStore.errorMessage }}
                    </div>
                </div>
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
                @click="handleMobileLogin" :disabled="userStore.isLoading">
                <div v-if="userStore.isLoading" class="flex items-center justify-center">
                    <UIcon name="lucide:loader" class="animate-spin mr-2" />
                    {{ t('auth.loading', 'Loading...') }}
                </div>
                <NuxtImg v-else :src="ssoImageSrc" alt="Login with EVE Online" class="max-w-full h-auto"
                    format="webp" quality="95" />
            </button>

            <!-- Error message - Fixed structure -->
            <div v-if="userStore.hasError" class="px-2 py-2 text-sm text-red-500 mb-3">
                {{ userStore.errorMessage }}
            </div>
        </div>

        <!-- Logged in content -->
        <div v-else>
            <!-- User Info Header -->
            <div class="flex flex-col items-center text-center px-2 py-3 mb-3 border-b border-gray-100 dark:border-gray-800">
                <!-- Character Portrait -->
                <NuxtImg v-if="characterPortraitUrl" :src="characterPortraitUrl"
                    :alt="userStore.user.characterName" class="w-16 h-16 rounded-lg object-cover mb-2"
                    :width="64" :height="64" format="webp" quality="90" />
                <div v-else
                    class="w-16 h-16 rounded-lg bg-primary-100 dark:bg-primary-900 flex items-center justify-center text-primary-700 dark:text-primary-300 text-lg font-medium mb-2">
                    {{ characterInitials }}
                </div>

                <!-- Character Name -->
                <div class="font-medium text-base text-gray-900 dark:text-white">
                    {{ userStore.user.characterName }}
                </div>

                <!-- Show corporation info if available -->
                <div v-if="userStore.user.corporationName"
                    class="text-sm text-gray-500 dark:text-gray-400 flex items-center mt-1 w-full justify-center">
                    <NuxtImg v-if="corporationLogoUrl" :src="corporationLogoUrl"
                        :alt="userStore.user.corporationName" class="w-5 h-5 rounded-lg mr-1"
                        :width="20" :height="20" format="webp" quality="80" />
                    {{ userStore.user.corporationName }}
                </div>

                <!-- Show alliance info if available -->
                <div v-if="userStore.user.allianceName"
                    class="text-sm text-gray-500 dark:text-gray-400 flex items-center mt-1 w-full justify-center">
                    <NuxtImg v-if="allianceLogoUrl" :src="allianceLogoUrl"
                        :alt="userStore.user.allianceName" class="w-5 h-5 rounded-lg mr-1"
                        :width="20" :height="20" format="webp" quality="80" />
                    {{ userStore.user.allianceName }}
                </div>
            </div>

            <!-- Menu Items -->
            <div class="space-y-1">
                <!-- Admin Panel link - only visible to administrators -->
                <NuxtLink v-if="userStore.user.administrator" to="/admin"
                    class="block px-2 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700/70 rounded-md transition-colors"
                    @click="emit('loginAction')">
                    <div class="flex items-center">
                        <UIcon name="lucide:shield" class="mr-2" />
                        {{ t('admin.panel', 'Admin Panel') }}
                    </div>
                </NuxtLink>

                <NuxtLink to="/user/settings"
                    class="block px-2 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700/70 rounded-md transition-colors"
                    @click="emit('loginAction')">
                    <div class="flex items-center">
                        <UIcon name="lucide:settings" class="mr-2" />
                        {{ t('user.settings') }}
                    </div>
                </NuxtLink>

                <!-- Logout Option -->
                <div class="border-t border-gray-100 dark:border-gray-800 my-1 pt-1">
                    <button
                        class="w-full text-left px-2 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-700/70 rounded-md transition-colors"
                        @click="handleMobileLogout" :disabled="userStore.isLoading">
                        <div class="flex items-center">
                            <UIcon :name="userStore.isLoading ? 'lucide:loader' : 'lucide:log-out'"
                                :class="{ 'animate-spin': userStore.isLoading }" class="mr-2" />
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

/* Glass effect for containers */
.bg-gray-50\/70, .dark\:bg-gray-800\/50 {
    backdrop-filter: blur(4px);
    -webkit-backdrop-filter: blur(4px);
}

/* Safari fix for backdrop-filter */
@supports not ((backdrop-filter: blur(4px)) or (-webkit-backdrop-filter: blur(4px))) {
    .bg-gray-50\/70 {
        background-color: rgba(249, 250, 251, 0.95) !important;
    }

    :root.dark .dark\:bg-gray-800\/50 {
        background-color: rgba(31, 41, 55, 0.95) !important;
    }
}
</style>
