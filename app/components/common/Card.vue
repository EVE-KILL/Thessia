<template>
    <div :class="cardClasses" v-bind="$attrs">
        <!-- Card Header -->
        <header v-if="$slots.header" :class="headerClasses">
            <slot name="header" />
        </header>

        <!-- Card Body -->
        <section v-if="$slots.default" :class="bodyClasses">
            <slot />
        </section>

        <!-- Card Footer -->
        <footer v-if="$slots.footer" :class="footerClasses">
            <slot name="footer" />
        </footer>

        <!-- Card Actions -->
        <div v-if="$slots.actions" :class="actionsClasses">
            <slot name="actions" />
        </div>
    </div>
</template>

<script setup lang="ts">
interface Props {
    /** Card variant style */
    variant?: 'default' | 'elevated' | 'outline' | 'ghost';
    /** Card size */
    size?: 'sm' | 'md' | 'lg';
    /** Whether card should have hover effects */
    hoverable?: boolean;
    /** Whether card should be clickable */
    clickable?: boolean;
    /** Custom padding for the body */
    padding?: 'none' | 'sm' | 'md' | 'lg';
    /** Whether to divide sections with borders */
    divided?: boolean;
    /** Custom CSS classes for different sections */
    cardClass?: string;
    headerClass?: string;
    bodyClass?: string;
    footerClass?: string;
    actionsClass?: string;
}

const props = withDefaults(defineProps<Props>(), {
    variant: 'default',
    size: 'md',
    hoverable: false,
    clickable: false,
    padding: 'md',
    divided: true
});

// Base card classes
const cardClasses = computed(() => [
    // Base styles
    'card-base',

    // Variant styles
    {
        'card-default': props.variant === 'default',
        'card-elevated': props.variant === 'elevated',
        'card-outline': props.variant === 'outline',
        'card-ghost': props.variant === 'ghost',
    },

    // Size styles
    {
        'card-sm': props.size === 'sm',
        'card-md': props.size === 'md',
        'card-lg': props.size === 'lg',
    },

    // Interactive styles
    {
        'card-hoverable': props.hoverable,
        'card-clickable': props.clickable,
    },

    // Custom classes
    props.cardClass
]);

// Header classes
const headerClasses = computed(() => [
    'card-header',
    {
        'card-header-divided': props.divided,
    },
    props.headerClass
]);

// Body classes
const bodyClasses = computed(() => [
    'card-body',
    {
        'card-body-padding-none': props.padding === 'none',
        'card-body-padding-sm': props.padding === 'sm',
        'card-body-padding-md': props.padding === 'md',
        'card-body-padding-lg': props.padding === 'lg',
    },
    props.bodyClass
]);

// Footer classes
const footerClasses = computed(() => [
    'card-footer',
    {
        'card-footer-divided': props.divided,
    },
    props.footerClass
]);

// Actions classes
const actionsClasses = computed(() => [
    'card-actions',
    {
        'card-actions-divided': props.divided,
    },
    props.actionsClass
]);
</script>

<style scoped>
/* Base Card Styles */
.card-base {
    display: flex;
    flex-direction: column;
    border-radius: var(--radius-lg);
    overflow: hidden;
    transition: all var(--transition-normal);
}

/* Card Variants */
.card-default {
    background: var(--color-surface-secondary);
    border: 1px solid var(--color-border-primary);
    box-shadow: var(--shadow-sm);
}

.card-elevated {
    background: var(--color-surface-secondary);
    border: 1px solid var(--color-border-primary);
    box-shadow: var(--shadow-md);
}

.card-outline {
    background: var(--color-surface-primary);
    border: 2px solid var(--color-border-primary);
}

.card-ghost {
    background: var(--color-surface-alpha);
    border: 1px solid var(--color-border-light);
}

/* Card Sizes */
.card-sm {
    border-radius: var(--radius-md);
}

.card-md {
    border-radius: var(--radius-lg);
}

.card-lg {
    border-radius: var(--radius-xl);
}

/* Interactive States */
.card-hoverable:hover {
    transform: translateY(-2px);
    box-shadow: var(--shadow-lg);
    border-color: var(--color-border-hover);
}

.card-clickable {
    cursor: pointer;
}

.card-clickable:hover {
    transform: translateY(-1px);
    box-shadow: var(--shadow-md);
    border-color: var(--color-border-hover);
}

.card-clickable:active {
    transform: translateY(0);
    box-shadow: var(--shadow-sm);
}

/* Card Header */
.card-header {
    display: flex;
    align-items: center;
    gap: var(--space-4);
    padding: var(--space-4);
    background: var(--color-surface-alpha-medium);
}

.card-header-divided {
    border-bottom: 1px solid var(--color-border-light);
}

/* Card Body */
.card-body {
    flex: 1;
    min-height: 0;
    /* Allows flex child to shrink */
}

.card-body-padding-none {
    padding: 0;
}

.card-body-padding-sm {
    padding: var(--space-3);
}

.card-body-padding-md {
    padding: var(--space-4);
}

.card-body-padding-lg {
    padding: var(--space-6);
}

/* Card Footer */
.card-footer {
    padding: var(--space-4);
    background: var(--color-surface-alpha-subtle);
}

.card-footer-divided {
    border-top: 1px solid var(--color-border-light);
}

/* Card Actions */
.card-actions {
    display: flex;
    gap: var(--space-2);
    padding: var(--space-4);
    background: var(--color-surface-alpha-subtle);
}

.card-actions-divided {
    border-top: 1px solid var(--color-border-light);
}

/* Responsive Design */
@media (max-width: 768px) {

    .card-header,
    .card-body-padding-md,
    .card-footer,
    .card-actions {
        padding: var(--space-3);
    }

    .card-body-padding-lg {
        padding: var(--space-4);
    }

    .card-header {
        flex-direction: column;
        align-items: flex-start;
        gap: var(--space-3);
    }

    .card-actions {
        flex-direction: column;
        gap: var(--space-2);
    }
}

/* Focus states for accessibility */
.card-clickable:focus {
    outline: none;
    box-shadow: 0 0 0 3px var(--color-primary-alpha-100);
}

.card-clickable:focus-visible {
    outline: 2px solid var(--color-primary-500);
    outline-offset: 2px;
}
</style>
