<script setup lang="ts">
import { computed } from 'vue';

const eveImages = useEveImages();

/**
 * Props for the component
 */
const props = defineProps({
  // The type of EVE image to display
  type: {
    type: String,
    required: true,
    validator: (value: string) => ['character', 'corporation', 'alliance', 'type-icon', 'type-render'].includes(value)
  },
  // The ID for the image (character ID, corporation ID, etc.)
  id: {
    type: Number,
    required: true
  },
  // Alt text for accessibility
  alt: {
    type: String,
    default: ''
  },
  // Image size in pixels - will be normalized to nearest valid EVE image size
  size: {
    type: Number,
    default: null,
    validator: (value: number) => value > 0
  },
  // Custom CSS classes
  class: {
    type: String,
    default: ''
  },
  // Image width (if different from size)
  width: {
    type: Number,
    default: null
  },
  // Image height (if different from size)
  height: {
    type: Number,
    default: null
  },
  // NuxtImg format
  format: {
    type: String,
    default: 'webp'
  },
  // NuxtImg quality - now properly typed as Number
  quality: {
    type: Number,
    default: 80
  },
  // Optional fit mode
  fit: {
    type: String,
    default: 'cover'
  },
  // Whether to apply rounded corners
  rounded: {
    type: Boolean,
    default: true
  },
  // Use rounded-full for completely round images
  circle: {
    type: Boolean,
    default: false
  }
});

// Normalized EVE image size
const eveSize = computed(() => {
  // Default sizes per image type
  const defaults = {
    'character': 128,
    'corporation': 64,
    'alliance': 64,
    'type-icon': 64,
    'type-render': 512
  };

  // Use prop size or default for type
  const requestedSize = props.size || defaults[props.type];

  // Return the nearest valid EVE image size
  return eveImages.normalizeSize(requestedSize);
});

// Compute the image source URL based on the type and ID
const src = computed(() => {
  switch (props.type) {
    case 'character':
      return eveImages.getCharacterPortrait(props.id, eveSize.value);
    case 'corporation':
      return eveImages.getCorporationLogo(props.id, eveSize.value);
    case 'alliance':
      return eveImages.getAllianceLogo(props.id, eveSize.value);
    case 'type-icon':
      return eveImages.getTypeIcon(props.id, eveSize.value);
    case 'type-render':
      return eveImages.getTypeRender(props.id, eveSize.value);
    default:
      return null;
  }
});

// Define dimensions for the image display (can differ from actual EVE image size)
const imgWidth = computed(() => props.width || props.size || eveSize.value);
const imgHeight = computed(() => props.height || props.size || eveSize.value);

// Computed classes for the image
const imageClasses = computed(() => {
  const classes = props.class ? [props.class] : [];

  if (props.rounded && !props.circle) {
    classes.push('rounded-lg');
  }

  if (props.circle) {
    classes.push('rounded-full');
  }

  if (props.fit) {
    classes.push(`object-${props.fit}`);
  }

  return classes.join(' ');
});
</script>

<template>
  <NuxtImg
    v-if="src"
    :src="src"
    :alt="alt"
    :class="imageClasses"
    :width="imgWidth"
    :height="imgHeight"
    :format="format"
    :quality="quality"
  />
  <div
    v-else
    :class="['bg-gray-200 dark:bg-gray-700 flex items-center justify-center', imageClasses]"
    :style="{ width: `${imgWidth}px`, height: `${imgHeight}px` }"
  >
    <UIcon name="lucide:image" class="text-gray-400 dark:text-gray-500" />
  </div>
</template>
