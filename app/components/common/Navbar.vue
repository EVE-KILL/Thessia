<script lang="ts" setup>
const { t } = useI18n();
const colorMode = useColorMode();

import NavbarBackgroundSwitcher from "../navbar/NavbarBackgroundSwitcher.vue";
import NavbarLanguageSelector from "../navbar/NavbarLanguageSelector.vue";
import NavbarUser from "../navbar/NavbarUser.vue";
import SpotlightSearch from "../search/SpotlightSearch.vue";

// Global spotlight search state
const { isOpen: isSearchOpen, openSearch, closeSearch } = useSpotlightSearch();

// Mobile menu state
const isMobileMenuOpen = ref(false);

// Track dropdown states for menus with children
const dropdownStates = ref<Record<string, boolean>>({});

// Track which menu sections are expanded on mobile
const expandedMobileMenus = ref<Record<string, boolean>>({});

// Navbar scroll state - simplified with intersection observer for better performance
const isScrolled = ref(false);

// Use intersection observer for performance-optimized scroll detection
let observer: IntersectionObserver | null = null;
let sentinel: HTMLElement | null = null;

onMounted(() => {
    // Create a minimal sentinel element at the top of the page
    sentinel = document.createElement('div');
    sentinel.style.cssText = 'position:absolute;top:0;height:1px;width:100%;pointer-events:none;z-index:-1';
    document.body.prepend(sentinel);

    // Intersection observer with minimal options for performance
    observer = new IntersectionObserver((entries) => {
        isScrolled.value = !entries[0].isIntersecting;
    }, {
        threshold: 0,
        rootMargin: '-1px 0px 0px 0px'
    });

    observer.observe(sentinel);
});

onUnmounted(() => {
    observer?.disconnect();
    sentinel?.remove();
    observer = null;
    sentinel = null;
});/**
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
            // Recent Activity
            { name: t("latest"), label: t("latest"), to: "/kills/latest" },
            { name: t("big"), label: t("big"), to: "/kills/big" },
            { name: t("solo"), label: t("solo"), to: "/kills/solo" },
            { name: t("npc"), label: t("npc"), to: "/kills/npc" },

            // Separator
            { name: "---", label: "separator", to: "#" },

            // By Location
            { name: t("highsec"), label: t("highsec"), to: "/kills/highsec" },
            { name: t("lowsec"), label: t("lowsec"), to: "/kills/lowsec" },
            { name: t("nullsec"), label: t("nullsec"), to: "/kills/nullsec" },
            { name: t("wspace"), label: t("wspace"), to: "/kills/wspace" },
            { name: t("abyssal"), label: t("abyssal"), to: "/kills/abyssal" },
            { name: t("pochven"), label: t("pochven"), to: "/kills/pochven" },

            // Separator
            { name: "---", label: "separator", to: "#" },

            // By Value
            { name: t("5b"), label: t("5b"), to: "/kills/5b" },
            { name: t("10b"), label: t("10b"), to: "/kills/10b" },

            // Separator
            { name: "---", label: "separator", to: "#" },

            // By Ship Class
            { name: t("frigates"), label: t("frigates"), to: "/kills/frigates" },
            { name: t("destroyers"), label: t("destroyers"), to: "/kills/destroyers" },
            { name: t("cruisers"), label: t("cruisers"), to: "/kills/cruisers" },
            { name: t("battlecruisers"), label: t("battlecruisers"), to: "/kills/battlecruisers" },
            { name: t("battleships"), label: t("battleships"), to: "/kills/battleships" },
            { name: t("capitals"), label: t("capitals"), to: "/kills/capitals" },
            { name: t("supercarriers"), label: t("supercarriers"), to: "/kills/supercarriers" },
            { name: t("titans"), label: t("titans"), to: "/kills/titans" },
            { name: t("freighters"), label: t("freighters"), to: "/kills/freighters" },

            // Separator
            { name: "---", label: "separator", to: "#" },

            // Structures & Tech
            { name: t("citadels"), label: t("citadels"), to: "/kills/citadels" },
            { name: t("structureboys"), label: t("structureboys"), to: "/kills/structureboys" },
            { name: t("t1"), label: t("t1"), to: "/kills/t1" },
            { name: t("t2"), label: t("t2"), to: "/kills/t2" },
            { name: t("t3"), label: t("t3"), to: "/kills/t3" }
        ],
    },
    {
        name: t("wars.title"),
        label: t("wars.title"),
        position: "left",
        to: "/wars",
        icon: "lucide:swords",
    },
    {
        name: t("battles"),
        label: t("battles"),
        position: "left",
        to: "/battles",
        icon: "lucide:shield",
    },
    {
        name: t("campaigns"),
        label: t("campaigns"),
        position: "left",
        to: "/campaigns",
        icon: "lucide:flag",
    },
    {
        name: t("stats"),
        label: t("stats"),
        position: "left",
        to: "/stats",
        icon: "lucide:chart-area",
    },
    {
        name: t("tools"),
        label: t("tools"),
        position: "left",
        children: [
            {
                name: t("Advanced Search"),
                label: t("Advanced Search"),
                position: "left",
                to: "/advancedsearch",
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
            },
            {
                name: t("metenox", "Metenox"),
                label: t("metenox", "Metenox"),
                position: "left",
                to: "/metenox",
                icon: "lucide:mountain",
            },
            {
                name: t('comments.list.title'),
                label: t('comments.list.title'),
                position: "left",
                to: "/comments",
                icon: "lucide:message-square",
            }
        ]
    },
]);

/**
 * Center navigation items
 */
const centerNavItems = computed(() => [
    {
        icon: "lucide:search",
        label: t("search.title", "Search"),
        position: "center",
        onClick: openSearch,
    },
]);

/**
 * Right navigation items
 */
const rightNavItems = computed(() => [
    {
        icon: "lucide:upload",
        label: t("killmail.submit"),
        position: "right",
        mobile: false,
        to: "/killmail"
    },
    {
        position: "right",
        component: NavbarLanguageSelector,
        mobile: true,
    },
    {
        icon: "lucide:sun-moon",
        label: t("toggleTheme"),
        position: "right",
        mobile: true,
        onClick: () => {
            colorMode.preference = colorMode.preference === "dark" ? "light" : "dark";
        },
    },
    {
        icon: "lucide:book-image",
        label: t("changeBackground"),
        component: NavbarBackgroundSwitcher,
        position: "right",
        mobile: true,
    },
    {
        icon: "lucide:info",
        label: t("informationMenu"),
        position: "right",
        collapse: false,
        children: [
            { name: t("faq"), label: t("faq"), to: "/faq" },
            { name: t("status"), label: t("status"), to: "/status" },
            { name: t("aboutTitle"), label: t("aboutTitle"), to: "/about" },
            { name: t("Donate"), label: t("Donate"), to: "/donate" },
            { name: t("Documentation"), label: t("Documentation"), to: "/docs" },
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
    <nav class="navbar-desktop" :class="{ 'navbar-scrolled': isScrolled }">
        <!-- Three-section layout with flexbox -->
        <div class="navbar-container">
            <!-- Left items - natural width -->
            <div class="navbar-section-left">
                <template v-for="(link, index) in leftNavItems" :key="index">
                    <!-- Regular links -->
                    <NuxtLink v-if="link.to && !link.children" :to="link.to" class="button-base navbar-button"
                        :aria-label="link.label || link.name">
                        <UIcon v-if="link.icon" :name="link.icon" class="navbar-icon" />
                        <span class="navbar-text">{{ link.name }}</span>
                    </NuxtLink>

                    <!-- Dropdown menus with column distribution -->
                    <Dropdown v-else-if="link.children" v-model="dropdownStates[link.name || link.label || '']"
                        :use-column-distribution="true" :items="link.children" :items-per-column="10" :max-height="70"
                        position="bottom" align="start" :smart-position="true">
                        <template #trigger>
                            <button class="button-base navbar-button navbar-dropdown-trigger" :aria-label="link.label">
                                <UIcon v-if="link.icon" :name="link.icon" class="navbar-icon" />
                                <span class="navbar-text">{{ link.name }}</span>
                                <UIcon name="lucide:chevron-down" class="navbar-chevron" />
                            </button>
                        </template>

                        <!-- Column item slot for menu items -->
                        <template #column-item="{ item }">
                            <!-- Separator -->
                            <div v-if="item.name === '---'" class="dropdown-separator"></div>
                            <!-- Regular item -->
                            <NuxtLink v-else :to="item.to" class="dropdown-item" :aria-label="item.label"
                                @click="dropdownStates[link.name || link.label || ''] = false">
                                {{ item.name }}
                            </NuxtLink>
                        </template>
                    </Dropdown>

                    <!-- Inline components -->
                    <component v-else-if="link.component && link.inline" :is="link.component" />

                    <!-- Buttons with click handlers -->
                    <button v-else-if="link.onClick" class="button-base navbar-button" :aria-label="link.label"
                        @click="link.onClick">
                        <UIcon v-if="link.icon" :name="link.icon" class="navbar-icon" />
                        <span class="navbar-text">{{ link.name }}</span>
                    </button>
                </template>
            </div>

            <!-- Center items - takes all available space -->
            <div class="navbar-section-center">
                <template v-for="(link, index) in centerNavItems" :key="index">
                    <button v-if="link.onClick" class="button-base navbar-search-button" :aria-label="link.label"
                        @click="link.onClick">
                        <UIcon v-if="link.icon" :name="link.icon" class="navbar-search-icon" />
                        <span class="navbar-search-text">{{ t('search.placeholder', 'Search...') }}</span>
                        <div class="navbar-search-shortcut">
                            <span class="navbar-key">⌘</span>
                            <span class="navbar-key">K</span>
                        </div>
                    </button>
                </template>
            </div>

            <!-- Right items - natural width -->
            <div class="navbar-section-right">
                <template v-for="(link, index) in rightNavItems" :key="index">
                    <!-- Regular links -->
                    <NuxtLink v-if="link.to && !link.children && !link.component" :to="link.to"
                        class="button-base navbar-button" :aria-label="link.label">
                        <UIcon v-if="link.icon" :name="link.icon" class="navbar-icon navbar-icon-only" />
                        <span v-if="link.name" class="navbar-text">{{ link.name }}</span>
                    </NuxtLink>

                    <!-- Inline components -->
                    <component v-else-if="link.component && link.inline" :is="link.component" />

                    <!-- Component buttons without dropdown -->
                    <component v-else-if="link.component" :is="link.component" />

                    <!-- Dropdown menus for right side -->
                    <Dropdown v-else-if="link.children" v-model="dropdownStates[link.label || '']" position="bottom"
                        align="end" :smart-position="true">
                        <template #trigger>
                            <button class="button-base navbar-button navbar-dropdown-trigger"
                                :aria-label="link.label || link.name">
                                <UIcon v-if="link.icon" :name="link.icon"
                                    :class="link.name ? 'navbar-icon' : 'navbar-icon navbar-icon-only'" />
                                <span v-if="link.name" class="navbar-text">{{ link.name }}</span>
                            </button>
                        </template>

                        <!-- Render dropdown items -->
                        <template v-for="(item, itemIndex) in link.children" :key="itemIndex">
                            <NuxtLink :to="item.to" class="dropdown-item" :aria-label="item.label"
                                @click="dropdownStates[link.label || ''] = false">
                                <div class="dropdown-item-content">
                                    <UIcon v-if="item.icon" :name="item.icon" class="dropdown-icon" />
                                    {{ item.name }}
                                </div>
                            </NuxtLink>
                        </template>
                    </Dropdown>

                    <!-- Buttons with click handlers -->
                    <button v-else-if="link.onClick" class="button-base navbar-button" :aria-label="'Toggle theme'"
                        @click="link.onClick">
                        <UIcon v-if="link.icon" :name="link.icon" class="navbar-icon navbar-icon-only" />
                    </button>
                </template>
            </div>
        </div>
    </nav>

    <!-- Mobile Navbar -->
    <nav class="navbar-mobile" :class="{ 'navbar-scrolled': isScrolled, 'navbar-hidden': isMobileMenuOpen }">
        <div class="navbar-mobile-header">
            <!-- Logo/Home link -->
            <NuxtLink to="/" class="navbar-mobile-logo">
                <Icon name="lucide:house" class="navbar-mobile-logo-icon" />
            </NuxtLink>

            <!-- Center mobile items (search button) -->
            <div class="navbar-mobile-center">
                <template v-for="(link, index) in centerNavItems" :key="index">
                    <button v-if="link.onClick" class="navbar-mobile-search-button" :aria-label="link.label"
                        @click="link.onClick">
                        <UIcon v-if="link.icon" :name="link.icon" class="navbar-mobile-search-icon" />
                        <span class="navbar-mobile-search-text">{{ t('search.short', 'Search') }}</span>
                    </button>
                </template>
            </div>

            <!-- Mobile header actions for items marked with mobile: true -->
            <div class="navbar-mobile-actions">
                <template v-for="(link, index) in allNavItems.filter(l => (l as any).mobile === true)" :key="index">
                    <!-- Regular component buttons -->
                    <component v-if="(link as any).component" :is="(link as any).component" />

                    <!-- Click handlers -->
                    <button v-else-if="(link as any).onClick" class="navbar-mobile-button"
                        :aria-label="(link as any).label" @click="(link as any).onClick">
                        <UIcon v-if="(link as any).icon" :name="(link as any).icon" class="navbar-mobile-icon" />
                    </button>
                </template>

                <!-- Regular links that should appear in mobile header -->
                <NuxtLink
                    v-for="(link, index) in rightNavItems.filter(l => (l as any).to && !(l as any).mobile && !(l as any).children && !(l as any).component)"
                    :key="`mobile-link-${index}`" :to="(link as any).to" class="navbar-mobile-link"
                    :aria-label="(link as any).label">
                    <UIcon v-if="(link as any).icon" :name="(link as any).icon" class="navbar-mobile-icon" />
                </NuxtLink>

                <!-- Mobile menu toggle button -->
                <button class="navbar-mobile-menu-toggle" aria-label="Menu" @click="isMobileMenuOpen = true">
                    <UIcon name="lucide:menu" class="navbar-mobile-icon" />
                </button>
            </div>
        </div>
    </nav>

    <!-- Mobile Fullscreen Menu Modal -->
    <MobileFullscreen :open="isMobileMenuOpen" :title="t('menuTitle')" :z-index="10000" @close="closeMobileMenu">
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

    <!-- Global Spotlight Search Modal -->
    <SpotlightSearch :open="isSearchOpen" @close="closeSearch" />
</template>

<style scoped>
/* Navbar Layout - Component-specific styles */
.navbar-desktop {
    display: none;
    height: 4rem;
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    z-index: 50;
    background-color: rgba(255, 255, 255, 0.0);
    transition: all 0.3s ease;
}

html.dark .navbar-desktop {
    background-color: rgba(0, 0, 0, 0.0);
}

/* When scrolled, use solid colors matching inner-content */
.navbar-desktop.navbar-scrolled {
    background-color: rgba(255, 255, 255, 0.8) !important;
    backdrop-filter: blur(12px) !important;
    -webkit-backdrop-filter: blur(12px) !important;

    /* Create edge fade using linear gradient mask */
    -webkit-mask: linear-gradient(to right,
            transparent 0px,
            black 100px,
            black calc(100% - 100px),
            transparent 100%);
    mask: linear-gradient(to right,
            transparent 0px,
            black 100px,
            black calc(100% - 100px),
            transparent 100%);
}

/* When scrolled, extend container to full width but keep content centered */
.navbar-desktop.navbar-scrolled .navbar-container {
    max-width: 80rem;
    margin: 0 auto;
    padding: 0 var(--space-4);
}

html.dark .navbar-desktop.navbar-scrolled {
    background-color: rgba(0, 0, 0, 0.8) !important;
}

@media (min-width: 768px) {
    .navbar-desktop {
        display: flex;
    }
}

.navbar-container {
    max-width: 80rem;
    margin: 0 auto;
    padding: 0 var(--space-4);
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
    height: 100%;
    transition: all 0.3s ease;
}

.navbar-section-left,
.navbar-section-right {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    flex-shrink: 0;
    /* Prevent shrinking */
}

.navbar-section-right>* {
    display: flex;
    align-items: center;
    flex-shrink: 0;
}

.navbar-section-center {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    margin: 0 var(--space-4);
    min-width: 0;
    /* Allow shrinking if needed */
}

/* Navbar-specific styling for buttons */
.navbar-icon {
    margin-right: var(--space-2);
    font-size: var(--text-lg);
}

/* Icon-only buttons */
.navbar-icon-only {
    margin-right: 0 !important;
}

.navbar-text {
    font-size: var(--text-lg);
}

.navbar-chevron {
    margin-left: var(--space-1);
    font-size: var(--text-lg);
}

.navbar-search {
    width: 100%;
    max-width: 48rem;
    /* 3xl */
}

/* Spotlight search button styling */
.navbar-search-button {
    display: flex !important;
    align-items: center !important;
    width: 100% !important;
    max-width: 32rem !important;
    height: 2.75rem !important;
    padding: 0 var(--space-4) !important;
    background: rgba(0, 0, 0, 0.05) !important;
    border: 1px solid rgba(0, 0, 0, 0.1) !important;
    border-radius: var(--radius-lg) !important;
    color: var(--color-text-muted) !important;
    font-size: var(--text-sm) !important;
    transition: all 0.2s ease !important;
    justify-content: flex-start !important;
    text-align: left !important;
    gap: var(--space-3) !important;
    cursor: pointer !important;
}

.navbar-search-button:hover {
    background: rgba(0, 0, 0, 0.1) !important;
    border-color: rgba(0, 0, 0, 0.2) !important;
    color: var(--color-text-primary) !important;
}

:global(.dark) .navbar-search-button {
    background: rgba(255, 255, 255, 0.05) !important;
    border: 1px solid rgba(255, 255, 255, 0.1) !important;
    color: var(--color-text-muted) !important;
}

:global(.dark) .navbar-search-button:hover {
    background: rgba(255, 255, 255, 0.1) !important;
    border-color: rgba(255, 255, 255, 0.2) !important;
    color: var(--color-text-primary) !important;
}

.navbar-search-icon {
    font-size: var(--text-base) !important;
    color: var(--color-text-muted) !important;
    margin-right: 0 !important;
}

.navbar-search-text {
    flex: 1 !important;
    font-weight: var(--font-normal) !important;
    text-align: left !important;
}

.navbar-search-shortcut {
    display: flex !important;
    align-items: center !important;
    gap: 2px !important;
    margin-left: auto !important;
}

.navbar-key {
    display: inline-flex !important;
    align-items: center !important;
    justify-content: center !important;
    min-width: 1.25rem !important;
    height: 1.25rem !important;
    padding: 0 2px !important;
    background: rgba(0, 0, 0, 0.1) !important;
    border: 1px solid rgba(0, 0, 0, 0.2) !important;
    border-radius: 2px !important;
    font-size: 10px !important;
    font-weight: var(--font-medium) !important;
    color: var(--color-text-muted) !important;
    box-shadow: inset 0 -1px 0 rgba(0, 0, 0, 0.1) !important;
}

:global(.dark) .navbar-key {
    background: rgba(255, 255, 255, 0.1) !important;
    border: 1px solid rgba(255, 255, 255, 0.2) !important;
    box-shadow: inset 0 -1px 0 rgba(255, 255, 255, 0.1) !important;
}

/* Mobile search button styling */
.navbar-mobile-search-button {
    display: flex;
    align-items: center;
    padding: var(--space-2) var(--space-3);
    background: rgba(0, 0, 0, 0.05);
    border: 1px solid rgba(0, 0, 0, 0.1);
    border-radius: var(--radius-base);
    color: var(--color-text-muted);
    font-size: var(--text-sm);
    transition: all 0.2s ease;
    gap: var(--space-2);
    flex: 1;
    margin: 0 var(--space-2);
    cursor: pointer;
}

.navbar-mobile-search-button:hover {
    background: rgba(0, 0, 0, 0.1);
    color: var(--color-text-primary);
}

:global(.dark) .navbar-mobile-search-button {
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.1);
}

:global(.dark) .navbar-mobile-search-button:hover {
    background: rgba(255, 255, 255, 0.1);
}

.navbar-mobile-search-icon {
    font-size: var(--text-base);
    color: var(--color-text-muted);
}

.navbar-mobile-search-text {
    font-size: var(--text-sm);
    color: var(--color-text-muted);
}

/* Dropdown separator styling */
.dropdown-separator {
    height: 1px;
    background: var(--color-border);
    margin: var(--space-2) 0;
    opacity: 0.5;
}

/* Standardize all navbar component buttons to match .button-base */
.navbar-section-right :deep(button),
.navbar-section-left :deep(button) {
    min-height: 2.5rem !important;
    padding: var(--space-2) var(--space-3) !important;
    border-radius: var(--radius-base) !important;
    font-size: var(--text-sm) !important;
    font-weight: var(--font-medium) !important;
    display: flex !important;
    align-items: center !important;
    box-sizing: border-box !important;
}

/* Override UButton hover effects to match our standardized style */
.navbar-section-right :deep(button:hover),
.navbar-section-left :deep(button:hover) {
    background-color: rgba(55, 65, 81, 0.6) !important;
    color: var(--color-text-primary) !important;
    transition: background-color 0.2s ease !important;
}

/* Ensure navbar component buttons don't have conflicting margins */
.navbar-section-right :deep(button),
.navbar-section-left :deep(button) {
    margin: 0 !important;
}

/* Mobile Navbar Layout */
.navbar-mobile {
    display: block;
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    z-index: 50;
    background-color: rgba(255, 255, 255, 0.1);
    backdrop-filter: blur(4px);
    -webkit-backdrop-filter: blur(4px);
    box-shadow: var(--shadow-sm);
    transition: all 0.3s ease;
}

html.dark .navbar-mobile {
    margin-left: 10px;
    margin-right: 10px;
    background-color: rgba(0, 0, 0, 0.1);
}

/* When scrolled, use solid colors matching inner-content */
.navbar-mobile.navbar-scrolled {
    background-color: rgba(255, 255, 255, 0.8) !important;
    backdrop-filter: blur(12px) !important;
    -webkit-backdrop-filter: blur(12px) !important;

    /* Add margins and edge fade */
    margin-left: 10px;
    margin-right: 10px;
    border-radius: 12px;

    /* Create edge fade using linear gradient mask */
    -webkit-mask: linear-gradient(to right,
            transparent 0px,
            black 30px,
            black calc(100% - 30px),
            transparent 100%);
    mask: linear-gradient(to right,
            transparent 0px,
            black 30px,
            black calc(100% - 30px),
            transparent 100%);
}

/* When scrolled, keep mobile header centered */
.navbar-mobile.navbar-scrolled .navbar-mobile-header {
    max-width: 80rem;
    margin: 0 auto;
}

html.dark .navbar-mobile.navbar-scrolled {
    background-color: rgba(0, 0, 0, 0.8) !important;
}

.navbar-mobile.navbar-hidden {
    transform: translateY(-100%);
    opacity: 0;
    pointer-events: none;
}

@media (min-width: 768px) {
    .navbar-mobile {
        display: none;
    }
}

.navbar-mobile-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    height: 4rem;
    padding: var(--space-4);
    max-width: 80rem;
    margin: 0 auto;
    width: 100%;
    transition: all 0.3s ease;
}

.navbar-mobile-logo {
    display: flex;
    align-items: center;
    color: var(--color-text-primary);
    text-decoration: none;
}

.navbar-mobile-logo-icon {
    font-size: var(--text-2xl);
    color: var(--color-text-primary);
}

.navbar-mobile-center {
    display: flex;
    align-items: center;
    margin: 0 var(--space-2);
    flex-grow: 1;
}

.navbar-mobile-search {
    width: 100%;
}

.navbar-mobile-actions {
    display: flex;
    align-items: center;
    gap: var(--space-3);
}

.navbar-mobile-button,
.navbar-mobile-link {
    display: flex;
    align-items: center;
    background: transparent;
    border: none;
    cursor: pointer;
    color: var(--color-text-primary);
    text-decoration: none;
}

.navbar-mobile-menu-toggle {
    display: flex;
    align-items: center;
    background: transparent;
    border: none;
    cursor: pointer;
    color: var(--color-text-primary);
}

.navbar-mobile-icon {
    font-size: var(--text-xl);
    color: var(--color-text-primary);
}

/* Force mobile fullscreen modal to start at absolute top */
:global(.modal-container) {
    margin-top: -45px !important;
}
</style>
