<template>
    <div :class="customClasses" :style="customCssVariables">
        <slot />

        <!-- Inject custom CSS if provided -->
        <component v-if="customCss" :is="'style'" v-html="customCss" />

        <!-- Custom favicon if provided -->

        <Head v-if="branding?.favicon_url">
            <link rel="icon" :href="branding.favicon_url" />
        </Head>
    </div>
</template>

<script setup lang="ts">
const { branding, isCustomDomain } = useDomainContext();
const { customCssVariables, customCssClasses, customCss } = useCustomBranding();

// Compute custom classes
const customClasses = computed(() => {
    const classes = [customCssClasses.value];

    if (isCustomDomain.value) {
        classes.push('custom-domain-active');
    }

    return classes.filter(Boolean).join(' ');
});

// Watch for branding changes and update CSS variables
watchEffect(() => {
    if (import.meta.client && isCustomDomain.value && branding.value) {
        // Apply CSS variables to document root
        const root = document.documentElement;

        Object.entries(customCssVariables.value).forEach(([property, value]) => {
            root.style.setProperty(property, value);
        });

        // Clean up on unmount
        onUnmounted(() => {
            Object.keys(customCssVariables.value).forEach((property) => {
                root.style.removeProperty(property);
            });
        });
    }
});
</script>

<style>
/* Base custom domain styles */
.custom-domain-active {
    /* Enable custom domain features */
}

.has-custom-primary {
    /* Primary color is customized */
}

.has-custom-secondary {
    /* Secondary color is customized */
}

/* CSS custom properties that can be overridden */
:root {
    --color-primary: #3b82f6;
    --color-secondary: #6b7280;
    --color-accent: var(--color-primary);
}

/* Custom domain color utilities */
.custom-domain-active .text-primary {
    color: var(--color-primary) !important;
}

.custom-domain-active .bg-primary {
    background-color: var(--color-primary) !important;
}

.custom-domain-active .border-primary {
    border-color: var(--color-primary) !important;
}

.custom-domain-active .text-secondary {
    color: var(--color-secondary) !important;
}

.custom-domain-active .bg-secondary {
    background-color: var(--color-secondary) !important;
}

.custom-domain-active .border-secondary {
    border-color: var(--color-secondary) !important;
}
</style>
