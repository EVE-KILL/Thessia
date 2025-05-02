<template>
    <div>
        <KillList v-if="character" killlistType="latest" :wsFilter="`attacker.character_id.${character.character_id}`"
            :limit="100" :apiEndpoint="`/api/killlist/attacker/character/${character.character_id}`" />
        <div v-else class="text-center text-gray-400">
            {{ $t('loading') }}...
        </div>
    </div>
</template>

<script setup lang="ts">
import type { ICharacter } from '~/server/interfaces/ICharacter';
import KillList from '../common/KillList.vue'; // Use relative path

const props = defineProps<{
    character: ICharacter | null;
}>();

</script>
