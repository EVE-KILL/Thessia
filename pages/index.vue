<template>
    <div class="layout-container">
        <div class="top-row">

        </div>

        <div class="main-content">
            <div class="left-column">
                <!-- Add padding to match KillList controls height - approximately 122px -->
                <div class="mt-25"></div>
                <TopBox
                    type="character"
                    :limit="10"
                    :days="7"
                    title="Top Characters"
                />
                <TopBox
                    type="corporation"
                    :limit="10"
                    :days="7"
                    title="Top Corporations"
                />
                <TopBox
                    type="alliance"
                    :limit="10"
                    :days="7"
                    title="Top Alliances"
                />
                <TopBox
                    type="ship"
                    :limit="10"
                    :days="7"
                    title="Top Ships"
                />
                <TopBox
                    type="solarsystem"
                    :limit="10"
                    :days="7"
                    title="Top Systems"
                />
                <TopBox
                    type="constellation"
                    :limit="10"
                    :days="7"
                    title="Top Constellations"
                />
                <TopBox
                    type="region"
                    :limit="10"
                    :days="7"
                    title="Top Regions"
                />
            </div>

            <div class="right-column">
                <KillList :killlistType="'latest'" />
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">

const { t } = useI18n();
useSeoMeta({
  title: t('home.pageTitle')
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

/* Media query for responsive design */
@media (max-width: 768px) {
    .main-content {
        grid-template-columns: 1fr;
    }

    .left-column {
        max-width: 100%;
        width: 100%;
    }
}
</style>
