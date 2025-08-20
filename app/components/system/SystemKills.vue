<template>
    <div class="tab-content">
        <KillList killlistType="latest" :limit="100"
            :apiEndpoint="`/api/killlist/system/${systemId}`"
            :wsFilter="`system.${systemId}`" />
    </div>
</template>

<script setup lang="ts">
import KillList from '../common/KillList.vue';

const props = defineProps<{
    systemId: number;
}>();
</script>
