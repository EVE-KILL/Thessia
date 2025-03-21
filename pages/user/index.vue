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
  <div class="mx-auto">
    <div class="text-center">
      <UIcon name="lucide:loader" class="animate-spin h-8 w-8 mx-auto text-primary-600 dark:text-primary-400" />
      <p class="mt-4 text-gray-600 dark:text-gray-400">{{ $t('common.loading') }}</p>
    </div>
  </div>
</template>
