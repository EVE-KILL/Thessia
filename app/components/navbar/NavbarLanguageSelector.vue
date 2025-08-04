<template>
    <div class="language-selector">
        <!-- Desktop dropdown with Dropdown -->
        <Dropdown v-model="isDropdownOpen" :smart-position="true" position="bottom" align="end">
            <template #trigger>
                <UButton color="neutral" variant="ghost" size="sm" class="language-trigger">
                    <!-- Language icon - using the standard translate icon -->
                    <UIcon name="lucide:languages" class="language-icon" />
                </UButton>
            </template>

            <!-- Dropdown Content -->
            <div class="language-dropdown">
                <button v-for="locale in availableLocales" :key="locale.code" class="language-option"
                    :class="{ 'language-option-active': currentLocale === locale.code }"
                    @click="switchLocale(locale.code)">
                    <UIcon v-if="currentLocale === locale.code" name="lucide:check" class="language-check-icon" />
                    <span v-else class="language-spacer"></span> <!-- Spacer for alignment -->
                    {{ locale.name }}
                    <span class="language-code">{{ locale.code.toUpperCase() }}</span>
                </button>
            </div>
        </Dropdown>

        <!-- Mobile view version (simplified display) -->
        <div v-if="isMobileView" class="language-mobile">
            <div class="language-mobile-title">
                {{ $t('common.selectLanguage', 'Select Language') }}
            </div>
            <div class="language-mobile-grid">
                <UButton v-for="locale in availableLocales" :key="locale.code" color="neutral" variant="ghost"
                    class="language-mobile-option"
                    :class="{ 'language-mobile-option-active': currentLocale === locale.code }"
                    @click="switchLocale(locale.code)">
                    <UIcon v-if="currentLocale === locale.code" name="lucide:check" class="language-mobile-check" />
                    <span class="language-mobile-name">{{ locale.name }}</span>
                </UButton>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import type { LocaleObject } from "@nuxtjs/i18n";
import type { Locale } from "vue-i18n";

// Props
const props = defineProps({
    isMobileView: {
        type: Boolean,
        default: false,
    },
});

// Use the i18n composable
const { locale: currentLocale, locales, setLocale } = useI18n();

// Dropdown state
const isDropdownOpen = ref(false);

// Type-safe available locales
const availableLocales = computed(() => {
    return (locales.value as LocaleObject[]).filter(
        (locale): locale is LocaleObject => typeof locale !== "string",
    );
});

// Function to switch the locale using the built-in setLocale method
async function switchLocale(newLocale: Locale) {
    try {
        await setLocale(newLocale);
        // Close dropdown after selection
        isDropdownOpen.value = false;
    } catch (error) {
        console.debug("Failed to switch locale:", error);
    }
}
</script>

<style scoped>
.language-selector {
    position: relative;
}

/* Desktop trigger button */
.language-trigger {
    display: flex;
    align-items: center;
    cursor: pointer;
}

.language-icon {
    font-size: var(--text-lg);
}

/* Desktop dropdown styles */
.language-dropdown {
    padding: var(--space-2) 0;
    width: 12rem;
    /* 192px */
}

.language-option {
    width: 100%;
    text-align: left;
    padding: var(--space-2) var(--space-4);
    font-size: var(--text-sm);
    background: transparent;
    border: none;
    cursor: pointer;
    display: flex;
    align-items: center;
    transition: var(--transition-colors);
    color: var(--color-text-primary);
}

.language-option:hover {
    background-color: var(--color-bg-tertiary);
}

.language-option-active {
    font-weight: var(--font-medium);
}

.language-check-icon {
    margin-right: var(--space-2);
    color: var(--color-brand-primary);
}

.language-spacer {
    width: 1.25rem;
    /* 20px */
    margin-right: var(--space-2);
}

.language-code {
    font-size: var(--text-xs);
    margin-left: auto;
    color: var(--color-text-secondary);
}

/* Mobile styles */
.language-mobile {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
    width: 100%;
}

.language-mobile-title {
    padding: var(--space-2) 0;
    font-weight: var(--font-medium);
    font-size: var(--text-sm);
    color: var(--color-text-secondary);
}

.language-mobile-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: var(--space-2);
}

.language-mobile-option {
    display: flex;
    align-items: center;
    justify-content: flex-start;
    padding: var(--space-2);
    cursor: pointer;
}

.language-mobile-option-active {
    border: 2px solid var(--color-brand-primary);
    border-radius: var(--radius-base);
}

.language-mobile-check {
    margin-right: var(--space-2);
    color: var(--color-brand-primary);
}

.language-mobile-name {
    font-size: var(--text-sm);
}
</style>
