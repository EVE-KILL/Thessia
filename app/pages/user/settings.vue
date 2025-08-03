<script setup lang="ts">
definePageMeta({
    layout: "default",
    requiresAuth: true,
});

// Add SEO meta
const { t } = useI18n();
const toast = useToast();
useSeoMeta({
    title: t("settingsPageTitle"),
});

// Add active tab tracking
const activeTab = ref("general");

const authStore = useAuthStore();
const router = useRouter();

// Use the user settings store directly
const userSettingsStore = useUserSettingsStore();

// Get user profile data directly from auth/me (client-only to avoid hydration issues)
const { data: profileData, pending, error, refresh } = await useFetch("/api/auth/me", {
    server: false, // Client-only to prevent SSR/hydration mismatches
});

// Local state for settings form (synced with store)
const userSettings = ref({
    killmailDelay: 0,
    defaultCharacterPage: "dashboard",
    defaultCorporationPage: "dashboard",
    defaultAlliancePage: "dashboard",
});

const isUpdatingSettings = ref(false);
const settingsError = ref("");
const settingsSuccess = ref("");

// Sync local settings with the store when it loads
watch(() => userSettingsStore.settings, (newSettings) => {
    if (newSettings) {
        userSettings.value = { ...newSettings };
    }
}, { immediate: true });

// Also update when loading state changes (initial load)
watch(() => userSettingsStore.isLoaded, (isLoaded) => {
    if (isLoaded && userSettingsStore.settings) {
        userSettings.value = { ...userSettingsStore.settings };
    }
}, { immediate: true });

// Ensure settings are loaded when page mounts
onMounted(async () => {
    // Fetch user settings if not already loaded
    if (!userSettingsStore.isLoaded) {
        await userSettingsStore.fetchSettings();
    }

    checkIfMobile();
    window.addEventListener("resize", checkIfMobile);
});

// Fetch detailed character information (client-only)
const { data: characterData } = await useFetch(`/api/characters/${authStore.currentUser?.characterId}`, {
    key: `character-${authStore.currentUser?.characterId}`,
    server: false, // Client-only to ensure auth is ready and prevent hydration issues
    default: () => null
});

// Update settings function
const updateSettings = async () => {
    try {
        isUpdatingSettings.value = true;
        settingsError.value = "";
        settingsSuccess.value = "";

        // Use the composable to update settings
        await userSettingsStore.updateSettings(userSettings.value);

        // Show success toast
        toast.add({
            title: t("settings.updateSuccess", "Settings updated successfully"),
            description: t("settings.updateSuccessDesc", "Your settings have been saved."),
            color: "success",
            icon: "lucide:check-circle"
        });

        settingsSuccess.value = t("settings.updateSuccess", "Settings updated successfully");
    } catch (err: any) {
        console.error("Error updating settings:", err);
        const errorMessage = err?.data?.message || t("settings.updateError", "Failed to update settings");

        // Show error toast
        toast.add({
            title: t("settings.updateError", "Failed to update settings"),
            description: errorMessage,
            color: "error",
            icon: "lucide:alert-circle"
        });

        settingsError.value = errorMessage;
    } finally {
        isUpdatingSettings.value = false;
    }
};

// Handle logout
const handleLogout = async () => {
    await authStore.logout();
    navigateTo("/");
};

// Handle account deletion
const handleDeleteAccount = async () => {
    try {
        isDeletingAccount.value = true;
        deleteError.value = "";

        const { data, error } = await useFetch("/api/auth/logout", {
            method: "POST",
        });

        if (error.value) {
            deleteError.value =
                error.value.message || t("settings.deleteError", "Failed to delete account data");
            return;
        }

        // Reset auth state
        await authStore.logout();

        // Redirect to home page with success message
        router.push("/?deleted=true");
    } catch (err) {
        console.debug("Error deleting account:", err);
        deleteError.value = t("settings.deleteError", "Failed to delete account data");
    } finally {
        isDeletingAccount.value = false;
    }
};

// State for delete confirmation modal
const isDeletingAccount = ref(false);
const deleteError = ref("");

// Check if we're on mobile
const isMobile = ref(false);

onUnmounted(() => {
    window.removeEventListener("resize", checkIfMobile);
});

// Check if we're on mobile
const checkIfMobile = () => {
    isMobile.value = window.innerWidth < 768;
};
</script>

<template>
    <div class="mx-auto px-4 pb-8 sm:px-6 lg:px-8">
        <ClientOnly>
            <div v-if="pending" class="flex items-center justify-center py-8">
                <div class="text-gray-600 dark:text-gray-400">{{ t("loading") }}</div>
            </div>

            <div v-else-if="error" class="rounded-md bg-red-50 p-4 dark:bg-red-900/20">
                <p class="text-red-800 dark:text-red-200">{{ error }}</p>
            </div>

            <div v-else class="space-y-6">
                <!-- User Profile Header Component -->
                <ProfileHeader :profile-data="profileData" :character-data="characterData"
                    :is-deleting-account="isDeletingAccount" @logout="handleLogout"
                    @delete-account="handleDeleteAccount" />

                <!-- Settings Tabs -->
                <div class="overflow-hidden rounded-lg bg-white/50 backdrop-blur-sm shadow dark:bg-gray-800/50">
                    <Tabs v-model="activeTab" :items="[
                        {
                            id: 'general',
                            label: t('settings.tabs.general', 'General'),
                            icon: 'lucide:settings',
                            slot: 'general'
                        },
                        {
                            id: 'esi',
                            label: t('settings.tabs.esi', 'ESI'),
                            icon: 'lucide:key',
                            slot: 'esi'
                        },
                        {
                            id: 'comments',
                            label: t('settings.tabs.comments', 'Comments'),
                            icon: 'lucide:message-circle',
                            slot: 'comments'
                        }
                    ]" class="w-full">
                        <template #general>
                            <GeneralSettings v-model:user-settings="userSettings"
                                :is-updating-settings="isUpdatingSettings" :settings-success="settingsSuccess"
                                :settings-error="settingsError" @update-settings="updateSettings" />
                        </template>

                        <template #esi>
                            <EsiSettings :profile-data="profileData"
                                :user-settings="{ killmailDelay: userSettings.killmailDelay }"
                                :is-updating-settings="isUpdatingSettings" :settings-success="settingsSuccess"
                                :settings-error="settingsError" @update-settings="updateSettings"
                                @update:user-settings="(event) => userSettings.killmailDelay = event.killmailDelay" />
                        </template>

                        <template #comments>
                            <CommentsSettings :profile-data="profileData" />
                        </template>
                    </Tabs>
                </div>
            </div>

            <template #fallback>
                <div class="flex items-center justify-center py-8">
                    <div class="text-gray-600 dark:text-gray-400">{{ t("loading") }}</div>
                </div>
            </template>
        </ClientOnly>
    </div>
</template>
