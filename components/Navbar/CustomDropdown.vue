<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed, watch, nextTick } from 'vue';
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

// Position the dropdown - completely revised for viewport-based positioning
const updatePosition = () => {
  if (!triggerRef.value || !dropdownRef.value) return;

  // Get trigger position relative to viewport
  const triggerRect = triggerRef.value.getBoundingClientRect();
  const { position, align } = props;

  // Screen dimensions
  const screenWidth = window.innerWidth;
  const screenHeight = window.innerHeight;
  const screenCenter = screenWidth / 2;
  const isOnRightSide = triggerRect.left > screenCenter;

  // Width calculation
  let widthValue = 'auto';
  if (props.width === 'full') {
    widthValue = `${triggerRect.width}px`;
  } else if (props.width !== 'auto') {
    widthValue = props.width;
  }

  // Default positioning variables - using viewport coordinates
  let top = 0;
  let left = 0;
  let right = 'auto';

  // Add 5px offset for better visual spacing
  const offsetY = 5;

  // Smart positioning logic - using viewport coordinates
  if (props.smartPosition) {
    // Position relative to the trigger in the viewport with offset
    top = triggerRect.bottom + offsetY; // Bottom edge of trigger in viewport + offset

    if (isOnRightSide) {
      // If on right half of screen, align right edges
      right = screenWidth - triggerRect.right;
      left = 'auto';
    } else {
      // If on left half of screen, align left edges
      left = triggerRect.left;
      right = 'auto';
    }
  } else {
    // Original positioning logic with viewport coordinates
    switch (position) {
      case 'bottom':
        top = triggerRect.bottom + offsetY; // Add offset
        break;
      case 'top':
        top = triggerRect.top - (dropdownRef.value?.offsetHeight || 0) - offsetY; // Subtract offset for top positioning
        break;
      case 'left':
        left = triggerRect.left - (dropdownRef.value?.offsetWidth || 0) - offsetY; // Subtract offset for left positioning
        top = triggerRect.top;
        break;
      case 'right':
        left = triggerRect.right + offsetY; // Add offset
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

  // Get dropdown dimensions
  const dropdownWidth = dropdownRef.value?.offsetWidth || 0;
  const dropdownHeight = dropdownRef.value?.offsetHeight || 0;

  // Horizontal constraint within viewport
  if (left !== 'auto' && left + dropdownWidth > screenWidth) {
    left = screenWidth - dropdownWidth - 8;
  }
  if (left !== 'auto' && left < 8) {
    left = 8;
  }

  // Vertical constraint within viewport
  if (top + dropdownHeight > screenHeight) {
    // Flip to above if below would go off screen
    if (position === 'bottom' || props.smartPosition) {
      top = triggerRect.top - dropdownHeight;
    } else {
      top = screenHeight - dropdownHeight - 8;
    }
  }
  if (top < 8) {
    top = 8;
  }

  // Apply final styles - using fixed position to stay relative to viewport
  dropdownStyles.value = {
    position: 'fixed', // Key change: use fixed positioning to stay in viewport
    top: `${top}px`,
    left: left !== 'auto' ? `${left}px` : left,
    right: right !== 'auto' ? `${right}px` : 'auto',
    width: widthValue,
    maxHeight: `${props.maxHeight}vh`,
    zIndex: 50
  };

  // Apply second-level adjustments after rendering
  setTimeout(() => {
    if (dropdownRef.value) {
      const actualDropdownWidth = dropdownRef.value.offsetWidth;

      // Adjust horizontal position if needed
      if (props.smartPosition) {
        if (isOnRightSide) {
          dropdownStyles.value.right = `${screenWidth - triggerRect.right}px`;
          dropdownStyles.value.left = 'auto';
        } else {
          dropdownStyles.value.left = `${triggerRect.left}px`;
          dropdownStyles.value.right = 'auto';
        }

        // Final edge detection
        if (left !== 'auto' && left + actualDropdownWidth > screenWidth) {
          dropdownStyles.value.left = `${screenWidth - actualDropdownWidth - 8}px`;
        }
      }
    }
  }, 10);
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
watch(() => isOpen.value, (value) => {
  if (value) {
    // Use nextTick to ensure the dropdown is rendered before measuring
    nextTick(() => {
      updatePosition();
      window.addEventListener('resize', updatePosition);
      window.addEventListener('scroll', handleScroll);
    });
  } else {
    window.removeEventListener('resize', updatePosition);
    window.removeEventListener('scroll', handleScroll);
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
