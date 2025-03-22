<template>
  <div class="language-selector">
    <!-- Desktop dropdown with CustomDropdown -->
    <CustomDropdown
      v-model="isDropdownOpen"
      :smart-position="true"
      position="bottom"
      align="end"
    >
      <template #trigger>
        <UButton
          color="neutral"
          variant="ghost"
          size="sm"
          class="flex items-center cursor-pointer"
        >
          <!-- Language icon - using the standard translate icon -->
          <UIcon
            name="lucide:languages"
            class="text-lg"
          />
        </UButton>
      </template>

      <!-- Dropdown Content -->
      <div class="py-2 w-48">
        <button
          v-for="locale in availableLocales"
          :key="locale.code"
          class="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors flex items-center"
          :class="{'font-medium': currentLocale === locale.code}"
          @click="switchLocale(locale.code)"
        >
          <UIcon
            v-if="currentLocale === locale.code"
            name="lucide:check"
            class="mr-2 text-primary-500"
          />
          <span v-else class="w-5 mr-2"></span> <!-- Spacer for alignment -->
          {{ locale.name }}
          <span class="text-xs ml-auto text-gray-500">{{ locale.code.toUpperCase() }}</span>
        </button>
      </div>
    </CustomDropdown>

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
          class="flex items-center justify-start p-2 cursor-pointer"
          :class="{ 'ring-2 ring-primary-500 dark:ring-primary-400': currentLocale === locale.code }"
          @click="switchLocale(locale.code)"
        >
          <UIcon
            v-if="currentLocale === locale.code"
            name="lucide:check"
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
import CustomDropdown from './CustomDropdown.vue';

// Props
const props = defineProps({
  isMobileView: {
    type: Boolean,
    default: false
  }
});

// Use the i18n composable
const { locale: currentLocale, locales, setLocale } = useI18n();

// Dropdown state
const isDropdownOpen = ref(false);

// Type-safe available locales
const availableLocales = computed(() => {
  return (locales.value as LocaleObject[]).filter(
    (locale): locale is LocaleObject => typeof locale !== 'string'
  );
});

// Function to switch the locale using the built-in setLocale method
async function switchLocale(newLocale: Locale) {
  try {
    await setLocale(newLocale);
    // Close dropdown after selection
    isDropdownOpen.value = false;
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
