<script lang="ts" setup>
import { markRaw } from "vue";
const { t } = useI18n();
const colorMode = useColorMode();

import BackgroundSwitcher from "../navbar/BackgroundSwitcher.vue";
import LanguageSelector from "../navbar/LanguageSelector.vue";
import SearchComponent from "../navbar/Search.vue";
import NavbarUser from "../navbar/User.vue";

const Search = markRaw(SearchComponent);

// Mobile menu state
const isMobileMenuOpen = ref(false);

// Track dropdown states for menus with children
const dropdownStates = ref<Record<string, boolean>>({});

// Track which menu sections are expanded on mobile
const expandedMobileMenus = ref<Record<string, boolean>>({});

/**
 * Navbar link interface
 */
interface NavLink {
    name?: string;
    label?: string;
    to?: string;
    icon?: string;
    component?: any;
    inline?: boolean;
    mobile?: boolean;
    position: "left" | "center" | "right";
    collapse?: boolean;
    onClick?: () => void;
    children?: NavLink[];
}

/**
 * Left navigation items
 */
const leftNavItems = computed(() => [
    {
        name: t("home"),
        label: t("home"),
        icon: "lucide:house",
        to: "/",
        position: "left",
    },
    {
        name: t("kills"),
        label: t("kills"),
        position: "left",
        children: [
            { name: t("latest"), label: t("latest"), to: "/kills/latest" },
            { name: t("abyssal"), label: t("abyssal"), to: "/kills/abyssal" },
            { name: t("wspace"), label: t("wspace"), to: "/kills/wspace" },
            { name: t("highsec"), label: t("highsec"), to: "/kills/highsec" },
            { name: t("lowsec"), label: t("lowsec"), to: "/kills/lowsec" },
            { name: t("nullsec"), label: t("nullsec"), to: "/kills/nullsec" },
            { name: t("big"), label: t("big"), to: "/kills/big" },
            { name: t("solo"), label: t("solo"), to: "/kills/solo" },
            { name: t("npc"), label: t("npc"), to: "/kills/npc" },
            { name: t("5b"), label: t("5b"), to: "/kills/5b" },
            { name: t("10b"), label: t("10b"), to: "/kills/10b" },
            { name: t("citadels"), label: t("citadels"), to: "/kills/citadels" },
            { name: t("t1"), label: t("t1"), to: "/kills/t1" },
            { name: t("t2"), label: t("t2"), to: "/kills/t2" },
            { name: t("t3"), label: t("t3"), to: "/kills/t3" },
            { name: t("frigates"), label: t("frigates"), to: "/kills/frigates" },
            { name: t("destroyers"), label: t("destroyers"), to: "/kills/destroyers" },
            { name: t("cruisers"), label: t("cruisers"), to: "/kills/cruisers" },
            { name: t("battlecruisers"), label: t("battlecruisers"), to: "/kills/battlecruisers" },
            { name: t("battleships"), label: t("battleships"), to: "/kills/battleships" },
            { name: t("capitals"), label: t("capitals"), to: "/kills/capitals" },
            { name: t("freighters"), label: t("freighters"), to: "/kills/freighters" },
            { name: t("supercarriers"), label: t("supercarriers"), to: "/kills/supercarriers" },
            { name: t("titans"), label: t("titans"), to: "/kills/titans" },
        ],
    },
    {
        name: t("battles"),
        label: t("battles"),
        position: "left",
        to: "/battles",
        icon: "lucide:shield",
    },
    {
        name: t("tools"),
        label: t("tools"),
        position: "left",
        children: [
            {
                name: t("Query"),
                label: t("Query"),
                position: "left",
                to: "/query",
                icon: "lucide:search",
            },
            {
                name: t("battlegenerator"),
                label: t("battlegenerator"),
                position: "left",
                to: "/battlegenerator",
                icon: "lucide:shield",
            },
            {
                name: t("campaigncreator"),
                label: t("campaigncreator"),
                position: "left",
                to: "/campaigncreator",
                icon: "lucide:flag",
            },
            {
                name: t("tools.localscan.title"),
                label: t("tools.localscan.title"),
                position: "left",
                to: "/tools/localscan",
                icon: "lucide:search",
            },
            {
                name: t("tools.dscan.title"),
                label: t("tools.dscan.title"),
                position: "left",
                to: "/tools/dscan",
                icon: "lucide:search",
            }
        ]
    },
]);

/**
 * Center navigation items
 */
const centerNavItems = computed(() => [
    {
        component: Search,
        inline: true,
        position: "center",
    },
]);

/**
 * Right navigation items
 */
const rightNavItems = computed(() => [
    {
        icon: "lucide:mail",
        position: "right",
        mobile: false,
        to: "/killmail"
    },
    {
        position: "right",
        component: LanguageSelector,
        mobile: true,
    },
    {
        icon: "lucide:sun-moon",
        position: "right",
        mobile: true,
        onClick: () => {
            colorMode.preference = colorMode.preference === "dark" ? "light" : "dark";
        },
    },
    {
        icon: "lucide:book-image",
        component: BackgroundSwitcher,
        position: "right",
        mobile: true,
    },
    {
        icon: "lucide:info",
        position: "right",
        collapse: false,
        children: [
            { name: t("faq"), label: t("faq"), to: "/faq" },
            { name: t("status"), label: t("status"), to: "/status" },
            { name: t("aboutTitle"), label: t("aboutTitle"), to: "/about" },
            { name: t("Donate"), label: t("Donate"), to: "/donate" },
        ],
    },
    {
        component: NavbarUser,
        position: "right",
    },
]);

/**
 * All navigation items combined
 */
const allNavItems = computed(() => [
    ...leftNavItems.value,
    ...centerNavItems.value,
    ...rightNavItems.value,
]);

// Initialize expanded menus based on collapse property
onMounted(() => {
    allNavItems.value.forEach((link) => {
        if (link.children && link.collapse !== false) {
            expandedMobileMenus.value[link.name || link.label || ""] = false; // Start collapsed by default
        }
    });
});

// Toggle mobile menu section expansion
const toggleMobileMenuSection = (menuName: string) => {
    expandedMobileMenus.value[menuName] = !expandedMobileMenus.value[menuName];
};

// Close the mobile menu
const closeMobileMenu = () => {
    isMobileMenuOpen.value = false;
};
</script>

<template>
    <!-- Desktop Navbar -->
    <nav
        class="hidden md:flex h-16 sticky top-0 z-50 bg-white bg-opacity-90 dark:bg-black dark:bg-opacity-90 backdrop-blur-sm shadow-sm">
        <!-- Three-section layout with flexbox -->
        <div class="container mx-auto px-4 flex items-center justify-between w-full h-full">
            <!-- Left items - natural width -->
            <div class="flex items-center space-x-2">
                <template v-for="(link, index) in leftNavItems" :key="index">
                    <!-- Regular links -->
                    <NuxtLink v-if="link.to && !link.children" :to="link.to"
                        class="flex items-center px-3 py-2 rounded-md text-sm font-medium hover:bg-gray-700 dark:hover:bg-gray-700"
                        :aria-label="link.label" color="neutral" variant="ghost">
                        <UIcon v-if="link.icon" :name="link.icon" class="mr-2 text-lg" />
                        <span class="text-lg">{{ link.name }}</span>
                    </NuxtLink>

                    <!-- Dropdown menus with column distribution -->
                    <Dropdown v-else-if="link.children" v-model="dropdownStates[link.name || link.label || '']"
                        :use-column-distribution="true" :items="link.children" :items-per-column="10" :max-height="70"
                        position="bottom" align="start" :smart-position="true">
                        <template #trigger>
                            <UButton color="neutral" variant="ghost" class="flex items-center" :aria-label="link.label">
                                <UIcon v-if="link.icon" :name="link.icon" class="mr-2 text-m" />
                                <span class="text-lg">{{ link.name }}</span>
                                <UIcon name="lucide:chevron-down" class="ml-1 text-lg" />
                            </UButton>
                        </template>

                        <!-- Column item slot for menu items -->
                        <template #column-item="{ item }">
                            <NuxtLink :to="item.to"
                                class="block px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md"
                                :aria-label="item.label" @click="dropdownStates[link.name || link.label || ''] = false">
                                {{ item.name }}
                            </NuxtLink>
                        </template>
                    </Dropdown>

                    <!-- Inline components -->
                    <component v-else-if="link.component && link.inline" :is="link.component" />

                    <!-- Buttons with click handlers -->
                    <UButton v-else-if="link.onClick" color="neutral" variant="ghost" class="flex items-center"
                        :aria-label="link.label" @click="link.onClick">
                        <UIcon v-if="link.icon" :name="link.icon" class="mr-2 text-lg" />
                        <span class="text-lg">{{ link.name }}</span>
                    </UButton>
                </template>
            </div>

            <!-- Center items - takes all available space -->
            <div class="flex-1 flex items-center justify-center ml-4 mr-4">
                <template v-for="(link, index) in centerNavItems" :key="index">
                    <component v-if="link.component && link.inline" :is="link.component" class="w-full max-w-3xl" />
                    <UButton v-else-if="link.onClick" color="neutral" variant="ghost" :aria-label="link.label"
                        @click="link.onClick">
                        <UIcon v-if="link.icon" :name="link.icon" class="mr-2 text-lg" />
                        <span class="text-lg">{{ link.name }}</span>
                    </UButton>
                </template>
            </div>

            <!-- Right items - natural width -->
            <div class="flex items-center space-x-2">
                <template v-for="(link, index) in rightNavItems" :key="index">
                    <!-- Regular links -->
                    <NuxtLink v-if="link.to && !link.children && !link.component" :to="link.to"
                        class="flex items-center px-3 py-2 rounded-md text-sm font-medium hover:bg-gray-700 dark:hover:bg-gray-700"
                        :aria-label="link.label" color="neutral" variant="ghost">
                        <UIcon v-if="link.icon" :name="link.icon" class="text-lg" />
                        <span v-if="link.name" class="text-lg ml-2">{{ link.name }}</span>
                    </NuxtLink>

                    <!-- Inline components -->
                    <component v-else-if="link.component && link.inline" :is="link.component" />

                    <!-- Component buttons without dropdown -->
                    <component v-else-if="link.component" :is="link.component" />

                    <!-- Dropdown menus for right side -->
                    <Dropdown v-else-if="link.children" v-model="dropdownStates[link.label || '']" position="bottom"
                        align="end" :smart-position="true">
                        <template #trigger>
                            <UButton color="neutral" variant="ghost" class="flex items-center" :aria-label="link.label">
                                <UIcon v-if="link.icon" :name="link.icon" class="text-lg" />
                                <span v-if="link.name" class="text-lg ml-2">{{ link.name }}</span>
                            </UButton>
                        </template>

                        <!-- Render dropdown items -->
                        <template v-for="(item, itemIndex) in link.children" :key="itemIndex">
                            <NuxtLink :to="item.to"
                                class="block px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md"
                                :aria-label="item.label" @click="dropdownStates[link.label || ''] = false">
                                <div class="flex items-center">
                                    <UIcon v-if="item.icon" :name="item.icon" class="mr-2 text-sm" />
                                    {{ item.name }}
                                </div>
                            </NuxtLink>
                        </template>
                    </Dropdown>

                    <!-- Buttons with click handlers -->
                    <UButton v-else-if="link.onClick" color="neutral" variant="ghost" class="flex items-center"
                        :aria-label="link.label" @click="link.onClick">
                        <UIcon v-if="link.icon" :name="link.icon" class="text-lg" />
                        <span v-if="link.name" class="text-lg ml-2">{{ link.name }}</span>
                    </UButton>
                </template>
            </div>
        </div>
    </nav>

    <!-- Mobile Navbar -->
    <nav
        class="md:hidden sticky top-0 z-50 bg-white bg-opacity-90 dark:bg-black dark:bg-opacity-90 backdrop-blur-sm shadow-sm">
        <div class="flex items-center justify-between h-16 p-4">
            <!-- Logo/Home link -->
            <NuxtLink to="/" class="flex items-center">
                <Icon name="lucide:house" class="text-2xl text-gray-900 text-black dark:text-white" />
            </NuxtLink>

            <!-- Center mobile items (typically search) -->
            <div class="flex items-center mx-2 flex-grow">
                <template v-for="(link, index) in centerNavItems" :key="index">
                    <component v-if="link.component && link.inline" :is="link.component" class="w-full" />
                </template>
            </div>

            <!-- Mobile header actions for items marked with mobile: true -->
            <div class="flex items-center gap-3">
                <template v-for="(link, index) in allNavItems.filter(l => l.mobile === true)" :key="index">
                    <!-- Regular component buttons -->
                    <component v-if="link.component" :is="link.component" />

                    <!-- Click handlers -->
                    <UButton v-else-if="link.onClick" color="neutral" variant="ghost" :aria-label="link.label"
                        @click="link.onClick">
                        <UIcon v-if="link.icon" :name="link.icon" class="text-xl text-black dark:text-white" />
                    </UButton>
                </template>

                <!-- Regular links that should appear in mobile header -->
                <NuxtLink
                    v-for="(link, index) in rightNavItems.filter(l => l.to && !l.mobile && !l.children && !l.component)"
                    :key="`mobile-link-${index}`" :to="link.to" class="flex items-center" :aria-label="link.label">
                    <UIcon v-if="link.icon" :name="link.icon" class="text-xl text-black dark:text-white" />
                </NuxtLink>

                <!-- Mobile menu toggle button -->
                <UButton color="neutral" variant="ghost" aria-label="Menu" @click="isMobileMenuOpen = true">
                    <UIcon name="lucide:menu" class="text-xl text-black dark:text-white" />
                </UButton>
            </div>
        </div>
    </nav>

    <!-- Mobile Fullscreen Menu Modal -->
    <MobileFullscreen :open="isMobileMenuOpen" :title="t('menuTitle')" @close="closeMobileMenu">
        <!-- Main menu content -->
        <div class="h-full pb-20">
            <!-- Navigation section with collapsible items -->
            <div class="mb-8">
                <h3 class="text-lg font-bold mb-4 text-gray-900 dark:text-gray-100">{{ t('navbar.menuNavigation') }}
                </h3>
                <div class="space-y-3">
                    <!-- Left positioned links - typically navigation -->
                    <template v-for="(link, index) in leftNavItems" :key="`left-${index}`">
                        <!-- Regular links -->
                        <NuxtLink v-if="link.to && !link.children" :to="link.to"
                            class="flex items-center px-4 py-3 rounded-lg text-base font-medium bg-gray-50/70 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-700/70 text-gray-900 dark:text-gray-100 shadow-sm transition-colors"
                            :aria-label="link.label" @click="isMobileMenuOpen = false">
                            <UIcon v-if="link.icon" :name="link.icon"
                                class="mr-3 text-xl text-gray-700 dark:text-gray-300" />
                            {{ link.name }}
                        </NuxtLink>

                        <!-- Non-collapsible links with children -->
                        <div v-else-if="link.children && link.collapse === false" class="mb-4 space-y-2">
                            <!-- Static header - no toggle button -->
                            <div
                                class="px-4 py-3 text-base font-medium text-gray-900 dark:text-gray-100 bg-gray-50/70 dark:bg-gray-800/50 rounded-lg shadow-sm">
                                <div class="flex items-center">
                                    <UIcon v-if="link.icon" :name="link.icon"
                                        class="mr-3 text-xl text-gray-700 dark:text-gray-300" />
                                    {{ link.name }}
                                </div>
                            </div>

                            <!-- Direct list of children without collapsible container -->
                            <div class="pl-4 space-y-1">
                                <NuxtLink v-for="(child, childIndex) in link.children" :key="childIndex" :to="child.to"
                                    class="flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700/70 rounded-md"
                                    :aria-label="child.label" @click="isMobileMenuOpen = false">
                                    <UIcon v-if="child.icon" :name="child.icon" class="mr-2" />
                                    {{ child.name }}
                                </NuxtLink>
                            </div>
                        </div>

                        <!-- Standard collapsible links with children -->
                        <div v-else-if="link.children"
                            class="text-base font-medium text-gray-900 dark:text-gray-100 bg-gray-50/70 dark:bg-gray-800/50 rounded-lg shadow-sm">
                            <!-- Collapsible header with toggle button -->
                            <button
                                class="w-full flex items-center justify-between px-4 py-3 text-gray-700 dark:text-gray-300 transition-colors"
                                @click="toggleMobileMenuSection(link.name)">
                                <div class="flex items-center">
                                    <UIcon v-if="link.icon" :name="link.icon"
                                        class="mr-3 text-xl text-gray-700 dark:text-gray-300" />
                                    {{ link.name }}
                                </div>
                                <UIcon
                                    :name="expandedMobileMenus[link.name] ? 'lucide:chevron-up' : 'lucide:chevron-down'"
                                    class="text-lg text-gray-700 dark:text-gray-300" />
                            </button>

                            <!-- Collapsible content -->
                            <div v-show="expandedMobileMenus[link.name]"
                                class="border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/70">
                                <div class="py-2 space-y-1">
                                    <NuxtLink v-for="(child, childIndex) in link.children" :key="childIndex"
                                        :to="child.to"
                                        class="flex items-center px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700/70"
                                        :aria-label="child.label" @click="isMobileMenuOpen = false">
                                        {{ child.name }}
                                    </NuxtLink>
                                </div>
                            </div>
                        </div>
                    </template>
                </div>
            </div>

            <!-- Tools Section -->
            <div class="mb-8">
                <h3 class="text-lg font-bold mb-4 text-gray-900 dark:text-gray-100">{{ t('navbar.menuTools') }}</h3>
                <div class="space-y-3">
                    <!-- Information dropdown items in mobile view -->
                    <template v-for="(link, index) in rightNavItems.filter(l => l.children)" :key="`info-${index}`">
                        <!-- Non-collapsible links with children -->
                        <div v-if="link.collapse === false" class="mb-4 space-y-2">
                            <!-- Static header -->
                            <div
                                class="px-4 py-3 text-base font-medium text-gray-900 dark:text-gray-100 bg-gray-50/70 dark:bg-gray-800/50 rounded-lg shadow-sm">
                                <div class="flex items-center">
                                    <UIcon v-if="link.icon" :name="link.icon"
                                        class="mr-3 text-xl text-gray-700 dark:text-gray-300" />
                                    <span>{{ link.label }}</span>
                                </div>
                            </div>

                            <!-- Direct list of children -->
                            <div class="pl-4 space-y-1">
                                <NuxtLink v-for="(child, childIndex) in link.children" :key="childIndex" :to="child.to"
                                    class="flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700/70 rounded-md"
                                    :aria-label="child.label" @click="isMobileMenuOpen = false">
                                    <UIcon v-if="child.icon" :name="child.icon" class="mr-2 text-lg" />
                                    {{ child.name }}
                                </NuxtLink>
                            </div>
                        </div>

                        <!-- Standard collapsible links -->
                        <div v-else class="mb-4 overflow-hidden rounded-lg shadow-sm bg-white/50 dark:bg-black/30">
                            <!-- Collapsible header with toggle button -->
                            <button
                                class="w-full flex items-center justify-between px-4 py-3 text-base font-medium text-gray-900 dark:text-gray-100 hover:bg-gray-100/50 dark:hover:bg-gray-800/50 transition-colors"
                                @click="toggleMobileMenuSection(link.label)">
                                <div class="flex items-center">
                                    <UIcon v-if="link.icon" :name="link.icon"
                                        class="mr-3 text-xl text-gray-700 dark:text-gray-300" />
                                    <span>{{ link.label }}</span>
                                </div>
                                <UIcon
                                    :name="expandedMobileMenus[link.label] ? 'lucide:chevron-up' : 'lucide:chevron-down'"
                                    class="text-lg text-gray-500 dark:text-gray-400" />
                            </button>

                            <!-- Collapsible content -->
                            <div v-show="expandedMobileMenus[link.label]" class="bg-gray-50 dark:bg-gray-800/70">
                                <div class="py-2 space-y-1">
                                    <NuxtLink v-for="(child, childIndex) in link.children" :key="childIndex"
                                        :to="child.to"
                                        class="flex items-center px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700/70"
                                        :aria-label="child.label" @click="isMobileMenuOpen = false">
                                        <UIcon v-if="child.icon" :name="child.icon" class="mr-2 text-lg" />
                                        {{ child.name }}
                                    </NuxtLink>
                                </div>
                            </div>
                        </div>
                    </template>
                </div>
            </div>

            <!-- Account Section -->
            <div class="mb-8">
                <h3 class="text-lg font-bold mb-4 text-gray-900 dark:text-gray-100">{{ t('navbar.menuAccount',
                    'Account') }}
                </h3>
                <div class="space-y-3">
                    <!-- Use NavbarUser component with mobile flag -->
                    <NavbarUser :is-mobile-view="true" @login-action="closeMobileMenu"
                        @logout-action="closeMobileMenu" />
                </div>
            </div>
        </div>
    </MobileFullscreen>
</template>

<style scoped>
/* Sticky header adjustments */
.sticky.top-0 {
    z-index: 5;
}

/* Animation for collapsible sections */
.collapsible-enter-active,
.collapsible-leave-active {
    transition: max-height 0.3s ease;
    overflow: hidden;
}

.collapsible-enter-from,
.collapsible-leave-to {
    max-height: 0;
}

.collapsible-enter-to,
.collapsible-leave-from {
    max-height: 500px;
}

/* Ensure navbar stays on top */
nav.sticky {
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
    transition: background-color 0.3s ease;
}

/* Safari fix for backdrop-filter */
@supports not (backdrop-filter: blur(8px)) {
    nav.sticky {
        background-color: rgba(255, 255, 255, 0.98);
    }

    :root.dark nav.sticky {
        background-color: rgba(0, 0, 0, 0.98);
    }
}

/* Glass effect */
.bg-white\/50,
.dark\:bg-black\/30,
.bg-gray-50\/70,
.dark\:bg-gray-800\/50 {
    backdrop-filter: blur(4px);
    -webkit-backdrop-filter: blur(4px);
}

/* Improved hover and active states */
.hover\:bg-gray-100:hover,
.dark .hover\:bg-gray-700\/70:hover {
    transition: background-color 0.2s ease;
}

/* Safari fixes for backdrop-filter */
@supports not ((backdrop-filter: blur(8px)) or (-webkit-backdrop-filter: blur(8px))) {

    .bg-white\/50,
    .dark\:bg-black\/30,
    .bg-gray-50\/70,
    .dark\:bg-gray-800\/50 {
        background-color: rgba(255, 255, 255, 0.95) !important;
    }

    :root.dark .bg-white\/50,
    :root.dark .dark\:bg-black\/30,
    :root.dark .bg-gray-50\/70,
    :root.dark .dark\:bg-gray-800\/50 {
        background-color: rgba(15, 15, 15, 0.95) !important;
    }
}

/* Better shadows */
.shadow-sm {
    box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
}

:root.dark .shadow-sm {
    box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.3);
}

/* Enhanced animations for menu items */
@keyframes slideIn {
    from {
        transform: translateY(10px);
        opacity: 0;
    }

    to {
        transform: translateY(0);
        opacity: 1;
    }
}

/* Apply animation to content */
h3,
.space-y-3>div {
    animation: slideIn 0.3s ease forwards;
    animation-delay: calc(var(--index, 0) * 0.05s);
}
</style>
