<script setup lang="ts">
definePageMeta({
  layout: "default",
  requiresAuth: true,
});

const router = useRouter();
const { t } = useI18n();

// Add SEO meta
useSeoMeta({
  title: t("userPageTitle"),
});

// Redirect to settings by default
onMounted(() => {
  router.push("/user/settings");
});
</script>

<template>
  <div class="mx-auto">
    <div class="text-center">
      <UIcon name="lucide:loader" class="animate-spin h-8 w-8 mx-auto text-primary-600 dark:text-primary-400" />
      <p class="mt-4 text-gray-600 dark:text-gray-400">{{ $t('loading') }}</p>
    </div>
  </div>
</template>
