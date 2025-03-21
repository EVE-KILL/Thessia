<script setup>
import * as locales from '@nuxt/ui/locale';

const { locale } = useI18n();
</script>

<template>
  <UApp :locale="locales[locale]">
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </UApp>
</template>
