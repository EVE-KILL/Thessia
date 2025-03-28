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
                    <TopBox
                        type="character"
                        :limit="10"
                        :days="7"
                        :title="t('top') + ' ' + t('characters')"
                    />
                    <TopBox
                        type="corporation"
                        :limit="10"
                        :days="7"
                        :title="t('top') + ' ' + t('corporations')"
                    />
                    <TopBox
                        type="alliance"
                        :limit="10"
                        :days="7"
                        :title="t('top') + ' ' + t('alliances')"
                    />
                    <TopBox
                        type="ship"
                        :limit="10"
                        :days="7"
                        :title="t('top') + ' ' + t('ships')"
                    />
                    <TopBox
                        type="solarsystem"
                        :limit="10"
                        :days="7"
                        :title="t('top') + ' ' + t('systems')"
                    />
                    <TopBox
                        type="constellation"
                        :limit="10"
                        :days="7"
                        :title="t('top') + ' ' + t('constellations')"
                    />
                    <TopBox
                        type="region"
                        :limit="10"
                        :days="7"
                        :title="t('top') + ' ' + t('regions')"
                    />
                </div>

                <div class="right-column">
                    <KillList :killlistType="'latest'" />
                </div>
            </div>
        </div>

        <!-- Mobile View with Tabs - Only shown on mobile -->
        <div v-else class="mobile-layout">
            <UTabs :items="tabItems" class="w-full" default-selected="kills" default-value="1" color="neutral">
                <template #content="{ item }">
                    <div class="tab-content">
                        <!-- Top Lists tab content -->
                        <template v-if="item.key === 'topLists'">
                            <TopBox
                                type="character"
                                :limit="10"
                                :days="7"
                                :title="t('top.characters')"
                            />
                            <TopBox
                                type="corporation"
                                :limit="10"
                                :days="7"
                                :title="t('top.corporations')"
                            />
                            <TopBox
                                type="alliance"
                                :limit="10"
                                :days="7"
                                :title="t('top.alliances')"
                            />
                            <TopBox
                                type="ship"
                                :limit="10"
                                :days="7"
                                :title="t('top.ships')"
                            />
                            <TopBox
                                type="solarsystem"
                                :limit="10"
                                :days="7"
                                :title="t('top.systems')"
                            />
                            <TopBox
                                type="constellation"
                                :limit="10"
                                :days="7"
                                :title="t('top.constellations')"
                            />
                            <TopBox
                                type="region"
                                :limit="10"
                                :days="7"
                                :title="t('top.regions')"
                            />
                        </template>

                        <!-- Kills tab content -->
                        <template v-else-if="item.key === 'kills'">
                            <KillList :killlistType="'latest'" />
                        </template>

                        <!-- Overview tab content -->
                        <template v-else-if="item.key === 'most-valuable'">
                            <MostValuable />
                        </template>
                    </div>
                </template>
            </UTabs>
        </div>
    </div>
</template>

<script setup lang="ts">
const { t } = useI18n();
const { isMobile } = useResponsive();

// Create the tabs configuration for mobile view
const tabItems = ref([
    {
        key: 'topLists',
        label: t('topLists'),
        icon: 'i-lucide-list-ordered'
    },
    {
        key: 'kills',
        label: t('kills'),
        icon: 'i-lucide-swords'
    },
    {
        key: 'most-valuable',
        label: t('mostValuable'),
        icon: 'i-lucide-layout-dashboard'
    }
]);

useSeoMeta({
    title: t('homePageTitle')
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
    min-width: 0; /* Ensures the column can shrink below content size */
    flex: 1;
}

/* Tab content spacing */
.tab-content {
    padding-top: 1rem;
}

/* Mobile-specific styling */
.mobile-layout {
    width: 100%;
}
</style>
