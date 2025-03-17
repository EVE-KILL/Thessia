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
        <span class="text-sm">{{ currentLanguageFlag }}</span>
      </UButton>
    </UDropdownMenu>

    <!-- Mobile view version (simplified display) -->
    <div v-if="isMobileView" class="flex flex-col gap-2 w-full">
      <div class="py-2 font-medium text-sm text-gray-500 dark:text-gray-400">
        {{ $t('common.selectLanguage', 'Select Language') }}
      </div>
      <div class="grid grid-cols-4 gap-2">
        <UButton
          v-for="(l, index) in Array.isArray(locales) ? locales.filter(item => typeof item !== 'string') : []"
          :key="index"
          color="neutral"
          variant="ghost"
          class="flex flex-col items-center justify-center p-2"
          :class="{ 'ring-2 ring-primary-500 dark:ring-primary-400': locale === l.code }"
          @click="switchLocale(l.code)"
        >
          <span class="text-2xl mb-1">{{ languageFlags[l.code] || '🏳️' }}</span>
          <span class="text-xs">{{ l.name }}</span>
        </UButton>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
// Props
const props = defineProps({
  isMobileView: {
    type: Boolean,
    default: false
  }
});

// Import directly from composables to ensure consistent access
const { locales, locale } = useI18n();

// Get current locale cookie
const localeCookie = useCookie('i18n_locale');

// Map of language codes to emoji flags
const languageFlags = {
  en: '🇬🇧',
  de: '🇩🇪',
  es: '🇪🇸',
  fr: '🇫🇷',
  ja: '🇯🇵',
  ko: '🇰🇷',
  ru: '🇷🇺',
  zh: '🇨🇳'
};

// Current language flag emoji
const currentLanguageFlag = computed(() => {
  return languageFlags[locale.value] || '🇬🇧';
});

// Computed property for the current locale name
const currentLocaleName = computed(() => {
  if (!Array.isArray(locales.value)) {
    return locale.value || 'en';
  }

  const currentLocale = locales.value.find(
    (l) => typeof l !== 'string' && l.code === locale.value
  );

  return currentLocale && typeof currentLocale !== 'string'
    ? currentLocale.name
    : locale.value;
});

// Generate dropdown items for locales
const localeItems = computed(() => {
  if (!Array.isArray(locales.value)) {
    return [];
  }

  return locales.value
    .filter((l) => typeof l !== 'string')
    .map((l) => {
      if (typeof l === 'string') return null;

      return {
        label: l.name,
        icon: locale.value === l.code ? 'i-heroicons-check' : '',
        iconClass: 'text-primary-500',
        trailing: () => h('span', { class: 'text-lg ml-2' }, languageFlags[l.code] || ''),
        onSelect: () => switchLocale(l.code)
      };
    })
    .filter(Boolean);
});

// Function to switch the locale
function switchLocale(newLocale: string) {
  // Set the locale
  locale.value = newLocale;

  // Set the cookie with appropriate options
  const cookieOptions = {
    maxAge: 365 * 24 * 60 * 60,
    path: '/',
    sameSite: 'lax' as const
  };

  // Store locale preference in cookie
  localeCookie.value = newLocale;

  // Also store in localStorage for redundancy
  if (process.client) {
    try {
      localStorage.setItem('user-locale', newLocale);
    } catch (e) {
      console.debug('Could not save locale to localStorage:', e);
    }
  }
}

// Initialize from cookie on client-side
onMounted(() => {
  if (process.client) {
    const savedLocale = localeCookie.value || localStorage.getItem('user-locale');
    if (savedLocale && Array.isArray(locales.value) &&
        locales.value.some((l) => typeof l !== 'string' && l.code === savedLocale)) {
      locale.value = savedLocale;
    }
  }
});
</script>

<style scoped>
.language-selector {
  position: relative;
}
</style>
