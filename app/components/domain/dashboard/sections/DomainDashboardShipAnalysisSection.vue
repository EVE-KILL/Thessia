<template>
    <div class="mb-12">
        <div class="mb-6">
            <h3 class="text-2xl font-bold text-zinc-100 mb-2">Ship Destruction Analysis</h3>
            <p class="text-zinc-400">Detailed breakdown of destroyed ship types ({{ timeRangeLabel }})</p>
        </div>
        <KillsShipStats :domain="domain" :stats="stats" :loading="loading" time-range="7d" />
    </div>
</template>

<script setup lang="ts">
import KillsShipStats from '~/components/kills/KillsShipStats.vue'

interface Props {
    domain: string
    stats: any
    loading: boolean
    selectedEntity: string
    timeRangeLabel: string
}

const props = withDefaults(defineProps<Props>(), {
    stats: () => ({}),
    loading: false,
    selectedEntity: '',
    timeRangeLabel: '7 days'
})
</script>
