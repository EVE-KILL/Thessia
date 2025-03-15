<template>
  <div>
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

            <!-- Background name overlay at bottom -->
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
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'

const {
  availableBackgrounds,
  setBackground,
  isCurrentBackground,
  setRandomRedditBackground
} = useBackgroundImage()

const isLoadingRandomBg = ref(false)

// Function to check if path is a video file
const isVideoFile = (path: string): boolean => {
  return path.toLowerCase().endsWith('.mp4') ||
         path.toLowerCase().endsWith('.webm') ||
         path.toLowerCase().endsWith('.ogg')
}

// Enhanced background changing function
const changeBackground = (path) => {
  setBackground(path)
}

// Create background items for the dropdown menu with thumbnails
const backgroundItems = computed(() => {
  const items = availableBackgrounds.map(bg => ({
    label: bg.name,
    slot: 'custom',
    bgPath: bg.path,
    isVideo: isVideoFile(bg.path),
    onSelect: () => changeBackground(bg.path),
    trailing: isCurrentBackground(bg.path) ? { name: 'i-heroicons-check', color: 'primary' } : undefined
  }));

  // Add divider and Random EVEPorn option
  items.push({ type: 'divider' });
  items.push({
    label: 'EVEPorn',
    icon: 'i-heroicons-photo',
    onSelect: async () => {
      isLoadingRandomBg.value = true;
      await setRandomRedditBackground();
      isLoadingRandomBg.value = false;
    }
  });

  return items;
})
</script>

<style scoped>
.aspect-video {
  aspect-ratio: 16/9;
}
</style>
