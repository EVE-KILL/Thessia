<script setup lang="ts">
import { computed, ref } from "vue";

/**
 * Column definition for the Table component
 */
export interface TableColumn {
    id: string; // Unique ID for the column
    header?: string | (() => any); // Column header text or function returning a VNode
    headerClass?: string; // Optional CSS class for header cell
    width?: string; // Optional width (e.g., '20%', '100px')
    cellClass?: string; // Optional CSS class for cells in this column
    sortable?: boolean; // Whether the column is sortable
}

/**
 * Props for the Table component
 */
const props = defineProps({
    /**
     * The columns configuration array
     */
    columns: {
        type: Array as PropType<TableColumn[]>,
        required: true,
    },
    /**
     * The data items to display
     */
    items: {
        type: Array,
        default: () => [],
    },
    /**
     * Whether the table is in loading state
     */
    loading: {
        type: Boolean,
        default: false,
    },
    /**
     * Number of skeleton rows to display when loading
     */
    skeletonCount: {
        type: Number,
        default: 5,
    },
    /**
     * Text to display when there are no items
     */
    emptyText: {
        type: String,
        default: "No data available",
    },
    /**
     * Icon to display in empty state
     */
    emptyIcon: {
        type: String,
        default: "i-lucide-file-text",
    },
    /**
     * CSS class or function returning CSS class for rows
     */
    rowClass: {
        type: [String, Function],
        default: "",
    },
    /**
     * Force mobile view regardless of screen size
     */
    forceMobile: {
        type: Boolean,
        default: false,
    },
    /**
     * Force desktop view regardless of screen size
     */
    forceDesktop: {
        type: Boolean,
        default: false,
    },
    /**
     * Optional additional class for the table container
     */
    tableClass: {
        type: String,
        default: "",
    },
    /**
     * Optional additional class for the header row
     */
    headerClass: {
        type: String,
        default: "",
    },
    /**
     * Show table header (true) or hide it (false)
     */
    showHeader: {
        type: Boolean,
        default: true,
    },
    /**
     * Spacing density: 'compact', 'normal', or 'relaxed'
     */
    density: {
        type: String,
        default: "normal",
        validator: (value: string) => ["compact", "normal", "relaxed"].includes(value),
    },
    /**
     * Whether to stripe alternate rows with different background
     */
    striped: {
        type: Boolean,
        default: false,
    },
    /**
     * Whether to show borders between rows
     */
    bordered: {
        type: Boolean,
        default: true,
    },
    /**
     * Whether to add hover effect to rows
     */
    hover: {
        type: Boolean,
        default: true,
    },
    /**
     * Set to true to initialize the table with fit-content width
     */
    fitContent: {
        type: Boolean,
        default: false,
    },
    /**
     * Background style: 'default', 'transparent', 'subtle'
     */
    background: {
        type: String,
        default: "default",
        validator: (value: string) => ["default", "transparent", "subtle"].includes(value),
    },
    /**
     * Custom class for skeleton elements
     */
    skeletonClass: {
        type: String,
        default: "",
    },
    /**
     * Whether to render the table header with special styling
     */
    specialHeader: {
        type: Boolean,
        default: false,
    },

    /**
     * Function to generate a link URL for a row, if the row should be clickable
     * Returns string URL or null/undefined if row shouldn't be a link
     */
    linkFn: {
        type: Function as PropType<(item: any) => string | null | undefined>,
        default: null,
    },

    /**
     * Whether to open links in a new tab by default
     */
    openInNewTab: {
        type: Boolean,
        default: false,
    },

    /**
     * Whether to show both the header title and column headers together
     * When true, both will be shown; when false, only one will be shown based on presence
     */
    showBothHeaders: {
        type: Boolean,
        default: false,
    },

    /**
     * Whether to display table in horizontal layout (items as columns)
     */
    horizontal: {
        type: Boolean,
        default: false,
    },

    /**
     * Number of items to display per row in horizontal mode
     */
    horizontalItemsPerRow: {
        type: Number,
        default: 7,
    },
});

const emit = defineEmits(["row-click"]);

// Track mouse events for handling middle clicks
const lastMouseEvent = ref<MouseEvent | null>(null);
const isMouseButtonDown = ref(false);

// Responsive detection with SSR compatibility
const { nuxtDevice } = useResponsive();

// Use a more SSR-friendly approach for mobile detection
const useMobileView = computed(() => {
    if (props.forceMobile) return true;
    if (props.forceDesktop) return false;

    // Always use Nuxt's device detection for consistency between SSR and client
    // This prevents layout shifts when client-side responsive detection differs
    return nuxtDevice.isMobile;
});

// Generate skeleton rows for loading state
const skeletonRows = computed(() =>
    Array(props.skeletonCount)
        .fill(0)
        .map((_, index) => ({
            id: `skeleton-${index}`,
            isLoading: true,
        })),
);

/**
 * Handle row click with improved link handling
 * @param item - The clicked data item
 * @param event - The mouse event
 */
const handleRowClick = (item: any, event: MouseEvent) => {
    // Emit row click event for custom handling if needed
    emit("row-click", { item, event });

    // Skip handling if:
    // 1. It's not a primary (left) mouse button click, OR
    // 2. No link function provided, OR
    // 3. Event originated from inside an <a> tag (let the browser handle it natively)
    if (
        event.button !== 0 ||
        !props.linkFn ||
        event.target instanceof HTMLAnchorElement ||
        (event.target as Element).closest("a")
    ) {
        return;
    }

    // For Ctrl/Cmd + click, we'll handle this manually since our anchor is at row level
    const url = props.linkFn(item);
    if (!url) return;

    // Prevent default behavior
    event.preventDefault();
    // Use Nuxt's navigateTo for SPA navigation to trigger page hooks
    if (event.ctrlKey || event.metaKey || props.openInNewTab) {
        // For ctrl/cmd clicks or when openInNewTab is true, open in new tab
        window.open(url, "_blank");
    } else {
        // For normal clicks, use navigateTo to trigger Nuxt page hooks
        navigateTo(url);
    }
};

// Get CSS class for a row
const getRowClasses = (item: any, index: number) => {
    const baseClasses = [];

    // Add striped class for alternating rows if enabled
    if (props.striped && index % 2 === 1) {
        baseClasses.push("table-row-striped");
    }

    // Add hover class if enabled
    if (props.hover) {
        baseClasses.push("hover-effect");
    }

    // Add user-defined classes
    if (typeof props.rowClass === "function") {
        baseClasses.push(props.rowClass(item));
    } else if (props.rowClass) {
        baseClasses.push(props.rowClass);
    }

    return baseClasses.join(" ");
};

// Computed classes for the table container
const tableContainerClasses = computed(() => {
    const classes = ["ek-table-container"];

    if (useMobileView.value) {
        classes.push("mobile-view");
    }

    if (props.horizontal) {
        classes.push("horizontal-layout");
    }

    if (props.tableClass) {
        classes.push(props.tableClass);
    }

    if (props.fitContent) {
        classes.push("fit-content");
    }

    // Add background style class
    classes.push(`bg-${props.background}`);

    return classes.join(" ");
});

// Computed CSS custom properties for grid columns
const gridColumns = computed(() => {
    if (useMobileView.value || props.horizontal) {
        return {};
    }

    const columnWidths = props.columns.map(col => col.width || "1fr").join(" ");
    return {
        "--grid-columns": columnWidths
    };
});

// Computed classes for the table header
const tableHeaderClasses = computed(() => {
    const classes = ["table-header"];

    if (props.headerClass) {
        classes.push(props.headerClass);
    }

    // Add density class to header
    classes.push(`density-${props.density}`);

    return classes.join(" ");
});

// Computed classes for the table rows
const tableRowClasses = computed(() => {
    const classes = ["table-row"];

    // Add density class to rows
    classes.push(`density-${props.density}`);

    // Add bordered class if enabled
    if (props.bordered) {
        classes.push("bordered");
    }

    return classes.join(" ");
});

// Generate URL for a row if it's a link
const getRowUrl = (item: any): string | null => {
    if (!props.linkFn) return null;
    return props.linkFn(item);
};
</script>

<template>
    <div :class="tableContainerClasses" :style="gridColumns">
        <!-- Only keep the column headers section -->
        <div v-if="!useMobileView && showHeader && !horizontal"
            :class="[tableHeaderClasses, { 'special-header': specialHeader }]">
            <div v-for="column in columns" :key="column.id" class="header-cell" :class="[column.headerClass]">
                <slot :name="`header-${column.id}`" :column="column">
                    {{ typeof column.header === 'function' ? column.header() : column.header }}
                </slot>
            </div>
        </div>

        <!-- Table Body - Vertical Layout (Default) -->
        <div v-if="!horizontal" class="table-body">
            <!-- Loading State -->
            <template v-if="loading">
                <!-- First check for custom skeleton template -->
                <slot name="skeleton" :mobile="useMobileView" :columns="columns" :count="skeletonCount">
                    <!-- Default skeleton fallback -->
                    <div v-for="(skeleton, index) in skeletonRows" :key="`skeleton-${index}`"
                        :class="[tableRowClasses, 'skeleton-row']">
                        <slot name="loading" :mobile="useMobileView" :index="index" :columns="columns">
                            <template v-if="useMobileView">
                                <!-- Mobile Loading Skeleton -->
                                <div class="mobile-skeleton-container">
                                    <div :class="['skeleton-ship', 'rounded-md', skeletonClass]"></div>
                                    <div class="skeleton-content">
                                        <div :class="['skeleton-line-full', skeletonClass]"></div>
                                        <div :class="['skeleton-line-med', skeletonClass]"></div>
                                        <div :class="['skeleton-line-wide', skeletonClass]"></div>
                                        <div :class="['skeleton-line-small', skeletonClass]"></div>
                                    </div>
                                </div>
                            </template>
                            <template v-else>
                                <!-- Desktop Loading Skeletons -->
                                <div v-for="column in columns" :key="column.id" class="body-cell skeleton"
                                    :class="[column.id, column.cellClass]">
                                    <slot :name="`loading-${column.id}`" :column="column">
                                        <div :class="['skeleton-item', skeletonClass]"></div>
                                    </slot>
                                </div>
                            </template>
                        </slot>
                    </div>
                </slot>
            </template>

            <!-- Empty State -->
            <div v-else-if="items.length === 0" class="empty-state">
                <slot name="empty">
                    <Icon :name="emptyIcon" class="empty-icon" />
                    <span>{{ emptyText }}</span>
                </slot>
            </div>

            <!-- Data Rows - Using native anchor elements for all link handling -->
            <component v-else v-for="(item, index) in items" :key="item.id || `item-${index}`"
                :is="props.linkFn && props.linkFn(item) ? 'nuxtlink' : 'div'"
                :to="props.linkFn && props.linkFn(item) ? props.linkFn(item) : null"
                :target="props.openInNewTab ? '_blank' : null" :rel="props.openInNewTab ? 'noopener' : null" :class="[
                    tableRowClasses,
                    getRowClasses(item, index),
                    { 'has-link': props.linkFn && props.linkFn(item) }
                ]" @click="(e) => handleRowClick(item, e)">
                <!-- Mobile View -->
                <template v-if="useMobileView">
                    <slot name="mobile-row" :item="item" :index="index">
                        <div class="mobile-container">
                            <slot name="mobile-content" :item="item" :index="index">
                                <div class="mobile-content">
                                    <div class="mobile-header">
                                        <span class="mobile-title">{{ item.name || 'Item' }}</span>
                                    </div>
                                </div>
                            </slot>
                        </div>
                    </slot>
                </template>

                <!-- Desktop View -->
                <template v-else>
                    <template v-for="column in columns" :key="column.id">
                        <div class="body-cell" :class="[column.id, column.cellClass]">
                            <slot :name="`cell-${column.id}`" :item="item" :column="column" :index="index">
                                <!-- Default cell content -->
                                {{ item[column.id] }}
                            </slot>
                        </div>
                    </template>
                </template>
            </component>
        </div>

        <!-- Horizontal Layout -->
        <div v-else class="horizontal-body">
            <!-- Horizontal Loading State -->
            <template v-if="loading">
                <!-- First check for custom horizontal skeleton template -->
                <slot name="horizontal-skeleton" :mobile="useMobileView" :count="skeletonCount">
                    <div class="horizontal-grid">
                        <slot name="horizontal-loading" :mobile="useMobileView">
                            <div v-for="(skeleton, index) in skeletonRows" :key="`skeleton-${index}`"
                                class="horizontal-item skeleton-item-container">
                                <div class="skeleton-item-box">
                                    <div :class="['skeleton-image rounded-md', skeletonClass]"></div>
                                    <div :class="['skeleton-line-full mt-2', skeletonClass]"></div>
                                    <div :class="['skeleton-line-med mt-1', skeletonClass]"></div>
                                </div>
                            </div>
                        </slot>
                    </div>
                </slot>
            </template>

            <!-- Horizontal Empty State -->
            <div v-else-if="items.length === 0" class="empty-state">
                <slot name="empty">
                    <Icon :name="emptyIcon" class="empty-icon" />
                    <span>{{ emptyText }}</span>
                </slot>
            </div>

            <!-- Horizontal Items Grid -->
            <div v-else class="horizontal-grid" :class="[`grid-cols-${useMobileView ? 2 : horizontalItemsPerRow}`]">
                <component v-for="(item, index) in items" :key="item.id || `item-${index}`"
                    :is="getRowUrl(item) ? 'NuxtLink' : 'div'" :to="getRowUrl(item) || undefined"
                    :target="getRowUrl(item) && props.openInNewTab ? '_blank' : undefined"
                    :rel="getRowUrl(item) && props.openInNewTab ? 'noopener' : undefined" class="horizontal-item"
                    :class="[getRowClasses(item, index), { 'has-link': !!getRowUrl(item) }]"
                    @click="(e) => handleRowClick(item, e)">
                    <slot name="horizontal-item" :item="item" :index="index">
                        <div class="horizontal-item-content">
                            {{ item.name || 'Item' }}
                        </div>
                    </slot>
                </component>
            </div>
        </div>
        <!-- Optional: Add a minimal placeholder or loading indicator for the pre-mount state if needed -->
        <!-- <div v-else class="min-h-[100px]">Loading...</div> -->
    </div>
</template>

<style scoped>
/* Table container */
.ek-table-container {
    display: flex;
    flex-direction: column;
    width: 100%;
    gap: 0;
    /* Remove gap to prevent spacing conflicts with section headers */
    border-radius: 0.5rem;
    overflow: hidden;
    font-size: 0.875rem;
    /* Explicit base font size to prevent inheritance issues */
    line-height: 1.25rem;
    /* Explicit line height */
}

/* Horizontal Layout */
.horizontal-body {
    width: 100%;
}

.horizontal-grid {
    display: grid;
    grid-template-columns: repeat(var(--cols, 7), 1fr);
    gap: 0.75rem;
    padding: 0.5rem;
}

.grid-cols-2 {
    --cols: 2;
}

.grid-cols-3 {
    --cols: 3;
}

.grid-cols-4 {
    --cols: 4;
}

.grid-cols-5 {
    --cols: 5;
}

.grid-cols-6 {
    --cols: 6;
}

.grid-cols-7 {
    --cols: 7;
}

.horizontal-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 0.5rem;
    border-radius: 0.375rem;
    transition: background-color 0.2s;
    cursor: pointer;
    text-decoration: none;
    color: inherit;
}

.horizontal-item.has-link:hover {
    background-color: light-dark(rgba(229, 231, 235, 0.25), rgba(45, 45, 45, 0.6));
}

.horizontal-item-content {
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    width: 100%;
}

/* Skeleton styles for horizontal layout */
.skeleton-item-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 0.5rem;
}

.skeleton-item-box {
    display: flex;
    flex-direction: column;
    align-items: center;
    width: 100%;
}

.skeleton-image {
    width: 100%;
    aspect-ratio: 1/1;
    background-color: light-dark(#e5e7eb, #2d3748);
    animation: pulse 1.5s ease-in-out infinite;
}

/* Fit content width */
.ek-table-container.fit-content {
    width: fit-content;
}

/* Background style variants */
.ek-table-container.bg-default {
    background-color: light-dark(rgba(255, 255, 255, 0.8), rgba(20, 20, 20, 0.8));
}

.ek-table-container.bg-transparent {
    background-color: transparent !important;
}

.ek-table-container.bg-subtle {
    background-color: light-dark(rgba(245, 245, 245, 0.5), rgba(26, 26, 26, 0.5));
}

.ek-table-container.bg-transparent .table-row {
    background-color: light-dark(rgba(255, 255, 255, 0.4), rgba(26, 26, 26, 0.3));
}

/* Table Header */
.table-header {
    display: grid;
    grid-template-columns: var(--grid-columns, 1fr);
    background-color: light-dark(rgba(245, 245, 245, 0.05), rgba(26, 26, 26, 0.3));
    border-bottom: 1px solid light-dark(rgba(229, 231, 235, 0.3), rgba(75, 85, 99, 0.2));
}

/* Density variations for header */
.table-header.density-compact {
    padding: 0.25rem 0.5rem;
}

.table-header.density-normal {
    padding: 0.4rem 0.75rem;
}

.table-header.density-relaxed {
    padding: 0.6rem 1rem;
}

.header-cell {
    font-size: 0.75rem;
    color: light-dark(#4b5563, #9ca3af);
    font-family: inherit;
    /* Ensure consistent font inheritance */
    line-height: 1rem;
    /* Explicit line height for consistency */
}

.header-cell.text-right {
    text-align: right;
}

/* Table Body */
.table-body {
    display: flex;
    flex-direction: column;
    background-color: transparent;
}

/* Table Row */
.table-row {
    display: grid;
    grid-template-columns: var(--grid-columns, 1fr);
    border-radius: 0.375rem;
    background-color: light-dark(rgba(255, 255, 255, 0.4), rgba(26, 26, 26, 0.3));
    transition: background-color 0.2s;
    cursor: pointer;
}

/* Add consistent spacing between rows */
.table-row:not(:first-child) {
    margin-top: 0.25rem;
}

/* Density variations for rows */
.table-row.density-compact {
    padding: 0.25rem 0.5rem;
}

.table-row.density-normal {
    padding: 0.35rem 0.75rem;
}

.table-row.density-relaxed {
    padding: 0.5rem 1rem;
}

/* Row with borders */
.table-row.bordered {
    border-bottom: 1px solid light-dark(rgba(229, 231, 235, 0.3), rgba(75, 85, 99, 0.2));
}

/* Striped row styling */
.table-row-striped {
    background-color: light-dark(rgba(249, 250, 251, 0.6), rgba(31, 31, 31, 0.4));
}

/* Hover effect for rows */
.table-row.hover-effect:hover {
    background-color: light-dark(rgba(229, 231, 235, 0.15), rgba(35, 35, 35, 0.5));
}

/* Mobile view adjustments */
.mobile-view .table-row {
    display: block;
}

/* Ensure consistent spacing for both mobile and desktop */
.mobile-view .table-row:not(:first-child) {
    margin-top: 0.25rem;
}

.mobile-view .table-row.density-compact {
    padding: 0.35rem 0.5rem;
}

.mobile-view .table-row.density-normal {
    padding: 0.5rem 0.75rem;
}

.mobile-view .table-row.density-relaxed {
    padding: 0.75rem 1rem;
}

/* Body cell */
.body-cell {
    display: flex;
    align-items: center;
    overflow: hidden;
    font-size: 0.875rem;
    font-family: inherit;
    /* Ensure consistent font inheritance */
    line-height: 1.25rem;
    /* Explicit line height for consistency */
}

/* Mobile container */
.mobile-container {
    display: flex;
    width: 100%;
    gap: 0.75rem;
}

.mobile-content {
    display: flex;
    flex-direction: column;
    flex: 1;
    min-width: 0;
}

.mobile-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.25rem;
}

.mobile-title {
    font-weight: 500;
    font-size: 0.875rem;
    color: light-dark(#111827, white);
}

/* Helper text classes */
:deep(.text-sm) {
    font-size: 0.875rem;
    line-height: 1.25rem;
}

:deep(.text-xs) {
    font-size: 0.75rem;
    line-height: 1rem;
}

/* Skeleton styles */
.skeleton-row {
    opacity: 1;
}

.skeleton {
    opacity: 0.7;
}

.skeleton-item {
    height: 0.875rem;
    width: 100%;
    background-color: light-dark(#e5e7eb, #2d3748);
    border-radius: 0.25rem;
    animation: pulse 1.5s ease-in-out infinite;
}

.mobile-skeleton-container {
    display: flex;
    width: 100%;
    gap: 0.75rem;
}

.skeleton-ship {
    width: 64px;
    height: 64px;
    flex-shrink: 0;
    background-color: light-dark(#e5e7eb, #2d3748);
    border-radius: 0.25rem;
    animation: pulse 1.5s ease-in-out infinite;
}

.skeleton-content {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
}

.skeleton-line-full {
    height: 0.875rem;
    width: 100%;
    background-color: light-dark(#e5e7eb, #2d3748);
    border-radius: 0.25rem;
    animation: pulse 1.5s ease-in-out infinite;
}

.skeleton-line-med {
    height: 0.75rem;
    width: 70%;
    background-color: light-dark(#e5e7eb, #2d3748);
    border-radius: 0.25rem;
    animation: pulse 1.5s ease-in-out infinite;
}

.skeleton-line-wide {
    height: 0.75rem;
    width: 90%;
    background-color: light-dark(#e5e7eb, #2d3748);
    border-radius: 0.25rem;
    animation: pulse 1.5s ease-in-out infinite;
}

.skeleton-line-small {
    height: 0.75rem;
    width: 50%;
    background-color: light-dark(#e5e7eb, #2d3748);
    border-radius: 0.25rem;
    animation: pulse 1.5s ease-in-out infinite;
}

/* Empty state */
.empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 2rem 0;
    color: light-dark(#6b7280, #9ca3af);
    background-color: light-dark(rgba(245, 245, 245, 0.05), rgba(26, 26, 26, 0.3));
    border-radius: 0.5rem;
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
    font-size: 0.875rem;
}

.empty-icon {
    font-size: 1.5rem;
    margin-bottom: 0.75rem;
}

/* Animation for skeleton loading */
@keyframes pulse {

    0%,
    100% {
        opacity: 1;
    }

    50% {
        opacity: 0.5;
    }
}

/* Helper classes */
.truncate {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 100%;
    display: inline-block;
}

/* Vertical padding adjustment for cell content */
:deep(.py-1) {
    padding-top: 0.1rem;
    padding-bottom: 0.1rem;
}

/* Special header styling */
.table-header.special-header {
    background-color: light-dark(rgba(229, 231, 235, 0.5), rgba(31, 41, 55, 0.5));
}

.table-header.special-header {
    background-color: light-dark(rgba(245, 245, 245, 0.05), rgba(26, 26, 26, 0.5)) !important;
    padding: 0.5rem 1rem !important;
}

/* Ensure special header cells have consistent styling */
.special-header .header-cell {
    font-size: 0.75rem;
    color: light-dark(#4b5563, #9ca3af) !important;
}

/* Cursor pointer for linkable rows */
.has-link {
    cursor: pointer;
}

/* Enhance hover effect for linkable rows */
.has-link:hover {
    background-color: light-dark(rgba(229, 231, 235, 0.25), rgba(45, 45, 45, 0.6));
}

/* Style for the row content wrapper */
.row-content {
    display: flex;
    width: 100%;
    color: inherit;
    text-decoration: none;
}

/* Ensure desktop view columns are properly displayed */
.row-content:not(.mobile-view) {
    display: contents;
    /* This preserves the grid layout */
}

/* Style for table rows that are links */
.table-row[href] {
    text-decoration: none;
    color: inherit;
}

/* Enhance pointer cursor */
.has-link {
    cursor: pointer;
}

/* Enhance hover effect for clickable rows */
.has-link:hover {
    background-color: light-dark(rgba(229, 231, 235, 0.25), rgba(45, 45, 45, 0.6));
}

/* Make horizontal skeleton grid responsive */
.horizontal-skeleton-grid {
    display: grid;
    grid-template-columns: repeat(var(--cols, 7), 1fr);
    gap: 0.75rem;
    padding: 0.5rem;
}
</style>
