<template>
    <div>
        <KillList v-if="corporation" :wsFilter="`corporation.${corporation.corporation_id}`" :limit="100"
            :combinedKillsAndLosses="true" combinedVictimType="corporation" :combinedVictimId="corporation.corporation_id"
            :apiEndpoint="`/api/killlist/combined/corporation/${corporation.corporation_id}`" />
        <div v-else class="text-center text-gray-400">
            {{ $t('loading') }}...
        </div>
    </div>
</template>

<script setup lang="ts">
import type { ICorporation } from '~/server/interfaces/ICorporation';
import KillList from '../common/KillList.vue';

const props = defineProps<{
    corporation: ICorporation | null;
}>();
</script>
