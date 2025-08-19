<script setup lang="ts">
import { onClickOutside } from "@vueuse/core";
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from "vue";

const props = defineProps({
    // Support for multi-column layout
    columns: {
        type: Number,
        default: 1,
    },
    // Control max height for scroll (vh units)
    maxHeight: {
        type: Number,
        default: 50, // 50vh by default
    },
    // Position relative to trigger (top, bottom, left, right)
    position: {
        type: String,
        default: "bottom",
    },
    // Alignment (start, center, end)
    align: {
        type: String,
        default: "start",
    },
    // Whether the dropdown should close when clicking inside
    closeOnInnerClick: {
        type: Boolean,
        default: false,
    },
    // Width of dropdown (auto, full, or pixel value)
    width: {
        type: String,
        default: "auto",
    },
    // Whether to show the dropdown
    modelValue: {
        type: Boolean,
        default: false,
    },
    // Whether to use smart positioning based on screen edge
    smartPosition: {
        type: Boolean,
        default: true,
    },
    // Whether to use built-in column distribution
    useColumnDistribution: {
        type: Boolean,
        default: false,
    },
    // Item data for column distribution (when useColumnDistribution is true)
    items: {
        type: Array,
        default: () => [],
    },
    // Items per column threshold
    itemsPerColumn: {
        type: Number,
        default: 10,
    },
    // New props for hover functionality
    openOnHover: {
        type: Boolean,
        default: false,
    },
    hoverDelay: {
        type: Number,
        default: 250, // ms
    },
});

const emit = defineEmits(["update:modelValue"]);

const isOpen = computed({
    get: () => props.modelValue,
    set: (value) => emit("update:modelValue", value),
});

const dropdownRef = ref<HTMLElement | null>(null);
const triggerRef = ref<HTMLElement | null>(null);
const dropdownStyles = ref({});

// Timer for hover delay
const hoverTimer = ref<ReturnType<typeof setTimeout> | null>(null);

// Add a ref to track positioning status
const isPositioned = ref(false);

// Handle hover events for opening/closing
const handleMouseEnter = () => {
    if (!props.openOnHover) return;

    if (hoverTimer.value) {
        clearTimeout(hoverTimer.value);
        hoverTimer.value = null;
    }

    hoverTimer.value = setTimeout(() => {
        isOpen.value = true;
    }, props.hoverDelay);
};

const handleMouseLeave = () => {
    if (!props.openOnHover) return;

    if (hoverTimer.value) {
        clearTimeout(hoverTimer.value);
        hoverTimer.value = null;
    }

    hoverTimer.value = setTimeout(() => {
        isOpen.value = false;
    }, props.hoverDelay);
};

// Handle click outside - MODIFY THIS FUNCTION
onClickOutside(dropdownRef, (event) => {
    // Only close if the click was not on the trigger element or its children
    const triggerEl = triggerRef.value;
    if (isOpen.value && triggerEl && !triggerEl.contains(event.target as Node)) {
        isOpen.value = false;
    }
});

// Close dropdown when Escape key is pressed
const handleKeydown = (e: KeyboardEvent) => {
    if (e.key === "Escape" && isOpen.value) {
        isOpen.value = false;
    }
};

// Toggle dropdown with improved behavior
const toggleDropdown = () => {
    // Simply toggle the state - we handle outside clicks separately
    isOpen.value = !isOpen.value;
};

// Distribute items evenly across columns
const distributeItemsInColumns = (items, columnCount) => {
    if (!items || !items.length) return [];
    if (columnCount === 1) return [items];

    const columns = Array.from({ length: columnCount }, () => []);
    const totalItems = items.length;
    const baseItemsPerColumn = Math.floor(totalItems / columnCount);
    const extraItems = totalItems % columnCount;

    let currentIndex = 0;

    // Distribute items evenly with extra items in earlier columns
    for (let col = 0; col < columnCount; col++) {
        // Add one extra item to earlier columns if we have remainder
        const itemsInThisColumn = col < extraItems ? baseItemsPerColumn + 1 : baseItemsPerColumn;

        for (let i = 0; i < itemsInThisColumn; i++) {
            if (currentIndex < totalItems) {
                columns[col].push(items[currentIndex]);
                currentIndex++;
            }
        }
    }

    return columns;
};

// Calculate columns for dropdown based on number of items
const calculateColumns = computed(() => {
    if (!props.items || !props.items.length) return 1;

    // Calculate number of columns based on total items
    const totalItems = props.items.length;
    const maxColumns = 4;

    // Use Math.min to limit to 4 columns max
    return Math.min(Math.ceil(totalItems / props.itemsPerColumn), maxColumns);
});

// Get distributed items
const distributedColumns = computed(() => {
    if (!props.useColumnDistribution) return [];
    return distributeItemsInColumns(props.items, calculateColumns.value);
});

// Position the dropdown - improved positioning flow
const updatePosition = () => {
    if (!triggerRef.value || !dropdownRef.value) return;

    // Start with dropdown invisible while calculating position
    isPositioned.value = false;

    // Get trigger position relative to viewport
    const triggerRect = triggerRef.value.getBoundingClientRect();
    const { position, align } = props;

    // Screen dimensions
    const screenWidth = window.innerWidth;
    const screenHeight = window.innerHeight;
    const screenCenter = screenWidth / 2;
    const isOnRightSide = triggerRect.left > screenCenter;

    // Width calculation
    let widthValue = "auto";
    if (props.width === "full") {
        widthValue = `${triggerRect.width}px`;
    } else if (props.width !== "auto") {
        widthValue = props.width;
    }

    // Default positioning variables - using viewport coordinates
    let top = 0;
    let left = 0;
    let right = "auto";
    let transform = "none";

    // Add 5px offset for better visual spacing
    const offsetY = 5;

    // SPECIAL CASE: Center alignment - handle differently
    if (align === "center") {
        top = triggerRect.bottom + offsetY;
        left = triggerRect.left + triggerRect.width / 2;
        transform = "translateX(-50%)";
    }
    // Standard smart positioning logic
    else if (props.smartPosition) {
        // Position relative to the trigger in the viewport with offset
        top = triggerRect.bottom + offsetY; // Bottom edge of trigger in viewport + offset

        if (isOnRightSide) {
            // If on right half of screen, align right edges
            right = screenWidth - triggerRect.right;
            left = "auto";
        } else {
            // If on left half of screen, align left edges
            left = triggerRect.left;
            right = "auto";
        }
    } else {
        // Original positioning logic with viewport coordinates
        switch (position) {
            case "bottom":
                top = triggerRect.bottom + offsetY; // Add offset
                break;
            case "top":
                top = triggerRect.top - (dropdownRef.value?.offsetHeight || 0) - offsetY;
                break;
            case "left":
                left = triggerRect.left - (dropdownRef.value?.offsetWidth || 0) - offsetY;
                top = triggerRect.top;
                break;
            case "right":
                left = triggerRect.right + offsetY; // Add offset
                top = triggerRect.top;
                break;
        }

        switch (align) {
            case "start":
                left = position === "top" || position === "bottom" ? triggerRect.left : left;
                break;
            case "center":
                // Standard center alignment (not using transform)
                left =
                    position === "top" || position === "bottom"
                        ? triggerRect.left + triggerRect.width / 2 - (dropdownRef.value?.offsetWidth || 0) / 2
                        : left;
                top =
                    position === "left" || position === "right"
                        ? triggerRect.top + triggerRect.height / 2 - (dropdownRef.value?.offsetHeight || 0) / 2
                        : top;
                break;
            case "end":
                left =
                    position === "top" || position === "bottom"
                        ? triggerRect.right - (dropdownRef.value?.offsetWidth || 0)
                        : left;
                break;
        }
    }

    // Get dropdown dimensions - first pass
    const dropdownWidth = dropdownRef.value?.offsetWidth || 0;
    const dropdownHeight = dropdownRef.value?.offsetHeight || 0;

    // Apply initial styles with opacity 0 to measure properly without showing it
    dropdownStyles.value = {
        position: "fixed",
        top: `${top}px`,
        left: left !== "auto" ? `${left}px` : left,
        right: right !== "auto" ? `${right}px` : "auto",
        width: widthValue,
        maxHeight: `${props.maxHeight}vh`,
        zIndex: 50,
        transform,
        opacity: 0,
    };

    // Ensure we have proper dimensions before continuing
    nextTick(() => {
        // Get updated dropdown dimensions now that we've applied initial styles
        const updatedWidth = dropdownRef.value?.offsetWidth || dropdownWidth;
        const updatedHeight = dropdownRef.value?.offsetHeight || dropdownHeight;

        // For centered dropdowns
        if (align === "center") {
            // Reapply the position with proper measurements
            const leftEdge = left - updatedWidth / 2;
            const rightEdge = left + updatedWidth / 2;

            if (leftEdge < 8) {
                // Too close to left edge, adjust position
                const adjustment = 8 - leftEdge;
                dropdownStyles.value.transform = `translateX(calc(-50% + ${adjustment}px))`;
            } else if (rightEdge > screenWidth - 8) {
                // Too close to right edge, adjust position
                const adjustment = rightEdge - (screenWidth - 8);
                dropdownStyles.value.transform = `translateX(calc(-50% - ${adjustment}px))`;
            }
        }
        // Special handling for left side of screen
        else if (!isOnRightSide) {
            // Revalidate left position now that we have proper measurements
            if (left !== "auto" && left + updatedWidth > screenWidth - 8) {
                dropdownStyles.value.left = `${screenWidth - updatedWidth - 8}px`;
            }

            // Ensure we're not too far left
            if (left < 8 && left !== "auto") {
                dropdownStyles.value.left = "8px";
            }
        }
        // Special handling for right side of screen
        else {
            // Confirm the right-side positioning is correct
            if (right !== "auto") {
                // Make sure dropdown doesn't go off left edge of screen
                const calculatedLeft = screenWidth - right - updatedWidth;
                if (calculatedLeft < 8) {
                    dropdownStyles.value.right = `${screenWidth - updatedWidth - 16}px`;
                }
            }
        }

        // Vertical constraint within viewport
        if (top + updatedHeight > screenHeight - 8) {
            // Flip to above if below would go off screen
            if (position === "bottom" || props.smartPosition) {
                dropdownStyles.value.top = `${triggerRect.top - updatedHeight - offsetY}px`;
            } else {
                dropdownStyles.value.top = `${screenHeight - updatedHeight - 8}px`;
            }
        }

        // Finally make it visible after all positioning is correct
        dropdownStyles.value.opacity = 1;
        isPositioned.value = true;
    });
};

// Handle inner clicks
const handleContentClick = (e: MouseEvent) => {
    if (props.closeOnInnerClick) {
        isOpen.value = false;
    }
};

// Update position on scroll to ensure dropdowns follow the navbar when fixed
const handleScroll = () => {
    if (isOpen.value) {
        updatePosition();
    }
};

// Update position when dropdown state changes
watch(
    () => isOpen.value,
    (value) => {
        if (value) {
            // Reset positioning status when opening
            isPositioned.value = false;

            // Use nextTick to ensure the dropdown is rendered before measuring
            nextTick(() => {
                updatePosition();
                window.addEventListener("resize", updatePosition);
                window.addEventListener("scroll", handleScroll);
            });
        } else {
            window.removeEventListener("resize", updatePosition);
            window.removeEventListener("scroll", handleScroll);
        }
    },
);

// Event handlers for keyboard navigation
onMounted(() => {
    window.addEventListener("keydown", handleKeydown);
});

onUnmounted(() => {
    window.removeEventListener("keydown", handleKeydown);
    window.removeEventListener("resize", updatePosition);
    window.removeEventListener("scroll", updatePosition);

    // Clear any remaining hover timers
    if (hoverTimer.value) {
        clearTimeout(hoverTimer.value);
        hoverTimer.value = null;
    }
});

// Column style based on props
const contentStyle = computed(() => {
    if (props.columns <= 1) return {};

    return {
        columnCount: props.columns,
        columnGap: "1rem",
    };
});
</script>

<template>
    <div class="custom-dropdown-container" @mouseenter="handleMouseEnter" @mouseleave="handleMouseLeave">
        <!-- Use stopPropagation to prevent click events from bubbling -->
        <div ref="triggerRef" @click.stop="toggleDropdown" @keydown.enter.space.prevent="toggleDropdown"
            class="cursor-pointer" :tabindex="0" role="button" :aria-expanded="isOpen" aria-haspopup="true">
            <slot name="trigger"></slot>
        </div>

        <!-- Dropdown content -->
        <Teleport to="body">
            <!-- Add a class that depends on positioning status -->
            <Transition name="dropdown">
                <div v-if="isOpen" ref="dropdownRef" class="custom-dropdown" :class="{ 'is-positioned': isPositioned }"
                    :style="dropdownStyles" @click="handleContentClick" @mouseenter="handleMouseEnter"
                    @mouseleave="handleMouseLeave">
                    <div class="dropdown-content" :style="contentStyle">
                        <!-- When using automatic column distribution -->
                        <template v-if="useColumnDistribution && distributedColumns.length">
                            <div class="flex space-x-4">
                                <div v-for="(column, colIndex) in distributedColumns" :key="`col-${colIndex}`"
                                    class="min-w-[200px]">
                                    <slot name="column-item" v-for="(item, itemIndex) in column" :item="item"
                                        :index="itemIndex"></slot>
                                </div>
                            </div>
                        </template>

                        <!-- Default slot for custom content -->
                        <slot v-else></slot>
                    </div>
                </div>
            </Transition>
        </Teleport>
    </div>
</template>

<style scoped>
.custom-dropdown {
    background-color: var(--ui-bg, #ffffff);
    border-radius: var(--ui-radius, 0.5rem);
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
    border: 1px solid var(--ui-border, rgba(229, 231, 235));
    color: var(--ui-text, inherit);
    overflow-y: auto;
}

:root.dark .custom-dropdown {
    background-color: var(--ui-bg, rgb(31, 41, 55));
    border-color: var(--ui-border, rgba(55, 65, 81));
}

.dropdown-content {
    padding: 0.5rem;
}

/* Animation for dropdown - updated with proper transitions */
.dropdown-enter-active,
.dropdown-leave-active {
    transition: opacity 0.2s, transform 0.2s;
    transform-origin: top center;
}

.dropdown-enter-from,
.dropdown-leave-to {
    opacity: 0;
    transform: translateY(-0.75rem);
}

/* Override transitions when positioning isn't complete */
.custom-dropdown {
    transition: opacity 0.15s ease-out;
}

.custom-dropdown:not(.is-positioned) {
    /* Prevent animation until properly positioned */
    pointer-events: none;
}

/* Add cursor-pointer for items in dropdown */
:deep(.dropdown-content a),
:deep(.dropdown-content button) {
    cursor: pointer;
}
</style>
