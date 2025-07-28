<script setup lang="ts">
import * as locales from "@nuxt/ui/locale";

// Get the error that was thrown
const props = defineProps({
  error: Object,
});

// Load i18n
const { locale, t } = useI18n();

// Handle 503 errors specially - show maintenance UI instead of redirecting
const isMaintenanceError = computed(() => props.error?.statusCode === 503);
const maintenanceMessage = computed(() => props.error?.data?.maintenanceMessage || '');

// For non-maintenance errors, clear error state on button click
const handleError = () => clearError({ redirect: "/" });

// For maintenance mode, implement refresh functionality
const refreshMaintenancePage = async () => {
  try {
    const maintenanceState = await $fetch("/api/maintenance/status");
    if (!maintenanceState?.isEnabled) {
      // Maintenance is over, redirect to home
      await clearError({ redirect: "/" });
    } else {
      // Still in maintenance, reload the page
      window.location.reload();
    }
  } catch (error) {
    // Fallback: reload the page
    window.location.reload();
  }
};

// Format current time for maintenance mode
const currentTime = ref(new Date());
const formattedTime = computed(() => {
  return new Intl.DateTimeFormat(undefined, {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).format(currentTime.value);
});

// Auto-check maintenance status and update time for 503 errors
onMounted(() => {
  if (isMaintenanceError.value) {
    // Update time every second
    const timeInterval = setInterval(() => {
      currentTime.value = new Date();
    }, 1000);

    // Check maintenance status every 10 seconds
    const maintenanceInterval = setInterval(async () => {
      try {
        const maintenanceState = await $fetch("/api/maintenance/status");
        if (!maintenanceState?.isEnabled) {
          // Maintenance is over, redirect to home
          await clearError({ redirect: "/" });
        }
      } catch (error) {
        console.error("Failed to check maintenance status:", error);
      }
    }, 10000);

    onUnmounted(() => {
      clearInterval(timeInterval);
      clearInterval(maintenanceInterval);
    });
  }
});

// Get appropriate error message based on status code
const errorMessage = computed(() => {
  const statusCode = props.error?.statusCode || 404;

  switch (statusCode) {
    case 404:
      return t("errorNotFound");
    case 403:
      return t("errorForbidden");
    case 500:
      return t("errorServerError");
    case 503:
      return t("errorMaintenance") || "Service temporarily unavailable";
    default:
      return props.error?.message || t("errorGeneric");
  }
});

// Get appropriate error icon based on status code
const getErrorIcon = (statusCode: number) => {
  switch (statusCode) {
    case 403:
      return "i-lucide-shield-x";
    case 500:
      return "i-lucide-server-crash";
    case 503:
      return "i-lucide-wrench";
    default:
      return "i-lucide-alert-triangle";
  }
};

// Get appropriate error icon color based on status code
const getErrorIconColor = (statusCode: number) => {
  switch (statusCode) {
    case 403:
      return "text-red-500";
    case 500:
      return "text-red-600";
    case 503:
      return "text-orange-500";
    default:
      return "text-yellow-500";
  }
};

// Get appropriate error title based on status code
const getErrorTitle = (statusCode: number) => {
  switch (statusCode) {
    case 404:
      return t("errors.titles.404") || "Page Not Found";
    case 403:
      return t("errors.titles.403") || "Access Forbidden";
    case 500:
      return t("errors.titles.500") || "Server Error";
    case 503:
      return t("errors.titles.503") || "Service Unavailable";
    default:
      return t("errors.titles.generic") || `Error ${statusCode}`;
  }
};

// Get appropriate image based on status code (only show for 404)
const errorImage = computed(() => {
  const statusCode = props.error?.statusCode || 404;
  return statusCode === 404 ? "/images/404.png" : null;
});

// Apply theme class when component mounts
onMounted(() => {
  if (import.meta.client) {
    const applyThemeClass = () => {
      const colorMode = useColorMode();
      const isDarkMode = colorMode.value === "dark";

      if (isDarkMode) {
        document.documentElement.classList.add("dark");
      } else {
        document.documentElement.classList.remove("dark");
      }
    };

    // Apply theme class immediately and on DOM content loaded
    applyThemeClass();
    document.addEventListener("DOMContentLoaded", applyThemeClass);

    // Clean up event listener on unmount
    onUnmounted(() => {
      document.removeEventListener("DOMContentLoaded", applyThemeClass);
    });
  }
});
</script>

<template>
  <UApp :locale="locales[locale]">
    <NuxtLayout>
      <!-- Maintenance Mode UI for 503 errors -->
      <div v-if="isMaintenanceError" class="container mx-auto px-4 py-8">
        <UCard class="max-w-3xl mx-auto bg-black/20 dark:bg-gray-900/20 backdrop-blur-sm">
          <div class="p-6 text-center">
            <div class="mb-8">
              <UIcon name="i-lucide-wrench" class="w-24 h-24 mx-auto text-orange-500 mb-4" />
              <h1 class="text-3xl md:text-4xl font-bold mb-4">{{ t('maintenance.title') }}</h1>
            </div>

            <div class="space-y-6">
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
                <UButton @click="refreshMaintenancePage" class="flex items-center gap-2 justify-center">
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

      <!-- Regular Error Page UI for non-503 errors -->
      <div v-else class="container mx-auto px-4 py-8">
        <UCard class="max-w-3xl mx-auto bg-black/20 dark:bg-gray-900/20 backdrop-blur-sm">
          <div class="p-6 text-center">
            <div class="mb-8">
              <!-- Show 404 image only for 404 errors -->
              <div v-if="errorImage" class="mb-6">
                <NuxtImg
                  :src="errorImage"
                  :alt="`Error ${props.error?.statusCode || 404}`"
                  class="h-auto max-w-md mx-auto"
                  width="400"
                  height="auto"
                  loading="lazy"
                />
              </div>

              <!-- Error icon for non-404 errors -->
              <div v-else class="mb-6">
                <UIcon
                  :name="getErrorIcon(props.error?.statusCode || 500)"
                  class="w-24 h-24 mx-auto mb-4"
                  :class="getErrorIconColor(props.error?.statusCode || 500)"
                />
              </div>

              <h1 class="text-3xl md:text-4xl font-bold mb-4">
                {{ getErrorTitle(props.error?.statusCode || 404) }}
              </h1>
            </div>

            <div class="space-y-6">
              <p class="text-lg text-gray-600 dark:text-gray-300">
                {{ errorMessage }}
              </p>

              <div class="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
                <h2 class="text-xl font-semibold mb-2 text-blue-600 dark:text-blue-400">{{ t('errors.whatToDo.title') }}</h2>
                <ul class="text-left text-gray-700 dark:text-gray-200 space-y-2">
                  <li class="flex items-start gap-2">
                    <UIcon name="i-lucide-check-circle" class="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                    <span>{{ t('errors.whatToDo.goBack') }}</span>
                  </li>
                  <li class="flex items-start gap-2">
                    <UIcon name="i-lucide-check-circle" class="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                    <span>{{ t('errors.whatToDo.tryAgain') }}</span>
                  </li>
                  <li class="flex items-start gap-2">
                    <UIcon name="i-lucide-check-circle" class="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                    <span>{{ t('errors.whatToDo.contact') }}</span>
                  </li>
                </ul>
              </div>

              <div class="flex flex-col sm:flex-row gap-4 justify-center pt-6">
                <UButton @click="handleError" class="flex items-center gap-2 justify-center">
                  <UIcon name="i-lucide-home" />
                  {{ t('backToHome') }}
                </UButton>
                <UButton @click="$router.go(-1)" variant="outline" class="flex items-center gap-2 justify-center">
                  <UIcon name="i-lucide-arrow-left" />
                  {{ t('errors.goBack') }}
                </UButton>
              </div>
            </div>
          </div>
        </UCard>
      </div>
    </NuxtLayout>
  </UApp>
</template>
