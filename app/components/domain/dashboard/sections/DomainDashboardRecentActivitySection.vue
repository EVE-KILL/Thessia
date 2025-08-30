<template>
    <div>
        <div class="mb-6">
            <h3 class="text-2xl font-bold text-zinc-100 mb-2">Recent Activity</h3>
            <p class="text-zinc-400">Latest killmails and battle reports</p>
        </div>
        <KillList killlist-type="latest" :domain="domain" :api-endpoint="apiEndpoint" :limit="50" />
    </div>
</template>

<script setup lang="ts">
import KillList from '~/components/common/KillList.vue';

interface Props {
    domain: string
    apiEndpoint: string
    selectedEntity: string
}

const props = withDefaults(defineProps<Props>(), {
    apiEndpoint: '',
    selectedEntity: ''
})
</script>
