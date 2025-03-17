<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed, watch } from 'vue';
import { onClickOutside } from '@vueuse/core';

const props = defineProps({
  // Support for multi-column layout
  columns: {
    type: Number,
    default: 1
  },
  // Control max height for scroll (vh units)
  maxHeight: {
    type: Number,
    default: 50 // 50vh by default
  },
  // Position relative to trigger (top, bottom, left, right)
  position: {
    type: String,
    default: 'bottom'
  },
  // Alignment (start, center, end)
  align: {
    type: String,
    default: 'start'
  },
  // Whether the dropdown should close when clicking inside
  closeOnInnerClick: {
    type: Boolean,
    default: false
  },
  // Width of dropdown (auto, full, or pixel value)
  width: {
    type: String,
    default: 'auto'
  },
  // Whether to show the dropdown
  modelValue: {
    type: Boolean,
    default: false
  },
  // Whether to use smart positioning based on screen edge
  smartPosition: {
    type: Boolean,
    default: true
  },
  // Whether to use built-in column distribution
  useColumnDistribution: {
    type: Boolean,
    default: false
  },
  // Item data for column distribution (when useColumnDistribution is true)
  items: {
    type: Array,
    default: () => []
  },
  // Items per column threshold
  itemsPerColumn: {
    type: Number,
    default: 10
  }
});

const emit = defineEmits(['update:modelValue']);

const isOpen = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
});

const dropdownRef = ref<HTMLElement | null>(null);
const triggerRef = ref<HTMLElement | null>(null);
const dropdownStyles = ref({});

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
  if (e.key === 'Escape' && isOpen.value) {
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
    const itemsInThisColumn = col < extraItems
      ? baseItemsPerColumn + 1
      : baseItemsPerColumn;

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

// Position the dropdown
const updatePosition = () => {
  if (!triggerRef.value || !dropdownRef.value) return;

  const triggerRect = triggerRef.value.getBoundingClientRect();
  const { position, align } = props;
  const screenWidth = window.innerWidth;
  const screenCenter = screenWidth / 2;
  const isOnRightSide = triggerRect.left > screenCenter;

  // Width calculation
  let widthValue = 'auto';
  if (props.width === 'full') {
    widthValue = `${triggerRect.width}px`;
  } else if (props.width !== 'auto') {
    widthValue = props.width;
  }

  // Default positioning variables
  let top = 0;
  let left = 0;
  let right = 'auto';

  // Smart positioning logic - prioritize keeping dropdown visible on screen
  if (props.smartPosition) {
    // Always position below the trigger by default
    top = triggerRect.bottom + window.scrollY;

    if (isOnRightSide) {
      // If on right half of screen, align right edges
      right = `${window.innerWidth - triggerRect.right}px`;
      left = 'auto';
    } else {
      // If on left half of screen, align left edges
      left = triggerRect.left;
      right = 'auto';
    }
  } else {
    // Original positioning logic
    switch (position) {
      case 'bottom':
        top = triggerRect.bottom;
        break;
      case 'top':
        top = triggerRect.top - (dropdownRef.value?.offsetHeight || 0);
        break;
      case 'left':
        left = triggerRect.left - (dropdownRef.value?.offsetWidth || 0);
        top = triggerRect.top;
        break;
      case 'right':
        left = triggerRect.right;
        top = triggerRect.top;
        break;
    }

    switch (align) {
      case 'start':
        left = position === 'top' || position === 'bottom' ? triggerRect.left : left;
        break;
      case 'center':
        left = position === 'top' || position === 'bottom'
          ? triggerRect.left + (triggerRect.width / 2) - ((dropdownRef.value?.offsetWidth || 0) / 2)
          : left;
        top = position === 'left' || position === 'right'
          ? triggerRect.top + (triggerRect.height / 2) - ((dropdownRef.value?.offsetHeight || 0) / 2)
          : top;
        break;
      case 'end':
        left = position === 'top' || position === 'bottom'
          ? triggerRect.right - (dropdownRef.value?.offsetWidth || 0)
          : left;
        break;
    }
  }

  // Ensure the dropdown doesn't go outside the viewport
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  const dropdownWidth = dropdownRef.value?.offsetWidth || 0;
  const dropdownHeight = dropdownRef.value?.offsetHeight || 0;

  // Horizontal constraint
  if (left !== 'auto' && left + dropdownWidth > viewportWidth) {
    left = viewportWidth - dropdownWidth - 8;
  }
  if (left !== 'auto' && left < 8) {
    left = 8;
  }

  // Vertical constraint
  if (top + dropdownHeight > viewportHeight) {
    // Flip to above if below would go off screen
    if (position === 'bottom' || props.smartPosition) {
      top = triggerRect.top - dropdownHeight + window.scrollY;
    } else {
      top = viewportHeight - dropdownHeight - 8 + window.scrollY;
    }
  }
  if (top < 8) {
    top = 8;
  }

  // Apply final styles
  dropdownStyles.value = {
    position: 'absolute',
    top: `${top}px`,
    left: left !== 'auto' ? `${left}px` : left,
    right: right !== 'auto' ? right : 'auto',
    width: widthValue,
    maxHeight: `${props.maxHeight}vh`,
    zIndex: 50
  };

  // After applying styles, we need a short delay to ensure accurate measurements
  // when first opening the dropdown
  setTimeout(() => {
    // Do a second measurement after the content has had time to render fully
    if (dropdownRef.value) {
      // Recalculate with actual rendered dimensions
      const dropdownWidth = dropdownRef.value.offsetWidth;
      const dropdownHeight = dropdownRef.value.offsetHeight;

      // Update horizontal position
      if (props.smartPosition) {
        const isOnRightSide = triggerRect.left > screenCenter;

        if (isOnRightSide) {
          // Align right edges
          dropdownStyles.value.right = `${window.innerWidth - triggerRect.right}px`;
          dropdownStyles.value.left = 'auto';
        } else {
          // Align left edges
          dropdownStyles.value.left = `${triggerRect.left}px`;
          dropdownStyles.value.right = 'auto';
        }

        // Additional edge detection
        if (left !== 'auto' && left + dropdownWidth > viewportWidth) {
          dropdownStyles.value.left = `${viewportWidth - dropdownWidth - 8}px`;
        }
      }
    }
  }, 10); // Very short timeout to ensure DOM has updated
};

// Handle inner clicks
const handleContentClick = (e: MouseEvent) => {
  if (props.closeOnInnerClick) {
    isOpen.value = false;
  }
};

// Update position when dropdown state changes
watch(() => isOpen.value, (value) => {
  if (value) {
    // Use nextTick to ensure the dropdown is rendered before measuring
    nextTick(() => {
      updatePosition();
      window.addEventListener('resize', updatePosition);
      window.addEventListener('scroll', updatePosition);
    });
  } else {
    window.removeEventListener('resize', updatePosition);
    window.removeEventListener('scroll', updatePosition);
  }
});

// Event handlers for keyboard navigation
onMounted(() => {
  window.addEventListener('keydown', handleKeydown);
});

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown);
  window.removeEventListener('resize', updatePosition);
  window.removeEventListener('scroll', updatePosition);
});

// Column style based on props
const contentStyle = computed(() => {
  if (props.columns <= 1) return {};

  return {
    columnCount: props.columns,
    columnGap: '1rem'
  };
});
</script>

<template>
  <div class="custom-dropdown-container">
    <!-- Use stopPropagation to prevent click events from bubbling -->
    <div ref="triggerRef" @click.stop="toggleDropdown">
      <slot name="trigger"></slot>
    </div>

    <!-- Dropdown content -->
    <Teleport to="body">
      <Transition name="dropdown">
        <div
          v-if="isOpen"
          ref="dropdownRef"
          class="custom-dropdown"
          :style="dropdownStyles"
          @click="handleContentClick"
        >
          <div
            class="dropdown-content"
            :style="contentStyle"
          >
            <!-- When using automatic column distribution -->
            <template v-if="useColumnDistribution && distributedColumns.length">
              <div class="flex space-x-4">
                <div
                  v-for="(column, colIndex) in distributedColumns"
                  :key="`col-${colIndex}`"
                  class="min-w-[200px]"
                >
                  <slot name="column-item" v-for="(item, itemIndex) in column" :item="item" :index="itemIndex"></slot>
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

/* Animation for dropdown */
.dropdown-enter-active,
.dropdown-leave-active {
  transition: opacity 0.2s, transform 0.2s;
  transform-origin: top;
}

.dropdown-enter-from,
.dropdown-leave-to {
  opacity: 0;
  transform: translateY(-0.25rem);
}
</style>
