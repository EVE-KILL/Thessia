<template>
    <div>
        <KillList v-if="character" :key="`character-${character.character_id}-kills`"
            :api-endpoint="`/api/killlist/attacker/character/${character.character_id}`" killlistType="latest"
            :wsFilter="`attacker.character_id.${character.character_id}`" :limit="100" />
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
