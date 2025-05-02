<template>
    <div class="flex flex-col md:flex-row gap-4 p-2 pt-4">
        <div class="flex-1 pb-5">
            <TopBox :apiUrl="`/api/characters/${characterId}/top`" type="ship" :title="$t('character.topShips')"
                icon="i-lucide-rocket" />
        </div>
        <div class="flex-1 pb-5">
            <TopBox :apiUrl="`/api/characters/${characterId}/top`" type="system" :title="$t('character.topSystems')"
                icon="i-lucide-globe" />
        </div>
        <div class="flex-1 pb-5">
            <TopBox :apiUrl="`/api/characters/${characterId}/top`" type="region" :title="$t('character.topRegions')"
                icon="i-lucide-map" />
        </div>
    </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import { useRoute } from 'vue-router';

const { t } = useI18n();
const route = useRoute();
const characterId = route.params.id;
</script>
