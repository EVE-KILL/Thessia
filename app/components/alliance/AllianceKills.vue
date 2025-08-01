<template>
    <div>
        <KillList v-if="alliance" killlistType="latest" :wsFilter="`attacker.alliance_id.${alliance.alliance_id}`"
            :limit="100" :apiEndpoint="`/api/killlist/attacker/alliance/${alliance.alliance_id}`" />
        <div v-else class="text-center text-gray-400">
            {{ $t('loading') }}...
        </div>
    </div>
</template>

<script setup lang="ts">
const props = defineProps<{
    alliance: IAlliance | null;
}>();
</script>
