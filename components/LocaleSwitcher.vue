<template>
  <div class="locale-switcher">
    <UDropdownMenu :items="localeItems">
      <UButton
        color="gray"
        variant="ghost"
        class="text-black dark:text-white hover:bg-black hover:bg-opacity-10 dark:hover:bg-white dark:hover:bg-opacity-10"
      >
        <div class="flex items-center gap-2">
          <span class="font-medium">{{ currentLocaleName }}</span>
          <UIcon name="i-heroicons-chevron-down" class="w-4 h-4" />
        </div>
      </UButton>
    </UDropdownMenu>
  </div>
</template>

<script setup lang="ts">
// Import directly from composables to ensure consistent access
const { locales, locale } = useI18n();

// Get current locale cookie
const localeCookie = useCookie('i18n_locale');

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
    localStorage.setItem('user-locale', newLocale);
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
.locale-switcher {
  position: relative;
}
</style>
