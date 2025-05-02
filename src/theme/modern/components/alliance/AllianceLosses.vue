<template>
    <div>
        <KillList v-if="alliance" killlistType="latest" :wsFilter="`victim.alliance_id.${alliance.alliance_id}`"
            :limit="100" :apiEndpoint="`/api/killlist/losses/alliance/${alliance.alliance_id}`" />
        <div v-else class="text-center text-gray-400">
            {{ $t('loading') }}...
        </div>
    </div>
</template>

<script setup lang="ts">
import type { IAlliance } from '~/server/interfaces/IAlliance';
import KillList from '../common/KillList.vue';

const props = defineProps<{
    alliance: IAlliance | null;
}>();
</script>
