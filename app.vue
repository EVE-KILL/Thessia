<script setup>
import * as locales from '@nuxt/ui/locale';

// Load i18n
const { locale } = useI18n();
</script>

<template>
  <UApp :locale="locales[locale]">
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </UApp>
</template>
