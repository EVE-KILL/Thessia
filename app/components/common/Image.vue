<script setup lang="ts">
import { computed, getCurrentInstance, onBeforeUnmount, onMounted, ref } from "vue";

const eveImages = useEveImages();
const { isMobile } = useResponsive();

/**
 * Props for the component
 */
type EveImageType =
    | "character"
    | "faction"
    | "corporation"
    | "alliance"
    | "type-icon"
    | "type-render"
    | "blueprint"
    | "blueprint-copy"
    | "item"
    | "system"
    | "constellation"
    | "region";

const props = defineProps({
    // The type of EVE image to display
    type: {
        type: String as () => EveImageType,
        required: true,
        validator: (value: EveImageType) =>
            [
                "character",
                "faction",
                "corporation",
                "alliance",
                "type-icon",
                "type-render",
                "blueprint",
                "blueprint-copy",
                "item",
                "system",
                "constellation",
                "region",
            ].includes(value),
    },
    // The ID for the image (character ID, corporation ID, etc.)
    id: {
        type: [Number, String] as () => number | string,
        required: true,
    },
    // Item name - used for detecting blueprint status for 'item' type
    name: {
        type: String,
        default: "",
    },
    // Alt text for accessibility
    alt: {
        type: String,
        default: "",
    },
    // Image size in pixels - will be normalized to nearest valid EVE image size
    size: {
        type: [Number, String],
        default: null,
        validator: (value: number | string) => {
            const numValue = typeof value === "string" ? Number.parseInt(value, 10) : value;
            return numValue > 0;
        },
    },
    // Custom CSS classes
    class: {
        type: String,
        default: "",
    },
    // Image width (if different from size)
    width: {
        type: Number,
        default: null,
    },
    // Image height (if different from size)
    height: {
        type: Number,
        default: null,
    },
    // Optional fit mode
    fit: {
        type: String,
        default: "cover",
    },
    // Whether to apply rounded corners
    rounded: {
        type: Boolean,
        default: true,
    },
    // Whether to optimize image quality on mobile
    mobileOptimize: {
        type: Boolean,
        default: true,
    },
    // Loading strategy - can be overridden but we'll intelligently manage it
    loading: {
        type: String as () => 'lazy' | 'eager',
        default: "lazy",
        validator: (value: string) => ['lazy', 'eager'].includes(value),
    },
    // Buffer size for pre-loading (pixels above/below viewport)
    bufferSize: {
        type: Number,
        default: 500,
    },
    // Force eager loading regardless of visibility
    forceEager: {
        type: Boolean,
        default: false,
    },
    // Priority hint for the image
    priority: {
        type: Boolean,
        default: false,
    },
    // Explicit fetchpriority attribute (high, low, auto)
    fetchpriority: {
        type: String as () => 'high' | 'low' | 'auto',
        default: undefined,
        validator: (value: string | undefined) => value === undefined || ['high', 'low', 'auto'].includes(value),
    },
    // Preload the image (high priority images)
    preload: {
        type: Boolean,
        default: false,
    },
    // Enable automatic prioritization based on viewport position
    autoPrioritize: {
        type: Boolean,
        default: true,
    },
    // Show count overlay
    showCount: {
        type: Boolean,
        default: false,
    },
    // Count value to display
    count: {
        type: [Number, String],
        default: null,
    },
    // Position of the count overlay
    countPosition: {
        type: String,
        default: "bottom-right", // 'top-left', 'top-right', 'bottom-left', 'bottom-right'
        validator: (value: string) =>
            ["top-left", "top-right", "bottom-left", "bottom-right"].includes(value),
    },
});

// Normalized EVE image size
const eveSize = computed(() => {
    // Default sizes per image type
    const defaults = {
        character: 128,
        corporation: 64,
        alliance: 64,
        "type-icon": 64,
        "type-render": 512,
        blueprint: 64,
        "blueprint-copy": 64,
        item: 64,
        system: 64,
        constellation: 64,
        region: 64,
    };

    // Convert size to number if it's a string
    const sizeAsNumber =
        props.size !== null
            ? typeof props.size === "string"
                ? Number.parseInt(props.size, 10)
                : props.size
            : null;

    // Use prop size or default for type
    const requestedSize = sizeAsNumber || defaults[props.type];

    // Return the nearest valid EVE image size
    return eveImages.normalizeSize(requestedSize);
});

// Compute the image source URL based on the type and ID
const src = computed(() => {
    const idAsNumber = Number(props.id); // Ensure ID is treated as a number for most ESI calls
    // For 'item', props.id might remain a string if it's a name not yet resolved to typeID.
    // The getItemImageUrl function should handle this.

    switch (props.type) {
        case "character":
            return eveImages.getCharacterPortrait(idAsNumber, eveSize.value);
        case "faction":
            return eveImages.getCorporationLogo(idAsNumber, eveSize.value);
        case "corporation":
            return eveImages.getCorporationLogo(idAsNumber, eveSize.value);
        case "alliance":
            return eveImages.getAllianceLogo(idAsNumber, eveSize.value);
        case "type-icon":
            return eveImages.getTypeIcon(idAsNumber, eveSize.value);
        case "type-render":
            return eveImages.getTypeRender(idAsNumber, eveSize.value);
        case "blueprint":
            return eveImages.getBlueprintIcon(idAsNumber, eveSize.value);
        case "blueprint-copy":
            return eveImages.getBlueprintCopyIcon(idAsNumber, eveSize.value);
        case "system":
            return eveImages.getSystemImage(idAsNumber, eveSize.value);
        case "constellation":
            return eveImages.getConstellationImage(idAsNumber, eveSize.value);
        case "region":
            return eveImages.getRegionImage(idAsNumber, eveSize.value);
        case "item":
            // getItemImageUrl might handle string ID (item name) or numeric typeID
            return eveImages.getItemImageUrl(props.id, props.name, "icon", eveSize.value);
        default:
            // const _exhaustiveCheck: never = props.type; // Ensures all cases are handled
            return null;
    }
});

// Define dimensions for the image display (can differ from actual EVE image size)
const imgWidth = computed(() => {
    const width = props.width || props.size || eveSize.value;
    return typeof width === "string" ? Number.parseInt(width, 10) : width;
});

const imgHeight = computed(() => {
    const height = props.height || props.size || eveSize.value;
    return typeof height === "string" ? Number.parseInt(height, 10) : height;
});

// Computed classes for the image
const imageClasses = computed(() => {
    const classes = ['relative', 'z-0']; // Ensure image is in stacking context at base level
    if (props.class) {
        classes.push(props.class);
    }

    if (props.rounded) {
        classes.push("rounded-lg");
    }

    if (props.fit) {
        classes.push(`object-${props.fit}`);
    }

    return classes.join(" ");
});

// Intelligent lazy loading implementation
const imageRef = ref<HTMLImageElement | null>(null);
const isInViewport = ref(false);
const wasEverInViewport = ref(false);
const initialViewportPosition = ref<number | null>(null);
const isAboveFold = ref(false);

// Function to calculate position in viewport (as percentage from top)
const calculateViewportPosition = () => {
    if (!imageRef.value || typeof imageRef.value.getBoundingClientRect !== "function") {
        return null;
    }

    try {
        const rect = imageRef.value.getBoundingClientRect();
        const windowHeight = window.innerHeight;

        // Calculate position as percentage from top of viewport
        const positionPercent = (rect.top / windowHeight) * 100;

        // Determine if the image is "above the fold" (in top 30% of viewport)
        isAboveFold.value = positionPercent < 30;

        return positionPercent;
    } catch (err) {
        console.error("Error calculating viewport position:", err);
        return null;
    }
};

// Determine effective priority based on viewport position and smart LCP detection
const effectivePriority = computed(() => {
    // If explicit fetchpriority prop is set, use that
    if (props.fetchpriority) return props.fetchpriority;
    
    // If priority prop is explicitly set, use that
    if (props.priority) return "high";

    // Smart LCP detection: For large images (>= 128px) that are likely to be above the fold
    const sizeNum = typeof props.size === 'string' ? parseInt(props.size) : props.size;
    const isLargeLcpCandidate = sizeNum >= 128 && props.type === 'type-render';
    if (isLargeLcpCandidate && props.autoPrioritize && isAboveFold.value) {
        return "high";
    }

    // If we're using auto-prioritization and the image is initially above the fold
    if (props.autoPrioritize && isAboveFold.value && initialViewportPosition.value !== null) {
        return "high";
    }

    // For preloaded images
    if (props.preload) return "high";

    // Default to auto for most images to let browser decide
    return "auto";
});

// Simplify image loading strategy - more reliable approach with smart LCP detection
const effectiveLoading = computed((): 'lazy' | 'eager' => {
    // If priority or preload is set, use eager loading
    if (props.priority || props.preload || props.forceEager) {
        return "eager";
    }

    // Smart LCP detection for large ship renders above the fold
    const sizeNum = typeof props.size === 'string' ? parseInt(props.size) : props.size;
    const isLargeLcpCandidate = sizeNum >= 128 && props.type === 'type-render';
    if (isLargeLcpCandidate && props.autoPrioritize && isAboveFold.value) {
        return "eager";
    }

    // If auto-prioritize is on and image is above fold, use eager loading
    if (props.autoPrioritize && isAboveFold.value && initialViewportPosition.value !== null) {
        return "eager";
    }

    // Otherwise use the specified loading strategy (default: lazy)
    // Ensure props.loading is one of the allowed values, defaulting to 'lazy' if not.
    const loadingValue = props.loading;
    return loadingValue === 'eager' ? 'eager' : 'lazy';
});

// For high-priority images, we can skip all the visibility detection
// Only set up visibility detection for non-priority images
const shouldDetectVisibility = computed(
    () => !props.priority && !props.preload && !props.forceEager && props.loading === "lazy",
);

// Check if the element is in the viewport plus buffer zone
const checkVisibility = () => {
    // Safety check - only proceed if we have a valid DOM element
    if (!imageRef.value || typeof imageRef.value.getBoundingClientRect !== "function") {
        return;
    }

    try {
        const rect = imageRef.value.getBoundingClientRect();
        const windowHeight = window.innerHeight;

        // Element is in viewport (plus buffer) if its top is within viewport + buffer
        // or its bottom is within viewport - buffer
        isInViewport.value =
            (rect.top >= 0 - props.bufferSize && rect.top <= windowHeight + props.bufferSize) ||
            (rect.bottom >= 0 - props.bufferSize && rect.bottom <= windowHeight + props.bufferSize);

        // Once in viewport, always treat as in-viewport for loading strategy
        if (isInViewport.value) {
            wasEverInViewport.value = true;
        }
    } catch (err) {
        console.error("Error checking element visibility:", err);
    }
};

// Set up intersection observer for more efficient visibility detection
let observer: IntersectionObserver | null = null;
const wasObserved = ref(false); // Track if the element was successfully observed

// Modify the onMounted hook to only set up visibility detection when needed
onMounted(() => {
    if (import.meta.client) {
        // First check - immediate position detection for initial prioritization
        setTimeout(() => {
            try {
                initialViewportPosition.value = calculateViewportPosition();
                isInViewport.value =
                    initialViewportPosition.value !== null && initialViewportPosition.value < 100; // Consider visible if < 100% from top

                if (isInViewport.value) {
                    wasEverInViewport.value = true;
                }
            } catch (err) {
                console.error("Error in initial position detection:", err);
            }
        }, 0);

        // Continue with existing visibility detection...
        if (shouldDetectVisibility.value) {
            // Delay the initial check to ensure the element is mounted
            setTimeout(() => {
                try {
                    checkVisibility();
                } catch (err) {
                    console.error("Error in initial visibility check:", err);
                }
            }, 0);

            // Set up intersection observer if supported
            if ("IntersectionObserver" in window) {
                try {
                    observer = new IntersectionObserver(
                        (entries) => {
                            entries.forEach((entry) => {
                                isInViewport.value = entry.isIntersecting;
                                if (entry.isIntersecting) {
                                    wasEverInViewport.value = true;
                                    // Once seen and loaded, no need to keep observing
                                    if (observer && imageRef.value) {
                                        try {
                                            observer.unobserve(imageRef.value);
                                        } catch (err) {
                                            // Silently handle unobserve errors
                                        }
                                    }
                                }
                            });
                        },
                        {
                            // Use our buffer zone for root margin
                            rootMargin: `${props.bufferSize}px`,
                            threshold: 0,
                        },
                    );

                    // Only observe if we have a valid DOM element
                    if (
                        imageRef.value &&
                        imageRef.value instanceof Element &&
                        typeof imageRef.value.getBoundingClientRect === "function"
                    ) {
                        try {
                            observer.observe(imageRef.value);
                            wasObserved.value = true;
                        } catch (err) {
                            console.error("Error observing element:", err);
                        }
                    }
                } catch (err) {
                    console.error("Error setting up IntersectionObserver:", err);
                }
            } else {
                // Fallback to scroll/resize event listeners
                if (typeof window !== 'undefined') {
                    window.addEventListener("scroll", checkVisibility, { passive: true });
                    window.addEventListener("resize", checkVisibility, { passive: true });
                }
            }
        }
    }
});

onBeforeUnmount(() => {
    // Check if we're actually in a Vue component context
    if (!getCurrentInstance()) return;

    if (import.meta.client) {
        // Clean up observer with better error handling
        if (observer) {
            // Only try to unobserve if the element was successfully observed
            if (wasObserved.value && imageRef.value && imageRef.value instanceof Element) {
                try {
                    observer.unobserve(imageRef.value);
                } catch (err) {
                    // Silently handle unobserve errors to prevent console spam
                }
            }

            // Always disconnect the observer
            try {
                observer.disconnect();
            } catch (err) {
                // Silently handle disconnect errors
            }

            observer = null;
        }

        // Clean up event listeners
        if (typeof window !== 'undefined') {
            window.removeEventListener("scroll", checkVisibility);
            window.removeEventListener("resize", checkVisibility);
        }
    }
});

const countPositionClass = computed(() => {
    switch (props.countPosition) {
        case 'top-left':
            return 'top-0 left-0';
        case 'top-right':
            return 'top-0 right-0';
        case 'bottom-left':
            return 'bottom-0 left-0';
        case 'bottom-right':
        default:
            return 'bottom-0 right-0';
    }
});

</script>

<template>
    <div class="relative inline-block">
        <!-- plain image -->
        <img v-if="src" ref="imageRef" :src="src" :alt="alt" :class="imageClasses" :width="imgWidth" :height="imgHeight"
            :loading="effectiveLoading" :fetchpriority="effectivePriority" />
        <div v-else :class="['bg-gray-200 dark:bg-gray-700 flex items-center justify-center', imageClasses]"
            :style="{ width: `${imgWidth}px`, height: `${imgHeight}px` }">
            <UIcon name="lucide:image" class="text-gray-400 dark:text-gray-500" />
        </div>
        <span v-if="props.showCount && props.count !== null" :class="[
            'absolute z-10 text-xs text-white leading-none px-1 py-0.5 bg-black/70 rounded-sm', // Text styling, padding, z-index & background
            countPositionClass, // Positioning (top/right/bottom/left)
        ]">
            {{ props.count }}
        </span>
    </div>
</template>
