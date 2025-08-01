<template>
    <div>
        <KillList v-if="corporation" killlistType="latest"
            :wsFilter="`attacker.corporation_id.${corporation.corporation_id}`" :limit="100"
            :apiEndpoint="`/api/killlist/attacker/corporation/${corporation.corporation_id}`" />
        <div v-else class="text-center text-gray-400">
            {{ $t('loading') }}...
        </div>
    </div>
</template>

<script setup lang="ts">
const props = defineProps<{
    corporation: ICorporation | null;
}>();
</script>
