<template>
    <div class="layout-container">
        <!-- Desktop View - Only shown on desktop -->
        <div v-if="!isMobile" class="desktop-layout">
            <div class="top-row">
                <MostValuable />
            </div>

            <div class="main-content">
                <div class="left-column">
                    <div class="mt-[48.39px]"></div>
                    <TopBox type="character" :limit="10" :days="7" :title="t('top') + ' ' + t('characters')" />
                    <TopBox type="corporation" :limit="10" :days="7" :title="t('top') + ' ' + t('corporations')" />
                    <TopBox type="alliance" :limit="10" :days="7" :title="t('top') + ' ' + t('alliances')" />
                    <TopBox type="ship" :limit="10" :days="7" :title="t('top') + ' ' + t('ships')" />
                    <TopBox type="solarsystem" :limit="10" :days="7" :title="t('top') + ' ' + t('systems')" />
                    <TopBox type="constellation" :limit="10" :days="7" :title="t('top') + ' ' + t('constellations')" />
                    <TopBox type="region" :limit="10" :days="7" :title="t('top') + ' ' + t('regions')" />
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
                            <TopBox type="character" :limit="10" :days="7" :title="t('top') + ' ' + t('characters')" />
                            <TopBox type="corporation" :limit="10" :days="7"
                                :title="t('top') + ' ' + t('corporations')" />
                            <TopBox type="alliance" :limit="10" :days="7" :title="t('top') + ' ' + t('alliances')" />
                            <TopBox type="ship" :limit="10" :days="7" :title="t('top') + ' ' + t('ships')" />
                            <TopBox type="solarsystem" :limit="10" :days="7" :title="t('top') + ' ' + t('systems')" />
                            <TopBox type="constellation" :limit="10" :days="7"
                                :title="t('top') + ' ' + t('constellations')" />
                            <TopBox type="region" :limit="10" :days="7" :title="t('top') + ' ' + t('regions')" />
                        </div>
                    </div>
                </template>

                <template #mostValuable="{ item }">
                    <div class="tab-content">
                        <MostValuable />
                    </div>
                </template>
            </Tabs>
        </div>
    </div>
</template>

<script setup lang="ts">
const { t } = useI18n();
const { isMobile } = useResponsive();

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
});
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

.main-content {
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
