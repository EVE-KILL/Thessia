<script setup lang="ts">
interface Props {
    characterData?: any;
    profileData?: any;
}

const props = defineProps<Props>();

// Composables
const { t } = useI18n();
const auth = useAuth();

// State for delete confirmation modal
const isDeleteModalOpen = ref(false);
const isDeletingAccount = ref(false);
const deleteError = ref("");

// Handle logout
const handleLogout = async () => {
    await auth.logout();
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
        await auth.logout();

        // Close modal first
        isDeleteModalOpen.value = false;

        // Redirect to home page with success message
        navigateTo("/?deleted=true");
    } catch (err) {
        console.debug("Error deleting account:", err);
        deleteError.value = t("settings.deleteError", "Failed to delete account data");
    } finally {
        isDeletingAccount.value = false;
    }
};
</script>

<template>
    <div
        class="mb-6 bg-gradient-to-r from-primary-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 rounded-lg p-4 sm:p-6">
        <div class="flex flex-col sm:flex-row items-center sm:items-start gap-4">
            <!-- Character Avatar -->
            <div class="relative">
                <div class="w-20 h-20 sm:w-24 sm:h-24 rounded-lg overflow-hidden shadow-lg">
                    <NuxtLink v-if="auth.user.value.characterId" :to="`/character/${auth.user.value.characterId}`"
                        class="block w-full h-full">
                        <Image type="character" :id="auth.user.value.characterId" :alt="auth.user.value.characterName"
                            :size="128" class="w-full h-full" :quality="90" />
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
                    <NuxtLink :to="`/character/${auth.user.value.characterId}`" class="hover:underline">
                        {{ characterData?.name || auth.user.value.characterName }}
                    </NuxtLink>
                </h1>

                <!-- Character details from API -->
                <div class="space-y-2 mt-3">
                    <!-- Corporation info -->
                    <div v-if="characterData?.corporation_name"
                        class="flex items-center justify-center sm:justify-start">
                        <NuxtLink :to="`/corporation/${characterData.corporation_id}`"
                            class="flex items-center hover:underline text-gray-700 dark:text-gray-300">
                            <Image type="corporation" :id="characterData.corporation_id"
                                :alt="characterData.corporation_name" :size="20" class="w-5 h-5 mr-2" />
                            <span class="text-sm font-medium">{{ characterData.corporation_name }}</span>
                            <span v-if="characterData.corporation_ticker"
                                class="text-xs text-gray-500 dark:text-gray-400 ml-1">
                                [{{ characterData.corporation_ticker }}]
                            </span>
                        </NuxtLink>
                    </div>

                    <!-- Alliance info -->
                    <div v-if="characterData?.alliance_name" class="flex items-center justify-center sm:justify-start">
                        <NuxtLink :to="`/alliance/${characterData.alliance_id}`"
                            class="flex items-center hover:underline text-gray-700 dark:text-gray-300">
                            <Image type="alliance" :id="characterData.alliance_id" :alt="characterData.alliance_name"
                                :size="20" class="w-5 h-5 mr-2" />
                            <span class="text-sm font-medium">{{ characterData.alliance_name }}</span>
                            <span v-if="characterData.alliance_ticker"
                                class="text-xs text-gray-500 dark:text-gray-400 ml-1">
                                &lt;{{ characterData.alliance_ticker }}&gt;
                            </span>
                        </NuxtLink>
                    </div>

                    <!-- Additional character details -->
                    <div v-if="characterData"
                        class="flex flex-wrap items-center justify-center sm:justify-start gap-x-4 gap-y-1 text-xs text-gray-500 dark:text-gray-400">
                        <span v-if="characterData.security_status !== undefined">
                            Security: {{ characterData.security_status.toFixed(1) }}
                        </span>
                        <span v-if="characterData.birthday">
                            Created: {{ new Date(characterData.birthday).toLocaleDateString() }}
                        </span>
                        <span v-if="characterData.race_name">
                            {{ characterData.race_name }}
                        </span>
                    </div>
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
                    <UButton color="warning" variant="soft" size="sm" icon="lucide:trash-2"
                        @click="isDeleteModalOpen = true">
                        {{ $t('settings.deleteData') }}
                    </UButton>

                    <template #content>
                        <UCard>
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
</template>
