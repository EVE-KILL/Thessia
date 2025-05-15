<template>
    <div>
        <KillList v-if="character" :key="`character-${character.character_id}-combined`"
            :api-endpoint="`/api/killlist/combined/character/${character.character_id}`"
            :wsFilter="`character.${character.character_id}`" :limit="100" :combinedKillsAndLosses="true"
            combinedVictimType="character" :combinedVictimId="character.character_id" />
        <div v-else class="text-center text-gray-400">
            {{ $t('loading') }}...
        </div>
    </div>
</template>

<script setup lang="ts">
import type { ICharacter } from '~/server/interfaces/ICharacter';
import KillList from '../common/KillList.vue';

const props = defineProps<{
    character: ICharacter | null;
}>();

</script>
