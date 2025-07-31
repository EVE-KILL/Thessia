<script setup lang="ts">
import { computed, nextTick, onMounted } from "vue";

// Component props
const props = defineProps({
    isMobileView: {
        type: Boolean,
        default: false,
    },
});

// Composables
const { t } = useI18n();
const colorMode = useColorMode();
const auth = useAuth();

// UI state
const isDropdownOpen = ref(false);
const killmailDelay = ref(0); // Hours delay for killmails (0-72)

// Initialize authentication state
onMounted(() => {
    nextTick(async () => {
        await auth.checkAuth();
    });
});

// Auth handlers
const handleEveLogin = () => {
    const currentPath = window.location.pathname;
    auth.login(currentPath, undefined, killmailDelay.value);
    isDropdownOpen.value = false;
};

const handleBasicLogin = () => {
    const currentPath = window.location.pathname;
    auth.login(currentPath, ["publicData"]);
    isDropdownOpen.value = false;
};

const handleLogout = () => {
    auth.logout();
    isDropdownOpen.value = false;
};

const handleCustomizeLogin = () => {
    const currentPath = window.location.pathname;
    const delayParam = killmailDelay.value > 0 ? `&delay=${killmailDelay.value}` : '';
    navigateTo(`/user/login?customize=true&redirect=${encodeURIComponent(currentPath)}${delayParam}`);
    isDropdownOpen.value = false;
};

// Computed properties for delay display
const delayText = computed(() => {
    if (killmailDelay.value === 0) {
        return t('killmail.delay.instant', 'Instant (no delay)');
    } else if (killmailDelay.value === 1) {
        return t('killmail.delay.oneHour', '1 hour delay');
    } else {
        return `${killmailDelay.value} ${t('killmail.delay.hoursUnit', 'hours delay')}`;
    }
});

// SSO image configuration
const SSO_IMAGES = {
    light: {
        large: "/images/sso-light-large.png",
        small: "/images/sso-light-small.png",
    },
    dark: {
        large: "/images/sso-dark-large.png",
        small: "/images/sso-dark-small.png",
    },
};

// Image source based on theme and viewport size
const ssoImageSrc = computed(() => {
    const theme = colorMode.value === "dark" ? "light" : "dark";
    const size = props.isMobileView ? "small" : "large";
    return SSO_IMAGES[theme][size];
});

// Image dimensions for consistent sizing
const ssoImageDimensions = computed(() => {
    return props.isMobileView ? { width: 195, height: 30 } : { width: 270, height: 45 };
});
</script>

<template>
    <!-- Desktop View -->
    <div v-if="!isMobileView" class="navbar-user">
        <div class="hidden md:block">
            <!-- User dropdown menu -->
            <Dropdown v-model="isDropdownOpen" :smart-position="true" position="bottom" align="end">
                <template #trigger>
                    <UButton color="neutral" variant="ghost" size="sm" class="flex items-center" aria-label="User menu">
                        <UIcon v-if="!auth.isAuthenticated.value" name="lucide:user" class="text-lg" />
                        <Image v-else type="character" :id="auth.user.value.characterId"
                            :alt="auth.user.value.characterName" :size="20" class="w-5 h-5" />
                    </UButton>
                </template>

                <!-- Dropdown Content -->
                <div class="py-2 w-64">
                    <!-- Not Logged In Content -->
                    <div v-if="!auth.isAuthenticated.value">
                        <!-- Basic Login Section -->
                        <div class="px-4 py-2">
                            <h3 class="text-sm font-medium text-gray-900 dark:text-white mb-2">{{ t('auth.basicLogin',
                                'Basic Login') }}
                            </h3>
                            <button
                                class="w-full px-3 py-2 flex justify-center items-center hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors rounded-md"
                                @click="handleBasicLogin" :disabled="auth.isLoading.value">
                                <div v-if="auth.isLoading.value" class="flex items-center justify-center">
                                    <UIcon name="lucide:loader" class="animate-spin mr-2" />
                                    {{ t('auth.loading', 'Loading...') }}
                                </div>
                                <NuxtImg v-else :src="ssoImageSrc" alt="Basic Login with EVE Online"
                                    class="sso-image w-full h-auto" :width="ssoImageDimensions.width"
                                    :height="ssoImageDimensions.height" format="webp" quality="95" />
                            </button>
                            <div class="text-xs text-gray-500 dark:text-gray-400 text-center mt-1">
                                {{ t('auth.basicLoginInfo', 'Basic login with publicData only') }}
                            </div>
                        </div>

                        <!-- Divider -->
                        <div class="border-t border-gray-100 dark:border-gray-800 my-2"></div>

                        <!-- Killmail Login Section -->
                        <div class="px-4 py-2">
                            <h3 class="text-sm font-medium text-gray-900 dark:text-white mb-2">
                                {{ t('auth.killmailLogin') }}
                            </h3>
                            <button
                                class="w-full px-3 py-2 flex justify-center items-center hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors rounded-md"
                                @click="handleEveLogin" :disabled="auth.isLoading.value">
                                <div v-if="auth.isLoading.value" class="flex items-center justify-center">
                                    <UIcon name="lucide:loader" class="animate-spin mr-2" />
                                    {{ t('auth.loading', 'Loading...') }}
                                </div>
                                <NuxtImg v-else :src="ssoImageSrc" alt="Killmail Login with EVE Online"
                                    class="sso-image w-full h-auto" :width="ssoImageDimensions.width"
                                    :height="ssoImageDimensions.height" format="webp" quality="95" />
                            </button>
                            <div class="text-xs text-gray-500 dark:text-gray-400 text-center mt-1">
                                {{ t('auth.killmailLoginInfo', 'For accessing private and corporation killmails') }}
                            </div>

                            <!-- Killmail Delay Slider -->
                            <div class="mt-3 pt-2 border-t border-gray-100 dark:border-gray-700">
                                <label class="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    {{ t('killmail.delay.label', 'Killmail Delay') }}
                                </label>
                                <div class="space-y-2">
                                    <USlider v-model="killmailDelay" :default-value="0" :min="0" :max="72" :step="1"
                                        class="w-full" />
                                    <div class="flex justify-between text-xs text-gray-500 dark:text-gray-400">
                                        <span>0h</span>
                                        <span class="font-medium text-gray-700 dark:text-gray-300">{{ delayText
                                        }}</span>
                                        <span>72h</span>
                                    </div>
                                </div>
                                <div class="text-xs text-gray-500 dark:text-gray-400 text-center mt-1">
                                    {{ t('killmail.delay.description') }}
                                </div>
                                <div class="text-center mt-2">
                                    <NuxtLink to="/faq#killmail-delay"
                                        class="text-xs text-blue-500 hover:text-blue-400 dark:text-blue-400 dark:hover:text-blue-300 underline"
                                        @click="isDropdownOpen = false">
                                        {{ t('killmail.delay.learnMore', 'Learn more about killmail delays') }}
                                    </NuxtLink>
                                </div>
                            </div>
                        </div>

                        <!-- Divider -->
                        <div class="border-t border-gray-100 dark:border-gray-800 my-2"></div>

                        <!-- Customize Scopes Section -->
                        <div class="px-4 py-2">
                            <button
                                class="w-full px-3 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-left rounded-md border border-gray-200 dark:border-gray-600"
                                @click="handleCustomizeLogin">
                                <div class="flex items-center justify-center">
                                    <UIcon name="lucide:settings" class="mr-2" />
                                    {{ t('auth.customizeScopes', 'Customize Login Scopes') }}
                                </div>
                            </button>
                        </div>

                        <div v-if="auth.hasError.value" class="px-4 py-2 text-sm text-red-600 dark:text-red-400">
                            {{ auth.errorMessage.value }}
                        </div>
                    </div>

                    <!-- Logged In Content -->
                    <template v-else>
                        <!-- User Profile -->
                        <div class="px-4 py-3 border-b border-gray-100 dark:border-gray-800">
                            <div class="flex flex-col items-center text-center">
                                <Image type="character" :id="auth.user.value.characterId"
                                    :alt="auth.user.value.characterName" :size="64" class="w-16 h-16 mb-2" />

                                <div class="font-medium text-sm text-gray-900 dark:text-white mb-1">
                                    {{ auth.user.value.characterName }}
                                </div>

                                <div v-if="auth.user.value.corporationName"
                                    class="text-xs text-gray-500 dark:text-gray-400 flex items-center mt-1 w-full justify-center">
                                    <Image type="corporation" :id="auth.user.value.corporationId"
                                        :alt="auth.user.value.corporationName" :size="20" class="w-5 h-5 mr-1" />
                                    {{ auth.user.value.corporationName }}
                                </div>

                                <div v-if="auth.user.value.allianceName"
                                    class="text-xs text-gray-500 dark:text-gray-400 flex items-center mt-1 w-full justify-center">
                                    <Image type="alliance" :id="auth.user.value.allianceId"
                                        :alt="auth.user.value.allianceName" :size="20" class="w-5 h-5 mr-1" />
                                    {{ auth.user.value.allianceName }}
                                </div>
                            </div>
                        </div>

                        <!-- Navigation Links -->
                        <div class="mt-2">
                            <NuxtLink v-if="auth.user.value.administrator" to="/admin"
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

                            <!-- Logout Button -->
                            <div class="border-t border-gray-100 dark:border-gray-800 my-1 pt-1">
                                <button
                                    class="w-full text-left px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                                    @click="handleLogout" :disabled="auth.isLoading.value">
                                    <div class="flex items-center">
                                        <UIcon :name="auth.isLoading.value ? 'lucide:loader' : 'lucide:log-out'"
                                            :class="{ 'animate-spin': auth.isLoading.value }" class="mr-2" />
                                        {{ auth.isLoading.value ? t('auth.loggingOut', 'Logging out...') :
                                            t('user.logout') }}
                                    </div>
                                </button>
                            </div>
                        </div>
                    </template>
                </div>
            </Dropdown>
        </div>

        <!-- Mobile Header Dropdown -->
        <div class="md:hidden">
            <div class="flex items-center">
                <UButton v-if="!auth.isAuthenticated.value" color="neutral" variant="ghost" aria-label="User menu"
                    @click="isDropdownOpen = !isDropdownOpen">
                    <UIcon name="lucide:user-circle" class="text-lg" />
                </UButton>

                <div v-if="!auth.isAuthenticated.value && isDropdownOpen"
                    class="absolute top-16 right-4 bg-white dark:bg-gray-800 shadow-lg rounded-md py-2 w-56 z-50">
                    <!-- Basic Login Section -->
                    <div class="px-3 py-2">
                        <h3 class="text-sm font-medium text-gray-900 dark:text-white mb-2">
                            {{ t('auth.basicLogin') }}
                        </h3>
                        <button
                            class="w-full px-2 py-2 flex justify-center items-center hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors rounded-md"
                            @click="handleBasicLogin" :disabled="auth.isLoading.value">
                            <div v-if="auth.isLoading.value" class="flex items-center justify-center">
                                <UIcon name="lucide:loader" class="animate-spin mr-2" />
                                {{ t('auth.loading', 'Loading...') }}
                            </div>
                            <NuxtImg v-else :src="ssoImageSrc" alt="Basic Login with EVE Online"
                                class="sso-image w-full h-auto" :width="ssoImageDimensions.width"
                                :height="ssoImageDimensions.height" format="webp" quality="95" />
                        </button>
                        <div class="text-xs text-gray-500 dark:text-gray-400 text-center mt-1">
                            {{ t('auth.basicLoginInfo', 'Basic login with publicData only') }}
                        </div>
                    </div>

                    <!-- Divider -->
                    <div class="border-t border-gray-100 dark:border-gray-800 my-2"></div>

                    <!-- Killmail Login Section -->
                    <div class="px-3 py-2">
                        <h3 class="text-sm font-medium text-gray-900 dark:text-white mb-2">
                            {{ t('auth.killmailLogin') }}
                        </h3>
                        <button
                            class="w-full px-2 py-2 flex justify-center items-center hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors rounded-md"
                            @click="handleEveLogin" :disabled="auth.isLoading.value">
                            <div v-if="auth.isLoading.value" class="flex items-center justify-center">
                                <UIcon name="lucide:loader" class="animate-spin mr-2" />
                                {{ t('auth.loading', 'Loading...') }}
                            </div>
                            <NuxtImg v-else :src="ssoImageSrc" alt="Killmail Login with EVE Online"
                                class="sso-image w-full h-auto" :width="ssoImageDimensions.width"
                                :height="ssoImageDimensions.height" format="webp" quality="95" />
                        </button>
                        <div class="text-xs text-gray-500 dark:text-gray-400 text-center mt-1">
                            {{ t('auth.killmailLoginInfo', 'For private and corporation killmails') }}
                        </div>

                        <!-- Killmail Delay Slider -->
                        <div class="mt-3 pt-2 border-t border-gray-100 dark:border-gray-700">
                            <label class="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
                                {{ t('killmail.delay.label', 'Killmail Delay') }}
                            </label>
                            <div class="space-y-2">
                                <USlider v-model="killmailDelay" :default-value="0" :min="0" :max="72" :step="1"
                                    class="w-full" />
                                <div class="flex justify-between text-xs text-gray-500 dark:text-gray-400">
                                    <span>0h</span>
                                    <span class="font-medium text-gray-700 dark:text-gray-300">{{ delayText }}</span>
                                    <span>72h</span>
                                </div>
                            </div>
                            <div class="text-xs text-gray-500 dark:text-gray-400 text-center mt-1">
                                {{ t('killmail.delay.description', 'Delay killmails to prevent instant leaks') }}
                            </div>
                            <div class="text-center mt-2">
                                <NuxtLink to="/faq#killmail-delay"
                                    class="text-xs text-blue-500 hover:text-blue-400 dark:text-blue-400 dark:hover:text-blue-300 underline"
                                    @click="isDropdownOpen = false">
                                    {{ t('killmail.delay.learnMore', 'Learn more about killmail delays') }}
                                </NuxtLink>
                            </div>
                        </div>
                    </div>

                    <!-- Divider -->
                    <div class="border-t border-gray-100 dark:border-gray-800 my-2"></div>

                    <!-- Customize Scopes -->
                    <div class="px-3 py-2">
                        <button
                            class="w-full px-2 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-left rounded-md border border-gray-200 dark:border-gray-600"
                            @click="handleCustomizeLogin">
                            <div class="flex items-center justify-center">
                                <UIcon name="lucide:settings" class="mr-2" />
                                {{ t('auth.customizeScopes', 'Customize Login') }}
                            </div>
                        </button>
                    </div>

                    <div v-if="auth.hasError.value" class="px-4 py-2 text-sm text-red-500">
                        {{ auth.errorMessage.value }}
                    </div>
                </div>
            </div>
        </div>
    </div>

    <!-- Mobile Fullscreen Menu View -->
    <div v-else class="p-4 bg-gray-50/70 dark:bg-gray-800/50 rounded-lg shadow-sm">
        <!-- Not logged in content -->
        <div v-if="!auth.isAuthenticated.value">
            <!-- Basic Login Section -->
            <div class="mb-4">
                <h3 class="text-sm font-medium text-gray-900 dark:text-white mb-3">
                    {{ t('auth.basicLogin') }}
                </h3>
                <button
                    class="w-full mb-2 px-4 py-3 flex justify-center items-center hover:bg-gray-100 dark:hover:bg-gray-700/70 transition-colors rounded-md"
                    @click="handleBasicLogin" :disabled="auth.isLoading.value">
                    <div v-if="auth.isLoading.value" class="flex items-center justify-center">
                        <UIcon name="lucide:loader" class="animate-spin mr-2" />
                        {{ t('auth.loading', 'Loading...') }}
                    </div>
                    <NuxtImg v-else :src="ssoImageSrc" alt="Basic Login with EVE Online" class="sso-image w-full h-auto"
                        :width="ssoImageDimensions.width" :height="ssoImageDimensions.height" format="webp"
                        quality="95" />
                </button>
                <div class="text-xs text-gray-500 dark:text-gray-400 text-center">
                    {{ t('auth.basicLoginInfo', 'Basic login with publicData only') }}
                </div>
            </div>

            <!-- Divider -->
            <div class="border-t border-gray-100 dark:border-gray-800 my-4"></div>

            <!-- Killmail Login Section -->
            <div class="mb-4">
                <h3 class="text-sm font-medium text-gray-900 dark:text-white mb-3">
                    {{ t('auth.killmailLogin') }}
                </h3>
                <button
                    class="w-full mb-2 px-4 py-3 flex justify-center items-center hover:bg-gray-100 dark:hover:bg-gray-700/70 transition-colors rounded-md"
                    @click="handleEveLogin" :disabled="auth.isLoading.value">
                    <div v-if="auth.isLoading.value" class="flex items-center justify-center">
                        <UIcon name="lucide:loader" class="animate-spin mr-2" />
                        {{ t('auth.loading', 'Loading...') }}
                    </div>
                    <NuxtImg v-else :src="ssoImageSrc" alt="Killmail Login with EVE Online"
                        class="sso-image w-full h-auto" :width="ssoImageDimensions.width"
                        :height="ssoImageDimensions.height" format="webp" quality="95" />
                </button>
                <div class="text-xs text-gray-500 dark:text-gray-400 text-center">
                    {{ t('auth.killmailLoginInfo', 'For accessing private and corporation killmails') }}
                </div>

                <!-- Killmail Delay Slider -->
                <div class="mt-4 pt-3 border-t border-gray-100 dark:border-gray-700">
                    <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                        {{ t('killmail.delay.label', 'Killmail Delay') }}
                    </label>
                    <div class="space-y-3">
                        <USlider v-model="killmailDelay" :default-value="0" :min="0" :max="72" :step="1"
                            class="w-full" />
                        <div class="flex justify-between text-sm text-gray-500 dark:text-gray-400">
                            <span>0h</span>
                            <span class="font-medium text-gray-700 dark:text-gray-300">{{ delayText }}</span>
                            <span>72h</span>
                        </div>
                    </div>
                    <div class="text-xs text-gray-500 dark:text-gray-400 text-center mt-2">
                        {{ t('killmail.delay.description') }}
                    </div>
                    <div class="text-center mt-2">
                        <NuxtLink to="/faq#killmail-delay"
                            class="text-xs text-blue-500 hover:text-blue-400 dark:text-blue-400 dark:hover:text-blue-300 underline">
                            {{ t('killmail.delay.learnMore', 'Learn more about killmail delays') }}
                        </NuxtLink>
                    </div>
                </div>
            </div>

            <!-- Divider -->
            <div class="border-t border-gray-100 dark:border-gray-800 my-4"></div>

            <!-- Customize Scopes Section -->
            <div class="mb-4">
                <button
                    class="w-full px-4 py-3 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700/70 transition-colors rounded-md text-left border border-gray-200 dark:border-gray-600"
                    @click="handleCustomizeLogin">
                    <div class="flex items-center justify-center">
                        <UIcon name="lucide:settings" class="mr-2" />
                        {{ t('auth.customizeScopes', 'Customize Login Scopes') }}
                    </div>
                </button>
            </div>

            <div v-if="auth.hasError.value" class="px-2 py-2 text-sm text-red-500 mb-3">
                {{ auth.errorMessage.value }}
            </div>
        </div>

        <!-- Logged in content -->
        <div v-else>
            <!-- User Profile -->
            <div
                class="flex flex-col items-center text-center px-2 py-3 mb-3 border-b border-gray-100 dark:border-gray-800">
                <Image type="character" :id="auth.user.value.characterId" :alt="auth.user.value.characterName"
                    :size="64" class="w-16 h-16 mb-2" />

                <div class="font-medium text-base text-gray-900 dark:text-white">
                    {{ auth.user.value.characterName }}
                </div>

                <div v-if="auth.user.value.corporationName"
                    class="text-sm text-gray-500 dark:text-gray-400 flex items-center mt-1 w-full justify-center">
                    <Image type="corporation" :id="auth.user.value.corporationId" :alt="auth.user.value.corporationName"
                        :size="20" class="w-5 h-5 mr-1" />
                    {{ auth.user.value.corporationName }}
                </div>

                <div v-if="auth.user.value.allianceName"
                    class="text-sm text-gray-500 dark:text-gray-400 flex items-center mt-1 w-full justify-center">
                    <Image type="alliance" :id="auth.user.value.allianceId" :alt="auth.user.value.allianceName"
                        :size="20" class="w-5 h-5 mr-1" />
                    {{ auth.user.value.allianceName }}
                </div>
            </div>

            <!-- Navigation Links -->
            <div class="space-y-1">
                <NuxtLink v-if="auth.user.value.administrator" to="/admin"
                    class="block px-2 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700/70 rounded-md transition-colors">
                    <div class="flex items-center">
                        <UIcon name="lucide:shield" class="mr-2" />
                        {{ t('admin.panel', 'Admin Panel') }}
                    </div>
                </NuxtLink>

                <NuxtLink to="/user/settings"
                    class="block px-2 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700/70 rounded-md transition-colors">
                    <div class="flex items-center">
                        <UIcon name="lucide:settings" class="mr-2" />
                        {{ t('user.settings') }}
                    </div>
                </NuxtLink>

                <!-- Logout Button -->
                <div class="border-t border-gray-100 dark:border-gray-800 my-1 pt-1">
                    <button
                        class="w-full text-left px-2 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-700/70 rounded-md transition-colors"
                        @click="handleLogout" :disabled="auth.isLoading.value">
                        <div class="flex items-center">
                            <UIcon :name="auth.isLoading.value ? 'lucide:loader' : 'lucide:log-out'"
                                :class="{ 'animate-spin': auth.isLoading.value }" class="mr-2" />
                            {{ auth.isLoading.value ? t('auth.loggingOut', 'Logging out...') : t('user.logout') }}
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
.bg-gray-50\/70,
.dark\:bg-gray-800\/50 {
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

/* Consistent SSO image sizing */
.sso-image {
    display: block;
    object-fit: contain;
    max-width: 100%;
    height: auto;
}

/* Enhanced button styling for login buttons */
button:has(.sso-image) {
    padding: 0 !important;
    overflow: hidden;
}

button:has(.sso-image) .sso-image {
    width: 100%;
    height: auto;
    border-radius: 0.375rem;
    /* rounded-md */
}
</style>
