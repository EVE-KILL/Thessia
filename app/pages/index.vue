<template>
    <!-- Custom Domain: Multi-Entity Dashboard -->
    <div v-if="isCustomDomain" class="domain-dashboard">
        <!-- Load the domain dashboard component -->
        <DomainDashboardRenderer :domain="customDomain || ''"
            :time-range="selectedTimeRange as '1d' | '7d' | '14d' | '30d'" :client-only="false" />
    </div>

    <!-- Main Domain: Standard Homepage -->
    <div v-else class="layout-container">
        <!-- Desktop View - Only shown on desktop -->
        <div v-if="!isMobile" class="desktop-layout">
            <div class="top-row">
                <FrontpageMostValuable />
            </div>

            <div class="index-content">
                <div class="left-column">
                    <div class="mt-[48.39px]"></div>
                    <TopBox dataType="characters" :limit="10" :days="7" :title="t('top') + ' ' + t('characters')" />
                    <TopBox dataType="corporations" :limit="10" :days="7" :title="t('top') + ' ' + t('corporations')" />
                    <TopBox dataType="alliances" :limit="10" :days="7" :title="t('top') + ' ' + t('alliances')" />
                    <TopBox dataType="ships" :limit="10" :days="7" :title="t('top') + ' ' + t('ships')" />
                    <TopBox dataType="systems" :limit="10" :days="7" :title="t('top') + ' ' + t('systems')" />
                    <TopBox dataType="constellations" :limit="10" :days="7"
                        :title="t('top') + ' ' + t('constellations')" />
                    <TopBox dataType="regions" :limit="10" :days="7" :title="t('top') + ' ' + t('regions')" />
                </div>

                <div class="right-column">
                    <KillList :killlistType="'latest'" />
                </div>
            </div>
        </div>

        <!-- Mobile View with Tabs - Only shown on mobile -->
        <div v-else class="mobile-layout">
            <Tabs v-model="selectedTab" :items="tabItems" class="w-full mobile-tabs" tabButtonClass="mobile-tab-button">
                <template #kills="{ item }">
                    <div class="tab-content">
                        <KillList :killlistType="'latest'" />
                    </div>
                </template>

                <template #topLists="{ item }">
                    <div class="tab-content">
                        <div class="mobile-top-lists space-y-4">
                            <TopBox dataType="characters" :limit="10" :days="7"
                                :title="t('top') + ' ' + t('characters')" />
                            <TopBox dataType="corporations" :limit="10" :days="7"
                                :title="t('top') + ' ' + t('corporations')" />
                            <TopBox dataType="alliances" :limit="10" :days="7"
                                :title="t('top') + ' ' + t('alliances')" />
                            <TopBox dataType="ships" :limit="10" :days="7" :title="t('top') + ' ' + t('ships')" />
                            <TopBox dataType="systems" :limit="10" :days="7" :title="t('top') + ' ' + t('systems')" />
                            <TopBox dataType="constellations" :limit="10" :days="7"
                                :title="t('top') + ' ' + t('constellations')" />
                            <TopBox dataType="regions" :limit="10" :days="7" :title="t('top') + ' ' + t('regions')" />
                        </div>
                    </div>
                </template>

                <template #mostValuable="{ item }">
                    <div class="tab-content">
                        <FrontpageMostValuable />
                    </div>
                </template>
            </Tabs>
        </div>
    </div>
</template>

<script setup lang="ts">
const { t } = useI18n();
const { isMobile } = useResponsive();
const { generateWebsiteStructuredData, generateOrganizationStructuredData, addStructuredDataToHead } = useStructuredData();
const selectedTimeRange = ref('7d');

// Custom domain handling - Phase 2
// Get domain context first to check if middleware detected a custom domain
const { isCustomDomain, customDomain, domainError } = useDomainContext();

// Handle domain detection and routing
(async () => {
    // If middleware detected a custom domain, use that context
    // If not, check hostname for client-side detection as fallback
    if (!isCustomDomain.value && process.client) {
        const hostname = window.location.hostname;
        const isMainDomain = hostname === "eve-kill.com" ||
            hostname === "www.eve-kill.com" ||
            hostname === "localhost" ||
            hostname === "127.0.0.1" ||
            hostname === "0.0.0.0" ||
            hostname.includes("eve-kill.com"); // Allow eve-kill subdomains

        console.log(`[Index Page] Client-side domain check:`, { hostname, isMainDomain });

        if (!isMainDomain) {
            // This is a custom domain that wasn't detected by middleware
            // Redirect to [domain].vue for proper error handling
            console.log(`[Index Page] Redirecting undetected custom domain: ${hostname}`);
            await navigateTo(`/${hostname}`);
            return;
        }
    }

    // Handle domain errors by redirecting to the domain page for proper error display
    if (domainError.value && customDomain.value) {
        console.log(`[Index Page] Domain error detected, redirecting to domain page:`, domainError.value);
        await navigateTo(`/${customDomain.value}`);
        return;
    }
})();

// Initialize with a valid ID from our tabs
const selectedTab = ref("kills");

// Updated to match the expected TabItem interface
const tabItems = ref([
    {
        id: "kills",
        label: t("kills"),
        icon: "i-lucide-swords text-xl",
        slot: "kills"
    },
    {
        id: "topLists",
        label: t("topLists"),
        icon: "i-lucide-list-ordered text-xl",
        slot: "topLists"
    },
    {
        id: "mostValuable",
        label: t("mostValuable"),
        icon: "i-lucide-layout-dashboard text-xl",
        slot: "mostValuable"
    }
]);

useSeoMeta({
    title: t("homePageTitle"),
    description: "The premier EVE Online killboard providing real-time combat data, killmail tracking, and battle reports for the EVE Online community",
    ogTitle: t("homePageTitle"),
    ogDescription: "Track EVE Online killmails, analyze combat data, and explore battle reports on the premier EVE killboard",
    ogType: "website",
    twitterCard: "summary_large_image",
    twitterTitle: t("homePageTitle"),
    twitterDescription: "The premier EVE Online killboard for combat data and killmail tracking"
});

// Generate structured data using the composable
const navigationItems = [
    {
        name: t("home"),
        url: "https://eve-kill.com/"
    },
    {
        name: t("kills"),
        url: "https://eve-kill.com/kills/latest",
        children: [
            { name: t("latest"), url: "https://eve-kill.com/kills/latest" },
            { name: t("highsec"), url: "https://eve-kill.com/kills/highsec" },
            { name: t("lowsec"), url: "https://eve-kill.com/kills/lowsec" },
            { name: t("nullsec"), url: "https://eve-kill.com/kills/nullsec" },
            { name: t("wspace"), url: "https://eve-kill.com/kills/wspace" },
            { name: t("capitals"), url: "https://eve-kill.com/kills/capitals" },
            { name: t("big"), url: "https://eve-kill.com/kills/big" }
        ]
    },
    {
        name: t("battles"),
        url: "https://eve-kill.com/battles"
    },
    {
        name: t("campaigns"),
        url: "https://eve-kill.com/campaigns"
    },
    {
        name: t("stats"),
        url: "https://eve-kill.com/stats"
    },
    {
        name: t("tools"),
        url: "https://eve-kill.com/query",
        children: [
            { name: t("Query"), url: "https://eve-kill.com/query" },
            { name: t("battlegenerator"), url: "https://eve-kill.com/battlegenerator" },
            { name: t("campaigncreator"), url: "https://eve-kill.com/campaigncreator" }
        ]
    },
    {
        name: t("faq"),
        url: "https://eve-kill.com/faq"
    }
];

// Generate and add structured data
const websiteStructuredData = generateWebsiteStructuredData(navigationItems);
const organizationStructuredData = generateOrganizationStructuredData();
addStructuredDataToHead([websiteStructuredData, organizationStructuredData]);
</script>

<style scoped>
.layout-container {
    display: grid;
    grid-template-rows: auto 1fr;
    gap: 1rem;
    width: 100%;
}

.top-row {
    grid-column: 1 / -1;
}

.index-content {
    display: grid;
    grid-template-columns: 250px 1fr;
    gap: 1rem;
}

.left-column {
    max-width: 250px;
    width: 250px;
}

.right-column {
    min-width: 0;
    /* Ensures the column can shrink below content size */
    flex: 1;
}

/* Tab content spacing */
.tab-content {
    padding-top: 1rem;
    padding-bottom: 2rem;
}

/* Mobile-specific styling */
.mobile-layout {
    width: 100%;
}

.mobile-top-lists {
    padding: 0 0.5rem;
}

/* Hide text labels in mobile tabs */
.mobile-tabs :deep(.mobile-tab-button) span {
    display: none;
}

/* Increase icon visibility */
.mobile-tabs :deep(.mobile-tab-button .u-icon) {
    margin-right: 0;
    font-size: 1.25rem;
}
</style>
