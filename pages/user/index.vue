<script setup lang="ts">
definePageMeta({
  title: 'User Account',
  layout: 'default',
  requiresAuth: true
});

const router = useRouter();

// Redirect to settings by default
onMounted(() => {
  router.push('/user/settings');
});
</script>

<template>
  <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
    <div class="text-center">
      <UIcon name="lucide:loader" class="animate-spin h-8 w-8 mx-auto text-primary-600 dark:text-primary-400" />
      <p class="mt-4 text-gray-600 dark:text-gray-400">{{ $t('common.loading') }}</p>
    </div>
  </div>
</template>
