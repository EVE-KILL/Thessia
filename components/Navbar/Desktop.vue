<script lang="ts" setup>

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
            <UInput
              :placeholder="$t('navbar.search')"
              icon="i-heroicons-magnifying-glass"
              color="white"
              variant="outline"
              trailing
              size="sm"
              class="w-[320px] no-zoom-input"
            />
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
