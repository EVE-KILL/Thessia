<script setup lang="ts">
import { computed } from "vue";

const eveImages = useEveImages();

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
    | "type-overlay-render"
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
                "type-overlay-render",
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
        type: [Number, String],
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
    // Loading strategy (lazy by default)
    loading: {
        type: String as () => 'lazy' | 'eager',
        default: "lazy",
        validator: (value: string) => ['lazy', 'eager'].includes(value),
    },
    // Priority hint for the image (maps to fetchpriority)
    priority: {
        type: Boolean,
        default: false,
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
        default: "bottom-right",
        validator: (value: string) =>
            ["top-left", "top-right", "bottom-left", "bottom-right"].includes(value),
    },
});

// Normalized EVE image size
const eveSize = computed(() => {
    // Default sizes per image type
    const defaults: Record<EveImageType, number> = {
        character: 128,
        faction: 64,
        corporation: 64,
        alliance: 64,
        "type-icon": 64,
        "type-render": 512,
        "type-overlay-render": 512,
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
    const idAsNumber = Number(props.id);

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
        case "type-overlay-render":
            return eveImages.getTypeOverlayRender(idAsNumber, eveSize.value);
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
            return eveImages.getItemImageUrl(idAsNumber, props.name, "icon", eveSize.value);
        default:
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
    const classes = ['relative', 'z-0'];
    if (props.class) {
        classes.push(props.class);
    }

    if (props.rounded) {
        classes.push("rounded-br-lg", "rounded-bl-lg", "rounded-tr-lg");
    }

    if (props.fit) {
        classes.push(`object-${props.fit}`);
    }

    return classes.join(" ");
});

// Simple fetchpriority based on priority prop
const fetchpriority = computed(() => {
    return props.priority ? "high" : "auto";
});

// Count position class
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
        <img v-if="src" :src="src" :alt="alt" :class="imageClasses" :width="imgWidth" :height="imgHeight"
            :loading="loading" :fetchpriority="fetchpriority" />
        <div v-else :class="['bg-gray-200 dark:bg-gray-700 flex items-center justify-center', imageClasses]"
            :style="{ width: `${imgWidth}px`, height: `${imgHeight}px` }">
            <UIcon name="lucide:image" class="text-gray-400 dark:text-gray-500" />
        </div>
        <span v-if="props.showCount && props.count !== null" :class="[
            'absolute z-10 text-xs text-white leading-none px-1 py-0.5 bg-black/70 rounded-sm',
            countPositionClass,
        ]">
            {{ props.count }}
        </span>
    </div>
</template>
