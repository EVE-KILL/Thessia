<script lang="ts" setup>
import { useSearch } from '~/composables/useSearch';

// Props for passing data from parent
const props = defineProps({
  themeIcon: String,
  themeAriaLabel: String,
  toggleTheme: Function,
  availableBackgrounds: Array,
  setBackground: Function,
  isCurrentBackground: Function,
  setRandomRedditBackground: Function,
  userDropdown: Array,
  navigationItems: Array,
  informationDropdown: Array,
  isVideoFile: Function
})

// State
const isLoadingRandomBg = ref(false)
const { query, navigateToSearch, results, isLoading, setupAutoSearch } = useSearch();

// Set up auto search with debounce
setupAutoSearch(3, 300);

// Search handling
const handleSearchSubmit = (e: Event) => {
  e.preventDefault();
  navigateToSearch();
}

// Create background items for the dropdown menu with thumbnails
const backgroundItems = computed(() => {
  const items = props.availableBackgrounds.map(bg => ({
    label: bg.name,
    // Add thumbnail component as a custom slot
    slot: 'custom',
    // Add props for the custom slot
    bgPath: bg.path,
    isVideo: props.isVideoFile(bg.path),
    onSelect: () => props.setBackground(bg.path),
    trailing: props.isCurrentBackground(bg.path) ? { name: 'i-heroicons-check', color: 'primary' } : undefined
  }));

  // Add divider and Random EVEPorn option
  items.push({ type: 'divider' });
  items.push({
    label: 'EVEPorn',
    icon: 'i-heroicons-photo',
    onSelect: async () => {
      isLoadingRandomBg.value = true;
      await props.setRandomRedditBackground();
      isLoadingRandomBg.value = false;
    }
  });

  return items;
})

// Create search items for dropdown
const searchItems = computed(() => {
  if (!results.value || !results.value.hits || results.value.hits.length === 0 || query.value.length < 3) {
    return [];
  }

  const items = results.value.hits.slice(0, 5).map(hit => ({
    label: hit.name,
    icon: getIconForEntityType(hit.type),
    iconClass: getColorForEntityType(hit.type),
    description: capitalizeFirstLetter(hit.type),
    click: () => {
      navigateTo(`/${hit.type}/${hit.id}`);
      query.value = '';
    }
  }));

  // Add "view all results" item if there are more than 5 results
  if (results.value.hits.length > 5) {
    items.push({ type: 'divider' });
    items.push({
      label: `${$t('search.viewAllResults', { count: results.value.estimatedTotalHits })}`,
      icon: 'i-heroicons-magnifying-glass',
      click: () => navigateToSearch()
    });
  }

  return items;
});

// Helper to capitalize first letter of a string
const capitalizeFirstLetter = (string: string) => {
  return string.charAt(0).toUpperCase() + string.slice(1);
};

// Helper functions for entity types
const getIconForEntityType = (type: string) => {
  switch (type.toLowerCase()) {
    case 'character':
      return 'i-heroicons-user';
    case 'corporation':
      return 'i-heroicons-building-office';
    case 'alliance':
      return 'i-heroicons-user-group';
    case 'ship':
      return 'i-heroicons-rocket-launch';
    case 'item':
      return 'i-heroicons-cube';
    case 'system':
      return 'i-heroicons-globe-alt';
    case 'region':
      return 'i-heroicons-map';
    default:
      return 'i-heroicons-question-mark-circle';
  }
};

const getColorForEntityType = (type: string) => {
  switch (type.toLowerCase()) {
    case 'character':
      return 'text-blue-600 dark:text-blue-400';
    case 'corporation':
      return 'text-green-600 dark:text-green-400';
    case 'alliance':
      return 'text-purple-600 dark:text-purple-400';
    case 'ship':
      return 'text-red-600 dark:text-red-400';
    case 'item':
      return 'text-orange-600 dark:text-orange-400';
    case 'system':
      return 'text-teal-600 dark:text-teal-400';
    case 'region':
      return 'text-indigo-600 dark:text-indigo-400';
    default:
      return 'text-gray-600 dark:text-gray-400';
  }
};

</script>

<template>
  <div class="w-full bg-white bg-opacity-60 dark:bg-black dark:bg-opacity-40 backdrop-blur-sm border-b border-zinc-300 dark:border-zinc-800 sticky top-0 z-50">
    <div class="max-w-[90rem] mx-auto">
      <nav class="px-4 py-3">
        <div class="flex justify-between items-center">
          <!-- Left: Logo & Navigation (Desktop) -->
          <div class="flex items-center space-x-6">
            <NuxtLink to="/" class="text-black dark:text-white text-2xl font-bold hover:text-gray-600 dark:hover:text-gray-300 transition">
              {{ $t('navbar.home') }}
            </NuxtLink>

            <!-- Desktop Navigation -->
            <div class="flex items-center space-x-4">
              <UDropdownMenu :items="userDropdown">
                <UButton>{{ $t('navbar.kills') }}</UButton>
              </UDropdownMenu>
            </div>
          </div>

          <!-- Center: Search (Desktop) -->
          <div class="absolute left-1/2 transform -translate-x-1/2">
            <form @submit="handleSearchSubmit" class="relative">
              <UInput
                v-model="query"
                :placeholder="$t('navbar.search')"
                :icon="isLoading ? 'i-heroicons-arrow-path' : 'i-heroicons-magnifying-glass'"
                :icon-class="isLoading ? 'animate-spin' : ''"
                color="white"
                variant="outline"
                trailing
                size="sm"
                class="w-[320px] no-zoom-input"
                @keydown.enter="handleSearchSubmit"
              >
                <template #trailing>
                  <div class="flex items-center">
                    <UButton
                      v-if="query"
                      color="gray"
                      variant="ghost"
                      icon="i-heroicons-x-mark"
                      size="xs"
                      :padded="false"
                      @click="query = ''"
                    />
                    <UButton
                      color="gray"
                      variant="ghost"
                      icon="i-heroicons-magnifying-glass"
                      size="xs"
                      :padded="false"
                      @click="handleSearchSubmit"
                    />
                  </div>
                </template>
              </UInput>

              <!-- Search Results Popover -->
              <div
                v-if="results && results.hits && results.hits.length > 0 && query.length >= 3"
                class="searchbox-dropdown absolute top-full left-0 right-0 mt-1 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg z-50 overflow-y-auto"
              >
                <div class="p-2 divide-y divide-gray-100 dark:divide-gray-700">
                  <div
                    v-for="(hit, index) in results.hits.slice(0, 5)"
                    :key="`${hit.id}-${index}`"
                    class="py-2 px-3 hover:bg-gray-100 dark:hover:bg-gray-700 rounded cursor-pointer transition-colors"
                    @click="navigateTo(`/${hit.type}/${hit.id}`); query = '';"
                  >
                    <div class="flex items-center">
                      <UIcon
                        :name="getIconForEntityType(hit.type)"
                        class="flex-shrink-0 mr-2"
                        :class="getColorForEntityType(hit.type)"
                      />
                      <div class="flex-1 min-w-0">
                        <div class="font-medium text-sm truncate">{{ hit.name }}</div>
                        <div class="text-gray-500 dark:text-gray-400 text-xs">
                          {{ capitalizeFirstLetter(hit.type) }}
                        </div>
                      </div>
                    </div>
                  </div>

                  <UButton
                    v-if="results.hits.length > 5"
                    block
                    size="sm"
                    color="gray"
                    variant="ghost"
                    class="mt-2"
                    @click="navigateToSearch(); query = '';"
                  >
                    {{ $t('search.viewAllResults', { count: results.estimatedTotalHits }) }}
                  </UButton>
                </div>
              </div>
            </form>
          </div>

          <!-- Right: User menu and theme toggle -->
          <div class="flex items-center gap-3">
            <!-- Language switcher -->
            <LocaleSwitcher />

            <!-- Information dropdown moved to here with icon -->
            <UDropdownMenu :items="informationDropdown">
              <UButton
                icon="i-heroicons-information-circle"
                color="gray"
                variant="ghost"
                class="text-black dark:text-white hover:bg-black hover:bg-opacity-10 dark:hover:bg-white dark:hover:bg-opacity-10"
                :aria-label="$t('navbar.information')"
              />
            </UDropdownMenu>

            <!-- Background selector - dropdown with thumbnails -->
            <UDropdownMenu :items="backgroundItems" class="background-dropdown">
              <UButton
                icon="i-heroicons-photo"
                color="gray"
                variant="ghost"
                class="text-black dark:text-white hover:bg-black hover:bg-opacity-10 dark:hover:bg-white dark:hover:bg-opacity-10"
                aria-label="Change background image"
              />

              <!-- Custom template for background items with thumbnails -->
              <template #custom="{ item }">
                <button
                  @click="item.onSelect"
                  class="w-full flex flex-col border-0 bg-transparent cursor-pointer p-1 hover:opacity-90"
                  :class="{'ring-1 ring-primary-500': isCurrentBackground(item.bgPath)}"
                >
                  <!-- Thumbnail container -->
                  <div class="w-full max-w-[160px] mx-auto aspect-video rounded overflow-hidden relative">
                    <!-- For images -->
                    <template v-if="!item.isVideo">
                      <NuxtImg
                        :src="item.bgPath"
                        width="160"
                        height="90"
                        loading="lazy"
                        format="webp"
                        fit="cover"
                        quality="80"
                        class="w-full h-full object-cover"
                      />
                    </template>

                    <!-- For videos -->
                    <template v-else>
                      <div class="w-full h-full flex items-center justify-center bg-black/20 dark:bg-white/10">
                        <UIcon name="i-heroicons-film" class="text-lg" />
                      </div>
                    </template>

                    <!-- Background name overlay at bottom - text smaller to match -->
                    <div class="absolute bottom-0 left-0 right-0 bg-black/40 py-0.5 px-2 text-white text-xs flex justify-between items-center">
                      <span class="text-xs">{{ item.label }}</span>
                      <UIcon
                        v-if="isCurrentBackground(item.bgPath)"
                        name="i-heroicons-check"
                        class="text-primary-500 text-xs"
                      />
                    </div>
                  </div>
                </button>
              </template>
            </UDropdownMenu>

            <!-- Theme toggle button -->
            <UButton
              :icon="themeIcon"
              color="gray"
              variant="ghost"
              @click="toggleTheme"
              class="text-black dark:text-white hover:bg-black hover:bg-opacity-10 dark:hover:bg-white dark:hover:bg-opacity-10"
              :aria-label="themeAriaLabel"
            />

            <!-- User menu dropdown -->
            <div class="flex items-center">
              <UDropdownMenu :items="userDropdown">
                <UButton
                  color="gray"
                  variant="ghost"
                  icon="i-heroicons-user-circle"
                  class="text-black dark:text-white hover:bg-black hover:bg-opacity-10 dark:hover:bg-white dark:hover:bg-opacity-10 flex items-center justify-center"
                  aria-label="User menu"
                />
              </UDropdownMenu>
            </div>
          </div>
        </div>
      </nav>
    </div>
  </div>
</template>

<style scoped>
.searchbox-dropdown {
  background-color: rgba(255, 255, 255, 0.95);
}

:root.dark .searchbox-dropdown {
  background-color: rgba(25, 25, 25, 0.95);
}

/* Add higher opacity fallback for browsers that don't support backdrop-filter */
@supports not ((backdrop-filter: blur(8px)) or (-webkit-backdrop-filter: blur(8px))) {
  .searchbox-dropdown {
    background-color: rgba(255, 255, 255, 0.98);
  }

  :root.dark .searchbox-dropdown {
    background-color: rgba(25, 25, 25, 0.98);
  }
}

/* Ensure fixed elements don't cause unwanted overflow */
.fixed.inset-0 {
  min-height: 100vh;
  height: auto !important;
}

/* Sticky header adjustments */
.sticky.top-0 {
  z-index: 5;
}

/* Ensure consistent icon vertical alignment */
:deep(.UButton) {
  display: flex;
  align-items: center;
  justify-content: center;
}

/* Fix icon centering */
:deep(.UButton__icon) {
  display: flex;
  align-items: center;
  justify-content: center;
}

/* Aspect ratio class for thumbnails */
.aspect-video {
  aspect-ratio: 16/9;
}

/* Prevent iOS zoom on input focus */
.no-zoom-input :deep(input) {
  font-size: 16px !important; /* Minimum font size to prevent iOS zoom */
}

/* Fix the search box height to maintain consistency */
.no-zoom-input :deep(.UInput) {
  min-height: 40px;
}

/* Ensure consistency in button and input sizes */
:deep(.UButton), :deep(.UInput) {
  touch-action: manipulation;
}

.navbar-end {
  display: flex;
  align-items: center;
  margin-left: auto;
}

.navbar-item {
  padding: 0 0.75rem;
}
</style>
