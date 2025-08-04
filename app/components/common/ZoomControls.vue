<script setup lang="ts">

const props = defineProps({
    // Whether to show current zoom display
    showZoomLevel: { type: Boolean, default: true },
    // Position: 'top-right', 'bottom-right', 'bottom-left', 'top-left', 'floating'
    position: { type: String, default: 'bottom-right' },
    // Offset from the bottom in pixels
    bottomOffset: { type: Number, default: 20 },
    // Offset from the right in pixels
    rightOffset: { type: Number, default: 20 },
    // Spacing between buttons
    buttonSpacing: { type: Number, default: 10 },
    // Minimum zoom level
    minZoom: { type: Number, default: 70 },
    // Maximum zoom level
    maxZoom: { type: Number, default: 150 },
    // Zoom step size
    step: { type: Number, default: 10 },
    // Button size: 'xs', 'sm', 'md', 'lg'
    size: { type: String, default: 'sm' }
});

const { t } = useI18n();

// Add the responsive composable to detect device type
const { isMobile } = useResponsive();

// Initialize the zoom composable with props
const {
    zoom,
    zoomIn,
    zoomOut,
    resetZoom
} = useZoom({
    minZoom: props.minZoom,
    maxZoom: props.maxZoom,
    step: props.step
});

// Calculate the positions for each button
const zoomInPosition = computed(() => {
    return {
        right: `${props.rightOffset}px`,
        bottom: `${props.bottomOffset + 130}px`,
    };
});

const resetZoomPosition = computed(() => {
    return {
        right: `${props.rightOffset}px`,
        bottom: `${props.bottomOffset + 80}px`,
    };
});

const zoomOutPosition = computed(() => {
    return {
        right: `${props.rightOffset}px`,
        bottom: `${props.bottomOffset + 30}px`,
    };
});

const zoomLevelPosition = computed(() => {
    return {
        right: `${props.rightOffset}px`,
        bottom: `${props.bottomOffset + 180}px`,
    };
});

// Whether buttons should be disabled
const isMinZoom = computed(() => zoom.value <= props.minZoom);
const isMaxZoom = computed(() => zoom.value >= props.maxZoom);
const isDefaultZoom = computed(() => zoom.value === 100);
</script>

<template>
    <!-- Only render on desktop (non-mobile) devices -->
    <template v-if="!isMobile">
        <!-- Zoom Level Display - Now styled like a button -->
        <div v-if="showZoomLevel" class="floating-button zoom-level-button" :style="zoomLevelPosition">
            <UButton size="sm" variant="solid" color="neutral" :ui="{
                base: 'min-w-[3em] flex justify-center text-xs'
            }">
                {{ zoom }}%
            </UButton>
        </div>

        <!-- Zoom In Button -->
        <div class="floating-button zoom-in-button" :style="zoomInPosition">
            <UButton size="sm" variant="solid" color="neutral" icon="i-lucide-zoom-in" :disabled="isMaxZoom"
                @click="zoomIn" :aria-label="t('zoomIn')" :title="t('zoomIn')" />
        </div>

        <!-- Reset Zoom Button -->
        <div class="floating-button zoom-reset-button" :style="resetZoomPosition">
            <UButton size="sm" variant="solid" color="neutral" icon="i-lucide-rotate-ccw" :disabled="isDefaultZoom"
                @click="resetZoom" :aria-label="t('resetZoom')" :title="t('resetZoom')" />
        </div>

        <!-- Zoom Out Button -->
        <div class="floating-button zoom-out-button" :style="zoomOutPosition">
            <UButton size="sm" variant="solid" color="neutral" icon="i-lucide-zoom-out" :disabled="isMinZoom"
                @click="zoomOut" :aria-label="t('zoomOut')" :title="t('zoomOut')" />
        </div>
    </template>
</template>

<style scoped>
.floating-button {
    position: fixed;
    z-index: var(--z-popover);
    opacity: 0.6;
    transition: opacity var(--duration-300), transform var(--duration-300);
}

.floating-button:hover {
    opacity: 1;
    transform: scale(1.05);
}

/* Add an inset shadow to make the buttons visible on all backgrounds */
.floating-button :deep(.u-button) {
    box-shadow: var(--shadow-lg);
}
</style>
