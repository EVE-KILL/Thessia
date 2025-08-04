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
const authStore = useAuthStore();
const { isAuthenticated, currentUser, isLoading, hasError, errorMessage } = storeToRefs(authStore);

// UI state
const isDropdownOpen = ref(false);
const killmailDelay = ref(0); // Hours delay for killmails (0-72)

// Initialize authentication state
onMounted(() => {
    nextTick(async () => {
        await authStore.checkAuth();
    });
});

// Auth handlers
const handleEveLogin = () => {
    const currentPath = window.location.pathname;
    authStore.login(currentPath, undefined, killmailDelay.value);
    isDropdownOpen.value = false;
};

const handleBasicLogin = () => {
    const currentPath = window.location.pathname;
    authStore.login(currentPath, ["publicData"]);
    isDropdownOpen.value = false;
};

const handleLogout = () => {
    authStore.logout();
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
    <ClientOnly>
        <!-- Desktop View -->
        <div v-if="!isMobileView" class="navbar-user">
            <div class="navbar-user-desktop">
                <!-- User dropdown menu -->
                <Dropdown v-model="isDropdownOpen" :smart-position="true" position="bottom" align="end">
                    <template #trigger>
                        <UButton color="neutral" variant="ghost" size="sm" class="user-trigger" aria-label="User menu">
                            <UIcon v-if="!isAuthenticated" name="lucide:user" class="user-icon" />
                            <Image v-else type="character" :id="currentUser.characterId!"
                                :alt="currentUser.characterName!" :size="20" class="user-avatar" />
                        </UButton>
                    </template>

                    <!-- Dropdown Content -->
                    <div class="user-dropdown">
                        <!-- Not Logged In Content -->
                        <div v-if="!isAuthenticated">
                            <!-- Basic Login Section -->
                            <div class="user-login-section">
                                <h3 class="user-section-title">{{
                                    t('auth.basicLogin',
                                        'Basic Login') }}
                                </h3>
                                <button class="user-sso-button" @click="handleBasicLogin" :disabled="isLoading">
                                    <div v-if="isLoading" class="user-loading">
                                        <UIcon name="lucide:loader" class="user-loading-icon" />
                                        {{ t('auth.loading', 'Loading...') }}
                                    </div>
                                    <img v-else :src="ssoImageSrc" alt="Basic Login with EVE Online"
                                        class="user-sso-image" :width="ssoImageDimensions.width"
                                        :height="ssoImageDimensions.height" />
                                </button>
                                <div class="user-info-text">
                                    {{ t('auth.basicLoginInfo', 'Basic login with publicData only') }}
                                </div>
                            </div>

                            <!-- Divider -->
                            <div class="user-divider"></div>

                            <!-- Killmail Login Section -->
                            <div class="user-login-section">
                                <h3 class="user-section-title">
                                    {{ t('auth.killmailLogin') }}
                                </h3>
                                <button class="user-sso-button" @click="handleEveLogin" :disabled="isLoading">
                                    <div v-if="isLoading" class="user-loading">
                                        <UIcon name="lucide:loader" class="user-loading-icon" />
                                        {{ t('auth.loading', 'Loading...') }}
                                    </div>
                                    <img v-else :src="ssoImageSrc" alt="Killmail Login with EVE Online"
                                        class="user-sso-image" :width="ssoImageDimensions.width"
                                        :height="ssoImageDimensions.height" />
                                </button>
                                <div class="user-info-text">
                                    {{ t('auth.killmailLoginInfo', 'For accessing private and corporation killmails') }}
                                </div>

                                <!-- Killmail Delay Slider -->
                                <div class="user-delay-section">
                                    <label class="user-delay-label">
                                        {{ t('killmail.delay.label', 'Killmail Delay') }}
                                    </label>
                                    <div class="user-delay-controls">
                                        <USlider v-model="killmailDelay" :default-value="0" :min="0" :max="72" :step="1"
                                            class="user-delay-slider" />
                                        <div class="user-delay-range">
                                            <span class="user-delay-min">0h</span>
                                            <span class="user-delay-current">{{ delayText }}</span>
                                            <span class="user-delay-max">72h</span>
                                        </div>
                                    </div>
                                    <div class="user-info-text">
                                        {{ t('killmail.delay.description') }}
                                    </div>
                                    <div class="user-delay-display">
                                        <NuxtLink to="/faq#killmail-delay"
                                            class="text-xs text-blue-500 hover:text-blue-400 dark:text-blue-400 dark:hover:text-blue-300 underline"
                                            @click="isDropdownOpen = false">
                                            {{ t('killmail.delay.learnMore', 'Learn more about killmail delays') }}
                                        </NuxtLink>
                                    </div>
                                </div>
                            </div>

                            <!-- Divider -->
                            <div class="user-divider"></div>

                            <!-- Customize Scopes Section -->
                            <div class="user-login-section">
                                <button class="user-customize-button" @click="handleCustomizeLogin">
                                    <div class="flex items-center justify-center">
                                        <UIcon name="lucide:settings" class="mr-2" />
                                        {{ t('auth.customizeScopes', 'Customize Login Scopes') }}
                                    </div>
                                </button>
                            </div>

                            <div v-if="hasError" class="user-error">
                                {{ errorMessage }}
                            </div>
                        </div>

                        <!-- Logged In Content -->
                        <template v-else>
                            <!-- User Profile -->
                            <div class="user-profile-section">
                                <div class="user-profile-content">
                                    <NuxtLink :to="`/character/${currentUser.characterId}`" class="user-profile-link"
                                        @click="isDropdownOpen = false">
                                        <Image type="character" :id="currentUser.characterId!"
                                            :alt="currentUser.characterName!" :size="64" class="user-profile-avatar" />
                                    </NuxtLink>

                                    <NuxtLink :to="`/character/${currentUser.characterId}`" class="user-profile-name"
                                        @click="isDropdownOpen = false">
                                        {{ currentUser.characterName }}
                                    </NuxtLink>

                                    <NuxtLink v-if="currentUser.corporationName"
                                        :to="`/corporation/${currentUser.corporationId}`" class="user-corp-link"
                                        @click="isDropdownOpen = false">
                                        <Image type="corporation" :id="currentUser.corporationId!"
                                            :alt="currentUser.corporationName!" :size="20" class="w-5 h-5 mr-1" />
                                        {{ currentUser.corporationName }}
                                    </NuxtLink>

                                    <NuxtLink v-if="currentUser.allianceName"
                                        :to="`/alliance/${currentUser.allianceId}`" class="user-alliance-link"
                                        @click="isDropdownOpen = false">
                                        <Image type="alliance" :id="currentUser.allianceId!"
                                            :alt="currentUser.allianceName!" :size="20" class="w-5 h-5 mr-1" />
                                        {{ currentUser.allianceName }}
                                    </NuxtLink>
                                </div>
                            </div>

                            <!-- Navigation Links -->
                            <div class="mt-2">
                                <NuxtLink v-if="currentUser.administrator" to="/admin" class="dropdown-item"
                                    @click="isDropdownOpen = false">
                                    <div class="flex items-center">
                                        <UIcon name="lucide:shield" class="mr-2" />
                                        {{ t('admin.panel', 'Admin Panel') }}
                                    </div>
                                </NuxtLink>

                                <NuxtLink to="/user/settings" class="dropdown-item" @click="isDropdownOpen = false">
                                    <div class="flex items-center">
                                        <UIcon name="lucide:settings" class="mr-2" />
                                        {{ t('user.settings') }}
                                    </div>
                                </NuxtLink>

                                <!-- Logout Button -->
                                <div class="user-divider mt-1 pt-1">
                                    <button class="dropdown-item logout-button w-full text-left" @click="handleLogout"
                                        :disabled="isLoading">
                                        <div class="flex items-center">
                                            <UIcon :name="isLoading ? 'lucide:loader' : 'lucide:log-out'"
                                                :class="{ 'animate-spin': isLoading }" class="mr-2" />
                                            {{ isLoading ? t('auth.loggingOut', 'Logging out...') :
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
            <div class="navbar-user-mobile">
                <div class="navbar-user-mobile-content">
                    <UButton v-if="!isAuthenticated" color="neutral" variant="ghost" aria-label="User menu"
                        @click="isDropdownOpen = !isDropdownOpen" class="user-mobile-trigger">
                        <UIcon name="lucide:user-circle" class="user-mobile-icon" />
                    </UButton>

                    <div v-if="!isAuthenticated && isDropdownOpen" class="user-mobile-dropdown">
                        <!-- Mobile dropdown content similar to desktop, but more compact -->
                        <div
                            class="absolute top-16 right-4 bg-white dark:bg-gray-800 shadow-lg rounded-md py-2 w-56 z-50">
                            <!-- Basic Login Section -->
                            <div class="user-login-section px-3 py-2">
                                <h3 class="user-section-title mb-2">
                                    {{ t('auth.basicLogin') }}
                                </h3>
                                <button class="user-sso-button" @click="handleBasicLogin" :disabled="isLoading">
                                    <div v-if="isLoading" class="user-loading">
                                        <UIcon name="lucide:loader" class="user-loading-icon" />
                                        {{ t('auth.loading', 'Loading...') }}
                                    </div>
                                    <img v-else :src="ssoImageSrc" alt="Basic Login with EVE Online"
                                        class="user-sso-image" :width="ssoImageDimensions.width"
                                        :height="ssoImageDimensions.height" />
                                </button>
                                <div class="user-info-text">
                                    {{ t('auth.basicLoginInfo', 'Basic login with publicData only') }}
                                </div>
                            </div>

                            <!-- Divider -->
                            <div class="user-divider"></div>

                            <!-- Killmail Login Section -->
                            <div class="user-login-section px-3 py-2">
                                <h3 class="user-section-title mb-2">
                                    {{ t('auth.killmailLogin') }}
                                </h3>
                                <button class="user-sso-button" @click="handleEveLogin" :disabled="isLoading">
                                    <div v-if="isLoading" class="user-loading">
                                        <UIcon name="lucide:loader" class="user-loading-icon" />
                                        {{ t('auth.loading', 'Loading...') }}
                                    </div>
                                    <img v-else :src="ssoImageSrc" alt="Killmail Login with EVE Online"
                                        class="user-sso-image" :width="ssoImageDimensions.width"
                                        :height="ssoImageDimensions.height" />
                                </button>
                                <div class="user-info-text">
                                    {{ t('auth.killmailLoginInfo', 'For private and corporation killmails') }}
                                </div>

                                <!-- Killmail Delay Slider -->
                                <div class="user-delay-section">
                                    <label class="user-delay-label">
                                        {{ t('killmail.delay.label', 'Killmail Delay') }}
                                    </label>
                                    <div class="user-delay-controls">
                                        <USlider v-model="killmailDelay" :default-value="0" :min="0" :max="72" :step="1"
                                            class="user-delay-slider" />
                                        <div class="user-delay-range">
                                            <span class="user-delay-min">0h</span>
                                            <span class="user-delay-current">{{ delayText }}</span>
                                            <span class="user-delay-max">72h</span>
                                        </div>
                                    </div>
                                    <div class="user-info-text">
                                        {{ t('killmail.delay.description', 'Delay killmails to prevent instant leaks')
                                        }}
                                    </div>
                                    <div class="user-delay-display">
                                        <NuxtLink to="/faq#killmail-delay"
                                            class="text-xs text-blue-500 hover:text-blue-400 dark:text-blue-400 dark:hover:text-blue-300 underline"
                                            @click="isDropdownOpen = false">
                                            {{ t('killmail.delay.learnMore', 'Learn more about killmail delays') }}
                                        </NuxtLink>
                                    </div>
                                </div>
                            </div>

                            <!-- Divider -->
                            <div class="user-divider"></div>

                            <!-- Customize Scopes -->
                            <div class="user-login-section px-3 py-2">
                                <button class="user-customize-button" @click="handleCustomizeLogin">
                                    <div class="flex items-center justify-center">
                                        <UIcon name="lucide:settings" class="mr-2" />
                                        {{ t('auth.customizeScopes', 'Customize Login') }}
                                    </div>
                                </button>
                            </div>

                            <div v-if="hasError" class="user-error px-4 py-2">
                                {{ errorMessage }}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Mobile Fullscreen Menu View -->
        <div v-else class="user-mobile-fullscreen">
            <!-- Not logged in content -->
            <div v-if="!isAuthenticated">
                <!-- Basic Login Section -->
                <div class="mb-4">
                    <h3 class="user-section-title mb-3">
                        {{ t('auth.basicLogin') }}
                    </h3>
                    <button class="user-sso-button w-full mb-2 px-4 py-3" @click="handleBasicLogin"
                        :disabled="isLoading">
                        <div v-if="isLoading" class="user-loading">
                            <UIcon name="lucide:loader" class="user-loading-icon" />
                            {{ t('auth.loading', 'Loading...') }}
                        </div>
                        <img v-else :src="ssoImageSrc" alt="Basic Login with EVE Online" class="user-sso-image"
                            :width="ssoImageDimensions.width" :height="ssoImageDimensions.height" />
                    </button>
                    <div class="user-info-text">
                        {{ t('auth.basicLoginInfo', 'Basic login with publicData only') }}
                    </div>
                </div>

                <!-- Divider -->
                <div class="user-divider my-4"></div>

                <!-- Killmail Login Section -->
                <div class="mb-4">
                    <h3 class="user-section-title mb-3">
                        {{ t('auth.killmailLogin') }}
                    </h3>
                    <button class="user-sso-button w-full mb-2 px-4 py-3" @click="handleEveLogin" :disabled="isLoading">
                        <div v-if="isLoading" class="user-loading">
                            <UIcon name="lucide:loader" class="user-loading-icon" />
                            {{ t('auth.loading', 'Loading...') }}
                        </div>
                        <img v-else :src="ssoImageSrc" alt="Killmail Login with EVE Online" class="user-sso-image"
                            :width="ssoImageDimensions.width" :height="ssoImageDimensions.height" />
                    </button>
                    <div class="user-info-text">
                        {{ t('auth.killmailLoginInfo', 'For accessing private and corporation killmails') }}
                    </div>

                    <!-- Killmail Delay Slider -->
                    <div class="user-delay-section mt-4 pt-3">
                        <label class="user-delay-label block text-sm font-medium mb-3">
                            {{ t('killmail.delay.label', 'Killmail Delay') }}
                        </label>
                        <div class="space-y-3">
                            <USlider v-model="killmailDelay" :default-value="0" :min="0" :max="72" :step="1"
                                class="user-delay-slider" />
                            <div class="user-delay-range text-sm">
                                <span>0h</span>
                                <span class="font-medium text-gray-700 dark:text-gray-300">{{ delayText }}</span>
                                <span>72h</span>
                            </div>
                        </div>
                        <div class="user-info-text mt-2">
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
                <div class="user-divider my-4"></div>

                <!-- Customize Scopes Section -->
                <div class="mb-4">
                    <button class="user-customize-button w-full px-4 py-3" @click="handleCustomizeLogin">
                        <div class="flex items-center justify-center">
                            <UIcon name="lucide:settings" class="mr-2" />
                            {{ t('auth.customizeScopes', 'Customize Login Scopes') }}
                        </div>
                    </button>
                </div>

                <div v-if="hasError" class="user-error mb-3">
                    {{ errorMessage }}
                </div>
            </div>

            <!-- Logged in content -->
            <div v-else>
                <!-- User Profile -->
                <div class="user-profile-section mb-3">
                    <div class="user-profile-content">
                        <NuxtLink :to="`/character/${currentUser.characterId}`" class="user-profile-link">
                            <Image type="character" :id="currentUser.characterId!" :alt="currentUser.characterName!"
                                :size="64" class="user-profile-avatar" />
                        </NuxtLink>

                        <NuxtLink :to="`/character/${currentUser.characterId}`"
                            class="font-medium text-base text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                            {{ currentUser.characterName }}
                        </NuxtLink>

                        <NuxtLink v-if="currentUser.corporationName" :to="`/corporation/${currentUser.corporationId}`"
                            class="user-corp-link text-sm">
                            <Image type="corporation" :id="currentUser.corporationId!"
                                :alt="currentUser.corporationName!" :size="20" class="w-5 h-5 mr-1" />
                            {{ currentUser.corporationName }}
                        </NuxtLink>

                        <NuxtLink v-if="currentUser.allianceName" :to="`/alliance/${currentUser.allianceId}`"
                            class="user-alliance-link text-sm">
                            <Image type="alliance" :id="currentUser.allianceId!" :alt="currentUser.allianceName!"
                                :size="20" class="w-5 h-5 mr-1" />
                            {{ currentUser.allianceName }}
                        </NuxtLink>
                    </div>
                </div>

                <!-- Navigation Links -->
                <div class="space-y-1">
                    <NuxtLink v-if="currentUser.administrator" to="/admin" class="dropdown-item">
                        <div class="flex items-center">
                            <UIcon name="lucide:shield" class="mr-2" />
                            {{ t('admin.panel', 'Admin Panel') }}
                        </div>
                    </NuxtLink>

                    <NuxtLink to="/user/settings" class="dropdown-item">
                        <div class="flex items-center">
                            <UIcon name="lucide:settings" class="mr-2" />
                            {{ t('user.settings') }}
                        </div>
                    </NuxtLink>

                    <!-- Logout Button -->
                    <div class="user-divider my-1 pt-1">
                        <button class="dropdown-item logout-button w-full text-left" @click="handleLogout"
                            :disabled="isLoading">
                            <div class="flex items-center">
                                <UIcon :name="isLoading ? 'lucide:loader' : 'lucide:log-out'"
                                    :class="{ 'animate-spin': isLoading }" class="mr-2" />
                                {{ isLoading ? t('auth.loggingOut', 'Logging out...') : t('user.logout') }}
                            </div>
                        </button>
                    </div>
                </div>
            </div>
        </div>

        <template #fallback>
            <!-- Desktop fallback -->
            <div v-if="!isMobileView" class="navbar-user">
                <div class="navbar-user-desktop">
                    <UButton color="neutral" variant="ghost" size="sm" class="user-trigger" aria-label="User menu">
                        <UIcon name="lucide:user" class="user-icon" />
                    </UButton>
                </div>
                <div class="navbar-user-mobile">
                    <UButton color="neutral" variant="ghost" aria-label="User menu" class="user-mobile-trigger">
                        <UIcon name="lucide:user-circle" class="user-mobile-icon" />
                    </UButton>
                </div>
            </div>
            <!-- Mobile fallback -->
            <div v-else class="user-mobile-loading">
                <div class="user-loading-content">
                    <UIcon name="lucide:loader-2" class="user-loading-spinner" />
                    <span class="user-loading-text">{{ t('auth.loading', 'Loading...') }}</span>
                </div>
            </div>
        </template>
    </ClientOnly>
</template>

<style scoped>
.navbar-user {
    display: flex;
    align-items: center;
}

.navbar-user-desktop {
    display: none;
}

.navbar-user-mobile {
    display: block;
}

@media (min-width: 768px) {
    .navbar-user-desktop {
        display: block;
    }

    .navbar-user-mobile {
        display: none;
    }
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
.user-mobile-fullscreen {
    backdrop-filter: blur(4px);
    -webkit-backdrop-filter: blur(4px);
}

/* Safari fix for backdrop-filter */
@supports not ((backdrop-filter: blur(4px)) or (-webkit-backdrop-filter: blur(4px))) {
    .user-mobile-fullscreen {
        background-color: rgba(249, 250, 251, 0.95) !important;
    }

    :root.dark .user-mobile-fullscreen {
        background-color: rgba(31, 41, 55, 0.95) !important;
    }
}

/* SSO Image sizing */
.user-sso-image {
    border-radius: 0.375rem;
}
</style>
