<script setup lang="ts">
import { computed, type PropType } from 'vue';

interface TabItem {
    id: string; // Unique identifier for the tab, used for v-model
    label: string; // Text displayed on the tab button
    icon?: string; // Optional icon name (e.g., for UIcon)
    slot: string; // Name of the slot for this tab's content (matches UTabs behavior)
    disabled?: boolean; // If the tab is disabled
}

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
})

const emit = defineEmits(['update:modelValue'])

const selectTab = (tabId: string) => {
    const item = props.items.find(i => i.id === tabId)
    if (item && !item.disabled) {
        emit('update:modelValue', tabId)
    }
}

const activeItem = computed(() => props.items.find(item => item.id === props.modelValue))

// Helper to get button classes dynamically
const getButtonClasses = (item: TabItem) => {
    const classes = [props.tabButtonClass];
    if (item.id === props.modelValue) {
        classes.push(props.activeTabButtonClass);
    } else {
        classes.push(props.inactiveTabButtonClass);
    }
    return classes.filter(c => c).join(' '); // Filter out empty strings and join
}
</script>

<template>
    <div>
        <div :class="tabsHeaderContainerClass">
            <button v-for="item in items" :key="item.id" type="button" :disabled="item.disabled"
                :class="getButtonClasses(item)" @click="selectTab(item.id)">
                <UIcon v-if="item.icon" :name="item.icon" class="mr-1" />
                {{ item.label }}
            </button>
        </div>

        <div :class="contentContainerClass">
            <template v-for="item in items" :key="item.id">
                <KeepAlive v-if="keepAliveContent">
                    <div v-show="modelValue === item.id">
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
.custom-tabs-header-container {
    display: flex;
    border-bottom: 1px solid #4A5568;
    /* Example: theme('colors.gray.700') */
    margin-bottom: 1rem;
    gap: 0.5rem;
}

.custom-tabs-inactive-button {
    padding: 0.5rem 1rem;
    color: #A0AEC0;
    /* Example: theme('colors.gray.400') */
    background-color: transparent;
    border: 1px solid transparent;
    /* Ensure consistent height with active */
    border-bottom: 2px solid transparent;
    /* Ensure consistent height with active */
    cursor: pointer;
}

.custom-tabs-inactive-button:hover:not(:disabled) {
    color: #CBD5E0;
    /* Example: theme('colors.gray.300') */
}

.custom-tabs-inactive-button:disabled {
    color: #718096;
    /* Example: theme('colors.gray.500') */
    cursor: not-allowed;
}

.custom-tabs-active-button {
    padding: 0.5rem 1rem;
    color: #FFFFFF;
    /* Example: theme('colors.white') */
    background-color: rgba(49, 130, 206, 0.1);
    /* Light blue background */
    border: 1px solid transparent;
    border-bottom: 2px solid #3182CE;
    /* Example: theme('colors.blue.500') */
    font-weight: bold;
    cursor: pointer;
    position: relative;
    /* For the pseudo-element */
    transition: all 0.2s ease;
}

.custom-tabs-active-button::after {
    content: '';
    position: absolute;
    bottom: -2px;
    left: 0;
    width: 100%;
    height: 2px;
    background-color: #3182CE;
    /* Same as border-bottom color */
    box-shadow: 0 0 8px rgba(49, 130, 206, 0.6);
    /* Glow effect */
}

/* Add transitions to both active and inactive buttons for smooth state changes */
.custom-tabs-active-button,
.custom-tabs-inactive-button {
    transition: background-color 0.3s, color 0.3s, border-color 0.3s, box-shadow 0.3s;
}

.custom-tab-content-container {
    padding-top: 1rem;
}

/* Default button styling if tabButtonClass is not provided or for base styling */
button {
    border-radius: 0.25rem;
    /* Example: theme('borderRadius.md') */
    transition: background-color 0.2s, color 0.2s, border-color 0.2s;
}
</style>
