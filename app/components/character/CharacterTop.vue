<template>
    <div class="flex flex-col gap-4 p-2 pt-4">
        <!-- Period Selector -->
        <div class="flex justify-between items-center mb-4">
            <h2 class="text-xl font-semibold flex items-center gap-2">
                <UIcon name="i-lucide-trophy" class="h-5 w-5" />
                {{ $t('top') }} ({{ activePeriodLabel }})
            </h2>
            <div class="flex gap-2">
                <UButton
                    v-for="period in periods"
                    :key="period.value"
                    size="sm"
                    :variant="activePeriod === period.value ? 'solid' : 'outline'"
                    @click="changePeriod(period.value)"
                >
                    {{ period.label }}
                </UButton>
            </div>
        </div>

        <!-- Row 1: Most Valuable Kills -->
        <div class="flex flex-col md:flex-row gap-4">
            <div class="flex-1">
                <MostValuable :title="$t('character.mostValuableKills')" :apiUrl="`/api/stats/character_id/${characterId}`" :days="activeDays" />
            </div>
        </div>

        <!-- Row 2: Top Blocks (Ships, Systems, Regions) -->
        <div class="flex flex-col md:flex-row gap-4">
            <div class="flex-1 pb-5">
                <CharacterTopBox :apiUrl="`/api/stats/character_id/${characterId}`" dataType="ships" :title="$t('character.topShips')"
                    icon="i-lucide-rocket" :days="activeDays" />
            </div>
            <div class="flex-1 pb-5">
                <CharacterTopBox :apiUrl="`/api/stats/character_id/${characterId}`" dataType="systems" :title="$t('character.topSystems')"
                    icon="i-lucide-globe" :days="activeDays" />
            </div>
            <div class="flex-1 pb-5">
                <CharacterTopBox :apiUrl="`/api/stats/character_id/${characterId}`" dataType="regions" :title="$t('character.topRegions')"
                    icon="i-lucide-map" :days="activeDays" />
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import { useRoute } from 'vue-router';
import CharacterTopBox from './CharacterTopBox.vue';
import MostValuable from '../common/MostValuable.vue';

const { t } = useI18n();
const route = useRoute();
const characterId = route.params.id;

// Period management
const activePeriod = ref("all");

const periods = [
    { value: "14", label: "14d" },
    { value: "30", label: "30d" },
    { value: "90", label: "90d" },
    { value: "all", label: t("allTime") },
];

const activePeriodLabel = computed(() => {
    if (activePeriod.value === "all") return t("allTime");
    return `${activePeriod.value}d`;
});

const activeDays = computed(() => {
    return activePeriod.value === "all" ? 0 : parseInt(activePeriod.value);
});

// Function to handle period change
const changePeriod = (period: string) => {
    activePeriod.value = period;
};
</script>
