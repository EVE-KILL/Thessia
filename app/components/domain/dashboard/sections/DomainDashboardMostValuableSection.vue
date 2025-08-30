<template>
    <div class="mb-12">
        <div class="mb-6">
            <h3 class="text-2xl font-bold text-zinc-100 mb-2">Most Valuable Kills</h3>
            <p class="text-zinc-400">Highest value killmails ({{ timeRangeLabel }})</p>
        </div>
        <KillsMostValuable :domain="domain" :items="mostValuableKills" :loading="loading" :limit="7" />
    </div>
</template>

<script setup lang="ts">
import KillsMostValuable from '~/components/kills/KillsMostValuable.vue'

interface Props {
    domain: string
    mostValuableKills: any[]
    loading: boolean
    selectedEntity: string
    timeRangeLabel: string
}

const props = withDefaults(defineProps<Props>(), {
    mostValuableKills: () => [],
    loading: false,
    selectedEntity: '',
    timeRangeLabel: '7 days'
})
</script>
