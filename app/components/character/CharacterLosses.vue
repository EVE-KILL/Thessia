<template>
    <div>
        <KillList v-if="character" killlistType="latest" :wsFilter="`victim.character_id.${character.character_id}`"
            :limit="100" :apiEndpoint="`/api/killlist/losses/character/${character.character_id}`" />
        <div v-else class="loading-state">
            {{ $t('loading') }}...
        </div>
    </div>
</template>

<script setup lang="ts">
const props = defineProps<{
    character: ICharacter | null;
}>();
</script>

<style scoped>
.loading-state {
    text-align: center;
    color: var(--color-text-tertiary);
}
</style>
