<script setup lang="ts">
import { computed, onMounted, watch, type PropType } from 'vue';
import { useResponsive } from '~/composables/useResponsive';

interface TabItem {
    id: string; // Unique identifier for the tab, used for v-model
    label: string; // Text displayed on the tab button
    icon?: string; // Optional icon name (e.g., for UIcon)
    slot: string; // Name of the slot for this tab's content (matches UTabs behavior)
    disabled?: boolean; // If the tab is disabled
}

// Mobile display options for tabs
type MobileDisplayMode = 'icon-only' | 'abbreviated' | 'full' | 'custom';

const props = defineProps({
    items: {
        type: Array as PropType<TabItem[]>,
        required: true,
    },
    modelValue: {
        type: String,
        required: true,
    },
    keepAliveContent: {
        type: Boolean,
        default: true,
    },
    tabButtonClass: {
        type: String,
        default: '',
    },
    activeTabButtonClass: {
        type: String,
        default: 'custom-tabs-active-button',
    },
    inactiveTabButtonClass: {
        type: String,
        default: 'custom-tabs-inactive-button',
    },
    tabsHeaderContainerClass: {
        type: String,
        default: 'custom-tabs-header-container',
    },
    contentContainerClass: {
        type: String,
        default: 'custom-tab-content-container',
    },
    // New props for mobile responsiveness
    mobileDisplayMode: {
        type: String as PropType<MobileDisplayMode>,
        default: 'icon-only',
        validator: (val: string) => ['icon-only', 'abbreviated', 'full', 'custom'].includes(val)
    },
    abbreviationLength: {
        type: Number,
        default: 1
    },
    // UI that lets you fully customize the UX of our component
    ui: {
        type: Object as PropType<Record<string, string>>,
        default: () => ({})
    }
})

const emit = defineEmits(['update:modelValue'])

// Check if we're on mobile
const { isMobile } = useResponsive();

// Ensure we have a valid active tab (fallback only)
const ensureValidTab = () => {
    // Only set to first tab if modelValue is completely empty or invalid
    if (!props.modelValue || !props.items.find(item => item.id === props.modelValue)) {
        if (props.items.length > 0) {
            emit('update:modelValue', props.items[0].id);
        }
    }
};

// Watch for changes in items array to ensure current tab is still valid
watch(() => props.items, ensureValidTab, { immediate: true });

// Initialize on mount only if needed
onMounted(() => {
    ensureValidTab();
});

const selectTab = (tabId: string) => {
    const item = props.items.find(i => i.id === tabId)
    if (item && !item.disabled) {
        emit('update:modelValue', tabId)
    }
}

// Helper to get button classes dynamically
const getButtonClasses = (item: TabItem) => {
    const baseClasses = props.ui?.tab ? [props.ui.tab] : [props.tabButtonClass];

    // Add active/inactive classes
    if (item.id === props.modelValue) {
        baseClasses.push(props.activeTabButtonClass);
    } else {
        baseClasses.push(props.inactiveTabButtonClass);
    }

    // Add mobile class if needed
    if (isMobile.value) {
        baseClasses.push('mobile-tab-button');
    }

    return baseClasses.filter(c => c).join(' '); // Filter out empty strings and join
}

// Helper function to clean icon names for different icon components
const getCleanIconName = (iconName: string) => {
    if (!iconName) return '';

    // Remove any extra classes like 'text-xl', 'text-lg', etc.
    const cleanName = iconName.split(' ')[0];

    // Convert from UIcon format (i-lucide-swords) to @nuxt/icon format (lucide:swords)
    if (cleanName.startsWith('i-lucide-')) {
        return cleanName.replace('i-lucide-', 'lucide:');
    }

    // If it's already in the right format, return as is
    if (cleanName.includes(':')) {
        return cleanName;
    }

    // If it's just the icon name, assume it's lucide
    return `lucide:${cleanName}`;
}
const getTabDisplayText = (item: TabItem) => {
    if (!isMobile.value || props.mobileDisplayMode === 'full') {
        return item.label; // On desktop or if full labels are requested, show full label
    }

    if (props.mobileDisplayMode === 'icon-only' && item.icon) {
        return ''; // If icon-only and we have an icon, show no text
    }

    if (props.mobileDisplayMode === 'abbreviated') {
        // Abbreviate the label to the specified length
        return item.label.substring(0, props.abbreviationLength);
    }

    // Default fallback
    return item.icon ? '' : item.label.substring(0, 1);
}

const headerContainerClass = computed(() => {
    const classes = props.ui?.list ? [props.ui.list] : [props.tabsHeaderContainerClass];

    if (isMobile.value) {
        classes.push('mobile-tabs-header-container');
    }

    return classes.join(' ');
});
</script>

<template>
    <div>
        <div :class="headerContainerClass">
            <template v-for="item in items" :key="item.id">
                <!-- Simple approach: Always wrap in tooltip on mobile, regardless of mode -->
                <UTooltip v-if="isMobile" :text="item.label">
                    <button type="button" :disabled="item.disabled" :class="getButtonClasses(item)"
                        @click="selectTab(item.id)">
                        <!-- Use @nuxt/icon for mobile -->
                        <Icon v-if="item.icon" :name="getCleanIconName(item.icon)"
                            class="tab-icon mobile-icon-force icon-mobile" size="20" />
                        <!-- Show text based on mobile display mode -->
                        <span v-if="mobileDisplayMode !== 'icon-only' || !item.icon" class="tab-label">
                            {{ getTabDisplayText(item) }}
                        </span>
                    </button>
                </UTooltip>

                <!-- Desktop: No tooltip, always show icon + label -->
                <button v-else type="button" :disabled="item.disabled" :class="getButtonClasses(item)"
                    @click="selectTab(item.id)">
                    <UIcon v-if="item.icon" :name="item.icon" class="tab-icon" />
                    <span class="tab-label">{{ item.label }}</span>
                </button>
            </template>
        </div>

        <div :class="contentContainerClass">
            <template v-for="item in items" :key="item.id">
                <KeepAlive v-if="keepAliveContent">
                    <div v-if="modelValue === item.id">
                        <slot :name="item.slot" :item="item"></slot>
                    </div>
                </KeepAlive>
                <div v-else-if="modelValue === item.id">
                    <slot :name="item.slot" :item="item"></slot>
                </div>
            </template>
        </div>
    </div>
</template>

<style scoped>
/* Force horizontal layout for tabs with higher specificity and !important */
.custom-tabs-header-container {
    display: flex !important;
    flex-direction: row !important;
    flex-wrap: nowrap !important;
    border-bottom: 1px solid light-dark(rgba(229, 231, 235, 0.5), rgba(75, 85, 99, 0.5));
    /* Enhanced border */
    margin-bottom: 1rem;
    gap: 0.5rem;
    overflow-x: auto;
    /* Enable horizontal scrolling */
    padding-bottom: 2px;
    /* Ensure bottom border is visible */
    width: 100%;
    align-items: center;
    /* Center items vertically */
    max-width: 100%;
    /* Prevent overflow */
    position: relative;
    /* For absolute positioning of active indicator */
}

/* Desktop-specific styles with stronger selectors */
@media (min-width: 769px) {

    .custom-tabs-header-container,
    div.custom-tabs-header-container,
    div>.custom-tabs-header-container {
        display: flex !important;
        flex-direction: row !important;
        flex-wrap: nowrap !important;
        justify-content: flex-start !important;
    }

    .custom-tabs-header-container>button,
    div>.custom-tabs-header-container>button {
        display: inline-flex !important;
        flex: 0 0 auto !important;
    }
}

/* Higher specificity selector to override any conflicting styles */
div>.custom-tabs-header-container {
    display: flex !important;
    flex-direction: row !important;
    flex-wrap: nowrap !important;
}

/* Add stronger styling for button elements */
.custom-tabs-header-container>button {
    display: inline-flex !important;
    flex-direction: row !important;
}

/* Universal horizontal layout - make sure nothing overrides this */
@media screen {

    /* Universal rules that apply to all screen sizes */
    .custom-tabs-header-container,
    .mobile-tabs-header-container {
        display: flex !important;
        flex-direction: row !important;
        flex-wrap: nowrap !important;
        overflow-x: auto;
        max-width: 100%;
    }

    /* Force buttons to be inline-flex and not stretch/wrap */
    button.custom-tabs-active-button,
    button.custom-tabs-inactive-button {
        display: inline-flex !important;
        flex-direction: row !important;
        flex: 0 0 auto !important;
        max-width: fit-content !important;
    }
}

/* Keep mobile-specific adjustments */
.mobile-tabs-header-container {
    justify-content: flex-start;
    /* Changed from space-between to flex-start */
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
    scrollbar-width: none;
    /* Firefox */
    -ms-overflow-style: none;
    /* IE and Edge */
    flex-wrap: nowrap !important;
    /* Prevent wrapping */
    padding-bottom: 4px;
    /* Add padding to show the active indicator better */
}

/* Hide scrollbar for Chrome, Safari and Opera */
.mobile-tabs-header-container::-webkit-scrollbar {
    display: none;
}

.custom-tabs-inactive-button {
    padding: 0.5rem 1rem;
    color: light-dark(#6B7280, #9CA3AF);
    /* Updated colors */
    background-color: transparent;
    border: 1px solid transparent;
    border-bottom: 2px solid transparent;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.25rem;
    flex-shrink: 0;
    /* Prevent tab buttons from shrinking */
    white-space: nowrap;
    /* Prevent text from wrapping */
    flex: 0 0 auto;
    /* Don't grow or shrink */
    transition: all 0.2s ease;
    position: relative;
    margin-bottom: -1px;
    /* Overlap the container border */
}

.custom-tabs-inactive-button:hover:not(:disabled) {
    color: light-dark(#4B5563, #E5E7EB);
    /* Brighter text on hover */
    background-color: light-dark(rgba(243, 244, 246, 0.2), rgba(55, 65, 81, 0.2));
    /* Subtle highlight */
    border-radius: 0.25rem 0.25rem 0 0;
    /* Rounded top corners */
}

.custom-tabs-inactive-button:disabled {
    color: #718096;
    cursor: not-allowed;
}

.custom-tabs-active-button {
    padding: 0.5rem 1rem;
    color: light-dark(#1F2937, #F9FAFB);
    /* Brighter text */
    background-color: light-dark(rgba(59, 130, 246, 0.15), rgba(59, 130, 246, 0.25));
    /* More visible background */
    border: 1px solid transparent;
    border-bottom: 2px solid #3B82F6;
    /* Primary blue accent */
    font-weight: 600;
    /* Slightly bolder */
    cursor: pointer;
    position: relative;
    transition: all 0.2s ease;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.25rem;
    flex-shrink: 0;
    /* Prevent tab buttons from shrinking */
    white-space: nowrap;
    /* Prevent text from wrapping */
    flex: 0 0 auto;
    /* Don't grow or shrink */
    border-radius: 0.25rem 0.25rem 0 0;
    /* Rounded top corners */
    margin-bottom: -1px;
    /* Overlap the container border */
    box-shadow: 0 -2px 8px rgba(59, 130, 246, 0.2);
    /* Subtle glow on top */
}

.custom-tabs-active-button::after {
    content: '';
    position: absolute;
    bottom: -2px;
    left: 0;
    width: 100%;
    height: 2px;
    background-color: #3B82F6;
    /* Bright blue active indicator */
    box-shadow: 0 0 8px rgba(59, 130, 246, 0.6);
    /* Enhanced glow effect */
}

/* Add transitions to both active and inactive buttons for smooth state changes */
.custom-tabs-active-button,
.custom-tabs-inactive-button {
    transition: background-color 0.3s, color 0.3s, border-color 0.3s, box-shadow 0.3s;
}

/* Mobile specific styling */
.mobile-tab-button {
    padding: 0.5rem;
    min-width: 2.5rem;
    /* Minimum width for buttons */
    flex: 0 0 auto;
    /* Don't stretch or shrink */
}

.mobile-tab-button .tab-icon {
    width: 1.25rem;
    height: 1.25rem;
}

/* Force mobile icons to be visible */
.mobile-icon-force {
    display: inline-flex !important;
    width: 1.25rem !important;
    height: 1.25rem !important;
    flex-shrink: 0 !important;
    opacity: 1 !important;
    visibility: visible !important;
    color: currentColor !important;
}

/* Force iconify icons to display properly */
.iconify {
    display: inline-block !important;
    width: 1em !important;
    height: 1em !important;
    vertical-align: -0.125em !important;
}

/* Ensure iconify icons work on mobile */
@media (max-width: 768px) {
    .iconify {
        display: inline-block !important;
        font-size: 1.25rem !important;
        width: 1.25rem !important;
        height: 1.25rem !important;
        line-height: 1 !important;
    }

    /* Force specific iconify classes */
    .i-lucide\:swords,
    .i-lucide\:list-ordered,
    .i-lucide\:layout-dashboard,
    .iconify[class*="i-lucide"] {
        display: inline-block !important;
        width: 1.25rem !important;
        height: 1.25rem !important;
        background-size: contain !important;
        background-repeat: no-repeat !important;
        background-position: center !important;
    }

    /* Mobile fallback text styling */
    .mobile-fallback-text {
        display: inline-block !important;
        font-size: 0.875rem !important;
        font-weight: 600 !important;
        color: currentColor !important;
        margin-left: 0.25rem !important;
    }

    /* NuxtIcon mobile styling */
    .nuxt-icon-mobile {
        font-size: 1.25rem !important;
        width: 1.25rem !important;
        height: 1.25rem !important;
        display: inline-block !important;
    }

    /* Icon component mobile styling */
    .icon-mobile {
        display: inline-block !important;
        width: 1.25rem !important;
        height: 1.25rem !important;
        font-size: 20px !important;
    }
}

/* Custom styling for compact mobile buttons */
@media (max-width: 768px) {

    .custom-tabs-header-container,
    .mobile-tabs-header-container {
        flex-direction: row !important;
        display: flex !important;
        overflow-x: auto;
        padding-bottom: 0;
        /* Adjust padding to account for active tab indicator */
    }

    .custom-tabs-active-button,
    .custom-tabs-inactive-button {
        padding: 0.5rem;
        white-space: nowrap;
        /* Prevent text wrapping */
        flex-direction: row !important;
        display: flex !important;
    }

    /* Make sure there's always room for the icons */
    .tab-icon {
        display: inline-flex !important;
        /* Force display */
        width: 1.25rem;
        height: 1.25rem;
        flex-shrink: 0 !important;
        opacity: 1 !important;
        visibility: visible !important;
    }

    /* Better touch targets on mobile */
    button {
        min-height: 2.5rem;
        min-width: 2.5rem;
        /* Ensure minimum width for icons */
        flex-direction: row !important;
        flex: 0 0 auto;
        /* Don't grow or shrink */
    }

    /* Fix tab label visibility */
    .tab-label {
        display: inline-block;
    }

    /* Enhance active tab on mobile */
    .custom-tabs-active-button {
        border-bottom-width: 2px;
        /* Make the bottom border more visible */
    }

    /* Force UIcon component visibility on mobile */
    .custom-tabs-active-button .tab-icon,
    .custom-tabs-inactive-button .tab-icon {
        display: inline-flex !important;
        opacity: 1 !important;
        visibility: visible !important;
        min-width: 1.25rem !important;
        min-height: 1.25rem !important;
    }
}

.custom-tab-content-container {
    padding-top: 1rem;
}

/* Default button styling if tabButtonClass is not provided or for base styling */
button {
    border-radius: 0.25rem;
    transition: background-color 0.2s, color 0.2s, border-color 0.2s;
    white-space: nowrap;
    /* Prevent text from wrapping */
}

/* Enhanced active tab icon */
.custom-tabs-active-button .tab-icon {
    color: #3B82F6;
    /* Blue for active tab icon */
}

/* Add subtle glow effect to active tab content transition */
:deep(.tab-content-appear-active),
:deep(.tab-content-enter-active) {
    animation: fade-in 0.3s ease-out;
}

@keyframes fade-in {
    from {
        opacity: 0;
        transform: translateY(5px);
    }

    to {
        opacity: 1;
        transform: translateY(0);
    }
}
</style>
