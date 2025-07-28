<template>
    <div class="container mx-auto px-4 py-8">
        <UCard class="max-w-3xl mx-auto bg-black/20 dark:bg-gray-900/20 backdrop-blur-sm">
            <div class="p-6 text-center">
                <div class="mb-8">
                    <UIcon name="i-lucide-wrench" class="w-24 h-24 mx-auto text-orange-500 mb-4" />
                    <h1 class="text-3xl md:text-4xl font-bold mb-4">{{ t('maintenance.title') }}</h1>
                </div>

                <div class="space-y-6">
                    <p class="text-lg text-gray-600 dark:text-gray-300">
                        {{ t('maintenance.description') }}
                    </p>

                    <div v-if="maintenanceMessage" class="bg-orange-500/10 border border-orange-500/20 rounded-lg p-4">
                        <h2 class="text-xl font-semibold mb-2 text-orange-600 dark:text-orange-400">{{ t('maintenance.messageTitle') }}</h2>
                        <p class="text-gray-700 dark:text-gray-200">{{ maintenanceMessage }}</p>
                    </div>

                    <div class="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
                        <h2 class="text-xl font-semibold mb-2 text-blue-600 dark:text-blue-400">{{ t('maintenance.whatToDo.title') }}</h2>
                        <ul class="text-left text-gray-700 dark:text-gray-200 space-y-2">
                            <li class="flex items-start gap-2">
                                <UIcon name="i-lucide-check-circle" class="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                                <span>{{ t('maintenance.whatToDo.checkBack') }}</span>
                            </li>
                            <li class="flex items-start gap-2">
                                <UIcon name="i-lucide-check-circle" class="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                                <span>{{ t('maintenance.whatToDo.discord') }}</span>
                            </li>
                            <li class="flex items-start gap-2">
                                <UIcon name="i-lucide-check-circle" class="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                                <span>{{ t('maintenance.whatToDo.patience') }}</span>
                            </li>
                        </ul>
                    </div>

                    <div class="flex flex-col sm:flex-row gap-4 justify-center pt-6">
                        <UButton @click="refreshPage" class="flex items-center gap-2 justify-center">
                            <UIcon name="i-lucide-refresh-cw" />
                            {{ t('maintenance.refreshButton') }}
                        </UButton>
                        <UButton to="https://discord.gg/R9gZRc4Jtn" target="_blank" variant="outline"
                            class="flex items-center gap-2 justify-center">
                            <UIcon name="i-simple-icons-discord" />
                            {{ t('maintenance.discordButton') }}
                        </UButton>
                    </div>

                    <div class="text-sm text-gray-400 dark:text-gray-500 pt-4">
                        {{ t('maintenance.lastChecked') }}: {{ formattedTime }}
                    </div>
                </div>
            </div>
        </UCard>
    </div>
</template>

<script setup lang="ts">
definePageMeta({
    layout: "default",
});

const { t } = useI18n();

// Get maintenance state from server
const { data: maintenanceData, refresh: refreshMaintenanceData } = await useFetch('/api/maintenance/status');
const maintenanceMessage = computed(() => maintenanceData.value?.message || '');

// Watch for maintenance mode changes and redirect when disabled
watch(() => maintenanceData.value?.isEnabled, (isEnabled) => {
    if (isEnabled === false) {
        // Maintenance mode has been disabled, redirect to home page
        navigateTo('/');
    }
}, { immediate: false });

// Format current time for display
const currentTime = ref(new Date());
const formattedTime = computed(() => {
    return new Intl.DateTimeFormat(undefined, {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
    }).format(currentTime.value);
});

// Update time every second and check maintenance status every 10 seconds
onMounted(() => {
    const timeInterval = setInterval(() => {
        currentTime.value = new Date();
    }, 1000);

    const maintenanceInterval = setInterval(async () => {
        await refreshMaintenanceData();
    }, 10000); // Check every 10 seconds

    onUnmounted(() => {
        clearInterval(timeInterval);
        clearInterval(maintenanceInterval);
    });
});

// Refresh the page to check if maintenance is over
async function refreshPage() {
    await refreshMaintenanceData();
    if (!maintenanceData.value?.isEnabled) {
        navigateTo('/');
    } else {
        window.location.reload();
    }
}

useSeoMeta({
    title: t("maintenance.pageTitle"),
    description: t("maintenance.description"),
    robots: "noindex, nofollow", // Don't index maintenance page
});
</script>
