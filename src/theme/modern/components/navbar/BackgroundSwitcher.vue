<script setup lang="ts">
import { computed, onUnmounted, ref } from "vue";

// Import the composable properly
const {
    currentBackground,
    setSiteBackground,
    setRedditBackground,
    isRedditBackground,
    redditBackgroundMeta
} = siteBackground();

// Get the backgrounds that are available from the API
const { data: backgrounds, pending: loading } = await useFetch("/api/site/backgrounds");

// Track dropdown state
const isDropdownOpen = ref(false);

// Track if we're displaying in fullscreen mode (for mobile)
const isFullscreen = ref(false);

// Track Reddit loading state
const isRedditLoading = ref(false);

// Use the composable instead of internal detection
const { isMobile: internalIsMobile } = useResponsive();

// Emit events for parent components
const emit = defineEmits(["fullscreen-opened", "fullscreen-closed", "background-selected"]);

// Props for component
const props = defineProps({
    // Whether the component is being used on mobile
    isMobile: {
        type: Boolean,
        default: false,
    },
    // Whether to open in fullscreen mode (controlled by parent)
    fullscreenOpen: {
        type: Boolean,
        default: false,
    },
});

// Compute effective mobile state (use responsive composable OR prop)
const isMobileView = computed(() => {
    return internalIsMobile.value || props.isMobile;
});

// Watch for changes in fullscreen prop from parent
watch(
    () => props.fullscreenOpen,
    (value) => {
        isFullscreen.value = value;
    },
);

// Check if a background is the current one - compare directly to the ref value
const isCurrentBackground = (path: string): boolean => {
    return currentBackground.value === path && !isRedditBackground.value;
};

// Check if Reddit background is active
const isRedditActive = computed(() => {
    return isRedditBackground.value;
});

// Handle background selection
const selectBackground = (path: string) => {
    setSiteBackground(path);

    // Close dropdown or fullscreen mode
    isDropdownOpen.value = false;

    if (isFullscreen.value) {
        emit("background-selected", path);
        emit("fullscreen-closed");
        isFullscreen.value = false;
    }
};

// Handle Reddit background selection
const selectRedditBackground = async () => {
    try {
        isRedditLoading.value = true;
        const redditBg = await setRedditBackground();

        // Close dropdown or fullscreen mode
        isDropdownOpen.value = false;

        if (isFullscreen.value) {
            emit("background-selected", redditBg.url);
            emit("fullscreen-closed");
            isFullscreen.value = false;
        }
    } catch (error) {
        console.error('Failed to set Reddit background:', error);
        // TODO: Show error toast to user
    } finally {
        isRedditLoading.value = false;
    }
};

// Open fullscreen mode
const openFullscreen = () => {
    isFullscreen.value = true;
    emit("fullscreen-opened");
};

// Close fullscreen mode
const closeFullscreen = () => {
    isFullscreen.value = false;
    emit("fullscreen-closed");
};

// Improved body scroll locking for mobile fullscreen view
watch(isFullscreen, (isOpen) => {
    if (import.meta.client) {
        const body = document.body;

        if (isOpen) {
            // Store current scroll position
            const scrollY = window.scrollY;
            body.style.position = "fixed";
            body.style.width = "100%";
            body.style.top = `-${scrollY}px`;
            body.style.overflow = "hidden";
            body.classList.add("modal-open");
            body.dataset.scrollPosition = String(scrollY);

            // Calculate scrollbar width and set custom property
            const scrollbarWidth = window.innerWidth - body.clientWidth;
            document.documentElement.style.setProperty("--scrollbar-width", `${scrollbarWidth}px`);
        } else {
            // Restore scroll position
            const scrollY = body.dataset.scrollPosition || "0";
            body.style.position = "";
            body.style.width = "";
            body.style.top = "";
            body.style.overflow = "";
            body.classList.remove("modal-open");
            delete body.dataset.scrollPosition;
            document.documentElement.style.setProperty("--scrollbar-width", "0px");
            window.scrollTo(0, Number.parseInt(scrollY, 10));
        }
    }
});

// Clean up on unmount
onUnmounted(() => {
    if (import.meta.client && document.body.classList.contains("modal-open")) {
        // Restore scroll if component unmounts while modal is open
        const scrollY = document.body.dataset.scrollPosition || "0";
        document.body.style.position = "";
        document.body.style.width = "";
        document.body.style.top = "";
        document.body.style.overflow = "";
        document.body.classList.remove("modal-open");
        document.documentElement.style.setProperty("--scrollbar-width", "0px");
        delete document.body.dataset.scrollPosition;
        window.scrollTo(0, Number.parseInt(scrollY, 10));
    }
});
</script>

<template>
    <div class="background-switcher">
        <!-- For desktop: Use Dropdown -->
        <div v-if="!isMobileView" class="desktop-switcher">
            <Dropdown v-model="isDropdownOpen" width="320px" :max-height="80" :smart-position="true">
                <!-- Trigger Button - Updated icon to a more appropriate choice -->
                <template #trigger>
                    <UButton color="primary" variant="ghost" aria-label="Change background" class="cursor-pointer">
                        <UIcon name="lucide:wallpaper" class="text-xl text-black dark:text-white" />
                    </UButton>
                </template>

                <!-- Dropdown Content -->
                <div class="p-2">
                    <div class="flex items-center justify-between mb-4">
                        <h3 class="text-base font-medium">
                            {{ $t('backgroundTitle') }}
                        </h3>
                    </div>

                    <!-- Reddit Random Button -->
                    <div class="mb-4">
                        <UButton @click="selectRedditBackground" :loading="isRedditLoading" :disabled="isRedditLoading"
                            variant="outline" color="primary" block class="mb-2">
                            <UIcon name="lucide:shuffle" class="mr-2" />
                            {{ $t('background.randomReddit', 'Random r/eveporn') }}
                        </UButton>

                        <!-- Show current Reddit background info if active -->
                        <div v-if="isRedditActive && redditBackgroundMeta"
                            class="text-xs text-gray-500 dark:text-gray-400 px-2 py-1 bg-(--ui-bg-muted) rounded">
                            <div class="flex items-center">
                                <UIcon name="lucide:check" class="text-(--ui-primary) mr-1" />
                                <span class="truncate">{{ redditBackgroundMeta.title }}</span>
                            </div>
                        </div>
                    </div>

                    <!-- Loading state -->
                    <div v-if="loading" class="p-4 text-center">
                        <UIcon name="lucide:refresh-ccw" class="animate-spin text-xl mb-2" />
                        <p class="text-sm text-gray-500 dark:text-gray-400">{{ $t('background.loading') }}</p>
                    </div>

                    <!-- Background Grid -->
                    <div v-else class="grid grid-cols-2 gap-2">
                        <button v-for="bg in backgrounds" :key="bg.path" @click="selectBackground(bg.path)"
                            class="bg-thumb-btn relative overflow-hidden rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-(--ui-focus-ring) cursor-pointer"
                            :class="{ 'ring-2 ring-(--ui-focus-ring)': isCurrentBackground(bg.path) }">
                            <!-- Image Thumbnail -->
                            <div class="aspect-video bg-(--ui-bg-muted) overflow-hidden">
                                <NuxtImg :src="bg.path" width="180" height="101" loading="lazy" format="webp"
                                    fit="cover" quality="80" class="w-full h-full object-cover" />
                            </div>

                            <!-- Image Name Overlay -->
                            <div class="absolute bottom-0 left-0 right-0 bg-black/70 py-1 px-2">
                                <div class="flex items-center justify-between">
                                    <UIcon v-if="isCurrentBackground(bg.path)" name="lucide:check"
                                        class="text-(--ui-primary) text-xs" />
                                </div>
                            </div>
                        </button>
                    </div>
                </div>
            </Dropdown>
        </div>

        <!-- For mobile: Just show the button that opens fullscreen view -->
        <div v-else>
            <UButton color="primary" variant="ghost" aria-label="Change background" @click="openFullscreen"
                class="cursor-pointer">
                <UIcon name="lucide:wallpaper" class="text-xl text-black dark:text-white" />
            </UButton>
        </div>

        <!-- Mobile Fullscreen Modal -->
        <MobileFullscreen :open="isFullscreen" :title="$t('backgroundTitle')" @close="closeFullscreen">
            <!-- Reddit Random Button (Mobile) -->
            <div class="mb-6 px-4">
                <UButton @click="selectRedditBackground" :loading="isRedditLoading" :disabled="isRedditLoading"
                    variant="outline" color="primary" block size="lg" class="mb-3">
                    <UIcon name="lucide:shuffle" class="mr-2" />
                    {{ $t('background.randomReddit', 'Random r/eveporn') }}
                </UButton>

                <!-- Show current Reddit background info if active -->
                <div v-if="isRedditActive && redditBackgroundMeta"
                    class="text-sm text-gray-500 dark:text-gray-400 px-3 py-2 bg-(--ui-bg-muted) rounded-lg">
                    <div class="flex items-center">
                        <UIcon name="lucide:check" class="text-(--ui-primary) mr-2" />
                        <span class="truncate">{{ redditBackgroundMeta.title }}</span>
                    </div>
                </div>
            </div>

            <!-- Loading state -->
            <div v-if="loading" class="p-8 text-center">
                <UIcon name="lucide:refresh-ccw" class="animate-spin text-2xl mb-3" />
                <p class="text-gray-500 dark:text-gray-400">{{ $t('background.loading', 'Loading backgrounds...') }}</p>
            </div>

            <!-- Main content slot -->
            <div v-else class="grid grid-cols-2 gap-4 px-4">
                <button v-for="bg in backgrounds" :key="bg.path" @click="selectBackground(bg.path)"
                    class="bg-thumb-btn relative overflow-hidden rounded-lg focus:outline-none shadow-sm cursor-pointer"
                    :class="{ 'ring-2 ring-primary-500': isCurrentBackground(bg.path) }">
                    <!-- Image Thumbnail -->
                    <div class="aspect-video bg-(--ui-bg-muted) overflow-hidden">
                        <NuxtImg :src="bg.path" width="180" height="101" loading="lazy" format="webp" fit="cover"
                            quality="80" class="w-full h-full object-cover" />
                    </div>

                    <!-- Image Name Overlay -->
                    <div class="absolute bottom-0 left-0 right-0 bg-black/70 py-2 px-3">
                        <div class="flex items-center justify-between">
                            <span class="text-sm text-white truncate">{{ bg.name }}</span>
                            <UIcon v-if="isCurrentBackground(bg.path)" name="lucide:check" class="text-primary-500" />
                        </div>
                    </div>
                </button>
            </div>
        </MobileFullscreen>
    </div>
</template>

<style scoped>
.aspect-video {
    aspect-ratio: 16/9;
}

.bg-thumb-btn {
    transition: all 0.2s ease;
    cursor: pointer;
}

.bg-thumb-btn:hover {
    transform: scale(1.02);
}

/* Shadow for buttons in grid */
.shadow-sm {
    box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
}

:root.dark .shadow-sm {
    box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.3);
}
</style>
