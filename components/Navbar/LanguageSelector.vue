<template>
  <div class="language-selector">
    <!-- Desktop dropdown -->
    <UDropdownMenu :items="localeItems">
      <UButton
        color="neutral"
        variant="ghost"
        size="sm"
        class="flex items-center"
      >
        <Icon
          name="i-heroicons-globe-alt"
          class="text-lg"
        />
      </UButton>
    </UDropdownMenu>

    <!-- Mobile view version (simplified display) -->
    <div v-if="isMobileView" class="flex flex-col gap-2 w-full">
      <div class="py-2 font-medium text-sm text-gray-500 dark:text-gray-400">
        {{ $t('common.selectLanguage', 'Select Language') }}
      </div>
      <div class="grid grid-cols-2 gap-2">
        <UButton
          v-for="locale in availableLocales"
          :key="locale.code"
          color="neutral"
          variant="ghost"
          class="flex items-center justify-start p-2"
          :class="{ 'ring-2 ring-primary-500 dark:ring-primary-400': currentLocale === locale.code }"
          @click="switchLocale(locale.code)"
        >
          <UIcon
            v-if="currentLocale === locale.code"
            name="i-heroicons-check"
            class="mr-2 text-primary-500"
          />
          <span class="text-sm">{{ locale.name }}</span>
        </UButton>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { LocaleObject } from '@nuxtjs/i18n';
import type { Locale } from 'vue-i18n';

// Props
const props = defineProps({
  isMobileView: {
    type: Boolean,
    default: false
  }
});

// Use the i18n composable
const { locale: currentLocale, locales, setLocale } = useI18n();

// Current language code for displaying in button
const currentLocaleCode = computed(() => {
  return currentLocale.value.toUpperCase();
});

// Type-safe available locales
const availableLocales = computed(() => {
  return (locales.value as LocaleObject[]).filter(
    (locale): locale is LocaleObject => typeof locale !== 'string'
  );
});

// Generate dropdown items for locales
const localeItems = computed(() => {
  return availableLocales.value.map((locale) => ({
    label: locale.name,
    icon: currentLocale.value === locale.code ? 'i-heroicons-check' : '',
    iconClass: 'text-primary-500',
    // Show language code instead of flag
    trailing: () => h('span', { class: 'text-xs ml-2' }, locale.code.toUpperCase()),
    onSelect: () => switchLocale(locale.code)
  }));
});

// Function to switch the locale using the built-in setLocale method
async function switchLocale(newLocale: Locale) {
  try {
    await setLocale(newLocale);
  } catch (error) {
    console.debug('Failed to switch locale:', error);
  }
}
</script>

<style scoped>
.language-selector {
  position: relative;
}
</style>
